import { useMemo, useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';

function Stars({
  value,
  size = 22,
}: {
  value: number;
  size?: number;
}) {
  return (
    <div className="flex gap-1" role="img" aria-label={`تقييم ${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= value ? 'text-[#c28228]' : 'text-muted-foreground/35'}
          aria-hidden
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </span>
      ))}
    </div>
  );
}

/** آراء نصية ثابتة فقط — غير مرتبطة بقاعدة البيانات */
const STATIC_REVIEWS: { userName: string; rating: number; body: string; daysAgo: number }[] = [
  {
    userName: 'سارة م.',
    rating: 5,
    body: 'رواية استثنائية من أول صفحة. الأسلوب سلس والأحداث متماسكة، وأنصح بها بشدة لكل محبي الأدب العربي المعاصر.',
    daysAgo: 2,
  },
  {
    userName: 'أحمد خليل',
    rating: 4,
    body: 'حبكة قوية وشخصيات مقنعة. الجزء الأوسط كان أبطأ قليلاً لكن النهاية عوضت كل شيء.',
    daysAgo: 5,
  },
  {
    userName: 'نورة العتيبي',
    rating: 5,
    body: 'من أجمل ما قرأت هذا العام. اللغة شاعرية دون تكلف، والرسالة الإنسانية واضحة ومؤثرة.',
    daysAgo: 8,
  },
  {
    userName: 'يوسف ر.',
    rating: 4,
    body: 'تجربة قراءة ممتعة. بعض الفصول تحتاج تركيزاً أكثر، لكن القيمة الأدبية عالية جداً.',
    daysAgo: 12,
  },
  {
    userName: 'مريم حسن',
    rating: 5,
    body: 'أعجبتني كثيراً. التشبيهات رائعة والحوار طبيعي. سأعيد قراءتها قريباً إن شاء الله.',
    daysAgo: 15,
  },
  {
    userName: 'كريم فؤاد',
    rating: 3,
    body: 'بداية قوية ثم تباطؤ ملحوظ. النهاية جيدة لكن كنت أتوقع تطوراً أكبر للشخصية الرئيسية.',
    daysAgo: 18,
  },
  {
    userName: 'ليلى منصور',
    rating: 5,
    body: 'رواية تلامس القلب. كل فصل يحمل مفاجأة، والكتابة أنيقة ومؤثرة في آن واحد.',
    daysAgo: 22,
  },
  {
    userName: 'عمر الشامي',
    rating: 4,
    body: 'أسلوب الكاتب مميز. أحببت التفاصيل الدقيقة في وصف الأماكن والأجواء.',
    daysAgo: 27,
  },
  {
    userName: 'هند جابر',
    rating: 5,
    body: 'من الروايات التي تبقى في الذاكرة. أنصح بها لكل من يبحث عن قصة عميقة وممتعة.',
    daysAgo: 31,
  },
  {
    userName: 'طلال ع.',
    rating: 4,
    body: 'قراءة سلسة وممتعة. بعض الحوارات طويلة قليلاً لكنها تخدم الحبكة جيداً.',
    daysAgo: 36,
  },
  {
    userName: 'رنيم س.',
    rating: 5,
    body: 'رواية مكتوبة بروح صادقة. شعرت أني جزء من الأحداث من الصفحة الأولى.',
    daysAgo: 40,
  },
  {
    userName: 'باسم نبيل',
    rating: 4,
    body: 'مستوى أدبي راقٍ. أنصح بها لمحبي الروايات الاجتماعية والواقعية.',
    daysAgo: 45,
  },
];

const PAGE_SIZE = 4;

/** عدّاد ثابت يعتمد على الـ slug فقط (نص/حساب محلي — بدون قاعدة بيانات) */
function staticCountFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  // بين 12 و 87 تقريباً حتى يبدو العداد «يزيد» حسب الرواية
  return 12 + (h % 76);
}

function formatRelativeDate(daysAgo: number): string {
  if (daysAgo <= 1) return 'اليوم';
  if (daysAgo <= 2) return 'أمس';
  if (daysAgo < 7) return `منذ ${daysAgo} أيام`;
  if (daysAgo < 30) return `منذ ${Math.floor(daysAgo / 7)} أسابيع`;
  return `منذ ${Math.floor(daysAgo / 30)} شهر`;
}

export function NovelReviews({
  slug,
  avgRating,
}: {
  slug: string;
  avgRating: number;
  ratingCount?: number;
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const displayAvg = avgRating > 10 ? avgRating / 100 : avgRating;
  const totalCount = useMemo(() => staticCountFromSlug(slug || 'default'), [slug]);

  // نكرر الآراء النصية حسب الحاجة لملء العداد الظاهر
  const allItems = useMemo(() => {
    const items: { id: string; userName: string; rating: number; body: string; label: string }[] = [];
    for (let i = 0; i < totalCount; i++) {
      const base = STATIC_REVIEWS[i % STATIC_REVIEWS.length]!;
      items.push({
        id: `static-${i}`,
        userName: base.userName,
        rating: base.rating,
        body: base.body,
        label: formatRelativeDate(base.daysAgo + Math.floor(i / STATIC_REVIEWS.length) * 3),
      });
    }
    return items;
  }, [totalCount]);

  const shown = allItems.slice(0, visible);
  const hasMore = visible < allItems.length;

  return (
    <section className="mb-12 space-y-6">
      <div className="rounded-[20px] border border-border bg-card p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold md:text-lg">تقييمات القراء</h2>
            <p className="mt-1 text-xs text-muted-foreground">آراء معروضة كنص فقط</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#c28228]/25 bg-[#fff8ee] px-4 py-2 dark:bg-[#2a2218]">
            <Stars value={Math.round(displayAvg) || 4} size={18} />
            <div className="text-sm font-extrabold text-[#9b6417] dark:text-[#e8c48a]">
              {displayAvg ? displayAvg.toFixed(1) : '4.2'}
              <span className="ms-1 text-[11px] font-medium text-muted-foreground">({totalCount})</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#675de8]/20 bg-gradient-to-br from-[#f8f7ff] to-transparent p-4 dark:from-[#1a1a2e]">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-[#675de8]" />
            <h3 className="text-sm font-extrabold">آراء القراء</h3>
          </div>
          <p className="text-[11px] leading-6 text-muted-foreground">
            هذا القسم يعرض نصوصاً ثابتة للعرض فقط وغير مرتبط بقاعدة البيانات.
          </p>
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">آراء القرّاء</h3>
          <span className="text-[11px] text-muted-foreground">{totalCount} رأي</span>
        </div>

        <ul className="space-y-4">
          {shown.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold">{item.userName}</span>
                <div className="flex items-center gap-2">
                  <Stars value={item.rating} size={14} />
                  <time className="text-[10px] text-muted-foreground">{item.label}</time>
                </div>
              </div>
              <p className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ul>

        {hasMore ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, allItems.length))}
              className="rounded-xl border border-[#675de8]/35 bg-[#f0eeff] px-5 py-2.5 text-xs font-extrabold text-[#5548d1] transition hover:bg-[#e8e5ff] dark:bg-[#24224c] dark:text-[#c8c4ff]"
            >
              عرض المزيد ({allItems.length - visible} متبقية)
            </button>
          </div>
        ) : null}

        {!hasMore && allItems.length > PAGE_SIZE ? (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">تم عرض كل الآراء</p>
        ) : null}
      </div>
    </section>
  );
}
