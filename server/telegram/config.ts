/** Telegram bot configuration (server-only). Never import from client. */

export function getTelegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

export function getTelegramWebhookSecret(): string {
  return (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
}

/** Comma-separated Telegram user IDs */
export function getTelegramAdminIds(): Set<number> {
  const raw = (process.env.TELEGRAM_ADMIN_IDS || '').trim();
  const ids = new Set<number>();
  for (const part of raw.split(/[,\s]+/)) {
    const n = Number(part);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return ids;
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken());
}

export const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || 'https://e7ketha.com').replace(/\/$/, '');
