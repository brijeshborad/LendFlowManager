import {
  users,
  borrowers,
  loans,
  payments,
  reminders,
  emailLogs,
  emailTemplates,
  auditLogs,
  type User,
  type UpsertUser,
  type Borrower,
  type InsertBorrower,
  type Loan,
  type InsertLoan,
  type Payment,
  type InsertPayment,
  type Reminder,
  type InsertReminder,
  type EmailLog,
  type InsertEmailLog,
  type EmailTemplate,
  type InsertEmailTemplate,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { calculateRealTimeInterestForUser } from "./interestCalculationService";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPreferences(userId: string, preferences: Partial<UpsertUser>): Promise<User>;

  // Borrower operations
  getBorrowers(userId: string): Promise<Borrower[]>;
  getBorrower(id: string, userId: string): Promise<Borrower | undefined>;
  createBorrower(borrower: InsertBorrower): Promise<Borrower>;
  updateBorrower(id: string, userId: string, borrower: Partial<InsertBorrower>): Promise<Borrower>;
  deleteBorrower(id: string, userId: string): Promise<void>;

  // Loan operations
  getLoans(userId: string, borrowerId?: string): Promise<Loan[]>;
  getLoan(id: string, userId: string): Promise<Loan | undefined>;
  createLoan(loan: InsertLoan): Promise<Loan>;
  updateLoan(id: string, userId: string, loan: Partial<InsertLoan>): Promise<Loan>;
  deleteLoan(id: string, userId: string): Promise<void>;

  // Payment operations
  getPayments(userId: string, loanId?: string): Promise<Payment[]>;
  getPayment(id: string, userId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, userId: string, payment: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: string, userId: string): Promise<void>;

  // Reminder operations
  getReminders(userId: string, borrowerId?: string): Promise<Reminder[]>;
  getReminder(id: string, userId: string): Promise<Reminder | undefined>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, userId: string, reminder: Partial<InsertReminder>): Promise<Reminder>;
  deleteReminder(id: string, userId: string): Promise<void>;

  // Email log operations
  getEmailLogs(userId: string, borrowerId?: string): Promise<EmailLog[]>;
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;

  // Email template operations
  getEmailTemplates(userId: string, type?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string, userId: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, userId: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string, userId: string): Promise<void>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>;

  // Analytics operations
  getDashboardStats(userId: string): Promise<{
    totalLent: string;
    outstandingPrincipal: string;
    interestReceived: string;
    interestPending: string;
    activeBorrowers: number;
    activeLoans: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user by ID first, then by email
    const existingById = userData.id ? await this.getUser(userData.id) : null;
    const existingByEmail = !existingById && userData.email
      ? (await db.select().from(users).where(eq(users.email, userData.email)))[0]
      : null;
    
    if (existingById || existingByEmail) {
      // Update existing user
      const userId = (existingById || existingByEmail)!.id;
      const [user] = await db
        .update(users)
        .set({ ...userData, id: userId, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserPreferences(userId: string, preferences: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Borrower operations
  async getBorrowers(userId: string): Promise<Borrower[]> {
    return db.select().from(borrowers).where(eq(borrowers.userId, userId)).orderBy(desc(borrowers.createdAt));
  }

  async getBorrower(id: string, userId: string): Promise<Borrower | undefined> {
    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, id), eq(borrowers.userId, userId)));
    return borrower;
  }

  async createBorrower(borrower: InsertBorrower): Promise<Borrower> {
    const [newBorrower] = await db.insert(borrowers).values(borrower).returning();
    return newBorrower;
  }

  async updateBorrower(id: string, userId: string, borrower: Partial<InsertBorrower>): Promise<Borrower> {
    const [updated] = await db
      .update(borrowers)
      .set({ ...borrower, updatedAt: new Date() })
      .where(and(eq(borrowers.id, id), eq(borrowers.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBorrower(id: string, userId: string): Promise<void> {
    await db.delete(borrowers).where(and(eq(borrowers.id, id), eq(borrowers.userId, userId)));
  }

  // Loan operations
  async getLoans(userId: string, borrowerId?: string): Promise<Loan[]> {
    const conditions = [eq(loans.userId, userId)];
    if (borrowerId) {
      conditions.push(eq(loans.borrowerId, borrowerId));
    }
    return db
      .select()
      .from(loans)
      .where(and(...conditions))
      .orderBy(desc(loans.createdAt));
  }

  async getLoan(id: string, userId: string): Promise<Loan | undefined> {
    const [loan] = await db.select().from(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
    return loan;
  }

  async createLoan(loan: InsertLoan): Promise<Loan> {
    const [newLoan] = await db.insert(loans).values(loan).returning();
    return newLoan;
  }

  async updateLoan(id: string, userId: string, loan: Partial<InsertLoan>): Promise<Loan> {
    const [updated] = await db
      .update(loans)
      .set({ ...loan, updatedAt: new Date() })
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .returning();
    return updated;
  }

  async deleteLoan(id: string, userId: string): Promise<void> {
    await db.delete(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
  }

  // Payment operations
  async getPayments(userId: string, loanId?: string): Promise<any[]> {
    const conditions = [eq(payments.userId, userId)];
    if (loanId) {
      conditions.push(eq(payments.loanId, loanId));
    }
    return db
      .select({
        id: payments.id,
        loanId: payments.loanId,
        userId: payments.userId,
        paymentDate: payments.paymentDate,
        amount: payments.amount,
        paymentType: payments.paymentType,
        paymentMethod: payments.paymentMethod,
        interestClearedTillDate: payments.interestClearedTillDate,
        transactionReference: payments.transactionReference,
        receiptUrl: payments.receiptUrl,
        notes: payments.notes,
        verified: payments.verified,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        borrowerName: borrowers.name,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .where(and(...conditions))
      .orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: string, userId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, userId)));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: string, userId: string, payment: Partial<InsertPayment>): Promise<Payment> {
    const [updated] = await db
      .update(payments)
      .set({ ...payment, updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.userId, userId)))
      .returning();
    return updated;
  }

  async deletePayment(id: string, userId: string): Promise<void> {
    await db.delete(payments).where(and(eq(payments.id, id), eq(payments.userId, userId)));
  }

  // Reminder operations
  async getReminders(userId: string, borrowerId?: string): Promise<Reminder[]> {
    const conditions = [eq(reminders.userId, userId)];
    if (borrowerId) {
      conditions.push(eq(reminders.borrowerId, borrowerId));
    }
    return db
      .select()
      .from(reminders)
      .where(and(...conditions))
      .orderBy(desc(reminders.scheduledFor));
  }

  async getReminder(id: string, userId: string): Promise<Reminder | undefined> {
    const [reminder] = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
    return reminder;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [newReminder] = await db.insert(reminders).values({
      ...reminder,
      metadata: reminder.metadata as any, // Cast to handle Drizzle JSON type
    }).returning();
    return newReminder;
  }

  async updateReminder(id: string, userId: string, reminder: Partial<InsertReminder>): Promise<Reminder> {
    const updateData: any = { ...reminder, updatedAt: new Date() };
    if (reminder.metadata) {
      updateData.metadata = reminder.metadata as any; // Cast to handle Drizzle JSON type
    }
    const [updated] = await db
      .update(reminders)
      .set(updateData)
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteReminder(id: string, userId: string): Promise<void> {
    await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  }

  // Email log operations
  async getEmailLogs(userId: string, borrowerId?: string): Promise<EmailLog[]> {
    const conditions = [eq(emailLogs.userId, userId)];
    if (borrowerId) {
      conditions.push(eq(emailLogs.borrowerId, borrowerId));
    }
    return db
      .select()
      .from(emailLogs)
      .where(and(...conditions))
      .orderBy(desc(emailLogs.sentAt));
  }

  async createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog> {
    const [newLog] = await db.insert(emailLogs).values(emailLog).returning();
    return newLog;
  }

  // Email template operations
  async getEmailTemplates(userId: string, type?: string): Promise<EmailTemplate[]> {
    const conditions = [eq(emailTemplates.userId, userId)];
    if (type) {
      conditions.push(eq(emailTemplates.type, type));
    }
    return db
      .select()
      .from(emailTemplates)
      .where(and(...conditions))
      .orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: string, userId: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(
    id: string,
    userId: string,
    template: Partial<InsertEmailTemplate>
  ): Promise<EmailTemplate> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: string, userId: string): Promise<void> {
    await db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Analytics operations with optimized single query
  async getDashboardStats(userId: string): Promise<{
    totalLent: string;
    totalOutstanding: string;
    totalPendingInterest: string;
    activeBorrowers: number;
  }> {
    // Get total lent from loans table separately to avoid JOIN duplication
    const loanStats = await db
      .select({
        totalLent: sql<number>`COALESCE(SUM(CAST(${loans.principalAmount} AS NUMERIC)), 0)`,
      })
      .from(loans)
      .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .where(eq(borrowers.userId, userId));

    // Get payment stats
    const paymentStats = await db
      .select({
        principalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .where(eq(borrowers.userId, userId));

    // Get active borrowers count
    const borrowerStats = await db
      .select({
        activeBorrowers: sql<number>`COUNT(DISTINCT ${borrowers.id})`,
      })
      .from(borrowers)
      .where(and(eq(borrowers.userId, userId), eq(borrowers.status, 'active')));
    
    // Get real-time interest data
    const realTimeInterest = await calculateRealTimeInterestForUser(userId);
    const totalInterestGenerated = realTimeInterest.reduce((sum, entry) => sum + entry.totalInterest, 0);

    const totalLent = loanStats[0]?.totalLent || 0;
    const principalPaid = paymentStats[0]?.principalPaid || 0;
    const interestPaid = paymentStats[0]?.interestPaid || 0;
    const activeBorrowers = borrowerStats[0]?.activeBorrowers || 0;
    
    const outstandingPrincipal = totalLent - principalPaid;
    const interestPending = totalInterestGenerated - interestPaid;
    
    return {
      totalLent: `₹${totalLent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      totalOutstanding: `₹${outstandingPrincipal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      totalPendingInterest: `₹${interestPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      activeBorrowers,
    };
  }

  async getLoanSummaryReport(userId: string) {
    const result = await db
      .select({
        loanId: loans.id,
        borrowerName: borrowers.name,
        principalAmount: loans.principalAmount,
        interestRate: loans.interestRate,
        startDate: loans.startDate,
        status: loans.status,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed', 'interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        paymentCount: sql<number>`COUNT(${payments.id})`,
        latestInterestClearedDate: sql<string>`MAX(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') AND ${payments.interestClearedTillDate} IS NOT NULL THEN ${payments.interestClearedTillDate} END)`,
      })
      .from(loans)
      .leftJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .leftJoin(payments, eq(loans.id, payments.loanId))
      .where(eq(loans.userId, userId))
      .groupBy(loans.id, borrowers.name, loans.principalAmount, loans.interestRate, loans.startDate, loans.status)
      .orderBy(desc(loans.startDate));
    
    const realTimeInterest = await calculateRealTimeInterestForUser(userId);
    
    return result.map(row => {
      const loanInterest = realTimeInterest.find((i: any) => i.loanId === row.loanId);
      const totalInterest = loanInterest?.totalInterest || 0;
      const balance = parseFloat(row.principalAmount.toString()) + totalInterest - row.totalPaid;
      const pendingInterest = totalInterest - row.interestPaid;
      const dailyInterest = row.status === 'active' 
        ? parseFloat(row.principalAmount.toString()) * (parseFloat(row.interestRate.toString()) / 100) / 30
        : 0;
      
      return {
        loanId: row.loanId,
        borrowerName: row.borrowerName || 'Unknown',
        principalAmount: parseFloat(parseFloat(row.principalAmount.toString()).toFixed(2)),
        interestRate: parseFloat(parseFloat(row.interestRate.toString()).toFixed(2)),
        startDate: row.startDate,
        status: row.status || 'active',
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPaid: parseFloat((row.totalPaid || 0).toString()),
        balance: parseFloat(balance.toFixed(2)),
        pendingInterest: parseFloat(pendingInterest.toFixed(2)),
        dailyInterest: parseFloat(dailyInterest.toFixed(2)),
        interestClearedTillDate: row.latestInterestClearedDate,
        paymentCount: row.paymentCount,
      };
    });
  }

  async getBorrowerSummaryReport(userId: string) {
    const result = await db
      .select({
        borrowerId: borrowers.id,
        borrowerName: borrowers.name,
        email: borrowers.email,
        phone: borrowers.phone,
        loanCount: sql<number>`COUNT(DISTINCT ${loans.id})`,
        activeLoans: sql<number>`COUNT(DISTINCT CASE WHEN ${loans.status} = 'active' THEN ${loans.id} END)`,
        totalPrincipal: sql<number>`COALESCE(SUM(CAST(${loans.principalAmount} AS NUMERIC)), 0)`,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed', 'interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        latestInterestClearedDate: sql<string>`MAX(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') AND ${payments.interestClearedTillDate} IS NOT NULL THEN ${payments.interestClearedTillDate} END)`,
      })
      .from(borrowers)
      .leftJoin(loans, eq(borrowers.id, loans.borrowerId))
      .leftJoin(payments, eq(loans.id, payments.loanId))
      .where(eq(borrowers.userId, userId))
      .groupBy(borrowers.id, borrowers.name, borrowers.email, borrowers.phone)
      .orderBy(borrowers.name);
    
    const realTimeInterest = await calculateRealTimeInterestForUser(userId);
    
    return result.map(row => {
      const borrowerInterest = realTimeInterest.filter((i: any) => 
        result.some(r => r.borrowerId === row.borrowerId)
      );
      const totalInterest = borrowerInterest.reduce((sum: number, entry: any) => sum + entry.totalInterest, 0);
      const balance = row.totalPrincipal + totalInterest - row.totalPaid;
      const pendingInterest = totalInterest - row.interestPaid;
      
      // Calculate daily interest for active loans
      const dailyInterest = row.activeLoans > 0 
        ? row.totalPrincipal * 0.02 / 30 // Simplified calculation
        : 0;
      
      return {
        borrowerId: row.borrowerId,
        borrowerName: row.borrowerName,
        email: row.email,
        phone: row.phone,
        loanCount: row.loanCount,
        totalPrincipal: parseFloat((row.totalPrincipal || 0).toString()),
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPaid: parseFloat((row.totalPaid || 0).toString()),
        balance: parseFloat(balance.toFixed(2)),
        pendingInterest: parseFloat(pendingInterest.toFixed(2)),
        dailyInterest: parseFloat(dailyInterest.toFixed(2)),
        interestClearedTillDate: row.latestInterestClearedDate,
        activeLoans: row.activeLoans,
      };
    });
  }

  async calculatePendingInterest(userId: string, borrowerId: string, tillDate: Date) {
    const borrowerLoans = await db
      .select()
      .from(loans)
      .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .where(and(eq(borrowers.userId, userId), eq(loans.borrowerId, borrowerId)));
    
    const borrowerPayments = await db
      .select()
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .where(and(
        eq(loans.borrowerId, borrowerId),
        lte(payments.paymentDate, tillDate)
      ));
    
    let totalPendingInterest = 0;
    const loanDetails = [];
    
    for (const loanRow of borrowerLoans) {
      const loan = loanRow.loans;
      const loanPayments = borrowerPayments.filter(p => p.payments.loanId === loan.id);
      
      // Calculate interest from loan start to tillDate
      const startDate = new Date(loan.startDate);
      const endDate = tillDate > startDate ? tillDate : startDate;
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
      const daysDiff = endDate.getDate() - startDate.getDate();
      const totalMonths = monthsDiff + (daysDiff > 0 ? daysDiff / 30 : 0);
      
      const principal = parseFloat(loan.principalAmount.toString());
      const monthlyRate = parseFloat(loan.interestRate.toString()) / 100;
      const totalInterestTillDate = principal * monthlyRate * totalMonths;
      
      // Calculate interest payments till date
      const interestPaidTillDate = loanPayments
        .filter(p => p.payments.paymentType === 'interest' || p.payments.paymentType === 'partial_interest')
        .reduce((sum, p) => sum + parseFloat(p.payments.amount.toString()), 0);
      
      const pendingInterest = Math.max(0, totalInterestTillDate - interestPaidTillDate);
      totalPendingInterest += pendingInterest;
      
      loanDetails.push({
        loanId: loan.id,
        principalAmount: principal,
        interestRate: parseFloat(loan.interestRate.toString()),
        startDate: loan.startDate,
        totalInterestTillDate: parseFloat(totalInterestTillDate.toFixed(2)),
        interestPaidTillDate: parseFloat(interestPaidTillDate.toFixed(2)),
        pendingInterest: parseFloat(pendingInterest.toFixed(2)),
      });
    }
    
    return {
      borrowerId,
      tillDate: tillDate.toISOString(),
      totalPendingInterest: parseFloat(totalPendingInterest.toFixed(2)),
      loanDetails,
    };
  }
}

export const storage = new DatabaseStorage();
