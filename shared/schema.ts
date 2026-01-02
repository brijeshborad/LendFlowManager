import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIndex: index("IDX_session_expire").on(table.expire),
  }),
);

// User storage table for local authentication
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  // User preferences for notifications and reminders
  notificationPreferences: jsonb("notification_preferences").$type<{
    emailNotifications: boolean;
    paymentAlerts: boolean;
    reminderAlerts: boolean;
    systemAlerts: boolean;
  }>().default({
    emailNotifications: true,
    paymentAlerts: true,
    reminderAlerts: true,
    systemAlerts: true,
  }),
  interestCalculationMethod: text("interest_calculation_method").default("simple"), // "simple" or "compound"
  autoLogoutMinutes: integer("auto_logout_minutes").default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// Borrowers table
export const borrowers = pgTable("borrowers", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  preferredContactMethod: text("preferred_contact_method").default("email"), // "email", "sms", "whatsapp"
  notes: text("notes"),
  status: text("status").default("active"), // "active", "overdue", "settled"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_borrowers_user_id").on(table.userId),
  statusIdx: index("idx_borrowers_status").on(table.status),
  userStatusIdx: index("idx_borrowers_user_status").on(table.userId, table.status),
}));

export const insertBorrowerSchema = createInsertSchema(borrowers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export type Borrower = typeof borrowers.$inferSelect;

// Loans table
export const loans = pgTable("loans", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  borrowerId: text("borrower_id").notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(), // percentage
  interestRateType: text("interest_rate_type").notNull().default("monthly"), // "monthly" or "annual"
  startDate: timestamp("start_date").notNull(),
  repaymentTerms: text("repayment_terms"),
  status: text("status").default("active"), // "active", "settled", "closed"
  documentUrls: text("document_urls").array().default([]), // URLs to uploaded documents as text array
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_loans_user_id").on(table.userId),
  borrowerIdIdx: index("idx_loans_borrower_id").on(table.borrowerId),
  statusIdx: index("idx_loans_status").on(table.status),
  startDateIdx: index("idx_loans_start_date").on(table.startDate),
  userBorrowerIdx: index("idx_loans_user_borrower").on(table.userId, table.borrowerId),
  borrowerStatusIdx: index("idx_loans_borrower_status").on(table.borrowerId, table.status),
}));

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: text("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(), // "principal", "interest", "partial_interest", "mixed"
  paymentMethod: text("payment_method").notNull(), // "cash", "upi", "bank_transfer", "cheque"
  interestClearedTillDate: timestamp("interest_cleared_till_date"),
  transactionReference: text("transaction_reference"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_payments_user_id").on(table.userId),
  loanIdIdx: index("idx_payments_loan_id").on(table.loanId),
  paymentDateIdx: index("idx_payments_payment_date").on(table.paymentDate),
  paymentTypeIdx: index("idx_payments_payment_type").on(table.paymentType),
  userLoanIdx: index("idx_payments_user_loan").on(table.userId, table.loanId),
  loanTypeIdx: index("idx_payments_loan_type").on(table.loanId, table.paymentType),
  userDateIdx: index("idx_payments_user_date").on(table.userId, table.paymentDate.desc()),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
    paymentDate: z.coerce.date(), // <-- add this
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Interest entries table (for automatic monthly interest tracking)
export const interestEntries = pgTable("interest_entries", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: text("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: text("borrower_id").notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }).notNull(),
  isAutoGenerated: boolean("is_auto_generated").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterestEntrySchema = createInsertSchema(interestEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertInterestEntry = z.infer<typeof insertInterestEntrySchema>;
export type InterestEntry = typeof interestEntries.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  borrowerId: text("borrower_id").references(() => borrowers.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type").notNull(), // "payment", "interest", "custom"
  title: text("title").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").default("pending"), // "pending", "sent", "failed", "cancelled"
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  isRecurring: boolean("is_recurring").default(false),
  metadata: jsonb("metadata").$type<{
    threshold?: number;
    daysBeforeDue?: number;
    escalationLevel?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_reminders_user_id").on(table.userId),
  borrowerIdIdx: index("idx_reminders_borrower_id").on(table.borrowerId),
  scheduledForIdx: index("idx_reminders_scheduled_for").on(table.scheduledFor),
  statusIdx: index("idx_reminders_status").on(table.status),
}));

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Email logs table
export const emailLogs = pgTable("email_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: text("borrower_id").references(() => borrowers.id, { onDelete: "cascade" }),
  loanId: text("loan_id").references(() => loans.id, { onDelete: "cascade" }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull(), // "sent", "failed", "queued"
  provider: text("provider"), // "sendgrid", "ses", etc.
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "reminder", "receipt", "statement"
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  placeholders: text("placeholders").array().default([]), // {{borrowerName}}, {{amount}}, etc.
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "create", "update", "delete"
  entityType: text("entity_type").notNull(), // "loan", "payment", "borrower", etc.
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes"), // Store the changes made
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_audit_logs_user_id").on(table.userId),
  createdAtIdx: index("idx_audit_logs_created_at").on(table.createdAt),
  entityIdx: index("idx_audit_logs_entity").on(table.entityType, table.entityId),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
