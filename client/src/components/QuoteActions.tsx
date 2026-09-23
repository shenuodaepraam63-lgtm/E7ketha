import { useEffect, useMemo, useState } from 'react';
import { Download, Heart, Share2, X, Copy, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export type QuoteLike = {
  id: number;
  quote_text: string;
  author_name?: string | null;
  speaker?: string | null;
  book_title?: string | null;
};

const BRAND = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 📖 | كُـل رِوَايـة لَهـا حِڪَايـة ✍︎';
const SITE = 'https://e7ketha.com';

type TemplateId = 'night' | 'sand' | 'lilac' | 'ink' | 'aurora';

const TEMPLATES: { id: TemplateId; label: string; bg: [string, string]; fg: string; muted: string; accent: string }[] = [
  { id: 'night', label: 'ليلي', bg: ['#0b1229', '#171e42'], fg: '#f4f2ff', muted: 'rgba(244,242,255,.72)', accent: '#a39bff' },
  { id: 'sand', label: 'ورقي', bg: ['#f7f0e4', '#efe4d0'], fg: '#2a2418', muted: 'rgba(42,36,24,.7)', accent: '#8b6914' },
  { id: 'lilac', label: 'بنفسجي', bg: ['#ece8ff', '#d9d2ff'], fg: '#1e1840', muted: 'rgba(30,24,64,.7)', accent: '#675de8' },
  { id: 'ink', label: 'حبر', bg: ['#111111', '#1c1c1c'], fg: '#fafafa', muted: 'rgba(250,250,250,.7)', accent: '#e8c36a' },
  { id: 'aurora', label: 'شفق', bg: ['#141d49', '#2a1f5c'], fg: '#fff8f0', muted: 'rgba(255,248,240,.75)', accent: '#ffcf9b' },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 14);
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderQuoteCard(quote: QuoteLike, templateId: TemplateId): Promise<Blob> {
  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, tpl.bg[0]);
  grad.addColorStop(1, tpl.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = tpl.accent;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.arc(W - 80, 80, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const logo = await loadImage('/favicon.png');
  if (logo) ctx.drawImage(logo, 72, 64, 72, 72);

  ctx.fillStyle = tpl.fg;
  ctx.font = '700 28px Cairo, Tajawal, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillText(BRAND, W - 72, 100);
  ctx.font = '500 22px Cairo, Tajawal, system-ui, sans-serif';
  ctx.fillStyle = tpl.muted;
  ctx.fillText('e7ketha.com', W - 72, 140);

  ctx.fillStyle = tpl.accent;
  ctx.font = '700 120px Georgia, serif';
  ctx.fillText('\u201C', W - 72, 280);

  ctx.fillStyle = tpl.fg;
  ctx.font = '600 44px Cairo, Tajawal, system-ui, sans-serif';
  const lines = wrapText(ctx, quote.quote_text, W - 160);
  let y = 340;
  for (const line of lines) {
    ctx.fillText(line, W - 80, y);
    y += 62;
  }

  const who = quote.author_name || quote.speaker || '';
  const book = quote.book_title || '';
  y = Math.max(y + 40, H - 280);
  ctx.fillStyle = tpl.accent;
  ctx.font = '700 28px Cairo, Tajawal, system-ui, sans-serif';
  if (who) ctx.fillText(`\u2014 ${who}`, W - 80, y);
  ctx.fillStyle = tpl.muted;
  ctx.font = '500 24px Cairo, Tajawal, system-ui, sans-serif';
  if (book) ctx.fillText(book, W - 80, y + 42);

  ctx.fillStyle = tpl.accent;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(0, H - 110, W, 110);
  ctx.globalAlpha = 1;
  ctx.fillStyle = tpl.fg;
  ctx.font = '600 24px Cairo, Tajawal, system-ui, sans-serif';
  ctx.fillText(`${SITE}/quotes/${quote.id}`, W - 80, H - 48);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob failed'))), 'image/png', 0.95);
  });
}

