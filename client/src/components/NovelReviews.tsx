import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

function Stars({
  value,
  size = 22,
  interactive = false,
  onPick,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onPick?: (n: number) => void;
}) {
  return (
    <div className="flex gap-1" role="img" aria-label={`تقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onPick?.(n)}
          className={`${n <= value ? 'text-[#c28228]' : 'text-muted-foreground/35'} ${interactive ? 'cursor-pointer transition hover:scale-110' : 'cursor-default'}`}
          aria-label={interactive ? `تقييم ${n}` : undefined}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 7) return `منذ ${days} أيام`;
  if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
  return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 6;

export function NovelReviews({
  slug,
  avgRating,
  ratingCount = 0,
}: {
  slug: string;
  avgRating: number;
  ratingCount?: number;
}) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [body, setBody] = useState('');
  const [myStars, setMyStars] = useState(0);
  const [prefilled, setPrefilled] = useState(false);

  const list = trpc.reviews.list.useQuery({ slug, limit: 100 }, { enabled: Boolean(slug) });
  const mine = trpc.reviews.mine.useQuery({ slug }, { enabled: Boolean(user && slug) });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (prefilled || !mine.data) return;
    if (mine.data.body) setBody(mine.data.body);
    if (mine.data.rating) setMyStars(Number(mine.data.rating));
    setPrefilled(true);
  }, [mine.data, prefilled]);

  const upsert = trpc.reviews.upsert.useMutation({
    onSuccess: () => {
      toast.success('تم إرسال رأيك — سيظهر بعد المراجعة إن لزم');
      setBody('');
      void utils.reviews.list.invalidate({ slug });
      void utils.reviews.mine.invalidate({ slug });
    },
    onError: (error) => toast.error(error.message),
  });

  const displayAvg = avgRating > 10 ? avgRating / 100 : avgRating;
  const items = list.data ?? [];
  const totalCount = items.length || ratingCount || 0;
  const shown = items.slice(0, visible);
  const hasMore = visible < items.length;

  const computedAvg = useMemo(() => {
    if (!items.length) return displayAvg;
    const withRating = items.filter((r) => typeof r.rating === 'number' && r.rating > 0);
    if (!withRating.length) return displayAvg;
    const sum = withRating.reduce((acc, r) => acc + Number(r.rating), 0);
    return sum / withRating.length;
  }, [items, displayAvg]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error('سجّل الدخول لكتابة رأيك');
      return;
    }
    if (body.trim().length < 20) {
      toast.error('اكتب رأياً أوضح (20 حرفاً على الأقل)');
      return;
    }
    upsert.mutate({
      slug,
      body: body.trim(),
      rating: myStars > 0 ? myStars : undefined,
    });
  };

  return (
    <section className="mb-14 grid gap-6" aria-labelledby="reviews-heading">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="rounded-[20px] border border-border bg-card p-5 text-center">
          <p id="reviews-heading" className="text-xs font-bold text-muted-foreground">
            تقييم القراء
          </p>
          <p className="mt-2 text-4xl font-black text-[#b9761e]">
            {computedAvg > 0 ? computedAvg.toFixed(1) : '—'}
          </p>
          <div className="mt-2 flex justify-center">
            <Stars value={Math.round(computedAvg)} size={18} />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {totalCount > 0 ? `${totalCount} رأي منشور` : 'لا توجد آراء منشورة بعد'}
          </p>
        </div>

        <div className="rounded-[20px] border border-[#675de8]/20 bg-gradient-to-br from-[#f8f7ff] to-transparent p-4 dark:from-[#1a1a2e]">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#675de8]" />
            <h3 className="text-sm font-extrabold">آراء حقيقية من القرّاء</h3>
          </div>
          <p className="text-[11px] leading-6 text-muted-foreground">
            يُعرض هنا فقط ما أرسله مستخدمون مسجّلون. لا توجد تعليقات تجريبية أو ثابتة.
          </p>
        </div>
      </div>

      {user ? (
        <form onSubmit={submit} className="rounded-[20px] border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-extrabold">
            {mine.data ? 'عدّل رأيك' : 'اكتب رأيك'}
          </h3>
          <div className="mb-3">
            <Stars value={myStars || Number(mine.data?.rating) || 0} size={22} interactive onPick={setMyStars} />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="شارك انطباعك الحقيقي عن الرواية (٢٠ حرفاً على الأقل)…"
            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]"
          />
          <button
            type="submit"
            disabled={upsert.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {upsert.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            نشر الرأي
          </button>
        </form>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <a href="/login" className="font-bold text-[#675de8]">
            سجّل الدخول
          </a>{' '}
          لكتابة رأيك الحقيقي عن الرواية.
        </p>
      )}

      <div className="rounded-[20px] border border-border bg-card p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">آراء القرّاء</h3>
          <span className="text-[11px] text-muted-foreground">{totalCount} رأي</span>
        </div>

        {list.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> جارٍ التحميل…
          </div>
        ) : shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا توجد آراء منشورة لهذه الرواية بعد. كن أول من يكتب رأياً حقيقياً.
          </p>
        ) : (
          <ul className="space-y-4">
            {shown.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold">{item.userName || 'قارئ'}</span>
                  <div className="flex items-center gap-2">
                    {item.rating ? <Stars value={Number(item.rating)} size={14} /> : null}
                    <time className="text-[10px] text-muted-foreground">{formatDate(item.createdAt)}</time>
                  </div>
                </div>
                <p className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">{item.body}</p>
              </li>
            ))}
          </ul>
        )}

        {hasMore ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, items.length))}
              className="rounded-xl border border-[#675de8]/35 bg-[#f0eeff] px-5 py-2.5 text-xs font-extrabold text-[#5548d1] transition hover:bg-[#e8e5ff] dark:bg-[#24224c] dark:text-[#c8c4ff]"
            >
              عرض المزيد ({items.length - visible} متبقية)
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
