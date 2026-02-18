import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const API = `https://api.telegram.org/bot${env.telegramBotToken}`;
const FILE_API = `https://api.telegram.org/file/bot${env.telegramBotToken}`;

async function call(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) {
    logger.error(`[TG Bot] ${method} failed: ${data.description}`);
  }
  return data;
}

/** Send a text message */
export function sendMessage(chatId: string | number, text: string, extra?: Record<string, unknown>) {
  return call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

/** Send a message requesting the user's phone number */
export function requestContact(chatId: string | number, text: string) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      keyboard: [[{ text: '\uD83D\uDCF1 Поделиться номером телефона', request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

/** Remove custom keyboard */
export function removeKeyboard(chatId: string | number, text: string) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { remove_keyboard: true },
  });
}

/** Download a user's profile photo and save it to uploads. Returns the public URL or null. */
export async function downloadProfilePhoto(telegramUserId: string | number): Promise<string | null> {
  try {
    const photosRes = await call('getUserProfilePhotos', { user_id: telegramUserId, limit: 1 });
    const photos = photosRes.result as { total_count: number; photos: Array<Array<{ file_id: string; width: number }>> } | undefined;
    if (!photos || photos.total_count === 0) return null;

    // Pick the largest size from the first photo
    const sizes = photos.photos[0];
    const best = sizes.reduce((a, b) => (a.width > b.width ? a : b));

    const fileRes = await call('getFile', { file_id: best.file_id });
    const fileInfo = fileRes.result as { file_path?: string } | undefined;
    if (!fileInfo?.file_path) return null;

    // Download the file
    const fileUrl = `${FILE_API}/${fileInfo.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = path.extname(fileInfo.file_path) || '.jpg';
    const filename = `tg-${telegramUserId}-${Date.now()}${ext}`;
    const uploadDir = env.uploadDir;

    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    const base = env.uploadsBaseUrl || `http://localhost:${env.port}`;
    return `${base}/uploads/${filename}`;
  } catch (err) {
    logger.error(`[TG Bot] Failed to download profile photo: ${(err as Error).message}`);
    return null;
  }
}
