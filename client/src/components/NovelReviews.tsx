import { useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

function Stars({
  value,
  onChange,
  size = 22,
  interactive = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
  interactive?: boolean;
}) {
  return (
    <div className="flex gap-1" role={interactive ? 'radiogroup' : 'img'} aria-label={`تقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={`transition ${interactive ? 'hover:scale-110' : 'cursor-default'} ${
            n <= value ? 'text-[#c28228]' : 'text-muted-foreground/35'
          }`}
          aria-label={`${n} نجوم`}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function NovelReviews({ slug, avgRating, ratingCount }: { slug: string; avgRating: number; ratingCount: number }) {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const list = trpc.reviews.list.useQuery({ slug }, { enabled: Boolean(slug) });
  const mine = trpc.reviews.mine.useQuery({ slug }, { enabled: Boolean(slug) && Boolean(user) });
  const myRating = trpc.ratings.mine.useQuery({ slug }, { enabled: Boolean(slug) && Boolean(user) });
  const rate = trpc.ratings.set.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ تقييمك');
      void utils.ratings.mine.invalidate({ slug });
      void utils.novels.bySlug.invalidate({ slug });
    },
    onError: () => toast.error('سجّل الدخول أولًا لإضافة تقييم'),
  });
  const submit = trpc.reviews.upsert.useMutation({
    onSuccess: () => {
      toast.success('تم نشر رأيك');
      setBody('');
      void utils.reviews.list.invalidate({ slug });
      void utils.reviews.mine.invalidate({ slug });
      void utils.novels.bySlug.invalidate({ slug });
      void utils.ratings.mine.invalidate({ slug });
    },
    onError: (err) => toast.error(err.message || 'تعذر حفظ الرأي'),
  });

  const [body, setBody] = useState('');
  const [stars, setStars] = useState(0);

  const currentStars = stars || myRating.data || mine.data?.rating || 0;
  const displayAvg = avgRating > 10 ? avgRating / 100 : avgRating;

  return (
    <section className="mb-12 space-y-6">
      <div className="rounded-[20px] border border-border bg-card p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold md:text-lg">تقييمات القراء</h2>
            <p className="mt-1 text-xs text-muted-foreground">تقييمات حقيقية محفوظة في قاعدة البيانات</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#c28228]/25 bg-[#fff8ee] px-4 py-2 dark:bg-[#2a2218]">
            <Stars value={Math.round(displayAvg)} size={18} />
            <div className="text-sm font-extrabold text-[#9b6417] dark:text-[#e8c48a]">
              {displayAvg ? displayAvg.toFixed(1) : '—'}
              <span className="ms-1 text-[11px] font-medium text-muted-foreground">({ratingCount || 0})</span>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-border/80 bg-background/60 p-4">
          <p className="mb-2 text-xs font-bold text-muted-foreground">تقييمك بالنجوم</p>
          <Stars
            value={Number(currentStars) || 0}
            interactive={!authLoading}
            onChange={(n) => {
              setStars(n);
              rate.mutate({ slug, rating: n });
            }}
            size={28}
          />
          {!user && !authLoading ? (
            <p className="mt-2 text-[11px] text-muted-foreground">سجّل الدخول لحفظ تقييمك بشكل دائم.</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#675de8]/20 bg-gradient-to-br from-[#f8f7ff] to-transparent p-4 dark:from-[#1a1a2e]">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#675de8]" />
            <h3 className="text-sm font-extrabold">اكتب رأيك</h3>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="شارك انطباعك عن الرواية بشكل منظم: الحبكة، الأسلوب، الشخصيات… (20 حرفًا على الأقل)"
            className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-7 outline-none ring-[#675de8]/30 focus:ring-2"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">{body.trim().length}/4000 — الحد الأدنى 20 حرفًا</p>
            <button
              type="button"
              disabled={submit.isPending || body.trim().length < 20}
              onClick={() => {
                if (!user) {
                  toast.error('سجّل الدخول أولًا لكتابة رأيك');
                  return;
                }
                submit.mutate({
                  slug,
                  body: body.trim(),
                  rating: stars || myRating.data || undefined,
                });
              }}
              className="rounded-xl bg-[#675de8] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
            >
              {submit.isPending ? 'جاري النشر…' : mine.data ? 'تحديث رأيك' : 'نشر الرأي'}
            </button>
          </div>
          {mine.data ? (
            <p className="mt-3 rounded-xl border border-border/60 bg-card/80 p-3 text-xs leading-6 text-muted-foreground">
              <span className="font-bold text-foreground">رأيك الحالي: </span>
              {mine.data.body}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5 md:p-6">
        <h3 className="mb-4 text-sm font-extrabold">آراء القرّاء</h3>
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري التحميل…</p>
        ) : list.error ? (
          <p className="text-sm text-destructive">تعذر تحميل الآراء.</p>
        ) : !(list.data?.length) ? (
          <p className="text-sm text-muted-foreground">لا توجد آراء منشورة بعد — كن أول من يكتب رأيه.</p>
        ) : (
          <ul className="space-y-4">
            {list.data.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold">{item.userName?.trim() || 'قارئ'}</span>
                  <div className="flex items-center gap-2">
                    {item.rating ? <Stars value={item.rating} size={14} /> : null}
                    <time className="text-[10px] text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar') : ''}
                    </time>
                  </div>
                </div>
                <p className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
