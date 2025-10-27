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
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
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
  interestCalculationMethod: varchar("interest_calculation_method", { length: 20 }).default("simple"), // "simple" or "compound"
  autoLogoutMinutes: integer("auto_logout_minutes").default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Borrowers table
export const borrowers = pgTable("borrowers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(),
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
export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  borrowerId: varchar("borrower_id").notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  principalAmount: decimal("principal_amount", { precision: 15, scale: 2 }).notNull(),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(), // percentage
  interestRateType: varchar("interest_rate_type", { length: 20 }).notNull().default("monthly"), // "monthly" or "annual"
  startDate: timestamp("start_date").notNull(),
  repaymentTerms: text("repayment_terms"),
  status: varchar("status", { length: 20 }).default("active"), // "active", "settled", "closed"
  documentUrls: text("document_urls").array().default([]), // URLs to uploaded documents
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
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loanId: varchar("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentDate: timestamp("payment_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentType: varchar("payment_type", { length: 30 }).notNull(), // "principal", "interest", "partial_interest", "mixed"
  paymentMethod: varchar("payment_method", { length: 30 }).notNull(), // "cash", "upi", "bank_transfer", "cheque"
  transactionReference: varchar("transaction_reference"),
  receiptUrl: varchar("receipt_url"),
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
export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id").notNull().references(() => borrowers.id, { onDelete: "cascade" }),
  loanId: varchar("loan_id").references(() => loans.id, { onDelete: "cascade" }),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(), // "payment_due", "interest_pending", "outstanding_principal", "custom"
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  frequency: varchar("frequency", { length: 20 }).default("once"), // "once", "daily", "weekly", "monthly"
  status: varchar("status", { length: 20 }).default("scheduled"), // "scheduled", "sent", "delivered", "failed", "cancelled"
  emailTemplateId: varchar("email_template_id"),
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

// Email activity logs
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  borrowerId: varchar("borrower_id").references(() => borrowers.id, { onDelete: "cascade" }),
  reminderId: varchar("reminder_id").references(() => reminders.id, { onDelete: "set null" }),
  recipientEmail: varchar("recipient_email").notNull(),
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
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "payment_reminder", "interest_alert", "monthly_statement", "overdue_notice", "thank_you"
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  placeholders: text("placeholders").array().default([]), // List of available placeholders
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

// Audit logs for security and tracking
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // "login", "logout", "create_borrower", "add_payment", "send_reminder", etc.
  entityType: varchar("entity_type", { length: 50 }), // "borrower", "loan", "payment", "reminder"
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
