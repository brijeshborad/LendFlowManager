import type { EmailTemplate, EmailLog, InsertEmailLog } from "@shared/schema";

export interface EmailProvider {
  sendEmail(params: SendEmailParams): Promise<EmailResponse>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: params.from || this.fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          reply_to: params.replyTo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to send email',
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResponse> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: params.to }],
          }],
          from: { email: params.from || this.fromEmail },
          subject: params.subject,
          content: [
            {
              type: 'text/html',
              value: params.html,
            },
            ...(params.text ? [{
              type: 'text/plain',
              value: params.text,
            }] : []),
          ],
          reply_to: params.replyTo ? { email: params.replyTo } : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.errors?.[0]?.message || 'Failed to send email',
        };
      }

      const messageId = response.headers.get('x-message-id');
      return {
        success: true,
        messageId: messageId || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

class MockEmailProvider implements EmailProvider {
  async sendEmail(params: SendEmailParams): Promise<EmailResponse> {
    console.log('📧 Mock Email Service - Would send:', {
      to: params.to,
      subject: params.subject,
      from: params.from,
    });
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }
}

export class EmailService {
  private provider: EmailProvider;
  private enabled: boolean;

  constructor() {
    const emailProvider = process.env.EMAIL_PROVIDER; // 'resend' | 'sendgrid' | 'mock'
    const apiKey = process.env.EMAIL_API_KEY;
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';

    this.enabled = !!emailProvider && emailProvider !== 'mock';

    if (emailProvider === 'resend' && apiKey) {
      this.provider = new ResendProvider(apiKey, fromEmail);
      console.log('✅ Email service initialized with Resend');
    } else if (emailProvider === 'sendgrid' && apiKey) {
      this.provider = new SendGridProvider(apiKey, fromEmail);
      console.log('✅ Email service initialized with SendGrid');
    } else {
      this.provider = new MockEmailProvider();
      console.log('⚠️  Email service running in MOCK mode - set EMAIL_PROVIDER and EMAIL_API_KEY to enable');
    }
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResponse> {
    return await this.provider.sendEmail(params);
  }

  async sendTemplatedEmail(
    template: EmailTemplate,
    to: string,
    variables: Record<string, string>
  ): Promise<EmailResponse> {
    let html = template.htmlBody || '';
    let subject = template.subject;

    // Replace variables in template (e.g., {{borrowerName}})
    Object.keys(variables).forEach(key => {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, 'g'), variables[key]);
      subject = subject.replace(new RegExp(placeholder, 'g'), variables[key]);
    });

    return await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const emailService = new EmailService();