export function QuoteActions({ quote }: { quote: QuoteLike }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const savedQ = trpc.quotes.savedState.useQuery({ id: quote.id }, { enabled: Boolean(user) && quote.id > 0 });
  const saveM = trpc.quotes.save.useMutation({
    onSuccess: () => {
      void utils.quotes.savedState.invalidate({ id: quote.id });
      void utils.quotes.saved.invalidate();
      toast.success('تم حفظ الاقتباس');
    },
    onError: (e) => toast.error(e.message || 'تعذر الحفظ — سجّل الدخول أولاً'),
  });
  const unsaveM = trpc.quotes.unsave.useMutation({
    onSuccess: () => {
      void utils.quotes.savedState.invalidate({ id: quote.id });
      void utils.quotes.saved.invalidate();
      toast.success('أُزيل من المحفوظات');
    },
  });
  const saved = Boolean(savedQ.data);
  const [open, setOpen] = useState(false);
  const [tpl, setTpl] = useState<TemplateId>('night');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageUrl = `${SITE}/quotes/${quote.id}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    void renderQuoteCard(quote, tpl)
      .then((blob) => {
        if (cancelled) return;
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => toast.error('تعذر إنشاء الصورة'))
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tpl, quote]);

  const plainText = useMemo(() => {
    const who = quote.author_name || quote.speaker || 'القائل غير محدد';
    const book = quote.book_title || '';
    return `\u201C${quote.quote_text}\u201D\n\n\u2014 ${who}${book ? `\n${book}` : ''}\n\n${BRAND}\n${pageUrl}`;
  }, [quote, pageUrl]);

  const toggleSave = () => {
    if (!user) {
      toast.error('سجّل الدخول لحفظ الاقتباس');
      window.location.href = `/login?next=/quotes/${quote.id}`;
      return;
    }
    if (saved) unsaveM.mutate({ id: quote.id });
    else saveM.mutate({ id: quote.id });
  };

  const downloadImage = async () => {
    try {
      setBusy(true);
      const blob = await renderQuoteCard(quote, tpl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `e7ketha-quote-${quote.id}-${tpl}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تنزيل صورة الاقتباس');
    } catch {
      toast.error('فشل التنزيل');
    } finally {
      setBusy(false);
    }
  };

  const shareImage = async () => {
    try {
      setBusy(true);
      const blob = await renderQuoteCard(quote, tpl);
      const file = new File([blob], `e7ketha-quote-${quote.id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: BRAND, text: plainText, url: pageUrl });
        return;
      }
      await downloadImage();
      toast.message('المشاركة بالصورة غير مدعومة هنا — تم تنزيل الصورة');
    } catch {
      /* cancelled */
    } finally {
      setBusy(false);
    }
  };

  const shareText = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND, text: plainText, url: pageUrl });
        return;
      }
      await navigator.clipboard.writeText(plainText);
      toast.success('تم نسخ النص');
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        toast.success('تم نسخ النص');
      } catch {
        toast.error('تعذر المشاركة');
      }
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={toggleSave}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-extrabold transition ${
            saved ? 'border-[#675de8] bg-[#eceaff] text-[#675de8]' : 'border-border bg-card text-foreground hover:border-[#675de8]'
          }`}
        >
          <Heart size={15} fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'محفوظ' : 'حفظ'}
        </button>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#675de8] px-4 py-3 text-xs font-extrabold text-white">
          <Share2 size={15} /> مشاركة / صورة
        </button>
        <button type="button" onClick={() => void shareText()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold">
          <Copy size={15} /> نسخ النص
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal>
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold">مشاركة الاقتباس</h3>
              <button type="button" className="grid size-9 place-items-center rounded-full border" onClick={() => setOpen(false)} aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">اختر قالبًا ثم شارك كصورة أو كنص. يظهر اسم المنصة ورابط الاقتباس على الصورة.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => setTpl(t.id)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${tpl === t.id ? 'bg-[#675de8] text-white' : 'border border-border'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-muted/30">
              {preview ? (
                <img src={preview} alt="معاينة بطاقة الاقتباس" className="mx-auto max-h-[420px] w-auto" />
              ) : (
                <div className="grid h-48 place-items-center text-xs text-muted-foreground">{busy ? 'جارٍ تجهيز الصورة…' : '—'}</div>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" disabled={busy} onClick={() => void shareImage()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#675de8] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60">
                <ImageIcon size={15} /> مشاركة الصورة
              </button>
              <button type="button" disabled={busy} onClick={() => void downloadImage()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold disabled:opacity-60">
                <Download size={15} /> تنزيل PNG
              </button>
              <button type="button" onClick={() => void shareText()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-xs font-extrabold sm:col-span-2">
                <Share2 size={15} /> مشاركة / نسخ النص
              </button>
            </div>
            {!user && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                للحفظ في حسابك:{' '}
                <Link href={`/login?next=/quotes/${quote.id}`} className="font-bold text-[#675de8]">
                  تسجيل الدخول
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
