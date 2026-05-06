import type {Express, Request, Response} from "express";
import {createServer, type Server} from "http";
import {WebSocketServer, WebSocket} from "ws";
import multer from "multer";
import {storage} from "./storage";
import {setupAuth, isAuthenticated} from "./localAuth";
import {emailService} from "./emailService";
import {reminderService} from "./reminderService";
import {
    insertBorrowerSchema,
    insertLoanSchema,
    insertPaymentSchema,
    insertReminderSchema,
    insertEmailTemplateSchema,
    insertFundHolderSchema,
    insertCashTransactionSchema,
    type User,
} from "@shared/schema";
import {
    getUserInterestEntries,
    getInterestHistory,
    generateMonthlyInterestEntries,
    calculateOutstandingInterest,
    generateHistoricalInterestEntries,
    calculateRealTimeInterestForUser,
} from "./interestCalculationService";
import {sendMonthlyInterestReminders, getSchedulerStatus} from "./reminderSchedulerService";

const upload = multer({dest: "uploads/"});

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
            const userId = (req.user as User).id;
            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }
            // Don't send password in response
            const {password, ...userWithoutPassword} = user;
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Error fetching user:", error);
            res.status(500).json({message: "Failed to fetch user"});
        }
    });

    app.patch("/api/auth/user/preferences", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const user = await storage.updateUserPreferences(userId, req.body);
            // Don't send password in response
            const {password, ...userWithoutPassword} = user;
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Error updating preferences:", error);
            res.status(500).json({message: "Failed to update preferences"});
        }
    });

    // User settings routes
    app.get("/api/user/settings", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({message: "User not found"});
            }
            // Don't send password in response
            const {password, ...userWithoutPassword} = user;
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Error fetching user settings:", error);
            res.status(500).json({message: "Failed to fetch user settings"});
        }
    });

    app.patch("/api/user/profile", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const {firstName, lastName} = req.body;
            const user = await storage.updateUserPreferences(userId, {firstName, lastName});
            // Don't send password in response
            const {password, ...userWithoutPassword} = user;
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            res.status(500).json({message: "Failed to update profile"});
        }
    });

    app.patch("/api/user/preferences", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const {notificationPreferences, interestCalculationMethod, autoLogoutMinutes, cashTrackingEnabled} = req.body;
            const user = await storage.updateUserPreferences(userId, {
                notificationPreferences,
                interestCalculationMethod,
                autoLogoutMinutes,
                cashTrackingEnabled,
            });
            // Don't send password in response
            const {password, ...userWithoutPassword} = user;
            res.json(userWithoutPassword);
        } catch (error: any) {
            console.error("Error updating preferences:", error);
            res.status(500).json({message: "Failed to update preferences"});
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
            res.status(500).json({message: "Failed to fetch notifications"});
        }
    });

    // Debug route for borrower calculations
    app.get("/api/debug/borrower/:borrowerId", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.params.borrowerId;
            
            const borrower = await storage.getBorrower(borrowerId, userId);
            const borrowerLoans = await storage.getLoans(userId, borrowerId);
            const allPayments = await storage.getPayments(userId);
            const borrowerPayments = allPayments.filter(p => 
                borrowerLoans.some(l => l.id === p.loanId)
            );
            const interestEntries = await getUserInterestEntries(userId);
            const borrowerInterest = interestEntries.filter((i: any) => i.borrowerId === borrowerId);
            
            const totalLent = borrowerLoans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0);
            const principalPaid = borrowerPayments
                .filter(p => p.paymentType === 'principal' || p.paymentType === 'mixed')
                .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
            const outstanding = totalLent - principalPaid;
            
            const totalInterestGenerated = borrowerInterest.reduce((sum: number, entry: any) => sum + parseFloat(entry.interestAmount), 0);
            const interestPaid = borrowerPayments
                .filter(p => p.paymentType === 'interest' || p.paymentType === 'partial_interest')
                .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
            const pendingInterest = totalInterestGenerated - interestPaid;
            
            res.json({
                borrower: borrower?.name,
                loans: borrowerLoans.map(l => ({ id: l.id, principal: l.principalAmount, rate: l.interestRate })),
                payments: borrowerPayments.map(p => ({ date: p.paymentDate, amount: p.amount, type: p.paymentType })),
                interestEntries: borrowerInterest.map((i: any) => ({ amount: i.interestAmount, period: i.periodStart })),
                calculations: {
                    totalLent,
                    principalPaid,
                    outstanding,
                    totalInterestGenerated,
                    interestPaid,
                    pendingInterest
                }
            });
        } catch (error: any) {
            console.error("Error in debug:", error);
            res.status(500).json({message: "Debug failed"});
        }
    });

    // Borrower routes
    app.get("/api/borrowers", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowers = await storage.getBorrowers(userId);
            res.json(borrowers);
        } catch (error: any) {
            console.error("Error fetching borrowers:", error);
            res.status(500).json({message: "Failed to fetch borrowers"});
        }
    });

    app.get("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrower = await storage.getBorrower(req.params.id, userId);
            if (!borrower) {
                return res.status(404).json({message: "Borrower not found"});
            }
            res.json(borrower);
        } catch (error: any) {
            console.error("Error fetching borrower:", error);
            res.status(500).json({message: "Failed to fetch borrower"});
        }
    });

    app.post("/api/borrowers", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const validated = insertBorrowerSchema.parse({...req.body, userId});
            const borrower = await storage.createBorrower(validated);

            await storage.createAuditLog({
                userId,
                action: "create_borrower",
                entityType: "borrower",
                entityId: borrower.id,
                changes: {borrowerName: borrower.name},
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
            res.status(400).json({message: error.message || "Failed to create borrower"});
        }
    });

    app.patch("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
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
            res.status(400).json({message: error.message || "Failed to update borrower"});
        }
    });

    app.delete("/api/borrowers/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
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
                data: {id: req.params.id},
            });

            res.status(204).send();
        } catch (error: any) {
            console.error("Error deleting borrower:", error);
            res.status(500).json({message: "Failed to delete borrower"});
        }
    });

    // Loan routes
    app.get("/api/loans", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.query.borrowerId as string | undefined;
            const loans = await storage.getLoans(userId, borrowerId);
            res.json(loans);
        } catch (error: any) {
            console.error("Error fetching loans:", error);
            res.status(500).json({message: "Failed to fetch loans"});
        }
    });

    app.get("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const loan = await storage.getLoan(req.params.id, userId);
            if (!loan) {
                return res.status(404).json({message: "Loan not found"});
            }
            res.json(loan);
        } catch (error: any) {
            console.error("Error fetching loan:", error);
            res.status(500).json({message: "Failed to fetch loan"});
        }
    });

    // Single-loan detail endpoint: loan + borrower + payments + interest.
    // Designed so the loan detail page does NOT need to fetch all-loans/all-payments.
    app.get("/api/loans/:id/details", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const details = await storage.getLoanDetails(req.params.id, userId);
            if (!details) {
                return res.status(404).json({message: "Loan not found"});
            }
            res.json(details);
        } catch (error: any) {
            console.error("Error fetching loan details:", error);
            res.status(500).json({message: "Failed to fetch loan details"});
        }
    });

    app.post("/api/loans", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
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

            // Create cash disbursement transactions if provided
            const disbursements = req.body.disbursements as Array<{ fundHolderId: string; amount: string }> | undefined;
            if (disbursements && disbursements.length > 0) {
                for (const d of disbursements) {
                    await storage.createCashTransaction({
                        userId,
                        fundHolderId: d.fundHolderId,
                        type: "loan_disbursement",
                        amount: d.amount,
                        loanId: loan.id,
                        notes: `Loan disbursement to ${req.body._borrowerName || 'borrower'}`,
                        transactionDate: loan.startDate,
                    });
                }
            }

            await storage.createAuditLog({
                userId,
                action: "create_loan",
                entityType: "loan",
                entityId: loan.id,
                changes: {amount: loan.principalAmount, borrowerId: loan.borrowerId, disbursements},
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
            res.status(400).json({message: error.message || "Failed to create loan"});
        }
    });

    app.patch("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            // Convert startDate string to Date object if provided
            const updateData = {
                ...req.body,
                ...(req.body.startDate && { startDate: new Date(req.body.startDate) })
            };
            const loan = await storage.updateLoan(req.params.id, userId, updateData);

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
            res.status(400).json({message: error.message || "Failed to update loan"});
        }
    });

    app.delete("/api/loans/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
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
                data: {id: req.params.id},
            });

            res.status(204).send();
        } catch (error: any) {
            console.error("Error deleting loan:", error);
            res.status(500).json({message: "Failed to delete loan"});
        }
    });

    // Loan close/settle route
    app.post("/api/loans/:id/close", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const { settlementAmount, settlementNotes } = req.body;

            const loan = await storage.getLoan(req.params.id, userId);
            if (!loan) {
                return res.status(404).json({message: "Loan not found"});
            }
            if (loan.status === "closed") {
                return res.status(400).json({message: "Loan is already closed"});
            }

            const updated = await storage.closeLoan(req.params.id, userId, settlementAmount, settlementNotes);

            await storage.createAuditLog({
                userId,
                action: "close_loan",
                entityType: "loan",
                entityId: updated.id,
                changes: {status: "settled", settlementAmount, settlementNotes},
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });

            broadcastToUser(userId, {
                type: "loan_updated",
                data: updated,
            });

            res.json(updated);
        } catch (error: any) {
            console.error("Error closing loan:", error);
            res.status(500).json({message: error.message || "Failed to close loan"});
        }
    });

    // Payment routes
    app.get("/api/payments", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const loanId = req.query.loanId as string | undefined;
            const payments = await storage.getPayments(userId, loanId);
            res.json(payments);
        } catch (error: any) {
            console.error("Error fetching payments:", error);
            res.status(500).json({message: "Failed to fetch payments"});
        }
    });

    app.post("/api/payments", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const validated = insertPaymentSchema.parse({...req.body, userId});

            // Validate interestClearedTillDate is not older than the latest existing one
            if (validated.interestClearedTillDate) {
                const latestDate = await storage.getLatestInterestClearedTillDate(validated.loanId);
                if (latestDate && new Date(validated.interestClearedTillDate) < latestDate) {
                    const formatted = latestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    return res.status(400).json({
                        message: `Interest cleared till date cannot be older than the previously recorded date (${formatted})`
                    });
                }
            }

            const payment = await storage.createPayment(validated);

            // If cash tracking is enabled and a fund holder collected the payment, create a cash inflow linked to this payment
            const { collectedByFundHolderId } = req.body;
            if (collectedByFundHolderId) {
                const user = await storage.getUser(userId);
                if (user?.cashTrackingEnabled) {
                    const loan = await storage.getLoan(validated.loanId, userId);
                    const borrower = loan ? await storage.getBorrower(loan.borrowerId, userId) : null;
                    await storage.createCashTransaction({
                        userId,
                        fundHolderId: collectedByFundHolderId,
                        type: "payment_collection",
                        amount: validated.amount as string,
                        loanId: validated.loanId,
                        paymentId: payment.id,
                        notes: `Payment collected from ${borrower?.name || 'borrower'} - ${validated.paymentType}`,
                        transactionDate: validated.paymentDate,
                    });
                }
            }

            await storage.createAuditLog({
                userId,
                action: "add_payment",
                entityType: "payment",
                entityId: payment.id,
                changes: {amount: payment.amount, type: payment.paymentType, loanId: payment.loanId, collectedByFundHolderId},
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
            res.status(400).json({message: error.message || "Failed to create payment"});
        }
    });

    app.patch("/api/payments/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const { collectedByFundHolderId, ...rest } = req.body;
            // Convert date strings to Date objects if provided
            const updateData = {
                ...rest,
                ...(rest.paymentDate && { paymentDate: new Date(rest.paymentDate) }),
                ...(rest.interestClearedTillDate && { interestClearedTillDate: new Date(rest.interestClearedTillDate) })
            };

            const payment = await storage.updatePayment(req.params.id, userId, updateData);

            // Sync linked cash transaction
            const existingCashTx = await storage.getCashTransactionByPaymentId(payment.id, userId);
            if (existingCashTx && collectedByFundHolderId) {
                // Update existing linked cash transaction
                await storage.updateCashTransaction(existingCashTx.id, userId, {
                    amount: payment.amount,
                    fundHolderId: collectedByFundHolderId,
                    transactionDate: payment.paymentDate,
                });
            } else if (existingCashTx && collectedByFundHolderId === null) {
                // Fund holder removed — delete the linked cash transaction
                await storage.deleteCashTransaction(existingCashTx.id, userId);
            } else if (!existingCashTx && collectedByFundHolderId) {
                // New fund holder assigned — create linked cash transaction
                const user = await storage.getUser(userId);
                if (user?.cashTrackingEnabled) {
                    const loan = await storage.getLoan(payment.loanId, userId);
                    const borrower = loan ? await storage.getBorrower(loan.borrowerId, userId) : null;
                    await storage.createCashTransaction({
                        userId,
                        fundHolderId: collectedByFundHolderId,
                        type: "payment_collection",
                        amount: payment.amount,
                        loanId: payment.loanId,
                        paymentId: payment.id,
                        notes: `Payment collected from ${borrower?.name || 'borrower'} - ${payment.paymentType}`,
                        transactionDate: payment.paymentDate,
                    });
                }
            }

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

            // Notify frontend to refresh cash data
            broadcastToUser(userId, {
                type: "cash_transaction_updated",
            });

            res.json(payment);
        } catch (error: any) {
            console.error("Error updating payment:", error);
            res.status(400).json({message: error.message || "Failed to update payment"});
        }
    });

    app.delete("/api/payments/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            // Cascade will auto-delete linked cash transaction via DB FK
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
                data: {id: req.params.id},
            });

            // Notify frontend to refresh cash data (linked cash tx was cascade-deleted)
            broadcastToUser(userId, {
                type: "cash_transaction_updated",
            });

            res.status(204).send();
        } catch (error: any) {
            console.error("Error deleting payment:", error);
            res.status(500).json({message: "Failed to delete payment"});
        }
    });

    // Real-time interest calculation
    app.get("/api/interest/real-time", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const interests = await calculateRealTimeInterestForUser(userId);
            res.json(interests);
        } catch (error: any) {
            console.error("Error calculating real-time interest:", error);
            res.status(500).json({message: "Failed to calculate real-time interest"});
        }
    });

    // Test endpoint for interest calculation example
    app.get("/api/interest/example", isAuthenticated, async (req: any, res: Response) => {
        try {
            const { calculateExampleInterest } = await import('./interestCalculationExample');
            const result = calculateExampleInterest();
            res.json(result);
        } catch (error: any) {
            console.error("Error running interest example:", error);
            res.status(500).json({message: "Failed to run interest example"});
        }
    });

    // Interest Entry routes (deprecated - using real-time calculation)
    // app.get("/api/interest-entries", ...)

    // Admin/Job routes for interest calculation and reminders
    app.post("/api/admin/generate-interest", isAuthenticated, async (req: any, res: Response) => {
        try {
            const result = await generateMonthlyInterestEntries();
            res.json(result);
        } catch (error: any) {
            console.error("Error generating interest entries:", error);
            res.status(500).json({message: "Failed to generate interest entries"});
        }
    });

    app.post("/api/admin/send-reminders", isAuthenticated, async (req: any, res: Response) => {
        try {
            const emailsSent = await sendMonthlyInterestReminders();
            res.json({emailsSent});
        } catch (error: any) {
            console.error("Error sending reminders:", error);
            res.status(500).json({message: "Failed to send reminders"});
        }
    });

    app.get("/api/admin/scheduler-status", isAuthenticated, async (req: any, res: Response) => {
        try {
            const status = getSchedulerStatus();
            res.json(status);
        } catch (error: any) {
            console.error("Error getting scheduler status:", error);
            res.status(500).json({message: "Failed to get scheduler status"});
        }
    });

    // Dashboard stats
    app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const stats = await storage.getDashboardStats(userId);
            res.json(stats);
        } catch (error: any) {
            console.error("Error fetching dashboard stats:", error);
            res.status(500).json({message: "Failed to fetch dashboard stats"});
        }
    });

    // Reminder routes
    app.get("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.query.borrowerId as string | undefined;
            const reminders = await storage.getReminders(userId, borrowerId);
            res.json(reminders);
        } catch (error: any) {
            console.error("Error fetching reminders:", error);
            res.status(500).json({message: "Failed to fetch reminders"});
        }
    });

    app.post("/api/reminders", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
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
                changes: {type: reminder.reminderType, borrowerId: reminder.borrowerId},
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
            res.status(400).json({message: error.message || "Failed to create reminder"});
        }
    });

    app.post("/api/reminders/:id/send", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const success = await reminderService.processReminder(req.params.id, userId);

            if (success) {
                res.json({message: "Reminder sent successfully"});
            } else {
                res.status(400).json({message: "Failed to send reminder"});
            }
        } catch (error: any) {
            console.error("Error sending reminder:", error);
            res.status(500).json({message: "Failed to send reminder"});
        }
    });

    app.post("/api/reminders/process-pending", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const count = await reminderService.processPendingReminders(userId);
            res.json({message: `Processed ${count} pending reminders`, count});
        } catch (error: any) {
            console.error("Error processing pending reminders:", error);
            res.status(500).json({message: "Failed to process pending reminders"});
        }
    });

    // Email template routes
    app.get("/api/email-templates", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const type = req.query.type as string | undefined;
            const templates = await storage.getEmailTemplates(userId, type);
            res.json(templates);
        } catch (error: any) {
            console.error("Error fetching email templates:", error);
            res.status(500).json({message: "Failed to fetch email templates"});
        }
    });

    app.post("/api/email-templates", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const validated = insertEmailTemplateSchema.parse({...req.body, userId});
            const template = await storage.createEmailTemplate(validated);
            res.status(201).json(template);
        } catch (error: any) {
            console.error("Error creating email template:", error);
            res.status(400).json({message: error.message || "Failed to create email template"});
        }
    });

    // Email logs
    app.get("/api/email-logs", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.query.borrowerId as string | undefined;
            const logs = await storage.getEmailLogs(userId, borrowerId);
            res.json(logs);
        } catch (error: any) {
            console.error("Error fetching email logs:", error);
            res.status(500).json({message: "Failed to fetch email logs"});
        }
    });

    // Audit logs
    app.get("/api/audit-logs", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const limit = parseInt(req.query.limit as string) || 100;
            const logs = await storage.getAuditLogs(userId, limit);
            res.json(logs);
        } catch (error: any) {
            console.error("Error fetching audit logs:", error);
            res.status(500).json({message: "Failed to fetch audit logs"});
        }
    });

    // Reports with optimized queries
    app.get("/api/reports/loan-summary", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            
            // Single optimized query with JOINs
            const report = await storage.getLoanSummaryReport(userId);
            res.json(report);
        } catch (error: any) {
            console.error("Error fetching loan summary report:", error);
            res.status(500).json({message: "Failed to fetch loan summary report"});
        }
    });

    app.get("/api/reports/payment-history", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const payments = await storage.getPayments(userId);
            res.json(payments);
        } catch (error: any) {
            console.error("Error fetching payment history report:", error);
            res.status(500).json({message: "Failed to fetch payment history report"});
        }
    });

    app.get("/api/reports/interest-earned", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const fromDate = req.query.from ? new Date(req.query.from as string) : null;
            const toDate = req.query.to ? new Date(req.query.to as string) : null;

            const interestEntries = await getUserInterestEntries(userId);

            // Bucket by the entry's period start month, optionally filtered by date range
            const filtered = interestEntries.filter((entry: any) => {
                const periodStart = new Date(entry.periodStart);
                if (fromDate && periodStart < fromDate) return false;
                if (toDate && periodStart > toDate) return false;
                return true;
            });

            const monthlyData = filtered.reduce((acc: Record<string, {
                month: string;
                total: number;
                count: number
            }>, entry: any) => {
                const date = new Date(entry.periodStart);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!acc[monthKey]) {
                    acc[monthKey] = {month: monthKey, total: 0, count: 0};
                }
                acc[monthKey].total += parseFloat(entry.interestAmount.toString());
                acc[monthKey].count += 1;
                return acc;
            }, {} as Record<string, { month: string; total: number; count: number }>);

            const monthlyReport = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

            res.json({
                total: filtered.reduce((sum: number, e: any) => sum + parseFloat(e.interestAmount.toString()), 0),
                count: filtered.length,
                monthly: monthlyReport,
            });
        } catch (error: any) {
            console.error("Error fetching interest earned report:", error);
            res.status(500).json({message: "Failed to fetch interest earned report"});
        }
    });

    app.get("/api/reports/borrower-summary", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            
            // Single optimized query with JOINs
            const report = await storage.getBorrowerSummaryReport(userId);
            res.json(report);
        } catch (error: any) {
            console.error("Error fetching borrower summary report:", error);
            res.status(500).json({message: "Failed to fetch borrower summary report"});
        }
    });

    app.get("/api/reports/borrower-report", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.query.borrowerId as string;
            const tillDate = req.query.tillDate as string;
            
            if (!borrowerId || !tillDate) {
                return res.status(400).json({message: "borrowerId and tillDate are required"});
            }
            
            const report = await storage.generateBorrowerReport(userId, borrowerId, new Date(tillDate));
            res.json(report);
        } catch (error: any) {
            console.error("Error generating borrower report:", error);
            res.status(500).json({message: "Failed to generate borrower report"});
        }
    });

    app.get("/api/reports/pending-interest", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const borrowerId = req.query.borrowerId as string;
            const tillDate = req.query.tillDate as string;
            
            if (!borrowerId || !tillDate) {
                return res.status(400).json({message: "borrowerId and tillDate are required"});
            }
            
            if (borrowerId === "all") {
                const result = await storage.calculatePendingInterestForAllBorrowers(userId, new Date(tillDate));
                res.json(result);
            } else {
                const result = await storage.calculatePendingInterest(userId, borrowerId, new Date(tillDate));
                res.json(result);
            }
        } catch (error: any) {
            console.error("Error calculating pending interest:", error);
            res.status(500).json({message: "Failed to calculate pending interest"});
        }
    });

    // Fund holder routes
    app.get("/api/fund-holders", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const holders = await storage.getFundHolders(userId);
            res.json(holders);
        } catch (error: any) {
            console.error("Error fetching fund holders:", error);
            res.status(500).json({message: "Failed to fetch fund holders"});
        }
    });

    app.post("/api/fund-holders", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const validated = insertFundHolderSchema.parse({...req.body, userId});
            const holder = await storage.createFundHolder(validated);
            res.status(201).json(holder);
        } catch (error: any) {
            console.error("Error creating fund holder:", error);
            res.status(400).json({message: error.message || "Failed to create fund holder"});
        }
    });

    app.patch("/api/fund-holders/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const holder = await storage.updateFundHolder(req.params.id, userId, req.body);
            res.json(holder);
        } catch (error: any) {
            console.error("Error updating fund holder:", error);
            res.status(400).json({message: error.message || "Failed to update fund holder"});
        }
    });

    app.delete("/api/fund-holders/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            await storage.deleteFundHolder(req.params.id, userId);
            res.status(204).send();
        } catch (error: any) {
            console.error("Error deleting fund holder:", error);
            res.status(500).json({message: "Failed to delete fund holder"});
        }
    });

    // Cash transaction routes
    app.get("/api/cash-transactions", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const fundHolderId = req.query.fundHolderId as string | undefined;
            const transactions = await storage.getCashTransactions(userId, fundHolderId);
            res.json(transactions);
        } catch (error: any) {
            console.error("Error fetching cash transactions:", error);
            res.status(500).json({message: "Failed to fetch cash transactions"});
        }
    });

    app.post("/api/cash-transactions", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const validated = insertCashTransactionSchema.parse({
                ...req.body,
                userId,
                transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : new Date(),
            });
            const transaction = await storage.createCashTransaction(validated);

            await storage.createAuditLog({
                userId,
                action: "create_cash_transaction",
                entityType: "cash_transaction",
                entityId: transaction.id,
                changes: {type: transaction.type, amount: transaction.amount, fundHolderId: transaction.fundHolderId},
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });

            res.status(201).json(transaction);
        } catch (error: any) {
            console.error("Error creating cash transaction:", error);
            res.status(400).json({message: error.message || "Failed to create cash transaction"});
        }
    });

    // Transfer endpoint — must be registered before :id routes
    app.post("/api/cash-transactions/transfer", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const { fromFundHolderId, toFundHolderId, amount, notes, transactionDate } = req.body;

            if (!fromFundHolderId || !toFundHolderId || !amount) {
                return res.status(400).json({ message: "fromFundHolderId, toFundHolderId, and amount are required" });
            }
            if (fromFundHolderId === toFundHolderId) {
                return res.status(400).json({ message: "Cannot transfer to the same fund holder" });
            }

            const date = transactionDate ? new Date(transactionDate) : new Date();
            const result = await storage.createTransfer(userId, fromFundHolderId, toFundHolderId, amount, notes || null, date);

            await storage.createAuditLog({
                userId,
                action: "create_transfer",
                entityType: "cash_transaction",
                entityId: result.transferOut.id,
                changes: { fromFundHolderId, toFundHolderId, amount, transferGroupId: result.transferOut.transferGroupId },
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });

            broadcastToUser(userId, { type: "cash_transaction_updated" });

            res.status(201).json(result);
        } catch (error: any) {
            console.error("Error creating transfer:", error);
            res.status(400).json({ message: error.message || "Failed to create transfer" });
        }
    });

    app.patch("/api/cash-transactions/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;

            // Protect payment-linked transactions
            const existing = await storage.getCashTransaction(req.params.id, userId);
            if (existing?.paymentId) {
                return res.status(400).json({ message: "This transaction is linked to a payment. Edit the payment instead." });
            }

            const { amount, fundHolderId, notes, transactionDate } = req.body;
            const updates: { amount?: string; fundHolderId?: string; notes?: string; transactionDate?: Date } = {};
            if (amount !== undefined) updates.amount = amount;
            if (fundHolderId !== undefined) updates.fundHolderId = fundHolderId;
            if (notes !== undefined) updates.notes = notes;
            if (transactionDate !== undefined) updates.transactionDate = new Date(transactionDate);

            const transaction = await storage.updateCashTransaction(req.params.id, userId, updates);

            await storage.createAuditLog({
                userId,
                action: "update_cash_transaction",
                entityType: "cash_transaction",
                entityId: transaction.id,
                changes: updates,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            });

            res.json(transaction);
        } catch (error: any) {
            console.error("Error updating cash transaction:", error);
            res.status(400).json({ message: error.message || "Failed to update cash transaction" });
        }
    });

    app.delete("/api/cash-transactions/:id", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;

            const existing = await storage.getCashTransaction(req.params.id, userId);
            if (!existing) {
                return res.status(404).json({ message: "Cash transaction not found" });
            }

            // Protect payment-linked transactions
            if (existing.paymentId) {
                return res.status(400).json({ message: "This transaction is linked to a payment. Delete the payment instead." });
            }

            // If part of a transfer, delete both legs
            if (existing.transferGroupId) {
                await storage.deleteTransferGroup(existing.transferGroupId, userId);
            } else {
                await storage.deleteCashTransaction(req.params.id, userId);
            }

            broadcastToUser(userId, { type: "cash_transaction_updated" });

            res.status(204).send();
        } catch (error: any) {
            console.error("Error deleting cash transaction:", error);
            res.status(500).json({message: "Failed to delete cash transaction"});
        }
    });

    app.get("/api/cash-transactions/balances", isAuthenticated, async (req: any, res: Response) => {
        try {
            const userId = (req.user as User).id;
            const balances = await storage.getCashBalances(userId);
            res.json(balances);
        } catch (error: any) {
            console.error("Error fetching cash balances:", error);
            res.status(500).json({message: "Failed to fetch cash balances"});
        }
    });

    const httpServer = createServer(app);

    // WebSocket server setup
    const wss = new WebSocketServer({server: httpServer, path: "/ws"});

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

                    ws.send(JSON.stringify({type: "auth_success", message: "Authenticated"}));
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
