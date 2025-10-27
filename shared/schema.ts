import { sql } from 'drizzle-orm';
import {
  index,
  json,
  mysqlTable,
  timestamp,
  varchar,
  text,
  int,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => ({
    expireIndex: index("IDX_session_expire").on(table.expire),
  }),
);

// User storage table for Replit Auth
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  // User preferences for notifications and reminders
  notificationPreferences: json("notification_preferences").$type<{
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
  interestCalculationMethod: varchar("interest_calculation_method", { length: 20 }).default("simple"), // "simple" or "compound"
  autoLogoutMinutes: int("auto_logout_minutes").default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Borrowers table
export const borrowers = mysqlTable("borrowers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  address: text("address"),
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }).default("email"), // "email", "sms", "whatsapp"
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("active"), // "active", "overdue", "settled"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBorrowerSchema = createInsertSchema(borrowers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBorrower = z.infer<typeof insertBorrowerSchema>;
export type Borrower = typeof borrowers.$inferSelect;

// Loans table
export const loans = mysqlTable("loans", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  borrowerId: varchar("borrower_id", { length: 36 }).notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(), // percentage
  interestRateType: varchar("interest_rate_type", { length: 20 }).notNull().default("monthly"), // "monthly" or "annual"
  startDate: timestamp("start_date").notNull(),
  repaymentTerms: text("repayment_terms"),
  status: varchar("status", { length: 20 }).default("active"), // "active", "settled", "closed"
  documentUrls: json("document_urls").$type<string[]>().default([]), // URLs to uploaded documents stored as JSON array
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

// Payments table
export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  loanId: varchar("loan_id", { length: 36 }).notNull().references(() => loans.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentType: varchar("payment_type", { length: 30 }).notNull(), // "principal", "interest", "partial_interest", "mixed"
  paymentMethod: varchar("payment_method", { length: 30 }).notNull(), // "cash", "upi", "bank_transfer", "cheque"
  transactionReference: varchar("transaction_reference", { length: 255 }),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  notes: text("notes"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Email reminders table
export const reminders = mysqlTable("reminders", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id", { length: 36 }).notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  loanId: varchar("loan_id", { length: 36 }).references(() => loans.id, { onDelete: "cascade" }),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(), // "payment_due", "interest_pending", "outstanding_principal", "custom"
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  frequency: varchar("frequency", { length: 20 }).default("once"), // "once", "daily", "weekly", "monthly"
  status: varchar("status", { length: 20 }).default("scheduled"), // "scheduled", "sent", "delivered", "failed", "cancelled"
  emailTemplateId: varchar("email_template_id", { length: 36 }),
  metadata: json("metadata").$type<{
    threshold?: number;
    daysBeforeDue?: number;
    escalationLevel?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Email activity logs
export const emailLogs = mysqlTable("email_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id", { length: 36 }).references(() => borrowers.id, { onDelete: "cascade" }),
  reminderId: varchar("reminder_id", { length: 36 }).references(() => reminders.id, { onDelete: "set null" }),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 20 }).default("sent"), // "sent", "delivered", "failed", "bounced"
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// Email templates
export const emailTemplates = mysqlTable("email_templates", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "payment_reminder", "interest_alert", "monthly_statement", "overdue_notice", "thank_you"
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  placeholders: json("placeholders").$type<string[]>().default([]), // List of available placeholders stored as JSON array
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

// Interest entries table - tracks monthly automatic interest calculations
export const interestEntries = mysqlTable("interest_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  loanId: varchar("loan_id", { length: 36 }).notNull().references(() => loans.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id", { length: 36 }).notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(), // Start of interest period
  periodEnd: timestamp("period_end").notNull(), // End of interest period
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(), // Principal at that time
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(), // Interest rate used
  interestAmount: decimal("interest_amount", { precision: 15, scale: 2 }).notNull(), // Calculated interest
  isAutoGenerated: boolean("is_auto_generated").default(true), // Auto vs manual entry
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInterestEntrySchema = createInsertSchema(interestEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertInterestEntry = z.infer<typeof insertInterestEntrySchema>;
export type InterestEntry = typeof interestEntries.$inferSelect;

// Audit logs for security and tracking
export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // "login", "logout", "create_borrower", "add_payment", "send_reminder", etc.
  entityType: varchar("entity_type", { length: 50 }), // "borrower", "loan", "payment", "reminder"
  entityId: varchar("entity_id", { length: 36 }),
  details: json("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
