import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const GREENSMS_BASE = 'https://api3.greensms.ru';

// Log API key status on module load for production debugging
logger.info(`[SMS] GREENSMS_API_KEY configured: ${env.greensmsApiKey ? 'yes' : 'NO (will use random codes)'}`);

/**
 * Send call verification via GreenSMS Call API.
 * Returns the 4-digit code (last 4 digits of caller ID).
 */
export async function sendCallVerification(phone: string): Promise<string> {
  const cleanPhone = phone.replace(/^\+/, '');

  if (!env.greensmsApiKey) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    logger.warn(`[CALL] greenSMS not configured. Code for ${phone}: ${code}`);
    console.log(`[CALL] Code for ${phone}: ${code}`);
    return code;
  }

  try {
    const res = await fetch(`${GREENSMS_BASE}/call/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.greensmsApiKey}`,
      },
      body: JSON.stringify({ to: cleanPhone }),
    });

    const data = await res.json() as { request_id?: string; code?: string; error?: string };

    if (!res.ok || !data.code) {
      logger.error(`[CALL] greenSMS error ${res.status}: ${JSON.stringify(data)}`);
      throw new Error(data.error || `Call send failed: ${res.status}`);
    }

    logger.info(`[CALL] Verification call sent to ${phone}, request_id: ${data.request_id}`);
    return data.code;
  } catch (err) {
    logger.error(`[CALL] Failed to call ${phone}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Send verification code via GreenSMS Telegram API.
 */
export async function sendTelegramCode(phone: string, code: string): Promise<void> {
  const cleanPhone = phone.replace(/^\+/, '');

  if (!env.greensmsApiKey) {
    logger.warn(`[TG] greenSMS not configured. Telegram code for ${phone}: ${code}`);
    console.log(`[TG] Telegram code for ${phone}: ${code}`);
    return;
  }

  try {
    const res = await fetch(`${GREENSMS_BASE}/telegram/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.greensmsApiKey}`,
      },
      body: JSON.stringify({ to: cleanPhone, txt: code }),
    });

    const data = await res.json() as { request_id?: string; error?: string };

    if (!res.ok || !data.request_id) {
      logger.error(`[TG] greenSMS error ${res.status}: ${JSON.stringify(data)}`);
      throw new Error(data.error || `Telegram send failed: ${res.status}`);
    }

    logger.info(`[TG] Code sent to ${phone} via Telegram, request_id: ${data.request_id}`);
  } catch (err) {
    logger.error(`[TG] Failed to send to ${phone}: ${(err as Error).message}`);
    throw err;
  }
}
