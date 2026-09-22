import { Link, useRoute } from 'wouter';
import { BookOpen, Calendar, Loader2, User } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      if (block.startsWith('## ')) {
        return (
          <h2 key={i} className="mt-8 mb-3 text-xl font-extrabold">
            {block.slice(3)}
          </h2>
        );
      }
      if (block.startsWith('# ')) {
        return (
          <h2 key={i} className="mt-8 mb-3 text-2xl font-extrabold">
            {block.slice(2)}
          </h2>
        );
      }
      return (
        <p key={i} className="mb-4 text-sm leading-8 text-muted-foreground whitespace-pre-wrap">
          {block}
        </p>
      );
    });
}

export function ArticlesPage() {
  const list = trpc.articles.list.useQuery({ limit: 48 });
  const items = list.data ?? [];

  return (
    <div className="container py-10 md:py-14">
      <Breadcrumbs items={['مقالات']} />
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-bold text-[#675de8]">مدونة رِواية</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">مقالات</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          مقالات عن الأدب العربي، ترشيحات القراءة، ونصائح لاكتشاف روايات تستحق وقتك.
        </p>
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={18} /> جارٍ تحميل المقالات…
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="لا مقالات منشورة بعد" description="سيظهر هنا أول مقال عند نشره من لوحة التحكم." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group overflow-hidden rounded-[22px] border border-border bg-card transition hover:border-[#675de8]/40 hover:shadow-lg"
            >
              {article.coverUrl ? (
                <img
                  src={article.coverUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="grid aspect-[16/10] place-items-center bg-gradient-to-br from-[#efeeff] to-[#fff8ee] text-[#675de8]">
                  <BookOpen size={32} />
                </div>
              )}
              <div className="p-5">
                <h2 className="text-lg font-extrabold leading-7 group-hover:text-[#675de8]">{article.title}</h2>
                {article.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-6 text-muted-foreground">{article.excerpt}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  {article.authorName ? (
                    <span className="inline-flex items-center gap-1">
                      <User size={12} /> {article.authorName}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> {formatDate(article.publishedAt || article.createdAt)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArticlePage() {
  const [, params] = useRoute('/articles/:slug');
  const slug = params?.slug || '';
  const query = trpc.articles.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const article = query.data;

  if (query.isLoading) {
    return (
      <div className="container flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" size={18} /> جارٍ تحميل المقال…
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container py-16">
        <EmptyState title="المقال غير موجود" description="ربما تم حذفه أو لم يُنشر بعد." action="كل المقالات" href="/articles" />
      </div>
    );
  }

  return (
    <article className="container py-10 md:py-14">
      <Breadcrumbs items={['مقالات', article.title]} />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold text-[#675de8]">مقال</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-5xl">{article.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {article.authorName ? (
            <span className="inline-flex items-center gap-1.5">
              <User size={14} /> {article.authorName}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} /> {formatDate(article.publishedAt || article.createdAt)}
          </span>
        </div>
        {article.coverUrl ? (
          <img src={article.coverUrl} alt="" className="mt-8 aspect-[16/9] w-full rounded-[24px] object-cover shadow-lg" />
        ) : null}
        {article.excerpt ? (
          <p className="mt-8 rounded-2xl border border-border bg-muted/40 p-5 text-sm leading-8 text-muted-foreground">{article.excerpt}</p>
        ) : null}
        <div className="prose-article mt-8">{renderContent(article.content)}</div>
        <div className="mt-12 border-t border-border pt-6">
          <Link href="/articles" className="text-xs font-bold text-[#675de8]">
            ← العودة لكل المقالات
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ArticlesPage;
