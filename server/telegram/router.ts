import { SITE_ORIGIN } from './config';
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  setMyCommands,
  type TelegramUpdate,
} from './api';
import { upsertTelegramUser, getPlatformStats } from './users';
import {
  detectIntent,
  searchE7ketha,
  megaSearch,
  formatHits,
  listNovelsPage,
  mainReplyKeyboard,
} from './search';

let commandsRegistered = false;

async function ensureBotCommands() {
  if (commandsRegistered) return;
  try {
    await setMyCommands([
      { command: 'start', description: 'الرئيسية والإحصائيات' },
      { command: 'novels', description: 'تصفح كل الروايات' },
      { command: 'search', description: 'بحث في المكتبة' },
      { command: 'authors', description: 'المؤلفون' },
      { command: 'genres', description: 'التصنيفات' },
      { command: 'articles', description: 'المقالات' },
      { command: 'stats', description: 'أرقام المنصة' },
      { command: 'help', description: 'قائمة الأوامر' },
    ]);
    commandsRegistered = true;
  } catch (err) {
    console.warn('[telegram] setMyCommands failed', err);
  }
}

function commandsHelp(): string {
  return `📋 <b>قائمة الأوامر</b>

/start — الشاشة الرئيسية والإحصائيات
/help — هذه القائمة
/novels — تصفح كل الروايات (صفحات)
/search كلمة — بحث قوي في الروايات والمؤلفين
/authors — المؤلفون
/genres — التصنيفات
/articles — المقالات
/stats — أرقام المنصة

أو استخدم الأزرار أسفل الشاشة 👇`;
}

async function buildWelcome(firstName?: string): Promise<string> {
  let statsLine = '';
  try {
    const s = await getPlatformStats();
    statsLine = `━━━━━━━━━━━━━━
👥 مستخدمو البوت: <b>${s.botUsers.toLocaleString('ar-EG')}</b>
📖 الروايات: <b>${s.novels.toLocaleString('ar-EG')}</b>
✍️ المؤلفون: <b>${s.authors.toLocaleString('ar-EG')}</b>
🏷️ التصنيفات: <b>${s.genres.toLocaleString('ar-EG')}</b>
━━━━━━━━━━━━━━
`;
  } catch {
    statsLine = '';
  }

  const name = firstName ? ` ${firstName}` : '';
  return `مرحبًا${name} 👋

أنا مساعد <b>𝐄𝟳𝐤𝐞𝐭𝐡𝐚</b> لاكتشاف الروايات العربية.

${statsLine}
🔍 اكتب اسم رواية أو نوعًا (مثل: رعب)
📚 أو اضغط «الروايات» لتصفح المكتبة كاملة

${commandsHelp()}

🌐 ${SITE_ORIGIN}`;
}

