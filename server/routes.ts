import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertBorrowerSchema,
  insertLoanSchema,
  insertPaymentSchema,
  insertReminderSchema,
  insertEmailTemplateSchema,
} from "@shared/schema";

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
        details: { borrowerName: borrower.name },
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
        details: { changes: req.body },
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
      const validated = insertLoanSchema.parse({ ...req.body, userId });
      const loan = await storage.createLoan(validated);
      
      await storage.createAuditLog({
        userId,
        action: "create_loan",
        entityType: "loan",
        entityId: loan.id,
        details: { amount: loan.principalAmount, borrowerId: loan.borrowerId },
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
        details: { changes: req.body },
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
        details: { amount: payment.amount, type: payment.paymentType, loanId: payment.loanId },
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
        details: { changes: req.body },
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
      const validated = insertReminderSchema.parse({ ...req.body, userId });
      const reminder = await storage.createReminder(validated);
      
      await storage.createAuditLog({
        userId,
        action: "create_reminder",
        entityType: "reminder",
        entityId: reminder.id,
        details: { type: reminder.reminderType, borrowerId: reminder.borrowerId },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

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
