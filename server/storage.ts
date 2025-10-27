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

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
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
  async getPayments(userId: string, loanId?: string): Promise<Payment[]> {
    const conditions = [eq(payments.userId, userId)];
    if (loanId) {
      conditions.push(eq(payments.loanId, loanId));
    }
    return db
      .select()
      .from(payments)
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

  // Analytics operations
  async getDashboardStats(userId: string): Promise<{
    totalLent: string;
    outstandingPrincipal: string;
    interestReceived: string;
    interestPending: string;
    activeBorrowers: number;
    activeLoans: number;
  }> {
    // Get all loans for the user
    const userLoans = await this.getLoans(userId);
    
    // Get all payments for the user
    const userPayments = await this.getPayments(userId);
    
    // Get all borrowers for the user
    const userBorrowers = await this.getBorrowers(userId);
    
    // Calculate total lent
    const totalLent = userLoans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0);
    
    // Calculate outstanding principal (total lent minus principal payments)
    const principalPaid = userPayments
      .filter(p => p.paymentType === 'principal' || p.paymentType === 'mixed')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const outstandingPrincipal = totalLent - principalPaid;
    
    // Calculate interest received (interest payments)
    const interestReceived = userPayments
      .filter(p => p.paymentType === 'interest' || p.paymentType === 'partial_interest')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Calculate interest pending (would need interest calculation logic - simplified for now)
    const interestPending = 0; // TODO: Implement interest calculation
    
    // Count active borrowers and loans
    const activeBorrowers = userBorrowers.filter(b => b.status === 'active').length;
    const activeLoans = userLoans.filter(l => l.status === 'active').length;
    
    return {
      totalLent: totalLent.toFixed(2),
      outstandingPrincipal: outstandingPrincipal.toFixed(2),
      interestReceived: interestReceived.toFixed(2),
      interestPending: interestPending.toFixed(2),
      activeBorrowers,
      activeLoans,
    };
  }
}

export const storage = new DatabaseStorage();