async function sendNovelsPage(chatId: number, page: number, edit?: { messageId: number }) {
  const { hits, page: p, totalPages, total } = await listNovelsPage(page);
  const fmt = formatHits(hits, {
    title: '📚 مكتبة الروايات',
    page: p,
    totalPages,
    total,
  });
  if (edit?.messageId) {
    try {
      await editMessageText(chatId, edit.messageId, fmt.text, {
        reply_markup: { inline_keyboard: fmt.keyboard },
      });
      return;
    } catch {
      /* fall through */
    }
  }
  await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  await ensureBotCommands();

  if (update.callback_query) {
    const cq = update.callback_query;
    const data = (cq.data || '').trim();
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    if (cq.from) await upsertTelegramUser(cq.from);

    if (data === 'noop') {
      await answerCallbackQuery(cq.id);
      return;
    }
    const m = data.match(/^novels:(\d+)$/);
    if (m && chatId) {
      const page = Number(m[1]);
      await answerCallbackQuery(cq.id, `صفحة ${page + 1}`);
      await sendNovelsPage(chatId, page, messageId ? { messageId } : undefined);
      return;
    }
    await answerCallbackQuery(cq.id);
    return;
  }

  const message = update.message || update.edited_message;
  if (!message?.chat?.id) return;

  const chatId = message.chat.id;
  if (message.from) await upsertTelegramUser(message.from);

  const text = (message.text || '').trim();
  if (!text) {
    await sendMessage(chatId, 'أرسل نصًا للبحث، أو استخدم الأزرار بالأسفل.\n/help للمساعدة.', {
      reply_markup: mainReplyKeyboard(),
    });
    return;
  }

  if (/^\/start/i.test(text)) {
    const arg = text.replace(/^\/start(?:@\w+)?\s*/i, '').trim();
    if (arg) {
      const deep = arg.match(/^(novel|author|genre|article)[_-](.+)$/i);
      if (deep) {
        const kind = deep[1].toLowerCase();
        const value = deep[2];
        if (kind === 'novel') {
          const hits = await searchE7ketha('novels', value.replace(/-/g, ' '));
          const exact = hits.find((h) => h.kind === 'novel' && h.slug === value);
          if (exact && exact.kind === 'novel') {
            await sendMessage(
              chatId,
              `📖 <b>${exact.title}</b>${exact.author ? `\n✍️ ${exact.author}` : ''}`,
              {
                reply_markup: {
                  inline_keyboard: [[{ text: '📚 فتح الرواية', url: exact.url }]],
                },
              },
            );
            return;
          }
        }
      }
    }
    const welcome = await buildWelcome(message.from?.first_name);
    await sendMessage(chatId, welcome, { reply_markup: mainReplyKeyboard() });
    return;
  }

  if (/^\/help\b/i.test(text) || text === '❓ مساعدة') {
    await sendMessage(chatId, commandsHelp(), { reply_markup: mainReplyKeyboard() });
    return;
  }

  if (/^\/stats\b/i.test(text)) {
    const s = await getPlatformStats();
    await sendMessage(
      chatId,
      `📊 <b>إحصائيات 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</b>\n\n👥 مستخدمو البوت: <b>${s.botUsers.toLocaleString('ar-EG')}</b>\n📖 الروايات: <b>${s.novels.toLocaleString('ar-EG')}</b>\n✍️ المؤلفون: <b>${s.authors.toLocaleString('ar-EG')}</b>\n🏷️ التصنيفات: <b>${s.genres.toLocaleString('ar-EG')}</b>\n📰 المقالات: <b>${s.articles.toLocaleString('ar-EG')}</b>`,
      { reply_markup: mainReplyKeyboard() },
    );
    return;
  }

  if (/^\/novels\b/i.test(text) || text === '📚 الروايات' || /^\/browse\b/i.test(text)) {
    await sendNovelsPage(chatId, 0);
    return;
  }

  if (/^\/search\b/i.test(text) || text === '🔍 بحث') {
    const q = text.replace(/^\/search\b/i, '').replace(/🔍 بحث/g, '').trim();
    if (!q) {
      await sendMessage(
        chatId,
        '🔍 <b>البحث</b>\n\nاكتب بعد الأمر كلمة البحث، مثل:\n<code>/search رعب</code>\nأو مباشرة: <b>أحمد خالد توفيق</b>',
        { reply_markup: mainReplyKeyboard() },
      );
      return;
    }
    const hits = await megaSearch(q);
    const fmt = formatHits(hits, { title: `نتائج البحث: ${q}` });
    await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }

  if (/^\/authors\b/i.test(text) || text === '✍️ المؤلفون') {
    const hits = await searchE7ketha('authors', '');
    const fmt = formatHits(hits, { title: '✍️ المؤلفون' });
    await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }

  if (/^\/genres\b/i.test(text) || text === '🏷️ التصنيفات') {
    const hits = await searchE7ketha('genres', '');
    const fmt = formatHits(hits, { title: '🏷️ التصنيفات' });
    await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }

  if (/^\/articles\b/i.test(text) || text === '📰 مقالات') {
    const hits = await searchE7ketha('articles', '');
    const fmt = formatHits(hits, { title: '📰 المقالات' });
    await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
    return;
  }

  const intent = detectIntent(text);
  if (intent.type === 'browse') {
    await sendNovelsPage(chatId, 0);
    return;
  }
  if (intent.type === 'help' || intent.type === 'menu') {
    await sendMessage(chatId, commandsHelp(), { reply_markup: mainReplyKeyboard() });
    return;
  }

  const hits =
    intent.type === 'novels' && intent.q
      ? await megaSearch(intent.q)
      : await searchE7ketha(intent.type, 'q' in intent ? intent.q : '');
  const fmt = formatHits(hits, {
    title: intent.type === 'novels' ? (intent.q ? `نتائج: ${intent.q}` : 'روايات مقترحة') : undefined,
  });
  await sendMessage(chatId, fmt.text, { reply_markup: { inline_keyboard: fmt.keyboard } });
}
