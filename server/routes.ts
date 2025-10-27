import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { emailService } from "./emailService";
import { reminderService } from "./reminderService";
import {
  insertBorrowerSchema,
  insertLoanSchema,
  insertPaymentSchema,
  insertReminderSchema,
  insertEmailTemplateSchema,
} from "@shared/schema";
import {
  getUserInterestEntries,
  getInterestHistory,
  generateMonthlyInterestEntries,
  calculateOutstandingInterest,
  generateHistoricalInterestEntries,
} from "./interestCalculationService";
import { sendMonthlyInterestReminders, getSchedulerStatus } from "./reminderSchedulerService";

const upload = multer({ dest: "uploads/" });

// WebSocket connection tracking
const wsClients = new Map<string, Set<WebSocket>>();

function broadcastToUser(userId: string, message: any) {
  const userSockets = wsClients.get(userId);
  if (userSockets) {
    const data = JSON.stringify(message);
    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/user/preferences", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.updateUserPreferences(userId, req.body);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Notifications route
  app.get("/api/notifications", isAuthenticated, async (req: any, res: Response) => {
    try {
      // For now, return mock notifications
      // TODO: Implement proper notification storage and retrieval
      const notifications = [
        {
          id: "1",
          title: "Payment Received",
          message: "Payment of ₹50,000 received from John Doe",
          type: "payment",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        },
        {
          id: "2",
          title: "Interest Generated",
          message: "Monthly interest of ₹5,000 calculated for Loan #1234",
          type: "interest",
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
          id: "3",
          title: "Reminder Sent",
          message: "Payment reminder sent to Jane Smith",
          type: "reminder",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
      ];
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Borrower routes
  app.get("/api/borrowers", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrowers = await storage.getBorrowers(userId);
      res.json(borrowers);
    } catch (error: any) {
      console.error("Error fetching borrowers:", error);
      res.status(500).json({ message: "Failed to fetch borrowers" });
    }
  });

  app.get("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrower = await storage.getBorrower(req.params.id, userId);
      if (!borrower) {
        return res.status(404).json({ message: "Borrower not found" });
      }
      res.json(borrower);
    } catch (error: any) {
      console.error("Error fetching borrower:", error);
      res.status(500).json({ message: "Failed to fetch borrower" });
    }
  });

  app.post("/api/borrowers", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertBorrowerSchema.parse({ ...req.body, userId });
      const borrower = await storage.createBorrower(validated);
      
      await storage.createAuditLog({
        userId,
        action: "create_borrower",
        entityType: "borrower",
        entityId: borrower.id,
        changes: { borrowerName: borrower.name },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "borrower_created",
        data: borrower,
      });

      res.status(201).json(borrower);
    } catch (error: any) {
      console.error("Error creating borrower:", error);
      res.status(400).json({ message: error.message || "Failed to create borrower" });
    }
  });

  app.patch("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrower = await storage.updateBorrower(req.params.id, userId, req.body);
      
      await storage.createAuditLog({
        userId,
        action: "update_borrower",
        entityType: "borrower",
        entityId: borrower.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "borrower_updated",
        data: borrower,
      });

      res.json(borrower);
    } catch (error: any) {
      console.error("Error updating borrower:", error);
      res.status(400).json({ message: error.message || "Failed to update borrower" });
    }
  });

  app.delete("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteBorrower(req.params.id, userId);
      
      await storage.createAuditLog({
        userId,
        action: "delete_borrower",
        entityType: "borrower",
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "borrower_deleted",
        data: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting borrower:", error);
      res.status(500).json({ message: "Failed to delete borrower" });
    }
  });

  // Loan routes
  app.get("/api/loans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrowerId = req.query.borrowerId as string | undefined;
      const loans = await storage.getLoans(userId, borrowerId);
      res.json(loans);
    } catch (error: any) {
      console.error("Error fetching loans:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const loan = await storage.getLoan(req.params.id, userId);
      if (!loan) {
        return res.status(404).json({ message: "Loan not found" });
      }
      res.json(loan);
    } catch (error: any) {
      console.error("Error fetching loan:", error);
      res.status(500).json({ message: "Failed to fetch loan" });
    }
  });

  app.post("/api/loans", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      // Convert startDate string to Date object
      const loanData = {
        ...req.body,
        userId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      };
      const validated = insertLoanSchema.parse(loanData);
      const loan = await storage.createLoan(validated);
      
      // Generate historical interest entries if the loan has a past start date
      try {
        const result = await generateHistoricalInterestEntries(
          loan.id,
          userId,
          loan.borrowerId,
          loan.startDate,
          loan.principalAmount,
          loan.interestRate,
          loan.interestRateType as 'monthly' | 'annual'
        );
        console.log(`Generated ${result.created} historical interest entries for loan ${loan.id}`);
      } catch (interestError) {
        console.error("Error generating historical interest entries:", interestError);
        // Don't fail the loan creation if interest generation fails
      }
      
      await storage.createAuditLog({
        userId,
        action: "create_loan",
        entityType: "loan",
        entityId: loan.id,
        changes: { amount: loan.principalAmount, borrowerId: loan.borrowerId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "loan_created",
        data: loan,
      });

      res.status(201).json(loan);
    } catch (error: any) {
      console.error("Error creating loan:", error);
      res.status(400).json({ message: error.message || "Failed to create loan" });
    }
  });

  app.patch("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const loan = await storage.updateLoan(req.params.id, userId, req.body);
      
      await storage.createAuditLog({
        userId,
        action: "update_loan",
        entityType: "loan",
        entityId: loan.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "loan_updated",
        data: loan,
      });

      res.json(loan);
    } catch (error: any) {
      console.error("Error updating loan:", error);
      res.status(400).json({ message: error.message || "Failed to update loan" });
    }
  });

  app.delete("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteLoan(req.params.id, userId);
      
      await storage.createAuditLog({
        userId,
        action: "delete_loan",
        entityType: "loan",
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "loan_deleted",
        data: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting loan:", error);
      res.status(500).json({ message: "Failed to delete loan" });
    }
  });

  // Payment routes
  app.get("/api/payments", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const loanId = req.query.loanId as string | undefined;
      const payments = await storage.getPayments(userId, loanId);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertPaymentSchema.parse({ ...req.body, userId });
      const payment = await storage.createPayment(validated);
      
      await storage.createAuditLog({
        userId,
        action: "add_payment",
        entityType: "payment",
        entityId: payment.id,
        changes: { amount: payment.amount, type: payment.paymentType, loanId: payment.loanId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "payment_created",
        data: payment,
        notification: {
          title: "Payment Recorded",
          message: `Payment of ₹${payment.amount} received`,
          type: "payment",
        },
      });

      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(400).json({ message: error.message || "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const payment = await storage.updatePayment(req.params.id, userId, req.body);
      
      await storage.createAuditLog({
        userId,
        action: "update_payment",
        entityType: "payment",
        entityId: payment.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "payment_updated",
        data: payment,
      });

      res.json(payment);
    } catch (error: any) {
      console.error("Error updating payment:", error);
      res.status(400).json({ message: error.message || "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deletePayment(req.params.id, userId);
      
      await storage.createAuditLog({
        userId,
        action: "delete_payment",
        entityType: "payment",
        entityId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      broadcastToUser(userId, {
        type: "payment_deleted",
        data: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Failed to delete payment" });
    }
  });

  // Interest Entry routes
  app.get("/api/interest-entries", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await getUserInterestEntries(userId);
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching interest entries:", error);
      res.status(500).json({ message: "Failed to fetch interest entries" });
    }
  });

  app.get("/api/interest-entries/loan/:loanId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const entries = await getInterestHistory(req.params.loanId);
      res.json(entries);
    } catch (error: any) {
      console.error("Error fetching interest history:", error);
      res.status(500).json({ message: "Failed to fetch interest history" });
    }
  });

  app.get("/api/interest-entries/loan/:loanId/outstanding", isAuthenticated, async (req: any, res: Response) => {
    try {
      const outstanding = await calculateOutstandingInterest(req.params.loanId);
      res.json({ outstandingInterest: outstanding });
    } catch (error: any) {
      console.error("Error calculating outstanding interest:", error);
      res.status(500).json({ message: "Failed to calculate outstanding interest" });
    }
  });

  // Admin/Job routes for interest calculation and reminders
  app.post("/api/admin/generate-interest", isAuthenticated, async (req: any, res: Response) => {
    try {
      const result = await generateMonthlyInterestEntries();
      res.json(result);
    } catch (error: any) {
      console.error("Error generating interest entries:", error);
      res.status(500).json({ message: "Failed to generate interest entries" });
    }
  });

  app.post("/api/admin/send-reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const emailsSent = await sendMonthlyInterestReminders();
      res.json({ emailsSent });
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  app.get("/api/admin/scheduler-status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const status = getSchedulerStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ message: "Failed to get scheduler status" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reminder routes
  app.get("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrowerId = req.query.borrowerId as string | undefined;
      const reminders = await storage.getReminders(userId, borrowerId);
      res.json(reminders);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.post("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      // Convert scheduledFor string to Date before validation
      const body = {
        ...req.body,
        userId,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
      };
      const validated = insertReminderSchema.parse(body);
      const reminder = await storage.createReminder(validated);
      
      await storage.createAuditLog({
        userId,
        action: "create_reminder",
        entityType: "reminder",
        entityId: reminder.id,
        changes: { type: reminder.reminderType, borrowerId: reminder.borrowerId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      // If sendImmediately is true, process the reminder right away
      if (req.body.sendImmediately) {
        await reminderService.processReminder(reminder.id, userId);
      }

      broadcastToUser(userId, {
        type: "reminder_created",
        data: reminder,
      });

      res.status(201).json(reminder);
    } catch (error: any) {
      console.error("Error creating reminder:", error);
      res.status(400).json({ message: error.message || "Failed to create reminder" });
    }
  });

  app.post("/api/reminders/:id/send", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const success = await reminderService.processReminder(req.params.id, userId);
      
      if (success) {
        res.json({ message: "Reminder sent successfully" });
      } else {
        res.status(400).json({ message: "Failed to send reminder" });
      }
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  app.post("/api/reminders/process-pending", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const count = await reminderService.processPendingReminders(userId);
      res.json({ message: `Processed ${count} pending reminders`, count });
    } catch (error: any) {
      console.error("Error processing pending reminders:", error);
      res.status(500).json({ message: "Failed to process pending reminders" });
    }
  });

  // Email template routes
  app.get("/api/email-templates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const type = req.query.type as string | undefined;
      const templates = await storage.getEmailTemplates(userId, type);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertEmailTemplateSchema.parse({ ...req.body, userId });
      const template = await storage.createEmailTemplate(validated);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating email template:", error);
      res.status(400).json({ message: error.message || "Failed to create email template" });
    }
  });

  // Email logs
  app.get("/api/email-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrowerId = req.query.borrowerId as string | undefined;
      const logs = await storage.getEmailLogs(userId, borrowerId);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(userId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Reports
  app.get("/api/reports/loan-summary", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const loans = await storage.getLoans(userId);
      const payments = await storage.getPayments(userId);
      const borrowers = await storage.getBorrowers(userId);
      const interestEntries = await getUserInterestEntries(userId);

      const report = loans.map(loan => {
        const borrower = borrowers.find(b => b.id === loan.borrowerId);
        const loanPayments = payments.filter(p => p.loanId === loan.id);
        const loanInterest = interestEntries.filter((i: any) => i.loanId === loan.id);
        const totalPaid = loanPayments.reduce((sum: number, p) => sum + parseFloat(p.amount.toString()), 0);
        const totalInterest = loanInterest.reduce((sum: number, i: any) => sum + parseFloat(i.amount.toString()), 0);
        const balance = parseFloat(loan.principalAmount.toString()) + totalInterest - totalPaid;

        return {
          loanId: loan.id,
          borrowerName: borrower?.name || 'Unknown',
          principalAmount: parseFloat(loan.principalAmount.toString()),
          interestRate: parseFloat(loan.interestRate.toString()),
          startDate: loan.startDate,
          dueDate: null,
          status: loan.status || 'active',
          totalInterest,
          totalPaid,
          balance,
          paymentCount: loanPayments.length,
        };
      });

      res.json(report);
    } catch (error: any) {
      console.error("Error fetching loan summary report:", error);
      res.status(500).json({ message: "Failed to fetch loan summary report" });
    }
  });

  app.get("/api/reports/payment-history", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getPayments(userId);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching payment history report:", error);
      res.status(500).json({ message: "Failed to fetch payment history report" });
    }
  });

  app.get("/api/reports/interest-earned", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const interestEntries = await getUserInterestEntries(userId);
      
      // Group by month
      const monthlyData = interestEntries.reduce((acc: Record<string, { month: string; total: number; count: number }>, entry: any) => {
        const date = new Date(entry.calculatedDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthKey, total: 0, count: 0 };
        }
        acc[monthKey].total += parseFloat(entry.amount.toString());
        acc[monthKey].count += 1;
        return acc;
      }, {} as Record<string, { month: string; total: number; count: number }>);

      const monthlyReport = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

      res.json({
        total: interestEntries.reduce((sum: number, e: any) => sum + parseFloat(e.amount.toString()), 0),
        count: interestEntries.length,
        monthly: monthlyReport,
      });
    } catch (error: any) {
      console.error("Error fetching interest earned report:", error);
      res.status(500).json({ message: "Failed to fetch interest earned report" });
    }
  });

  app.get("/api/reports/borrower-summary", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const borrowers = await storage.getBorrowers(userId);
      const loans = await storage.getLoans(userId);
      const payments = await storage.getPayments(userId);
      const interestEntries = await getUserInterestEntries(userId);

      const report = borrowers.map(borrower => {
        const borrowerLoans = loans.filter(l => l.borrowerId === borrower.id);
        const totalPrincipal = borrowerLoans.reduce((sum, l) => sum + parseFloat(l.principalAmount.toString()), 0);
        
        let totalPaid = 0;
        let totalInterest = 0;
        
        borrowerLoans.forEach(loan => {
          const loanPayments = payments.filter(p => p.loanId === loan.id);
          const loanInterest = interestEntries.filter((i: any) => i.loanId === loan.id);
          totalPaid += loanPayments.reduce((sum: number, p) => sum + parseFloat(p.amount.toString()), 0);
          totalInterest += loanInterest.reduce((sum: number, i: any) => sum + parseFloat(i.amount.toString()), 0);
        });

        const balance = totalPrincipal + totalInterest - totalPaid;

        return {
          borrowerId: borrower.id,
          borrowerName: borrower.name,
          email: borrower.email,
          phone: borrower.phone,
          loanCount: borrowerLoans.length,
          totalPrincipal,
          totalInterest,
          totalPaid,
          balance,
          activeLoans: borrowerLoans.filter(l => l.status === 'active').length,
        };
      });

      res.json(report);
    } catch (error: any) {
      console.error("Error fetching borrower summary report:", error);
      res.status(500).json({ message: "Failed to fetch borrower summary report" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("WebSocket client connected");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "auth" && data.userId) {
          // Register this socket for the user
          if (!wsClients.has(data.userId)) {
            wsClients.set(data.userId, new Set());
          }
          wsClients.get(data.userId)!.add(ws);
          
          ws.send(JSON.stringify({ type: "auth_success", message: "Authenticated" }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      // Remove this socket from all user sets
      wsClients.forEach((sockets, userId) => {
        sockets.delete(ws);
        if (sockets.size === 0) {
          wsClients.delete(userId);
        }
      });
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return httpServer;
}
