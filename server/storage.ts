import {
  users,
  borrowers,
  loans,
  payments,
  reminders,
  emailLogs,
  emailTemplates,
  auditLogs,
  fundHolders,
  cashTransactions,
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
  type FundHolder,
  type InsertFundHolder,
  type CashTransaction,
  type InsertCashTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne, desc, gte, lte, sql, isNotNull } from "drizzle-orm";
import { calculateRealTimeInterestForUser, calculateInterestFromPayments } from "./interestCalculationService";

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
  getLatestInterestClearedTillDate(loanId: string, excludePaymentId?: string): Promise<Date | null>;

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
    totalLent: number;
    totalOutstanding: number;
    totalPendingInterest: number;
    activeBorrowers: number;
    cashOnHand?: number;
  }>;

  // Loan close/settle
  closeLoan(loanId: string, userId: string, settlementAmount?: string, settlementNotes?: string): Promise<Loan>;

  // Fund holder operations
  getFundHolders(userId: string): Promise<FundHolder[]>;
  createFundHolder(fundHolder: InsertFundHolder): Promise<FundHolder>;
  updateFundHolder(id: string, userId: string, data: Partial<InsertFundHolder>): Promise<FundHolder>;
  deleteFundHolder(id: string, userId: string): Promise<void>;

  // Cash transaction operations
  getCashTransactions(userId: string, fundHolderId?: string): Promise<any[]>;
  getCashTransaction(id: string, userId: string): Promise<CashTransaction | undefined>;
  getCashTransactionByPaymentId(paymentId: string, userId: string): Promise<CashTransaction | undefined>;
  createCashTransaction(transaction: InsertCashTransaction): Promise<CashTransaction>;
  updateCashTransaction(id: string, userId: string, updates: { amount?: string; fundHolderId?: string; notes?: string; transactionDate?: Date }): Promise<CashTransaction>;
  deleteCashTransaction(id: string, userId: string): Promise<void>;
  createTransfer(userId: string, fromFundHolderId: string, toFundHolderId: string, amount: string, notes: string | null, date: Date): Promise<{ transferOut: CashTransaction; transferIn: CashTransaction }>;
  deleteTransferGroup(transferGroupId: string, userId: string): Promise<void>;
  getCashBalances(userId: string): Promise<{ fundHolderId: string; name: string; balance: number }[]>;
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

  /**
   * Loan detail bundle for the loan detail page — single round trip:
   * loan + borrower + payments + computed interest (handles closed loans).
   */
  async getLoanDetails(id: string, userId: string) {
    const [loan] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, userId)));
    if (!loan) return null;

    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, loan.borrowerId), eq(borrowers.userId, userId)));

    const loanPayments = await this.getPayments(userId, loan.id);

    const principalPayments = loanPayments
      .filter((p: any) => p.paymentType === 'principal')
      .map((p: any) => ({ paymentDate: p.paymentDate, amount: p.amount }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const accrualEnd = loan.status !== 'active' && loan.closedAt
      ? new Date(loan.closedAt)
      : today;

    const totalInterest = calculateInterestFromPayments(
      principalPayments,
      parseFloat(loan.principalAmount),
      parseFloat(loan.interestRate),
      loan.interestRateType as 'monthly' | 'annual',
      new Date(loan.startDate),
      accrualEnd,
    );

    const principalPaid = loanPayments
      .filter((p: any) => p.paymentType === 'principal' || p.paymentType === 'mixed')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
    const interestPaid = loanPayments
      .filter((p: any) => p.paymentType === 'interest' || p.paymentType === 'partial_interest')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

    const latestInterestClearedDate = loanPayments
      .filter((p: any) => p.interestClearedTillDate && (p.paymentType === 'interest' || p.paymentType === 'partial_interest'))
      .map((p: any) => new Date(p.interestClearedTillDate))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0] || null;

    return {
      loan,
      borrower: borrower || null,
      payments: loanPayments,
      totals: {
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        principalPaid: parseFloat(principalPaid.toFixed(2)),
        interestPaid: parseFloat(interestPaid.toFixed(2)),
        outstandingPrincipal: parseFloat(Math.max(0, parseFloat(loan.principalAmount) - principalPaid).toFixed(2)),
        pendingInterest: parseFloat(Math.max(0, totalInterest - interestPaid).toFixed(2)),
        latestInterestClearedDate,
        accrualEndDate: accrualEnd,
      },
    };
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
        collectedByFundHolderId: cashTransactions.fundHolderId,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .innerJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .leftJoin(cashTransactions, eq(cashTransactions.paymentId, payments.id))
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

  async getLatestInterestClearedTillDate(loanId: string, excludePaymentId?: string): Promise<Date | null> {
    const conditions = [
      eq(payments.loanId, loanId),
      isNotNull(payments.interestClearedTillDate),
    ];
    if (excludePaymentId) {
      conditions.push(ne(payments.id, excludePaymentId));
    }
    const [result] = await db
      .select({ maxDate: sql<string>`MAX(${payments.interestClearedTillDate})` })
      .from(payments)
      .where(and(...conditions));
    return result?.maxDate ? new Date(result.maxDate) : null;
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

  // Analytics operations - optimized to 2 queries + interest calculation
  async getDashboardStats(userId: string): Promise<{
    totalLent: number;
    totalOutstanding: number;
    totalPendingInterest: number;
    activeBorrowers: number;
    cashOnHand?: number;
  }> {
    // Separate queries to avoid JOIN inflation (LEFT JOIN payments duplicates loan rows)
    const [loanStats, paymentStats, realTimeInterest] = await Promise.all([
      db.select({
        totalLent: sql<number>`COALESCE(SUM(CAST(${loans.principalAmount} AS NUMERIC)), 0)`,
        activeBorrowers: sql<number>`(SELECT COUNT(DISTINCT ${borrowers.id}) FROM ${borrowers} WHERE ${borrowers.userId} = ${userId} AND ${borrowers.status} = 'active')`,
      })
      .from(loans)
      .where(eq(loans.userId, userId)),
      db.select({
        principalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        // Only count interest payments on active loans — totalInterestGenerated below
        // also excludes settled loans, so including their paid interest would understate pending.
        interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') AND ${loans.status} = 'active' THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .where(eq(payments.userId, userId)),
      calculateRealTimeInterestForUser(userId),
    ]);
    const combinedStats = [{
      totalLent: Number(loanStats[0]?.totalLent) || 0,
      activeBorrowers: Number(loanStats[0]?.activeBorrowers) || 0,
      principalPaid: Number(paymentStats[0]?.principalPaid) || 0,
      interestPaid: Number(paymentStats[0]?.interestPaid) || 0,
    }];

    const totalInterestGenerated = realTimeInterest.reduce((sum, entry) => sum + entry.totalInterest, 0);

    const totalLent = combinedStats[0]?.totalLent || 0;
    const principalPaid = combinedStats[0]?.principalPaid || 0;
    const interestPaid = combinedStats[0]?.interestPaid || 0;
    const activeBorrowers = combinedStats[0]?.activeBorrowers || 0;

    const outstandingPrincipal = totalLent - principalPaid;
    const interestPending = totalInterestGenerated - interestPaid;

    // Check if cash tracking is enabled for this user
    const user = await this.getUser(userId);
    let cashOnHand: number | undefined;
    if (user?.cashTrackingEnabled) {
      const balances = await this.getCashBalances(userId);
      cashOnHand = balances.reduce((sum, b) => sum + b.balance, 0);
    }

    return {
      totalLent,
      totalOutstanding: outstandingPrincipal,
      totalPendingInterest: interestPending,
      activeBorrowers,
      cashOnHand,
    };
  }

  async getLoanSummaryReport(userId: string) {
    const result = await db
      .select({
        loanId: loans.id,
        borrowerId: loans.borrowerId,
        borrowerName: borrowers.name,
        principalAmount: loans.principalAmount,
        interestRate: loans.interestRate,
        startDate: loans.startDate,
        status: loans.status,
        totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed', 'interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        principalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
        paymentCount: sql<number>`COUNT(${payments.id})`,
        latestInterestClearedDate: sql<string>`MAX(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') AND ${payments.interestClearedTillDate} IS NOT NULL THEN ${payments.interestClearedTillDate} END)`,
      })
      .from(loans)
      .leftJoin(borrowers, eq(loans.borrowerId, borrowers.id))
      .leftJoin(payments, eq(loans.id, payments.loanId))
      .where(eq(loans.userId, userId))
      .groupBy(loans.id, loans.borrowerId, borrowers.name, loans.principalAmount, loans.interestRate, loans.startDate, loans.status)
      .orderBy(desc(loans.startDate));
    
    const realTimeInterest = await calculateRealTimeInterestForUser(userId, { includeAllLoans: true });

    return result.map(row => {
      const loanInterest = realTimeInterest.find((i: any) => i.loanId === row.loanId);
      const totalInterest = loanInterest?.totalInterest || 0;
      const principalAmount = parseFloat(row.principalAmount.toString());
      const principalPaid = Number(row.principalPaid) || 0;
      const interestPaid = Number(row.interestPaid) || 0;
      const outstandingPrincipal = Math.max(0, principalAmount - principalPaid);
      // Floor at 0 — if a closed loan had over-collection on interest, don't display negative
      const pendingInterest = Math.max(0, totalInterest - interestPaid);

      return {
        loanId: row.loanId,
        borrowerId: (row as any).borrowerId,
        borrowerName: row.borrowerName || 'Unknown',
        principalAmount: parseFloat(principalAmount.toFixed(2)),
        principalPaid: parseFloat(principalPaid.toFixed(2)),
        interestPaid: parseFloat(interestPaid.toFixed(2)),
        outstandingPrincipal: parseFloat(outstandingPrincipal.toFixed(2)),
        interestRate: parseFloat(parseFloat(row.interestRate.toString()).toFixed(2)),
        startDate: row.startDate,
        status: row.status || 'active',
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPaid: parseFloat((Number(row.totalPaid) || 0).toFixed(2)),
        pendingInterest: parseFloat(pendingInterest.toFixed(2)),
        interestClearedTillDate: row.latestInterestClearedDate,
        paymentCount: row.paymentCount,
      };
    });
  }

  async getBorrowerSummaryReport(userId: string) {
    // Loan-level and payment-level aggregates must be computed in SEPARATE queries.
    // Joining borrowers ⨝ loans ⨝ payments and then SUMming loans.principal_amount
    // multiplies each loan's principal by its payment count, producing inflated totals
    // (e.g. one ₹50,000 loan with 100 payments would surface as ₹50,00,000).

    const [borrowerRows, loanAggRows, paymentAggRows, realTimeInterest] = await Promise.all([
      db
        .select({
          borrowerId: borrowers.id,
          borrowerName: borrowers.name,
          email: borrowers.email,
          phone: borrowers.phone,
        })
        .from(borrowers)
        .where(eq(borrowers.userId, userId))
        .orderBy(borrowers.name),

      db
        .select({
          borrowerId: loans.borrowerId,
          loanCount: sql<number>`COUNT(${loans.id})`,
          activeLoans: sql<number>`COUNT(CASE WHEN ${loans.status} = 'active' THEN 1 END)`,
          totalPrincipal: sql<number>`COALESCE(SUM(CAST(${loans.principalAmount} AS NUMERIC)), 0)`,
        })
        .from(loans)
        .where(eq(loans.userId, userId))
        .groupBy(loans.borrowerId),

      db
        .select({
          borrowerId: loans.borrowerId,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed', 'interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
          principalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('principal', 'mixed') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
          interestPaid: sql<number>`COALESCE(SUM(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') THEN CAST(${payments.amount} AS NUMERIC) ELSE 0 END), 0)`,
          latestInterestClearedDate: sql<string>`MAX(CASE WHEN ${payments.paymentType} IN ('interest', 'partial_interest') AND ${payments.interestClearedTillDate} IS NOT NULL THEN ${payments.interestClearedTillDate} END)`,
        })
        .from(payments)
        .innerJoin(loans, eq(payments.loanId, loans.id))
        .where(eq(payments.userId, userId))
        .groupBy(loans.borrowerId),

      calculateRealTimeInterestForUser(userId, { includeAllLoans: true }),
    ]);

    const loanAggByBorrower = new Map(loanAggRows.map(r => [r.borrowerId, r]));
    const paymentAggByBorrower = new Map(paymentAggRows.map(r => [r.borrowerId, r]));

    return borrowerRows.map(row => {
      const loanAgg = loanAggByBorrower.get(row.borrowerId);
      const paymentAgg = paymentAggByBorrower.get(row.borrowerId);

      const borrowerInterest = realTimeInterest.filter((i: any) => i.borrowerId === row.borrowerId);
      const totalInterest = borrowerInterest.reduce((sum: number, entry: any) => sum + entry.totalInterest, 0);

      const totalPrincipal = Number(loanAgg?.totalPrincipal) || 0;
      const principalPaid = Number(paymentAgg?.principalPaid) || 0;
      const interestPaid = Number(paymentAgg?.interestPaid) || 0;
      const outstandingPrincipal = Math.max(0, totalPrincipal - principalPaid);
      const pendingInterest = Math.max(0, totalInterest - interestPaid);

      return {
        borrowerId: row.borrowerId,
        borrowerName: row.borrowerName,
        email: row.email,
        phone: row.phone,
        loanCount: Number(loanAgg?.loanCount) || 0,
        activeLoans: Number(loanAgg?.activeLoans) || 0,
        totalPrincipal: parseFloat(totalPrincipal.toFixed(2)),
        principalPaid: parseFloat(principalPaid.toFixed(2)),
        interestPaid: parseFloat(interestPaid.toFixed(2)),
        outstandingPrincipal: parseFloat(outstandingPrincipal.toFixed(2)),
        totalInterest: parseFloat(totalInterest.toFixed(2)),
        totalPaid: parseFloat((Number(paymentAgg?.totalPaid) || 0).toFixed(2)),
        pendingInterest: parseFloat(pendingInterest.toFixed(2)),
        interestClearedTillDate: paymentAgg?.latestInterestClearedDate ?? null,
      };
    });
  }

  async generateBorrowerReport(userId: string, borrowerId: string, tillDate: Date) {
    const borrower = await this.getBorrower(borrowerId, userId);
    if (!borrower) throw new Error("Borrower not found");
    
    const borrowerLoans = await db
      .select()
      .from(loans)
      .where(and(eq(loans.borrowerId, borrowerId), eq(loans.userId, userId)));
    
    const borrowerPayments = await db
      .select()
      .from(payments)
      .innerJoin(loans, eq(payments.loanId, loans.id))
      .where(and(
        eq(loans.borrowerId, borrowerId),
        lte(payments.paymentDate, tillDate)
      ));
    
    let totalInterestGenerated = 0;
    let totalInterestPaid = 0;
    const loanDetails = [];
    const monthlyBreakdown = [];
    
    for (const loan of borrowerLoans) {
      const loanPayments = borrowerPayments.filter(p => p.payments.loanId === loan.id);
      const startDate = new Date(loan.startDate);
      const principal = parseFloat(loan.principalAmount.toString());
      const interestRate = parseFloat(loan.interestRate.toString());
      
      // Calculate interest with principal payments - use same logic as borrower report
      let loanInterestGenerated = 0;
      let currentPrincipal = principal;
      let currentDate = new Date(startDate);
      
      // Get principal payments for this loan
      const principalPayments = loanPayments
        .filter(p => p.payments.paymentType === 'principal')
        .map(p => ({
          date: new Date(p.payments.paymentDate),
          amount: parseFloat(p.payments.amount.toString())
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Calculate month by month
      while (currentDate < tillDate) {
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const monthEndDate = monthEnd < tillDate ? monthEnd : tillDate;
        
        // Get payments in this month
        const monthPayments = principalPayments.filter(p => 
          p.date >= currentDate && p.date <= monthEndDate
        );
        
        let monthInterest = 0;
        const isFirstMonth = currentDate.getTime() === new Date(startDate).getTime();
        const isPartialEnd = monthEndDate.getTime() < monthEnd.getTime();

        const rateFactor = loan.interestRateType === 'monthly'
          ? interestRate / 100
          : interestRate / 100 / 12;

        // Segment-by-segment accrual: count days SINCE the previous event (month start
        // or prior payment), not the absolute day-of-month, so the segments sum to the
        // actual elapsed days. See calculateInterestFromPayments for the canonical version.
        let prevDay = isFirstMonth ? new Date(startDate).getDate() - 1 : 0;
        const endDay = isPartialEnd ? monthEndDate.getDate() : 30;

        for (const payment of monthPayments) {
          const days = payment.date.getDate() - prevDay;
          if (days > 0) monthInterest += currentPrincipal * rateFactor * (days / 30);
          currentPrincipal = Math.max(0, currentPrincipal - payment.amount);
          prevDay = payment.date.getDate();
        }

        const daysAfter = endDay - prevDay;
        if (daysAfter > 0) monthInterest += currentPrincipal * rateFactor * (daysAfter / 30);

        loanInterestGenerated += monthInterest;
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
      }
      
      const loanInterestPaid = loanPayments
        .filter(p => p.payments.paymentType === 'interest' || p.payments.paymentType === 'partial_interest')
        .reduce((sum, p) => sum + parseFloat(p.payments.amount.toString()), 0);
      
      totalInterestGenerated += loanInterestGenerated;
      totalInterestPaid += loanInterestPaid;
      
      loanDetails.push({
        loanId: loan.id,
        startDate: formatDate(loan.startDate),
        principalAmount: principal,
        interestRate: interestRate,
        interestRateType: loan.interestRateType,
        monthlyInterest: loan.interestRateType === 'monthly' 
          ? principal * (interestRate / 100)
          : principal * (interestRate / 100 / 12)
      });
      
      // Generate month-by-month breakdown with proper period splits
      let monthStart = new Date(startDate);
      let cumulativeInterest = 0;
      let cumulativePaid = 0;
      let runningPrincipal = principal;
      
      while (monthStart < tillDate) {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const monthEndDate = monthEnd < tillDate ? monthEnd : tillDate;
        
        // Get principal payments in this month
        const monthPrincipalPayments = principalPayments
          .filter(p => p.date >= monthStart && p.date <= monthEndDate)
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        let monthlyInterest = 0;
        let calculationNote = '';
        let daysInMonth = 30; // Always show 30 for display
        
        if (monthPrincipalPayments.length === 0) {
          // No payments this month
          if (monthStart.getTime() === new Date(startDate).getTime()) {
            // First month - calculate from start date
            const startDay = new Date(startDate).getDate();
            const daysFromStart = 30 - startDay + 1;
            daysInMonth = daysFromStart;
            monthlyInterest = loan.interestRateType === 'monthly'
              ? runningPrincipal * (interestRate / 100) * (daysFromStart / 30)
              : runningPrincipal * (interestRate / 100 / 12) * (daysFromStart / 30);
          } else if (monthEndDate < tillDate) {
            // Complete month
            monthlyInterest = loan.interestRateType === 'monthly'
              ? runningPrincipal * (interestRate / 100)
              : runningPrincipal * (interestRate / 100 / 12);
          } else {
            // Last partial month
            const endDay = tillDate.getDate();
            daysInMonth = endDay;
            monthlyInterest = loan.interestRateType === 'monthly'
              ? runningPrincipal * (interestRate / 100) * (endDay / 30)
              : runningPrincipal * (interestRate / 100 / 12) * (endDay / 30);
          }
        } else {
          // Has payments - split calculation
          const isFirstMonth = monthStart.getTime() === new Date(startDate).getTime();
          const isPartialEnd = monthEndDate.getTime() < monthEnd.getTime();
          const startDay = new Date(startDate).getDate();
          // Effective last day of this month's accrual window (caps the final partial month)
          const monthEndDay = isPartialEnd ? monthEndDate.getDate() : 30;

          // Reflect the actual span of days in the displayed "Days" column
          if (isFirstMonth && isPartialEnd) {
            daysInMonth = monthEndDay - startDay + 1;
          } else if (isFirstMonth) {
            daysInMonth = 30 - startDay + 1;
          } else if (isPartialEnd) {
            daysInMonth = monthEndDay;
          }

          let currentPeriodPrincipal = runningPrincipal;
          let breakdownParts = [];
          // Day boundary already accounted for: loan start day in the first month, else
          // the 1st. Each segment counts days SINCE the previous event, not the absolute
          // day-of-month, so segments sum to the real elapsed days.
          let prevDay = isFirstMonth ? startDay - 1 : 0;

          for (const payment of monthPrincipalPayments) {
            // Days since the previous event (month start or prior payment)
            const daysBefore = payment.date.getDate() - prevDay;
            if (daysBefore > 0) {
              const periodInterest = loan.interestRateType === 'monthly'
                ? currentPeriodPrincipal * (interestRate / 100) * (daysBefore / 30)
                : currentPeriodPrincipal * (interestRate / 100 / 12) * (daysBefore / 30);
              monthlyInterest += periodInterest;
              breakdownParts.push(`${daysBefore}d@₹${currentPeriodPrincipal.toLocaleString()}`);
            }

            // Reduce principal
            currentPeriodPrincipal = Math.max(0, currentPeriodPrincipal - payment.amount);
            prevDay = payment.date.getDate();
          }

          // Days after last payment (from last payment to end of month/till-date)
          const daysAfter = monthEndDay - prevDay;
          if (daysAfter > 0) {
            const periodInterest = loan.interestRateType === 'monthly'
              ? currentPeriodPrincipal * (interestRate / 100) * (daysAfter / 30)
              : currentPeriodPrincipal * (interestRate / 100 / 12) * (daysAfter / 30);
            monthlyInterest += periodInterest;
            breakdownParts.push(`${daysAfter}d@₹${currentPeriodPrincipal.toLocaleString()}`);
          }
          
          calculationNote = breakdownParts.join('+');
          runningPrincipal = currentPeriodPrincipal;
        }
        
        cumulativeInterest += monthlyInterest;
        
        // Get interest payments for this month
        const monthPayments = loanPayments.filter(p => {
          const paymentDate = new Date(p.payments.paymentDate);
          return paymentDate >= monthStart && paymentDate <= monthEndDate &&
                 (p.payments.paymentType === 'interest' || p.payments.paymentType === 'partial_interest');
        });
        
        const monthInterestPaid = monthPayments.reduce((sum, p) => sum + parseFloat(p.payments.amount.toString()), 0);
        const monthPrincipalPaid = monthPrincipalPayments.reduce((sum, p) => sum + p.amount, 0);
        cumulativePaid += monthInterestPaid;
        
        monthlyBreakdown.push({
          loanId: loan.id,
          month: `${monthStart.toLocaleDateString('en-IN', { month: 'short' })} ${monthStart.getFullYear()}`,
          daysInMonth: daysInMonth,
          principalBalance: parseFloat((runningPrincipal + monthPrincipalPaid).toFixed(2)),
          monthlyInterest: parseFloat(monthlyInterest.toFixed(2)),
          cumulativeInterest: parseFloat(cumulativeInterest.toFixed(2)),
          monthInterestPaid: parseFloat(monthInterestPaid.toFixed(2)),
          monthPrincipalPaid: parseFloat(monthPrincipalPaid.toFixed(2)),
          cumulativePaid: parseFloat(cumulativePaid.toFixed(2)),
          pendingInterest: parseFloat((cumulativeInterest - cumulativePaid).toFixed(2)),
          calculationNote
        });
        
        // Move to next month
        monthStart.setMonth(monthStart.getMonth() + 1);
        monthStart.setDate(1);
      }
    }
    
    function formatDate(date: Date | string) {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
      const year = dateObj.getFullYear();
      const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                     day === 2 || day === 22 ? 'nd' :
                     day === 3 || day === 23 ? 'rd' : 'th';
      return `${day}${suffix} ${month}, ${year}`;
    }
    
    // Build payment history per loan
    const paymentHistory = borrowerPayments
      .map(p => ({
        loanId: p.payments.loanId,
        paymentDate: p.payments.paymentDate,
        amount: parseFloat(p.payments.amount.toString()),
        paymentType: p.payments.paymentType,
        paymentMethod: p.payments.paymentMethod,
        interestClearedTillDate: p.payments.interestClearedTillDate,
        transactionReference: p.payments.transactionReference,
        notes: p.payments.notes,
      }))
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    return {
      borrowerName: borrower.name,
      tillDate: tillDate.toISOString(),
      totalLoans: borrowerLoans.length,
      totalInterestGenerated: parseFloat(totalInterestGenerated.toFixed(2)),
      totalInterestPaid: parseFloat(totalInterestPaid.toFixed(2)),
      totalPendingInterest: parseFloat((totalInterestGenerated - totalInterestPaid).toFixed(2)),
      loanDetails,
      monthlyBreakdown,
      paymentHistory,
    };
  }

  async calculatePendingInterestForAllBorrowers(userId: string, tillDate: Date) {
    const allBorrowers = await db
      .select()
      .from(borrowers)
      .where(eq(borrowers.userId, userId));
    
    let totalPendingInterest = 0;
    const borrowerDetails = [];
    
    for (const borrower of allBorrowers) {
      const result = await this.calculatePendingInterest(userId, borrower.id, tillDate);
      totalPendingInterest += result.totalPendingInterest;
      
      if (result.totalPendingInterest > 0) {
        borrowerDetails.push({
          borrowerId: borrower.id,
          borrowerName: borrower.name,
          totalPendingInterest: result.totalPendingInterest,
          loanDetails: result.loanDetails,
        });
      }
    }
    
    return {
      tillDate: tillDate.toISOString(),
      totalPendingInterest: parseFloat(totalPendingInterest.toFixed(2)),
      borrowerDetails,
    };
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
      
      const startDate = new Date(loan.startDate);
      const endDate = tillDate > startDate ? tillDate : startDate;
      const principal = parseFloat(loan.principalAmount.toString());
      const interestRate = parseFloat(loan.interestRate.toString());
      
      // Calculate interest considering principal payments
      let totalInterestTillDate = 0;
      let currentPrincipal = principal;
      let currentDate = new Date(startDate);
      
      // Get principal payments for this loan
      const principalPayments = loanPayments
        .filter(p => p.payments.paymentType === 'principal')
        .map(p => ({
          date: new Date(p.payments.paymentDate),
          amount: parseFloat(p.payments.amount.toString())
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Add end date as final event
      const paymentEvents = [...principalPayments, { date: endDate, amount: 0 }];
      
      // Calculate interest considering principal payments - use same logic as monthly breakdown
      totalInterestTillDate = 0;
      currentPrincipal = principal;
      currentDate = new Date(startDate);
      
      // Calculate month by month
      while (currentDate < endDate) {
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const monthEndDate = monthEnd < endDate ? monthEnd : endDate;
        
        // Get payments in this month
        const monthPayments = principalPayments.filter(p => 
          p.date >= currentDate && p.date <= monthEndDate
        );
        
        let monthInterest = 0;
        const isFirstMonth = currentDate.getTime() === new Date(startDate).getTime();
        const isPartialEnd = monthEndDate.getTime() < monthEnd.getTime();

        const rateFactor = loan.interestRateType === 'monthly'
          ? interestRate / 100
          : interestRate / 100 / 12;

        // Segment-by-segment accrual: count days SINCE the previous event (month start
        // or prior payment), not the absolute day-of-month, so the segments sum to the
        // actual elapsed days. See calculateInterestFromPayments for the canonical version.
        let prevDay = isFirstMonth ? new Date(startDate).getDate() - 1 : 0;
        const endDay = isPartialEnd ? monthEndDate.getDate() : 30;

        for (const payment of monthPayments) {
          const days = payment.date.getDate() - prevDay;
          if (days > 0) monthInterest += currentPrincipal * rateFactor * (days / 30);
          currentPrincipal = Math.max(0, currentPrincipal - payment.amount);
          prevDay = payment.date.getDate();
        }

        const daysAfter = endDay - prevDay;
        if (daysAfter > 0) monthInterest += currentPrincipal * rateFactor * (daysAfter / 30);

        totalInterestTillDate += monthInterest;
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
      }
      
      // Calculate interest payments till date
      const interestPaidTillDate = loanPayments
        .filter(p => p.payments.paymentType === 'interest' || p.payments.paymentType === 'partial_interest')
        .reduce((sum, p) => sum + parseFloat(p.payments.amount.toString()), 0);
      
      const pendingInterest = Math.max(0, totalInterestTillDate - interestPaidTillDate);
      totalPendingInterest += pendingInterest;
      
      loanDetails.push({
        loanId: loan.id,
        principalAmount: principal,
        interestRate: interestRate,
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
  // Loan close/settle
  async closeLoan(loanId: string, userId: string, settlementAmount?: string, settlementNotes?: string): Promise<Loan> {
    const [updated] = await db
      .update(loans)
      .set({
        status: "closed",
        settlementAmount: settlementAmount || null,
        settlementNotes: settlementNotes || null,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(loans.id, loanId), eq(loans.userId, userId)))
      .returning();
    return updated;
  }

  // Fund holder operations
  async getFundHolders(userId: string): Promise<FundHolder[]> {
    return db.select().from(fundHolders).where(eq(fundHolders.userId, userId)).orderBy(fundHolders.name);
  }

  async createFundHolder(fundHolder: InsertFundHolder): Promise<FundHolder> {
    const [newHolder] = await db.insert(fundHolders).values(fundHolder).returning();
    return newHolder;
  }

  async updateFundHolder(id: string, userId: string, data: Partial<InsertFundHolder>): Promise<FundHolder> {
    const [updated] = await db
      .update(fundHolders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(fundHolders.id, id), eq(fundHolders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteFundHolder(id: string, userId: string): Promise<void> {
    await db.delete(fundHolders).where(and(eq(fundHolders.id, id), eq(fundHolders.userId, userId)));
  }

  // Cash transaction operations
  async getCashTransactions(userId: string, fundHolderId?: string): Promise<any[]> {
    const conditions = [eq(cashTransactions.userId, userId)];
    if (fundHolderId) {
      conditions.push(eq(cashTransactions.fundHolderId, fundHolderId));
    }
    return db
      .select({
        id: cashTransactions.id,
        userId: cashTransactions.userId,
        fundHolderId: cashTransactions.fundHolderId,
        fundHolderName: fundHolders.name,
        type: cashTransactions.type,
        amount: cashTransactions.amount,
        loanId: cashTransactions.loanId,
        paymentId: cashTransactions.paymentId,
        transferGroupId: cashTransactions.transferGroupId,
        notes: cashTransactions.notes,
        transactionDate: cashTransactions.transactionDate,
        createdAt: cashTransactions.createdAt,
      })
      .from(cashTransactions)
      .innerJoin(fundHolders, eq(cashTransactions.fundHolderId, fundHolders.id))
      .where(and(...conditions))
      .orderBy(desc(cashTransactions.transactionDate));
  }

  async getCashTransaction(id: string, userId: string): Promise<CashTransaction | undefined> {
    const [tx] = await db
      .select()
      .from(cashTransactions)
      .where(and(eq(cashTransactions.id, id), eq(cashTransactions.userId, userId)));
    return tx;
  }

  async getCashTransactionByPaymentId(paymentId: string, userId: string): Promise<CashTransaction | undefined> {
    const [tx] = await db
      .select()
      .from(cashTransactions)
      .where(and(eq(cashTransactions.paymentId, paymentId), eq(cashTransactions.userId, userId)));
    return tx;
  }

  async createCashTransaction(transaction: InsertCashTransaction): Promise<CashTransaction> {
    const [newTransaction] = await db.insert(cashTransactions).values(transaction).returning();
    return newTransaction;
  }

  async updateCashTransaction(id: string, userId: string, updates: { amount?: string; fundHolderId?: string; notes?: string; transactionDate?: Date }): Promise<CashTransaction> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.fundHolderId !== undefined) updateData.fundHolderId = updates.fundHolderId;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.transactionDate !== undefined) updateData.transactionDate = updates.transactionDate;

    const [updated] = await db
      .update(cashTransactions)
      .set(updateData)
      .where(and(eq(cashTransactions.id, id), eq(cashTransactions.userId, userId)))
      .returning();
    if (!updated) throw new Error("Cash transaction not found");
    return updated;
  }

  async deleteCashTransaction(id: string, userId: string): Promise<void> {
    await db.delete(cashTransactions).where(and(eq(cashTransactions.id, id), eq(cashTransactions.userId, userId)));
  }

  async createTransfer(userId: string, fromFundHolderId: string, toFundHolderId: string, amount: string, notes: string | null, date: Date): Promise<{ transferOut: CashTransaction; transferIn: CashTransaction }> {
    const transferGroupId = crypto.randomUUID();
    const fromHolder = await db.select().from(fundHolders).where(eq(fundHolders.id, fromFundHolderId)).then(r => r[0]);
    const toHolder = await db.select().from(fundHolders).where(eq(fundHolders.id, toFundHolderId)).then(r => r[0]);

    const [transferOut] = await db.insert(cashTransactions).values({
      userId,
      fundHolderId: fromFundHolderId,
      type: "transfer_out",
      amount,
      transferGroupId,
      notes: notes || `Transfer to ${toHolder?.name || 'fund holder'}`,
      transactionDate: date,
    }).returning();

    const [transferIn] = await db.insert(cashTransactions).values({
      userId,
      fundHolderId: toFundHolderId,
      type: "transfer_in",
      amount,
      transferGroupId,
      notes: notes || `Transfer from ${fromHolder?.name || 'fund holder'}`,
      transactionDate: date,
    }).returning();

    return { transferOut, transferIn };
  }

  async deleteTransferGroup(transferGroupId: string, userId: string): Promise<void> {
    await db.delete(cashTransactions).where(
      and(eq(cashTransactions.transferGroupId, transferGroupId), eq(cashTransactions.userId, userId))
    );
  }

  async getCashBalances(userId: string): Promise<{ fundHolderId: string; name: string; balance: number }[]> {
    const holders = await this.getFundHolders(userId);
    const result = [];

    for (const holder of holders) {
      const [stats] = await db
        .select({
          inflow: sql<number>`COALESCE(SUM(CASE WHEN ${cashTransactions.type} IN ('inflow', 'payment_collection', 'transfer_in') THEN CAST(${cashTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
          outflow: sql<number>`COALESCE(SUM(CASE WHEN ${cashTransactions.type} IN ('outflow', 'loan_disbursement', 'transfer_out') THEN CAST(${cashTransactions.amount} AS NUMERIC) ELSE 0 END), 0)`,
        })
        .from(cashTransactions)
        .where(and(eq(cashTransactions.userId, userId), eq(cashTransactions.fundHolderId, holder.id)));

      result.push({
        fundHolderId: holder.id,
        name: holder.name,
        balance: (stats?.inflow || 0) - (stats?.outflow || 0),
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
