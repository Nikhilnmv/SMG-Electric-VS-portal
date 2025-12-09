import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email service for sending emails via SMTP or dev fallback
 */
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static devEmails: EmailOptions[] = [];

  /**
   * Initialize email transporter
   */
  private static async getTransporter(): Promise<nodemailer.Transporter | null> {
    // In dev mode without SMTP, return null to use console logging
    if (env.DEV_MODE && (!env.SMTP_HOST || !env.SMTP_USER)) {
      return null;
    }

    // If SMTP is configured, use it
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      if (!this.transporter) {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465, // true for 465, false for other ports
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });

        // Verify connection
        try {
          await this.transporter.verify();
          console.log('[EmailService] SMTP connection verified');
        } catch (error) {
          console.error('[EmailService] SMTP connection failed:', error);
          // Fall back to dev mode if verification fails
          if (env.DEV_MODE) {
            this.transporter = null;
          } else {
            throw new Error('SMTP connection failed. Please check your SMTP configuration.');
          }
        }
      }
      return this.transporter;
    }

    // No SMTP configured - use dev fallback
    return null;
  }

  /**
   * Send an email
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    const transporter = await this.getTransporter();

    // Store email in dev mode for inspection
    if (env.DEV_MODE || env.DEV_EMAIL_DUMP) {
      this.devEmails.push({ ...options, timestamp: new Date() } as any);
      // Keep only last 50 emails
      if (this.devEmails.length > 50) {
        this.devEmails.shift();
      }

      console.log('\n========== EMAIL (DEV MODE) ==========');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Text:', options.text || '(HTML only)');
      console.log('HTML:', options.html);
      console.log('=====================================\n');
    }

    // If no transporter (dev mode), just log and return
    if (!transporter) {
      if (!env.DEV_MODE && !env.DEV_EMAIL_DUMP) {
        throw new Error('Email service not configured. Please set SMTP environment variables.');
      }
      return;
    }

    try {
      await transporter.sendMail({
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || this.htmlToText(options.html),
        html: options.html,
      });
      console.log(`[EmailService] Email sent to ${options.to}`);
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    username: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}&username=${encodeURIComponent(username)}`;
    const expiresIn = Math.floor(env.PASSWORD_RESET_TOKEN_TTL_SECONDS / 60); // minutes

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
          </div>
          
          <p>Hello,</p>
          
          <p>We received a request to reset the password for your account (username: <strong>${username}</strong>).</p>
          
          <p>Click the link below to reset your password. This link will expire in <strong>${expiresIn} minutes</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Security Notice:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>If you did not request this password reset, please ignore this email.</li>
              <li>This link can only be used once and will expire after ${expiresIn} minutes.</li>
              <li>For security reasons, never share this link with anyone.</li>
            </ul>
          </div>
          
          <p>If you continue to have problems, please contact support.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </body>
      </html>
    `;

    const text = `
Password Reset Request

Hello,

We received a request to reset the password for your account (username: ${username}).

Click the link below to reset your password. This link will expire in ${expiresIn} minutes.

${resetUrl}

Security Notice:
- If you did not request this password reset, please ignore this email.
- This link can only be used once and will expire after ${expiresIn} minutes.
- For security reasons, never share this link with anyone.

If you continue to have problems, please contact support.

This is an automated message. Please do not reply to this email.
    `.trim();

    await this.sendEmail({
      to,
      subject: 'Reset Your Password - VS Platform',
      html,
      text,
    });
  }

  /**
   * Send user credentials email (when admin creates user)
   */
  static async sendUserCredentialsEmail(
    to: string,
    username: string,
    password: string,
    isTemporary: boolean = true
  ): Promise<void> {
    const loginUrl = `${env.FRONTEND_URL}/login`;
    const changePasswordUrl = `${env.FRONTEND_URL}/profile/change-password`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Account Credentials</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Welcome to VS Platform</h1>
          </div>
          
          <p>Hello,</p>
          
          <p>Your account has been created. Here are your login credentials:</p>
          
          <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>Username:</strong> <code style="background-color: #fff; padding: 2px 6px; border-radius: 3px;">${username}</code></p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #fff; padding: 2px 6px; border-radius: 3px;">${password}</code></p>
          </div>
          
          ${isTemporary ? `
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> This is a temporary password. You will be required to change it when you first log in.</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Log In Now</a>
          </div>
          
          ${isTemporary ? `
          <p>After logging in, you'll be redirected to change your password. You can also change it later at:</p>
          <p style="word-break: break-all; color: #3498db;">${changePasswordUrl}</p>
          ` : ''}
          
          <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 12px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Security Tips:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Keep your credentials secure and never share them.</li>
              <li>Use a strong, unique password.</li>
              <li>If you suspect your account has been compromised, contact support immediately.</li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </body>
      </html>
    `;

    const text = `
Welcome to VS Platform

Hello,

Your account has been created. Here are your login credentials:

Username: ${username}
Password: ${password}

${isTemporary ? 'IMPORTANT: This is a temporary password. You will be required to change it when you first log in.\n' : ''}

Log in at: ${loginUrl}

${isTemporary ? `After logging in, you'll be redirected to change your password. You can also change it later at: ${changePasswordUrl}\n` : ''}

Security Tips:
- Keep your credentials secure and never share them.
- Use a strong, unique password.
- If you suspect your account has been compromised, contact support immediately.

This is an automated message. Please do not reply to this email.
    `.trim();

    await this.sendEmail({
      to,
      subject: 'Your VS Platform Account Credentials',
      html,
      text,
    });
  }

  /**
   * Get last sent emails (dev mode only)
   */
  static getLastEmails(limit: number = 10): EmailOptions[] {
    if (!env.DEV_MODE) {
      throw new Error('This method is only available in DEV_MODE');
    }
    return this.devEmails.slice(-limit);
  }

  /**
   * Clear stored emails (dev mode only)
   */
  static clearStoredEmails(): void {
    if (!env.DEV_MODE) {
      throw new Error('This method is only available in DEV_MODE');
    }
    this.devEmails = [];
  }

  /**
   * Convert HTML to plain text (simple implementation)
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

