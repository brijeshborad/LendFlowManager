import { storage } from "./storage";
import { emailService } from "./emailService";
import type { Reminder, Loan, Borrower, EmailTemplate } from "@shared/schema";

export interface ReminderContext {
  reminder: Reminder;
  loan?: Loan;
  borrower?: Borrower;
  template?: EmailTemplate;
}

export class ReminderService {
  async processReminder(reminderId: string, userId: string): Promise<boolean> {
    try {
      const reminder = await storage.getReminder(reminderId, userId);
      if (!reminder) {
        console.error(`Reminder ${reminderId} not found`);
        return false;
      }

      // Check if reminder is due
      if (new Date(reminder.scheduledFor) > new Date()) {
        console.log(`Reminder ${reminderId} not yet due`);
        return false;
      }

      // Check if already sent
      if (reminder.status === 'sent') {
        console.log(`Reminder ${reminderId} already sent`);
        return false;
      }

      // Get borrower information
      const borrower = await storage.getBorrower(reminder.borrowerId, userId);
      if (!borrower) {
        console.error(`Borrower ${reminder.borrowerId} not found`);
        return false;
      }

      // Get loan if specified
      let loan: Loan | undefined;
      if (reminder.loanId) {
        loan = await storage.getLoan(reminder.loanId, userId);
      }

      // Get email template if specified
      let template: EmailTemplate | undefined;
      if (reminder.emailTemplateId) {
        template = await storage.getEmailTemplate(reminder.emailTemplateId, userId);
      }

      // Send the reminder email
      const emailSent = await this.sendReminderEmail({
        reminder,
        loan,
        borrower,
        template,
      });

      if (emailSent) {
        // Mark reminder as sent
        await storage.updateReminder(reminderId, userId, {
          status: 'sent',
        });

        console.log(`✅ Reminder ${reminderId} sent successfully`);
        return true;
      } else {
        // Mark as failed
        await storage.updateReminder(reminderId, userId, {
          status: 'failed',
        });
        console.error(`❌ Failed to send reminder ${reminderId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error processing reminder ${reminderId}:`, error);
      return false;
    }
  }

  private async sendReminderEmail(context: ReminderContext): Promise<boolean> {
    const { reminder, loan, borrower, template } = context;

    if (!borrower || !borrower.email) {
      console.error(`Borrower ${reminder.borrowerId} has no email address`);
      return false;
    }

    try {
      let result;

      if (template) {
        // Use template with variable substitution
        const variables = this.buildTemplateVariables(reminder, loan, borrower);
        result = await emailService.sendTemplatedEmail(
          template,
          borrower.email,
          variables
        );
      } else {
        // Send basic reminder email
        const subject = reminder.title;
        const html = this.buildDefaultEmailHtml(reminder, loan, borrower);

        result = await emailService.sendEmail({
          to: borrower.email,
          subject,
          html,
        });
      }

      // Log the email
      await storage.createEmailLog({
        userId: reminder.userId,
        borrowerId: borrower.id,
        reminderId: reminder.id,
        recipientEmail: borrower.email,
        subject: reminder.title,
        body: template ? template.htmlBody : this.buildDefaultEmailHtml(reminder, loan, borrower),
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
      });

      return result.success;
    } catch (error) {
      console.error('Error sending reminder email:', error);
      
      // Log the failed email attempt
      await storage.createEmailLog({
        userId: reminder.userId,
        borrowerId: borrower.id,
        reminderId: reminder.id,
        recipientEmail: borrower.email,
        subject: reminder.title,
        body: 'Email failed to send',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  private buildTemplateVariables(
    reminder: Reminder,
    loan: Loan | undefined,
    borrower: Borrower
  ): Record<string, string> {
    const formatCurrency = (amount: string) => {
      return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
    };

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return {
      borrowerName: borrower.name,
      borrowerEmail: borrower.email || '',
      borrowerPhone: borrower.phone || '',
      reminderTitle: reminder.title,
      reminderMessage: reminder.message,
      scheduledDate: formatDate(reminder.scheduledFor),
      loanAmount: loan ? formatCurrency(loan.principalAmount) : 'N/A',
      interestRate: loan ? `${loan.interestRate}%` : 'N/A',
      loanStartDate: loan ? formatDate(loan.startDate) : 'N/A',
    };
  }

  private buildDefaultEmailHtml(
    reminder: Reminder,
    loan: Loan | undefined,
    borrower: Borrower
  ): string {
    const formatCurrency = (amount: string) => {
      return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
    };

    const formatDate = (date: Date | string) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .message { background: #f3f4f6; padding: 20px; border-left: 4px solid #3B82F6; margin: 20px 0; border-radius: 4px; }
          .details { margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; color: #6b7280; }
          .detail-value { color: #111827; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Payment Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${borrower.name},</p>
          <div class="message">
            <p style="margin: 0; font-size: 16px;"><strong>${reminder.title}</strong></p>
            <p style="margin: 10px 0 0 0;">${reminder.message}</p>
          </div>
    `;

    if (loan) {
      html += `
          <div class="details">
            <h3 style="color: #111827; margin-bottom: 15px;">Loan Details</h3>
            <div class="detail-row">
              <span class="detail-label">Principal Amount:</span>
              <span class="detail-value">${formatCurrency(loan.principalAmount)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Interest Rate:</span>
              <span class="detail-value">${loan.interestRate}% ${loan.interestRateType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Loan Start Date:</span>
              <span class="detail-value">${formatDate(loan.startDate)}</span>
            </div>
          </div>
      `;
    }

    html += `
          <p style="margin-top: 30px;">If you have any questions or concerns, please don't hesitate to contact us.</p>
          <p>Best regards,<br>LendingPro Team</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from your Lending Management System.</p>
          <p style="margin-top: 10px; font-size: 12px;">Scheduled for: ${formatDate(reminder.scheduledFor)}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  async processPendingReminders(userId: string): Promise<number> {
    try {
      const reminders = await storage.getReminders(userId);
      const pendingReminders = reminders.filter(r => 
        r.status === 'pending' && new Date(r.scheduledFor) <= new Date()
      );

      let successCount = 0;
      for (const reminder of pendingReminders) {
        const success = await this.processReminder(reminder.id, userId);
        if (success) successCount++;
      }

      return successCount;
    } catch (error) {
      console.error('Error processing pending reminders:', error);
      return 0;
    }
  }
}

export const reminderService = new ReminderService();
