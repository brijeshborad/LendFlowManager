import { db } from './db';
import { users, loans, borrowers, interestEntries, emailLogs } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { generateMonthlyInterestEntries } from './interestCalculationService';

// Track if scheduler is running
let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Email service interface (will use Replit integration when setup)
 */
export interface EmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

// Mock email service for development
class MockEmailService implements EmailService {
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    console.log('📧 [MOCK EMAIL] Sending email to:', to);
    console.log('Subject:', subject);
    console.log('Body preview:', html.substring(0, 200) + '...');
    
    // Log to database
    await db.insert(emailLogs).values({
      userId: 'system',
      recipientEmail: to,
      subject,
      body: html,
      status: 'sent',
    });
  }
}

let emailService: EmailService = new MockEmailService();

/**
 * Set the email service (for integration setup)
 */
export function setEmailService(service: EmailService) {
  emailService = service;
}

/**
 * Generate monthly interest summary email HTML
 */
function generateMonthlyInterestEmail(
  lenderName: string,
  interestSummary: {
    borrowerName: string;
    principalAmount: string;
    interestRate: string;
    interestAmount: string;
    periodStart: Date;
    periodEnd: Date;
  }[]
): string {
  const totalInterest = interestSummary.reduce(
    (sum, item) => sum + parseFloat(item.interestAmount),
    0
  );

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .summary { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .loan-item { padding: 15px; border-bottom: 1px solid #e5e7eb; }
        .loan-item:last-child { border-bottom: none; }
        .total { background-color: #4F46E5; color: white; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; border-radius: 8px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        h2 { margin: 0 0 10px 0; }
        .label { color: #6b7280; font-size: 14px; }
        .value { font-weight: bold; color: #111827; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Monthly Interest Summary</h1>
        <p>Your lending portfolio update for ${formatDate(new Date())}</p>
      </div>
      
      <div class="content">
        <p>Hello ${lenderName},</p>
        <p>Here's your monthly interest summary for all active loans:</p>
        
        <div class="summary">
          ${interestSummary.map(item => `
            <div class="loan-item">
              <h3 style="margin: 0 0 10px 0; color: #111827;">${item.borrowerName}</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <div class="label">Principal Amount</div>
                  <div class="value">${formatCurrency(item.principalAmount)}</div>
                </div>
                <div>
                  <div class="label">Interest Rate</div>
                  <div class="value">${item.interestRate}%</div>
                </div>
                <div>
                  <div class="label">Period</div>
                  <div class="value">${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}</div>
                </div>
                <div>
                  <div class="label">Interest Earned</div>
                  <div class="value" style="color: #059669;">${formatCurrency(item.interestAmount)}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          Total Interest This Month: ${formatCurrency(totalInterest)}
        </div>
        
        <p style="margin-top: 30px; color: #6b7280;">
          This is an automated monthly summary of your lending activity. 
          Login to your dashboard to view detailed transaction history.
        </p>
      </div>
      
      <div class="footer">
        <p>This is an automated email from your Lending Management System</p>
        <p>© ${new Date().getFullYear()} Lending Management. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send monthly interest summary emails to all lenders
 */
export async function sendMonthlyInterestReminders(): Promise<number> {
  try {
    console.log('🔔 Starting monthly interest reminder process...');
    
    // First, generate interest entries for this month
    const { created, calculations } = await generateMonthlyInterestEntries();
    console.log(`Generated ${created} new interest entries`);

    // Get all users with active loans
    const allUsers = await db
      .select({
        userId: users.id,
        email: users.email,
      })
      .from(users)
      .innerJoin(loans, eq(loans.userId, users.id))
      .where(eq(loans.status, 'active'))
      .groupBy(users.id, users.email);

    let emailsSent = 0;

    for (const user of allUsers) {
      // Get this month's interest entries for this user
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const userInterestEntries = await db
        .select({
          borrowerName: borrowers.name,
          principalAmount: interestEntries.principalAmount,
          interestRate: interestEntries.interestRate,
          interestAmount: interestEntries.interestAmount,
          periodStart: interestEntries.periodStart,
          periodEnd: interestEntries.periodEnd,
        })
        .from(interestEntries)
        .innerJoin(borrowers, eq(interestEntries.borrowerId, borrowers.id))
        .where(
          and(
            eq(interestEntries.userId, user.userId),
            gte(interestEntries.periodStart, monthStart),
            lte(interestEntries.periodStart, monthEnd)
          )
        );

      if (userInterestEntries.length === 0) {
        console.log(`No interest entries for user ${user.email} this month`);
        continue;
      }

      // Send email
      const emailHtml = generateMonthlyInterestEmail(
        'Lender',
        userInterestEntries
      );

      await emailService.sendEmail(
        user.email || '',
        `💰 Monthly Interest Summary - ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
        emailHtml
      );

      emailsSent++;
      console.log(`✅ Sent monthly interest summary to ${user.email}`);
    }

    console.log(`📧 Sent ${emailsSent} monthly interest reminder emails`);
    return emailsSent;
  } catch (error) {
    console.error('❌ Error sending monthly interest reminders:', error);
    throw error;
  }
}

/**
 * Check if it's the first day of the month and send reminders
 */
async function checkAndSendMonthlyReminders() {
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // Run on the 1st of every month
  if (dayOfMonth === 1) {
    console.log('📅 First day of the month - triggering interest calculations and reminders');
    try {
      await sendMonthlyInterestReminders();
    } catch (error) {
      console.error('Failed to send monthly reminders:', error);
    }
  }
}

/**
 * Start the scheduler (checks daily)
 */
export function startReminderScheduler() {
  if (isRunning) {
    console.log('⚠️  Reminder scheduler already running');
    return;
  }

  console.log('🚀 Starting reminder scheduler...');
  isRunning = true;

  // Run immediately on startup (if it's the first day)
  checkAndSendMonthlyReminders();

  // Check every 24 hours
  schedulerInterval = setInterval(() => {
    checkAndSendMonthlyReminders();
  }, 24 * 60 * 60 * 1000); // 24 hours

  console.log('✅ Reminder scheduler started - will check daily for monthly reminders');
}

/**
 * Stop the scheduler
 */
export function stopReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    console.log('🛑 Reminder scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    isRunning,
    nextCheck: isRunning ? 'Within 24 hours' : 'Not scheduled',
  };
}
