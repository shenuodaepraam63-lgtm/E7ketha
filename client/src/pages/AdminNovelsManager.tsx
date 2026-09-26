import { Edit3, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

function ManagerShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

type NovelStatus = 'standalone' | 'completed' | 'ongoing';

const emptyForm = {
  title: '',
  slug: '',
  authorId: '',
  genreId: '',
  description: '',
  coverUrl: '',
  status: 'standalone' as NovelStatus,
  parts: '1',
  publicationYear: '',
};


const emptyDetails = {
  detailedSummary: '',
  spoilerFreeSummary: '',
  themes: '',
  characters: '',
  setting: '',
  writingStyle: '',
  literaryAnalysis: '',
  whatMakesItDistinct: '',
  recommendedFor: '',
  notableDetails: '',
  keywords: '',
};

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function novelsListHref() {
  return '/admin?s=novels';
}
function novelNewHref() {
  return '/admin?s=novels&new=1';
}
function novelEditHref(id: number) {
  return `/admin?s=novels&edit=${id}`;
}

export function NovelsManager() {
  const utils = trpc.useUtils();
  const [location, navigate] = useLocation();
  const search = typeof window !== 'undefined' ? window.location.search : location.includes('?') ? location.slice(location.indexOf('?')) : '';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const editingId = params.get('edit') ? Number(params.get('edit')) : null;
  const isNew = params.get('new') === '1';
  const isEditorPage = isNew || (editingId != null && Number.isFinite(editingId) && editingId > 0);

  const novels = trpc.admin.novels.list.useQuery();
  const authors = trpc.admin.authors.list.useQuery();
  const genres = trpc.admin.genres.list.useQuery();
  const detailsQuery = trpc.admin.novels.details.useQuery(
    { novelId: editingId ?? 0 },
    { enabled: Boolean(editingId) },
  );

  const [form, setForm] = useState(emptyForm);
  const [detailsForm, setDetailsForm] = useState(emptyDetails);
  const [prefilledId, setPrefilledId] = useState<number | null>(null);
  const [prefilledDetailsId, setPrefilledDetailsId] = useState<number | null>(null);

  const updateDetails = trpc.admin.novels.updateDetails.useMutation({
    onSuccess: (result) => {
      void utils.admin.novels.details.invalidate({ novelId: editingId ?? 0 });
      toast.success(`تم حفظ البيانات الموسعة (${result?.wordCount ?? 0} كلمة)`);
    },
    onError: (error) => toast.error(`تعذر حفظ البيانات الموسعة: ${error.message}`),
  });

  const create = trpc.admin.novels.create.useMutation({
    onSuccess: (novel) => {
      toast.success('تمت إضافة الرواية');
      void utils.admin.novels.list.invalidate();
      if (novel && typeof novel === 'object' && 'slug' in novel && (novel as { slug?: string }).slug) {
        toast.message('الرواية جاهزة', {
          action: {
            label: 'فتح الرواية',
            onClick: () => {
              window.location.href = `/books/${(novel as { slug: string }).slug}`;
            },
          },
        });
      }
      navigate(novelsListHref());
    },
    onError: (error) => toast.error(error.message),
  });

  const update = trpc.admin.novels.update.useMutation({
    onSuccess: async () => {
      if (editingId) await updateDetails.mutateAsync({ novelId: editingId, data: detailsForm });
      toast.success('تم تحديث الرواية');
      void utils.admin.novels.list.invalidate();
      navigate(novelsListHref());
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = trpc.admin.novels.delete.useMutation({
    onSuccess: () => {
      toast.success('تم حذف الرواية');
      void utils.admin.novels.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const resolveCover = trpc.admin.novels.resolveCover.useMutation({
    onSuccess: (result) => {
      if (result?.coverUrl) setForm((f) => ({ ...f, coverUrl: result.coverUrl }));
      toast.success('تم جلب الغلاف');
    },
    onError: (error) => toast.error(error.message),
  });

  const upload = trpc.admin.novels.uploadCover.useMutation({
    onSuccess: (result) => {
      if (result?.url) setForm((f) => ({ ...f, coverUrl: result.url }));
      toast.success('تم رفع الغلاف');
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!editingId || !novels.data) return;
    if (prefilledId === editingId) return;
    const current = novels.data.find((n) => n.id === editingId);
    if (!current) return;
    const status = (['standalone', 'completed', 'ongoing'].includes(String(current.status))
      ? current.status
      : 'standalone') as NovelStatus;
    setForm({
      title: current.title ?? '',
      slug: current.slug ?? '',
      authorId: current.authorId != null ? String(current.authorId) : '',
      genreId: '',
      description: current.description ?? '',
      coverUrl: current.coverUrl ?? '',
      status,
      parts: current.parts != null ? String(current.parts) : '1',
      publicationYear: current.publicationYear != null ? String(current.publicationYear) : '',
    });
    setPrefilledId(editingId);
  }, [editingId, novels.data, prefilledId]);


  useEffect(() => {
    if (!editingId || !detailsQuery.data || prefilledDetailsId === editingId) return;
    setDetailsForm({
      detailedSummary: detailsQuery.data.detailedSummary ?? '',
      spoilerFreeSummary: detailsQuery.data.spoilerFreeSummary ?? '',
      themes: detailsQuery.data.themes ?? '',
      characters: detailsQuery.data.characters ?? '',
      setting: detailsQuery.data.setting ?? '',
      writingStyle: detailsQuery.data.writingStyle ?? '',
      literaryAnalysis: detailsQuery.data.literaryAnalysis ?? '',
      whatMakesItDistinct: detailsQuery.data.whatMakesItDistinct ?? '',
      recommendedFor: detailsQuery.data.recommendedFor ?? '',
      notableDetails: detailsQuery.data.notableDetails ?? '',
      keywords: detailsQuery.data.keywords ?? '',
    });
    setPrefilledDetailsId(editingId);
  }, [editingId, detailsQuery.data, prefilledDetailsId]);

  useEffect(() => {
    if (isNew && !editingId) {
      setForm(emptyForm);
      setDetailsForm(emptyDetails);
      setPrefilledId(null);
      setPrefilledDetailsId(null);
    }
  }, [isNew, editingId]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.authorId) {
      toast.error('اختر المؤلف');
      return;
    }
    const authorId = Number(form.authorId);
    if (!Number.isFinite(authorId) || authorId <= 0) {
      toast.error('مؤلف غير صالح');
      return;
    }
    const genreIds = form.genreId ? [Number(form.genreId)] : undefined;
    const data = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      authorId,
      coverUrl: form.coverUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      status: form.status,
      parts: form.parts ? Number(form.parts) : undefined,
      publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
      genreIds,
    };
    if (editingId) update.mutate({ id: editingId, data });
    else create.mutate(data);
  };

  const detailsWordCount = Object.values(detailsForm).reduce((total, value) => total + countWords(value), 0);
  const busy = create.isPending || update.isPending || updateDetails.isPending;

  return (
    <ManagerShell
      title={isEditorPage ? (editingId ? 'تعديل الرواية' : 'إضافة رواية جديدة') : 'إدارة جميع الروايات'}
      description={isEditorPage ? 'أدخل بيانات الرواية. الحالة: منفردة / مكتملة / مستمرة (كما في قاعدة البيانات).' : 'استعرض الروايات وعدّلها أو احذفها.'}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-extrabold">{isEditorPage ? 'بيانات الرواية' : 'كل الروايات'}</span>
        {!isEditorPage && (
          <Link href={novelNewHref()} className="rounded-xl bg-[#675de8] px-3 py-2 text-[10px] font-extrabold text-white">
            + رواية جديدة
          </Link>
        )}
      </div>

      {isEditorPage && editingId && novels.isLoading && (
        <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="animate-spin" size={14} /> جارٍ تحميل بيانات الرواية…
        </p>
      )}
      {isEditorPage && editingId && novels.isSuccess && !novels.data?.some((n) => n.id === editingId) && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-600">
          لم يُعثر على الرواية #{editingId}. قد تكون حُذفت.
        </p>
      )}

      {isEditorPage && (
        <form onSubmit={submit} className="mb-8 grid gap-3 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold">
            <span>العنوان</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>الرابط المختصر</span>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>المؤلف</span>
            <select required value={form.authorId} onChange={(e) => setForm({ ...form, authorId: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">—</option>
              {(authors.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>التصنيف (اختياري)</span>
            <select value={form.genreId} onChange={(e) => setForm({ ...form, genreId: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">—</option>
              {(genres.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>الحالة</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as NovelStatus })}
              className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="standalone">منفردة</option>
              <option value="completed">مكتملة</option>
              <option value="ongoing">مستمرة</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>عدد الأجزاء</span>
            <input type="number" min={1} value={form.parts} onChange={(e) => setForm({ ...form, parts: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>سنة النشر</span>
            <input type="number" min={0} value={form.publicationYear} onChange={(e) => setForm({ ...form, publicationYear: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>الغلاف URL</span>
            <div className="flex flex-wrap gap-2">
              <input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm" />
              <button
                type="button"
                disabled={!form.coverUrl || resolveCover.isPending}
                onClick={() => resolveCover.mutate({ url: form.coverUrl })}
                className="rounded-xl border border-border px-3 py-2 text-[10px] font-bold disabled:opacity-50"
              >
                تحقق من الرابط
              </button>
            </div>
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>النبذة</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-28 rounded-xl border border-border bg-background p-3 text-sm" />
          </label>

          {editingId && (
            <details open className="mt-2 rounded-[20px] border border-[#675de8]/20 bg-[#f8f7ff]/70 p-4 md:col-span-2 dark:bg-[#151936]/50">
              <summary className="cursor-pointer list-none font-extrabold text-sm">البيانات الموسعة للرواية</summary>
              <p className="mt-2 text-xs text-muted-foreground">الهدف 1000 كلمة فأكثر إجمالًا. البيانات تُحفظ في جدول مستقل ولا تغيّر النبذة الحالية.</p>
              <div className="mt-4 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold">
                عدد الكلمات الحالي: <span className={detailsWordCount >= 1000 ? 'text-emerald-600' : 'text-amber-600'}>{detailsWordCount}</span> / 1000
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {([
                  ['detailedSummary', 'نبذة تفصيلية'],
                  ['spoilerFreeSummary', 'ملخص بدون حرق'],
                  ['themes', 'الأفكار والموضوعات'],
                  ['characters', 'الشخصيات'],
                  ['setting', 'المكان والزمان'],
                  ['writingStyle', 'الأسلوب الأدبي'],
                  ['literaryAnalysis', 'تحليل أدبي مختصر'],
                  ['whatMakesItDistinct', 'ما يميز الرواية'],
                  ['recommendedFor', 'مناسبة لمن؟'],
                  ['notableDetails', 'تفاصيل ومعلومات بارزة'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="grid gap-2 text-xs font-bold md:col-span-1">
                    <span>{label}</span>
                    <textarea value={detailsForm[key]} onChange={(e) => setDetailsForm({ ...detailsForm, [key]: e.target.value })} className="min-h-32 rounded-xl border border-border bg-background p-3 text-sm leading-7" />
                  </label>
                ))}
                <label className="grid gap-2 text-xs font-bold md:col-span-2">
                  <span>الكلمات المفتاحية</span>
                  <input value={detailsForm.keywords} onChange={(e) => setDetailsForm({ ...detailsForm, keywords: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="مثال: غموض، صداقة، القاهرة، تحقيق" />
                </label>
              </div>
            </details>
          )}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {editingId ? 'حفظ التعديلات' : 'إضافة الرواية'}
            </button>
            <button type="button" onClick={() => navigate(novelsListHref())} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {!isEditorPage && novels.isError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-600">
          تعذر تحميل الروايات: {novels.error.message}
        </div>
      )}
      {!isEditorPage && novels.isLoading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="animate-spin" size={14} /> جارٍ تحميل الروايات…
        </p>
      )}
      {!isEditorPage && novels.isSuccess && !(novels.data ?? []).length && (
        <div className="rounded-xl bg-muted/50 p-5 text-center text-xs text-muted-foreground">لا توجد روايات بعد. أضف رواية جديدة.</div>
      )}

      {!isEditorPage && (
        <div className="grid gap-3">
          {(novels.data ?? []).map((novel) => (
            <div key={novel.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-card p-4">
              {novel.coverUrl ? (
                <img src={novel.coverUrl} alt="" className="size-14 rounded-xl object-cover" />
              ) : (
                <div className="grid size-14 place-items-center rounded-xl bg-muted text-[10px]">بلا غلاف</div>
              )}
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{novel.title}</strong>
                <span className="text-[10px] text-muted-foreground">
                  /{novel.slug} · {novel.status}
                </span>
              </div>
              <Link href={`/books/${novel.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-bold text-[#675de8]">
                فتح
              </Link>
              <button type="button" onClick={() => navigate(novelEditHref(novel.id))} className="rounded-lg p-2 text-[#675de8] hover:bg-muted" aria-label="تعديل">
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`حذف الرواية «${novel.title}»؟`)) remove.mutate({ id: novel.id });
                }}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                aria-label="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ManagerShell>
  );
}
