import { useEffect, useState } from 'react';
import { Edit3, Eye, EyeOff, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

type Status = 'draft' | 'published' | 'archived';

const emptyForm = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverUrl: '',
  status: 'draft' as Status,
  authorName: '',
  seoTitle: '',
  seoDescription: '',
  tags: '',
};

function slugFromTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9\-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
}

export function AdminArticlesManager() {
  const utils = trpc.useUtils();
  const list = trpc.admin.articles.list.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showEditor, setShowEditor] = useState(false);

  const create = trpc.admin.articles.create.useMutation({
    onSuccess: () => {
      toast.success('تم إنشاء المقال');
      reset();
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.admin.articles.update.useMutation({
    onSuccess: () => {
      toast.success('تم حفظ المقال');
      reset();
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const publish = trpc.admin.articles.publish.useMutation({
    onSuccess: () => {
      toast.success('تم النشر');
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const unpublish = trpc.admin.articles.unpublish.useMutation({
    onSuccess: () => {
      toast.success('تم إلغاء النشر');
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.admin.articles.delete.useMutation({
    onSuccess: () => {
      toast.success('تم الحذف');
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowEditor(false);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowEditor(true);
  };

  const startEdit = (article: NonNullable<typeof list.data>[number]) => {
    setEditingId(article.id);
    setForm({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt ?? '',
      content: article.content,
      coverUrl: article.coverUrl ?? '',
      status: article.status,
      authorName: article.authorName ?? '',
      seoTitle: article.seoTitle ?? '',
      seoDescription: article.seoDescription ?? '',
      tags: article.tags ?? '',
    });
    setShowEditor(true);
  };

  useEffect(() => {
    if (!form.slug && form.title && !editingId) {
      setForm((f) => ({ ...f, slug: slugFromTitle(f.title) }));
    }
  }, [form.title, form.slug, editingId]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      slug: form.slug || slugFromTitle(form.title),
      title: form.title,
      excerpt: form.excerpt || null,
      content: form.content,
      coverUrl: form.coverUrl || null,
      status: form.status,
      authorName: form.authorName || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      tags: form.tags || null,
    };
    if (editingId) update.mutate({ id: editingId, data: payload });
    else create.mutate(payload);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-amber-50 text-amber-800',
      published: 'bg-emerald-50 text-emerald-800',
      archived: 'bg-slate-100 text-slate-600',
    };
    const labels: Record<string, string> = { draft: 'مسودة', published: 'منشور', archived: 'مؤرشف' };
    return (
      <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${map[status] || 'bg-muted'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">المقالات</h1>
          <p className="mt-2 text-xs text-muted-foreground">نظام نشر احترافي: مسودة، نشر، أرشفة، وتحسينات SEO.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#675de8] px-4 py-3 text-xs font-bold text-white">
          <Plus size={15} /> مقال جديد
        </button>
      </div>

      {showEditor && (
        <form onSubmit={submit} className="mb-8 grid gap-4 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>العنوان</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>الرابط المختصر (slug)</span>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-mono outline-none focus:border-[#8279ee]" dir="ltr" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>الحالة</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]">
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="archived">مؤرشف</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>اسم الكاتب الظاهر</span>
            <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>صورة الغلاف (URL)</span>
            <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]" dir="ltr" placeholder="https://..." />
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>مقتطف قصير</span>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>المحتوى (فقرات؛ استخدم # أو ## للعناوين)</span>
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-56 rounded-xl border border-border bg-background p-3 font-mono text-sm leading-7 outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>عنوان SEO</span>
            <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>وسوم (مفصولة بفاصلة)</span>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>وصف SEO</span>
            <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="min-h-16 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white">
              <Save size={15} /> {editingId ? 'حفظ التعديلات' : 'إنشاء المقال'}
            </button>
            <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إلغاء</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {list.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} /> جارٍ التحميل…</div>
        ) : (list.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا مقالات بعد. أنشئ أول مقال من الزر أعلاه.</p>
        ) : (
          (list.data ?? []).map((article) => (
            <div key={article.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-card p-4">
              <div className="grid size-12 place-items-center rounded-xl bg-[#efeeff] text-[#675de8]"><FileText size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate text-sm">{article.title}</strong>
                  {statusBadge(article.status)}
                </div>
                <span className="text-[10px] text-muted-foreground">/{article.slug}</span>
              </div>
              <button type="button" onClick={() => startEdit(article)} className="rounded-lg p-2 text-[#675de8] hover:bg-muted" aria-label="تعديل"><Edit3 size={16} /></button>
              {article.status === 'published' ? (
                <button type="button" onClick={() => unpublish.mutate({ id: article.id })} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" aria-label="إلغاء النشر"><EyeOff size={16} /></button>
              ) : (
                <button type="button" onClick={() => publish.mutate({ id: article.id })} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" aria-label="نشر"><Eye size={16} /></button>
              )}
              <button type="button" onClick={() => { if (window.confirm('حذف المقال نهائياً؟')) remove.mutate({ id: article.id }); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف"><Trash2 size={16} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminArticlesManager;
