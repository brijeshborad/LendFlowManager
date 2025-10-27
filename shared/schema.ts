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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: text("id").primaryKey(),
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

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
});

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
});

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
  transactionReference: text("transaction_reference"),
  receiptUrl: text("receipt_url"),
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
});

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
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
