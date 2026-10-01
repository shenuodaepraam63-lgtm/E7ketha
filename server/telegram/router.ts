import { getTelegramAdminIds, SITE_ORIGIN } from './config';
import { sendMessage, type TelegramMessage, type TelegramUpdate } from './api';
import { upsertTelegramUser } from './users';
import { detectIntent, searchE7ketha, formatHits } from './search';

const HELP = `🤖 <b>مساعد 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</b>

ابحث طبيعيًا، مثل:
• روايات رعب
• مؤلف أحمد خالد توفيق
• تصنيفات
• مقالات

أوامر:
/start — البداية
/help — المساعدة
/novels — أحدث/أشهر الروايات
/authors — المؤلفون
/genres — التصنيفات
/articles — المقالات

الموقع: ${SITE_ORIGIN}`;

function deepLinkPayload(startArg: string): { kind: string; value: string } | null {
  const a = startArg.trim();
  if (!a) return null;
  const m = a.match(/^(novel|author|genre|article)[_-](.+)$/i);
  if (m) return { kind: m[1].toLowerCase(), value: m[2] };
  return { kind: 'query', value: a };
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message || update.edited_message;
  if (!message?.chat?.id) {
    if (update.callback_query) {
      return;
    }
    return;
  }

  const chatId = message.chat.id;
  if (message.from) {
    await upsertTelegramUser(message.from);
  }

  const text = (message.text || '').trim();
  if (!text) {
    await sendMessage(chatId, 'أرسل نصًا للبحث عن رواية أو مؤلف أو تصنيف.\n/help للمساعدة.');
    return;
  }

  if (/^\/start/i.test(text)) {
    const arg = text.replace(/^\/start\s*/i, '').trim();
    const payload = deepLinkPayload(arg);
    if (payload?.kind === 'novel' && payload.value) {
      const hits = await searchE7ketha('novels', payload.value.replace(/-/g, ' '));
      const exact = hits.find((h) => h.kind === 'novel' && h.slug === payload.value);
      if (exact && exact.kind === 'novel') {
        await sendMessage(chatId, `📖 <b>${exact.title}</b>${exact.author ? `\n✍️ ${exact.author}` : ''}`, {
          reply_markup: { inline_keyboard: [[{ text: '📚 فتح الرواية', url: exact.url }]] },
        });
        return;
      }
      if (hits.length) {
        const fmt = formatHits(hits);
        await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
        return;
      }
    }
    await sendMessage(
      chatId,
      `مرحبًا${message.from?.first_name ? ` ${message.from.first_name}` : ''} 👋\n\nأنا مساعد <b>𝐄𝟳𝐤𝐞𝐭𝐡𝐚</b> لاكتشاف الروايات العربية.\nاكتب اسم رواية أو نوعًا (مثل: رعب) وسأبحث لك.\n\n${HELP}`,
    );
    return;
  }

  if (/^\/help\b/i.test(text)) {
    await sendMessage(chatId, HELP);
    return;
  }

  if (/^\/novels\b/i.test(text)) {
    const hits = await searchE7ketha('novels', '');
    const fmt = formatHits(hits);
    await sendMessage(chatId, fmt.text || 'لا توجد روايات.', { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }
  if (/^\/authors\b/i.test(text)) {
    const hits = await searchE7ketha('authors', '');
    const fmt = formatHits(hits);
    await sendMessage(chatId, fmt.text || 'لا يوجد مؤلفون.', { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }
  if (/^\/genres\b/i.test(text)) {
    const hits = await searchE7ketha('genres', '');
    const fmt = formatHits(hits);
    await sendMessage(chatId, fmt.text || 'لا توجد تصنيفات.', { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }
  if (/^\/articles\b/i.test(text)) {
    const hits = await searchE7ketha('articles', '');
    const fmt = formatHits(hits);
    await sendMessage(chatId, fmt.text || 'لا توجد مقالات منشورة.', { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }

  if (/^\/admin\b/i.test(text)) {
    const admins = getTelegramAdminIds();
    const uid = message.from?.id;
    if (uid && admins.has(uid)) {
      await sendMessage(chatId, '👑 وضع المشرف مفعّل (V1).\nلاحقًا: إحصائيات وإدارة محتوى من هنا.');
    } else {
      await sendMessage(chatId, 'هذا الأمر للمشرفين فقط.');
    }
    return;
  }

  const intent = detectIntent(text);
  if (intent.type === 'help') {
    await sendMessage(chatId, HELP);
    return;
  }

  const searchType =
    intent.type === 'authors' || intent.type === 'genres' || intent.type === 'articles' || intent.type === 'novels'
      ? intent.type
      : 'novels';

  try {
    const hits = await searchE7ketha(searchType, intent.query);
    const fmt = formatHits(hits);
    await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
  } catch (err) {
    console.error('[telegram] search failed', err);
    await sendMessage(chatId, 'حدث خطأ أثناء البحث. حاول مرة أخرى بعد قليل.');
  }
}

export type { TelegramMessage };
