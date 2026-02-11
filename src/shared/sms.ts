import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export async function sendSmsCode(phone: string, code: string): Promise<void> {
  const message = `Ваш код EstateHub: ${code}`;

  if (!env.greensmsApiKey) {
    logger.warn(`[SMS] greenSMS not configured. Code for ${phone}: ${code}`);
    console.log(`[SMS] Code for ${phone}: ${code}`);
    return;
  }

  try {
    const res = await fetch('https://api3.greensms.ru/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.greensmsApiKey}`,
      },
      body: JSON.stringify({ to: phone.replace(/^\+/, ''), txt: message }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`[SMS] greenSMS error ${res.status}: ${text}`);
      throw new Error(`SMS send failed: ${res.status}`);
    }

    logger.info(`[SMS] Code sent to ${phone}`);
  } catch (err) {
    logger.error(`[SMS] Failed to send to ${phone}: ${(err as Error).message}`);
    throw err;
  }
}
