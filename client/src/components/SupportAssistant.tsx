import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { MessageCircle, X, Send } from 'lucide-react';

type Msg = { role: 'bot' | 'user'; text: string };

const FAQ: { label: string; answer: string; href?: string }[] = [
  {
    label: 'كيف أبحث عن رواية؟',
    answer:
      'من شريط البحث أعلى الموقع اكتب اسم الرواية أو المؤلف أو النوع (مثل: رعب). يمكنك أيضًا فتح «استكشف» وتصفية النتائج.',
    href: '/explore',
  },
  {
    label: 'أين الاقتباسات؟',
    answer: 'قسم الاقتباسات يجمع مقتطفات من الروايات مع إمكانية الحفظ والمشاركة كصورة.',
    href: '/quotes',
  },
  {
    label: 'كيف أنشئ حسابًا؟',
    answer: 'من صفحة تسجيل الدخول اختر «إنشاء حساب»، ثم أكّد بريدك إن طُلب ذلك. بعدها يمكنك حفظ الروايات والاقتباسات.',
    href: '/login',
  },
  {
    label: 'هل تستضيفون ملفات الكتب؟',
    answer:
      'لا. رِواية منصة اكتشاف فقط: معلومات، ملخصات، تصنيفات واقتباسات وروابط قانونية — دون استضافة ملفات الكتب.',
  },
  {
    label: 'تواصل معنا',
    answer: 'للاقتراحات أو الإبلاغ عن مشكلة استخدم صفحة التواصل أو الإبلاغ من تذييل الموقع.',
    href: '/contact',
  },
];

const WELCOME =
  'أهلًا بك في رِواية 👋\nاختر موضوعًا من الأزرار بالأسفل وسأرشدك مباشرة — هذا مساعد ثابت بإجابات جاهزة (وليس ذكاءً اصطناعيًا).';

/** Static FAQ helper — not AI */
export function SupportAssistant() {
  const [location] = useLocation();
  const hidden = useMemo(
    () =>
      location.startsWith('/admin') ||
      location.startsWith('/login') ||
      location.startsWith('/register'),
    [location],
  );

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: WELCOME }]);
  const [draft, setDraft] = useState('');

  if (hidden) return null;

  const pushFaq = (item: (typeof FAQ)[number]) => {
    setMessages((m) => [
      ...m,
      { role: 'user', text: item.label },
      {
        role: 'bot',
        text: item.answer + (item.href ? `\n\n→ ${item.href}` : ''),
      },
    ]);
  };

  const onSend = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    const match = FAQ.find(
      (f) => t.includes(f.label.slice(0, 8)) || f.label.includes(t) || f.answer.includes(t),
    );
    setMessages((m) => [
      ...m,
      { role: 'user', text: t },
      {
        role: 'bot',
        text: match
          ? match.answer + (match.href ? `\n\n→ ${match.href}` : '')
          : 'شكرًا لرسالتك. اختر أحد المواضيع الجاهزة بالأسفل، أو تواصل معنا من صفحة «تواصل معنا» وسنرد في أقرب وقت.',
      },
    ]);
  };

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] end-3 z-[60] md:bottom-6 md:end-6">
      {open && (
        <div className="mb-3 flex h-[min(28rem,70vh)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-[#171e42] px-4 py-3 text-white">
            <div>
              <div className="text-sm font-extrabold">مساعد رِواية</div>
              <div className="text-[10px] text-white/65">إجابات جاهزة · ليس ذكاءً اصطناعيًا</div>
            </div>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-6 ${
                  msg.role === 'bot'
                    ? 'bg-muted text-foreground'
                    : 'ms-auto bg-[#675de8] text-white'
                }`}
              >
                {msg.text.split('\n').map((line, j) => {
                  if (line.startsWith('→ /')) {
                    const href = line.replace('→ ', '').trim();
                    return (
                      <Link key={j} href={href} className="mt-1 block font-bold text-[#675de8] underline">
                        افتح الصفحة
                      </Link>
                    );
                  }
                  return (
                    <span key={j}>
                      {j > 0 && <br />}
                      {line}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-border px-2 py-2">
            {FAQ.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => pushFaq(item)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-foreground/80 hover:border-[#675de8]/50 hover:text-[#675de8]"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="اكتب باختصار…"
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-[#675de8]"
            />
            <button
              type="button"
              onClick={onSend}
              className="grid size-10 place-items-center rounded-xl bg-[#675de8] text-white hover:bg-[#5a50d6]"
              aria-label="إرسال"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 items-center gap-2 rounded-full bg-[#675de8] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#675de8]/35 transition hover:bg-[#5a50d6]"
        aria-label="فتح مساعد رِواية"
      >
        <MessageCircle size={20} />
        <span className="hidden sm:inline">{open ? 'إغلاق' : 'هل تحتاج مساعدة؟'}</span>
      </button>
    </div>
  );
}
