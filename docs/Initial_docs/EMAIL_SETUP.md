# Email Setup Guide

## Overview

This guide explains how to configure email sending for the VS Platform, including password reset emails and user credential emails.

## SMTP Configuration

### Environment Variables

Add these to your `backend/.env` file:

```bash
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@vs-platform.com
SMTP_FROM_NAME=VS Platform

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Development Mode
DEV_MODE=false
DEV_EMAIL_DUMP=false
```

### Common SMTP Providers

#### Gmail

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

#### SendGrid

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   ```

#### AWS SES

1. Verify your email/domain in AWS SES
2. Create SMTP credentials
3. Use these settings:
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-username
   SMTP_PASS=your-smtp-password
   ```

#### Mailgun

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Get SMTP credentials from dashboard
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=your-mailgun-username
   SMTP_PASS=your-mailgun-password
   ```

## Development Mode

### Console Logging

In development, you can log emails to console instead of sending:

```bash
DEV_MODE=true
DEV_EMAIL_DUMP=true
```

When enabled, emails will be printed to the console with full content.

### Testing Email Service

```bash
# Start backend in dev mode
cd backend
DEV_MODE=true DEV_EMAIL_DUMP=true pnpm dev
```

Then trigger a password reset or create a user to see email output in console.

## Email Templates

### Password Reset Email

The password reset email includes:
- Reset link with token and username
- Expiry time (default: 1 hour)
- Security warnings
- Support contact information

**Template Location:** `backend/src/services/email.service.ts`

### User Credentials Email

The credentials email includes:
- Username and password
- Login link
- Password change instructions (if temporary)
- Security tips

**Template Location:** `backend/src/services/email.service.ts`

## Customizing Email Templates

Edit the email templates in `backend/src/services/email.service.ts`:

```typescript
static async sendPasswordResetEmail(
  to: string,
  username: string,
  resetToken: string
): Promise<void> {
  // Customize HTML and text templates here
  const html = `...`;
  const text = `...`;
  await this.sendEmail({ to, subject, html, text });
}
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP Configuration**
   ```bash
   # Verify all SMTP variables are set
   echo $SMTP_HOST
   echo $SMTP_USER
   ```

2. **Test SMTP Connection**
   ```bash
   # Use telnet to test SMTP
   telnet $SMTP_HOST $SMTP_PORT
   ```

3. **Check Firewall**
   - Ensure port 587 (or 465) is not blocked
   - Check for corporate firewall restrictions

4. **Verify Credentials**
   - Double-check username and password
   - For Gmail, ensure App Password is used (not regular password)

5. **Check Logs**
   ```bash
   # Backend logs will show email errors
   tail -f backend/logs/app.log
   ```

### Common Errors

#### "SMTP connection failed"
- Verify SMTP_HOST and SMTP_PORT
- Check network connectivity
- Ensure credentials are correct

#### "Authentication failed"
- Verify SMTP_USER and SMTP_PASS
- For Gmail, ensure App Password is used
- Check if 2FA is enabled (required for Gmail)

#### "Email not received"
- Check spam folder
- Verify recipient email address
- Check SMTP provider's sending limits
- Verify email domain is not blacklisted

## Production Checklist

- [ ] Use production SMTP service (not Gmail personal account)
- [ ] Set up SPF, DKIM, and DMARC records
- [ ] Use dedicated email domain
- [ ] Monitor email delivery rates
- [ ] Set up bounce handling
- [ ] Configure email templates with branding
- [ ] Test email delivery before going live
- [ ] Set up email monitoring/alerts
- [ ] Use HTTPS for FRONTEND_URL
- [ ] Disable DEV_MODE and DEV_EMAIL_DUMP

## Security Considerations

1. **Never commit SMTP credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate SMTP passwords** regularly
4. **Use App Passwords** instead of main passwords
5. **Enable 2FA** on email accounts
6. **Monitor for suspicious activity**
7. **Use dedicated email service** for production

## Rate Limiting

Email sending is rate-limited to prevent abuse:
- Password reset: 5 requests/hour per IP
- Username enumeration protection: Always returns success

## Email Service API

### Send Email

```typescript
import { EmailService } from '../services/email.service';

await EmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello</h1>',
  text: 'Hello',
});
```

### Send Password Reset

```typescript
await EmailService.sendPasswordResetEmail(
  'user@example.com',
  'username',
  'reset-token'
);
```

### Send User Credentials

```typescript
await EmailService.sendUserCredentialsEmail(
  'user@example.com',
  'username',
  'password',
  true // isTemporary
);
```

## Support

For email-related issues:
1. Check backend logs
2. Verify SMTP configuration
3. Test with a simple email first
4. Check SMTP provider status page
5. Review email service code in `backend/src/services/email.service.ts`

