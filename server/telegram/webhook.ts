import type { Express, Request, Response } from 'express';
import { getTelegramWebhookSecret, isTelegramConfigured } from './config';
import { handleTelegramUpdate } from './router';
import type { TelegramUpdate } from './api';

/**
 * POST /api/telegram/webhook
 * Validates X-Telegram-Bot-Api-Secret-Token when TELEGRAM_WEBHOOK_SECRET is set.
 */
export function registerTelegramWebhook(app: Express): void {
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    if (!isTelegramConfigured()) {
      res.status(503).json({ ok: false, error: 'telegram_not_configured' });
      return;
    }

    const secret = getTelegramWebhookSecret();
    if (secret) {
      const header = String(req.headers['x-telegram-bot-api-secret-token'] || '');
      if (header !== secret) {
        res.status(401).json({ ok: false, error: 'unauthorized' });
        return;
      }
    }

    res.status(200).json({ ok: true });

    const update = req.body as TelegramUpdate;
    try {
      await handleTelegramUpdate(update);
    } catch (err) {
      console.error('[telegram] handle update failed', err);
    }
  });

  app.get('/api/telegram/health', (_req, res) => {
    res.json({
      ok: true,
      configured: isTelegramConfigured(),
      secretConfigured: Boolean(getTelegramWebhookSecret()),
    });
  });
}
