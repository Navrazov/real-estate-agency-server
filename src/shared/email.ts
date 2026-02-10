import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  : null;

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.appUrl}/verify-email?token=${token}`;

  if (!transporter) {
    logger.warn(`Email not configured. Verification URL for ${to}: ${url}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: 'Подтвердите ваш email — EstateHub',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Подтверждение email</h2>
        <p>Для подтверждения вашего email-адреса нажмите на кнопку ниже:</p>
        <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px;">
          Подтвердить email
        </a>
        <p style="margin-top: 16px; color: #666;">Ссылка действительна 24 часа.</p>
        <p style="color: #666;">Если вы не регистрировались на EstateHub, проигнорируйте это письмо.</p>
      </div>
    `,
  });
  logger.info(`Verification email sent to ${to}`);
}
