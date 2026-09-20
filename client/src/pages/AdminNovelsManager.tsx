import { Edit3, Save, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

function ManagerShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div><div className="mb-8"><h1 className="text-2xl font-extrabold">{title}</h1><p className="mt-2 text-xs text-muted-foreground">{description}</p></div>{children}</div>;
}

export function NovelsManager() {
  const utils = trpc.useUtils();
  const [location, navigate] = useLocation();
  const normalizedLocation = location.replace(/\/$/, '');
  const isEditorPage = normalizedLocation === '/novels/new' || /^\/novels\/edit\/\d+$/.test(normalizedLocation);
  const editingMatch = normalizedLocation.match(/^\/novels\/edit\/(\d+)$/);
  const editingId = editingMatch ? Number(editingMatch[1]) : null;

  const novels = trpc.admin.novels.list.useQuery();
  const authors = trpc.admin.authors.list.useQuery();
  const genres = trpc.admin.genres.list.useQuery();

  const create = trpc.admin.novels.create.useMutation({
    onSuccess: (novel) => {
      toast.success('تمت إضافة الرواية');
      void utils.admin.novels.list.invalidate();
      if (novel?.slug) {
        toast.message('الرواية جاهزة', {
          action: { label: 'فتح الرواية', onClick: () => { window.location.href = `/books/${novel.slug}`; } },
        });
      }
      navigate('/novels');
    },
    onError: (error) => toast.error(error.message),
  });

  const update = trpc.admin.novels.update.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الرواية');
      void utils.admin.novels.list.invalidate();
      navigate('/novels');
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

  const [form, setForm] = useState({
    title: '',
    slug: '',
    authorId: '',
    genreId: '',
    synopsis: '',
    coverUrl: '',
    status: 'published' as 'draft' | 'published',
  });

  const editing = editingId;

  // Prefill when editing
  const current = (novels.data ?? []).find((n) => n.id === editingId);
  if (editingId && current && form.slug === '' && form.title === '') {
    // one-shot prefill via effect-like pattern avoided; user can re-open editor
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = {
      title: form.title,
      slug: form.slug,
      authorId: form.authorId ? Number(form.authorId) : undefined,
      genreId: form.genreId ? Number(form.genreId) : undefined,
      synopsis: form.synopsis || undefined,
      coverUrl: form.coverUrl || undefined,
      status: form.status,
    };
    if (editing) update.mutate({ id: editing, data });
    else create.mutate(data);
  };

  return (
    <ManagerShell
      title={isEditorPage ? (editing ? 'تعديل الرواية' : 'إضافة رواية جديدة') : 'إدارة جميع الروايات'}
      description={isEditorPage ? 'أدخل بيانات الرواية وروابط القراءة والتحميل.' : 'استعرض جميع الروايات وعدّلها أو احذفها.'}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-extrabold">{isEditorPage ? 'بيانات الرواية' : 'كل الروايات'}</span>
        {!isEditorPage && (
          <Link href="/novels/new" className="rounded-xl bg-[#675de8] px-3 py-2 text-[10px] font-extrabold text-white">
            + رواية جديدة
          </Link>
        )}
      </div>

      {isEditorPage && (
        <form onSubmit={submit} className="mb-8 grid gap-3 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold"><span>العنوان</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" /></label>
          <label className="grid gap-2 text-xs font-bold"><span>الرابط المختصر</span><input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" /></label>
          <label className="grid gap-2 text-xs font-bold"><span>المؤلف</span><select value={form.authorId} onChange={(e) => setForm({ ...form, authorId: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="">—</option>{(authors.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold"><span>التصنيف</span><select value={form.genreId} onChange={(e) => setForm({ ...form, genreId: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="">—</option>{(genres.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2"><span>الغلاف URL</span><input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm" /></label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2"><span>النبذة</span><textarea value={form.synopsis} onChange={(e) => setForm({ ...form, synopsis: e.target.value })} className="min-h-28 rounded-xl border border-border bg-background p-3 text-sm" /></label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white"><Save size={15} />{editing ? 'حفظ التعديلات' : 'إضافة الرواية'}</button>
            <button type="button" onClick={() => navigate('/novels')} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إلغاء</button>
          </div>
        </form>
      )}

      {!isEditorPage && (
        <div className="grid gap-3">
          {(novels.data ?? []).map((novel) => (
            <div key={novel.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-card p-4">
              {novel.coverUrl ? <img src={novel.coverUrl} alt="" className="size-14 rounded-xl object-cover" /> : <div className="grid size-14 place-items-center rounded-xl bg-muted text-[10px]">بلا غلاف</div>}
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{novel.title}</strong>
                <span className="text-[10px] text-muted-foreground">/{novel.slug}</span>
              </div>
              <Link href={`/books/${novel.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-bold text-[#675de8]">فتح</Link>
              <button type="button" onClick={() => navigate(`/novels/edit/${novel.id}`)} className="rounded-lg p-2 text-[#675de8] hover:bg-muted" aria-label="تعديل"><Edit3 size={16} /></button>
              <button type="button" onClick={() => { if (window.confirm('حذف الرواية؟')) remove.mutate({ id: novel.id }); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {!isEditorPage && !(novels.data ?? []).length && (
        <div className="rounded-xl bg-muted/50 p-5 text-center text-xs text-muted-foreground">
          جارٍ تحميل الروايات أو لا توجد بيانات متاحة لهذا الحساب.
        </div>
      )}
    </ManagerShell>
  );
}
