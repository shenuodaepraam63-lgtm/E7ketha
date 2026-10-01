import { getTelegramBotToken } from './config';

const TG_API = 'https://api.telegram.org';

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: Array<{ type: string; offset: number; length: number }>;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
};

export type InlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

async function tgCall<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = getTelegramBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  const res = await fetch(`${TG_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: T };
  if (!data.ok) {
    throw new Error(data.description || `Telegram API ${method} failed`);
  }
  return data.result as T;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
    disable_web_page_preview?: boolean;
  },
) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode ?? 'HTML',
    reply_markup: options?.reply_markup,
    disable_web_page_preview: options?.disable_web_page_preview ?? false,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text || '',
  });
}

export async function setWebhook(url: string, secretToken: string) {
  return tgCall('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  });
}

export async function getWebhookInfo() {
  return tgCall<{ url: string; pending_update_count: number; last_error_message?: string }>('getWebhookInfo', {});
}
