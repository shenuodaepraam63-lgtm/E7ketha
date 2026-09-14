import { Edit3, Save, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

function ManagerShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div><div className="mb-8"><h1 className="text-2xl font-extrabold">{title}</h1><p className="mt-2 text-xs text-muted-foreground">{description}</p></div>{children}</div>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="grid gap-2 text-xs font-bold"><span>{label}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-[#8279ee]" /></label>;
}

export function NovelsManager() {
  const [location, navigate] = useLocation();
  const normalizedLocation = location.replace(/\/$/, '');
  const isEditorPage = normalizedLocation === '/admin/novels/new' || /^\/admin\/novels\/edit\/\d+$/.test(normalizedLocation);
  const utils = trpc.useUtils();
  const novels = trpc.admin.novels.list.useQuery();
  const authors = trpc.admin.authors.list.useQuery();
  const genres = trpc.admin.genres.list.useQuery();
  const create = trpc.admin.novels.create.useMutation({
    onSuccess: (novel) => {
      reset();
      void utils.admin.novels.list.invalidate();
      toast.success('تمت إضافة الرواية بنجاح', {
        action: { label: 'فتح الرواية', onClick: () => { window.location.href = `/books/${novel.slug}`; } },
      });
    },
    onError: (error) => toast.error(error.message),
  });
  const update = trpc.admin.novels.update.useMutation({
    onSuccess: () => {
      toast.success('تم تحديث الرواية');
      reset();
      void utils.admin.novels.list.invalidate();
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
    onSuccess: (url) => {
      setForm((current) => ({ ...current, coverUrl: url ?? current.coverUrl }));
      toast.success('تم تحويل الرابط إلى رابط الصورة الصحيح');
    },
    onError: (error) => toast.error(error.message),
  });
  const upload = trpc.admin.novels.uploadCover.useMutation({
    onSuccess: (result) => {
      setForm((current) => ({ ...current, coverUrl: result.url }));
      toast.success('تم رفع الغلاف إلى Cloudinary');
    },
    onError: (error) => toast.error(error.message),
  });
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({
    slug: '',
    title: '',
    authorId: '',
    coverUrl: '',
    description: '',
    rightsNote: '',
    noteType: 'rights' as 'warning' | 'announcement' | 'clarification' | 'rights' | 'info',
    parts: '1',
    status: 'standalone' as 'standalone' | 'completed' | 'ongoing',
    publicationYear: '',
    genreIds: [] as number[],
    links: [] as Array<{ label: string; url: string; type: 'read' | 'download' }>,
  });
  const reset = () => {
    setEditing(null);
    setForm({
      slug: '',
      title: '',
      authorId: '',
      coverUrl: '',
      description: '',
      rightsNote: '',
      noteType: 'rights',
      parts: '1',
      status: 'standalone',
      publicationYear: '',
      genreIds: [],
      links: [],
    });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (/^https?:\/\//i.test(form.slug) || form.slug.includes('/')) {
      toast.error('اكتب slug مختصرًا فقط مثل sifr-al-bidaya، بدون https:// أو روابط كاملة.');
      return;
    }
    const noteBody = form.rightsNote.trim();
    const encodedNote = noteBody
      ? form.noteType === 'rights'
        ? noteBody
        : JSON.stringify({ type: form.noteType, body: noteBody })
      : '';
    const data = {
      slug: form.slug,
      title: form.title,
      authorId: Number(form.authorId),
      coverUrl: form.coverUrl || undefined,
      description: form.description || undefined,
      rightsNote: encodedNote,
      parts: Number(form.parts) || 1,
      status: form.status,
      publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
      genreIds: form.genreIds,
      links: form.links.filter((link) => link.label.trim() && link.url.trim()),
    };
    editing ? update.mutate({ id: editing, data }) : create.mutate(data);
  };
  return (
    <ManagerShell
      title={isEditorPage ? (editing ? 'تعديل الرواية' : 'إضافة رواية جديدة') : 'إدارة جميع الروايات'}
      description={isEditorPage ? 'أدخل بيانات الرواية وروابط القراءة والتحميل.' : 'استعرض جميع الروايات وعدّلها أو احذفها.'}
    >
      <div className="mb-4 flex items-center justify-between rounded-[20px] border border-border bg-card px-4 py-3">
        <span className="text-sm font-extrabold">{isEditorPage ? 'بيانات الرواية' : 'كل الروايات'}</span>
        {!isEditorPage && (
          <Link href="/admin/novels/new" className="rounded-xl bg-[#675de8] px-3 py-2 text-[10px] font-extrabold text-white">
            + إضافة رواية
          </Link>
        )}
      </div>
      {isEditorPage && (
        <form onSubmit={submit} className="mb-8 grid gap-3 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
          <Field label="العنوان" value={form.title} required onChange={(value) => setForm({ ...form, title: value })} />
          <Field label="الرابط المختصر" value={form.slug} required onChange={(value) => setForm({ ...form, slug: value })} />
          <label className="grid gap-2 text-xs font-bold">
            <span>المؤلف</span>
            <select required value={form.authorId} onChange={(event) => setForm({ ...form, authorId: event.target.value })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="">اختر المؤلف</option>
              {(authors.data ?? []).map((author) => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 text-xs font-bold">
            <span>غلاف الرواية</span>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label="رابط الصورة (أي رابط HTTPS)" value={form.coverUrl} onChange={(value) => setForm({ ...form, coverUrl: value })} />
              </div>
              <button type="button" disabled={!form.coverUrl || resolveCover.isPending} onClick={() => resolveCover.mutate({ url: form.coverUrl })} className="h-11 shrink-0 rounded-xl border border-[#675de8]/30 px-3 text-[10px] font-bold text-[#675de8]">
                {resolveCover.isPending ? 'جارٍ التحويل...' : 'استخراج الرابط'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              {form.coverUrl && <img src={form.coverUrl} onError={() => toast.error('الرابط لا يعيد صورة مباشرة؛ استخدم رابط صورة أو رابط مشاركة يحتوي على og:image')} className="size-16 rounded-xl border border-border object-cover" alt="معاينة الغلاف" />}
              <span className="text-[10px] text-muted-foreground">تظهر المعاينة إذا كان الرابط يعيد صورة فعلية.</span>
            </div>
            <span className="text-[10px] font-normal text-muted-foreground">يقبل رابط صورة مباشر أو رابط مشاركة مثل share.google، بدون اشتراط امتداد jpg أو png.</span>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#8279ee] px-3 py-3 text-xs font-bold text-[#675de8]">
              <Upload size={15} />رفع صورة إلى Cloudinary
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={upload.isPending} onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 8 * 1024 * 1024) { toast.error('حجم الغلاف يجب ألا يتجاوز 8MB'); return; }
                const reader = new FileReader();
                reader.onload = () => upload.mutate({ filename: file.name, dataUrl: String(reader.result) });
                reader.readAsDataURL(file);
              }} />
            </label>
            {upload.isPending && <span className="text-[10px] text-muted-foreground">جارٍ الرفع...</span>}
          </div>
          <div className="grid gap-3 rounded-2xl border border-[#8279ee]/25 bg-[#f7f5ff] p-4 dark:bg-[#171936] md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">روابط الرواية</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">أضف أكثر من رابط وحدد هل هو للقراءة أو التحميل.</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, links: [...form.links, { label: `رابط ${form.links.length + 1}`, url: '', type: 'read' }] })} className="rounded-xl bg-[#675de8] px-3 py-2 text-[10px] font-bold text-white">+ إضافة رابط</button>
            </div>
            {form.links.map((link, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1fr_2fr_120px_auto]">
                <input value={link.label} onChange={(event) => { const links = [...form.links]; links[index] = { ...links[index], label: event.target.value }; setForm({ ...form, links }); }} className="h-10 rounded-lg border border-border bg-background px-3 text-xs" placeholder="اسم الزر مثل اقرأ الآن" />
                <input type="url" value={link.url} onChange={(event) => { const links = [...form.links]; links[index] = { ...links[index], url: event.target.value }; setForm({ ...form, links }); }} className="h-10 rounded-lg border border-border bg-background px-3 text-xs" placeholder="https://example.com/book" />
                <select value={link.type} onChange={(event) => { const links = [...form.links]; links[index] = { ...links[index], type: event.target.value as 'read' | 'download' }; setForm({ ...form, links }); }} className="h-10 rounded-lg border border-border bg-background px-2 text-xs">
                  <option value="read">قراءة</option>
                  <option value="download">تحميل</option>
                </select>
                <button type="button" onClick={() => setForm({ ...form, links: form.links.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-lg px-3 text-xs font-bold text-red-500">حذف</button>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:col-span-2 md:grid-cols-[180px_1fr]">
            <label className="grid gap-2 text-xs font-bold">
              <span>نوع الملاحظة</span>
              <select value={form.noteType} onChange={(event) => setForm({ ...form, noteType: event.target.value as typeof form.noteType })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#8279ee]">
                <option value="warning">تحذير</option>
                <option value="announcement">إعلان</option>
                <option value="clarification">توضيح</option>
                <option value="rights">حقوق ملكية</option>
                <option value="info">معلومة</option>
              </select>
            </label>
            <label className="grid gap-2 text-xs font-bold">
              <span>نص الملاحظة (تظهر داخل صفحة الرواية)</span>
              <textarea value={form.rightsNote} onChange={(event) => setForm({ ...form, rightsNote: event.target.value })} placeholder="اكتب الملاحظة هنا — ستظهر للزوار داخل صفحة الكتاب" className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" />
            </label>
          </div>
          <Field label="عدد الأجزاء" type="number" value={form.parts} onChange={(value) => setForm({ ...form, parts: value })} />
          <Field label="سنة النشر" type="number" value={form.publicationYear} onChange={(value) => setForm({ ...form, publicationYear: value })} />
          <label className="grid gap-2 text-xs font-bold">
            <span>الحالة</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })} className="h-11 rounded-xl border border-border bg-background px-3 text-sm">
              <option value="standalone">منفردة</option>
              <option value="completed">مكتملة</option>
              <option value="ongoing">مستمرة</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">
            <span>التصنيفات</span>
            <select multiple value={form.genreIds.map(String)} onChange={(event) => setForm({ ...form, genreIds: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) })} className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {(genres.data ?? []).map((genre) => (
                <option key={genre.id} value={genre.id}>{genre.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold md:col-span-2">
            <span>الوصف</span>
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white">
              <Save size={15} />{editing ? 'حفظ التعديلات' : 'إضافة الرواية'}
            </button>
            {editing && <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إلغاء</button>}
          </div>
        </form>
      )}
      {!isEditorPage && (
        <div className="grid gap-3">
          {(novels.data ?? []).map((novel) => (
            <div key={novel.id} className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4">
              <img src={novel.coverUrl ?? ''} className="size-14 rounded-xl object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{novel.title}</strong>
                <span className="text-[10px] text-muted-foreground">{novel.author} · {novel.status} · {novel.parts} أجزاء</span>
              </div>
              <Link href={`/books/${novel.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-bold text-[#675de8]">فتح</Link>
              <button
                onClick={() => {
                  setEditing(novel.id);
                  navigate(`/admin/novels/edit/${novel.id}`);
                  const raw = novel.rightsNote ?? '';
                  let noteType: 'warning' | 'announcement' | 'clarification' | 'rights' | 'info' = 'rights';
                  let rightsNote = raw;
                  try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object' && typeof parsed.body === 'string' && parsed.type) {
                      noteType = parsed.type;
                      rightsNote = parsed.body;
                    }
                  } catch { /* plain */ }
                  setForm({
                    slug: novel.slug,
                    title: novel.title,
                    authorId: String(novel.authorId),
                    coverUrl: novel.coverUrl ?? '',
                    description: novel.description ?? '',
                    rightsNote,
                    noteType,
                    parts: String(novel.parts),
                    status: novel.status,
                    publicationYear: novel.publicationYear ? String(novel.publicationYear) : '',
                    genreIds: [],
                    links: (novel.links ?? []).map((link: any) => ({
                      label: link.label,
                      url: link.url,
                      type: link.type === 'download' ? 'download' : 'read',
                    })),
                  });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[#675de8]/30 px-3 py-2 text-[10px] font-bold text-[#675de8]"
                aria-label="تعديل"
              >
                <Edit3 size={14} /> تعديل
              </button>
              <button onClick={() => { if (window.confirm('حذف الرواية نهائيًا؟ سيتم حذف تقييماتها وارتباطاتها.')) remove.mutate({ id: novel.id }); }} className="rounded-lg p-2 text-red-500" aria-label="حذف">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!isEditorPage && !(novels.data ?? []).length && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          جارٍ تحميل الروايات أو لا توجد بيانات متاحة لهذا الحساب.
        </div>
      )}
    </ManagerShell>
  );
}
