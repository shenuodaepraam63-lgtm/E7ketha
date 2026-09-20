import { BarChart3, Bell, BookOpen, CheckCircle2, Edit3, FileClock, LayoutDashboard, Menu, Megaphone, Save, Send, ShieldCheck, Trash2, Users, UserCog, X, Tags, Loader2, Upload, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { AdminOperations } from './AdminOperations';
import AdminReports from './AdminReports';
import AdminQuotesManager from './AdminQuotesManager';
import { NovelsManager } from './AdminNovelsManager';
import { AdminOverview } from './AdminOverview';

const nav = [
  { key: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
  { key: 'novels', label: 'الروايات', icon: BookOpen },
  { key: 'quotes', label: 'الاقتباسات', icon: WandSparkles },
  { key: 'authors', label: 'المؤلفون', icon: Users },
  { key: 'genres', label: 'التصنيفات', icon: Tags },
  { key: 'users', label: 'المستخدمون والأدوار', icon: UserCog },
  { key: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },
  { key: 'audit', label: 'سجل النشاط', icon: FileClock },
  { key: 'trash', label: 'سلة المهملات', icon: Trash2 },
  { key: 'notifications', label: 'الإشعارات', icon: Bell },
  { key: 'messages', label: 'الرسائل', icon: Send },
  { key: 'ads', label: 'إدارة الإعلانات', icon: Megaphone },
] as const;
type Section = typeof nav[number]['key'];

function AdminSidebar({ section, setSection, open, onClose }: { section: Section; setSection: (value: Section) => void; open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  return (
    <aside className={`${open ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-[#222b4a] bg-[#0d142d] text-white transition-transform md:static md:translate-x-0`}>
      <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-6">
        <Link href="/" className="text-lg font-extrabold">𝐄𝟳𝐤𝐞𝐭𝐡𝐚 <span className="text-[#8d84f9]">/ admin</span></Link>
        <button onClick={onClose} className="md:hidden" aria-label="إغلاق القائمة"><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4" aria-label="قائمة الإدارة">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                setSection(item.key);
                onClose();
                if (item.key === 'novels') navigate('/novels');
                if (item.key === 'overview') navigate('/');
              }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-xs font-semibold transition ${section === item.key ? 'bg-[#6259dd] text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon size={16} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="m-4 rounded-[16px] border border-white/10 bg-white/5 p-4 text-[10px] text-white/55">كل التغييرات تُحفظ مباشرة في Supabase.</div>
    </aside>
  );
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-2 text-xs font-bold">
      <span>{label}</span>
      <input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-[#8279ee]" />
    </label>
  );
}

function AuthorsManager() {
  const utils = trpc.useUtils();
  const query = trpc.admin.authors.list.useQuery();
  const create = trpc.admin.authors.create.useMutation({ onSuccess: () => { toast.success('تمت إضافة المؤلف'); reset(); void utils.admin.authors.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const update = trpc.admin.authors.update.useMutation({ onSuccess: () => { toast.success('تم تحديث المؤلف'); reset(); void utils.admin.authors.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.admin.authors.delete.useMutation({ onSuccess: () => { toast.success('تم حذف المؤلف'); void utils.admin.authors.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ slug: '', name: '', bio: '', avatarUrl: '', bookCount: '0' });
  const reset = () => { setEditing(null); setForm({ slug: '', name: '', bio: '', avatarUrl: '', bookCount: '0' }); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = { slug: form.slug, name: form.name, bio: form.bio || undefined, avatarUrl: form.avatarUrl || undefined, bookCount: Number(form.bookCount) || 0 };
    editing ? update.mutate({ id: editing, data }) : create.mutate(data);
  };
  return (
    <ManagerShell title="المؤلفون" description="أضف وعدّل بيانات المؤلفين المرتبطة بالروايات.">
      <form onSubmit={submit} className="mb-8 grid gap-3 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
        <Field label="الاسم" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} />
        <Field label="الرابط المختصر" value={form.slug} required placeholder="مثال: sifr-al-bidaya — بدون https://" onChange={(value) => setForm({ ...form, slug: value })} />
        <Field label="الصورة URL" value={form.avatarUrl} onChange={(value) => setForm({ ...form, avatarUrl: value })} />
        <Field label="عدد الأعمال" type="number" value={form.bookCount} onChange={(value) => setForm({ ...form, bookCount: value })} />
        <label className="grid gap-2 text-xs font-bold md:col-span-2"><span>نبذة</span><textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" /></label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white"><Save size={15} />{editing ? 'حفظ التعديلات' : 'إضافة المؤلف'}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إلغاء</button>}
        </div>
      </form>
      <div className="grid gap-3">
        {(query.data ?? []).map((author) => (
          <div key={author.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-card p-4">
            <img src={author.avatarUrl ?? ''} className="size-12 rounded-xl object-cover" alt="" />
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{author.name}</strong><span className="text-[10px] text-muted-foreground">/{author.slug} · {author.bookCount} عمل</span></div>
            <button onClick={() => { setEditing(author.id); setForm({ slug: author.slug, name: author.name, bio: author.bio ?? '', avatarUrl: author.avatarUrl ?? '', bookCount: String(author.bookCount) }); }} className="rounded-lg p-2 text-[#675de8] hover:bg-muted" aria-label="تعديل"><Edit3 size={16} /></button>
            <button onClick={() => { if (window.confirm('حذف المؤلف؟ لا يمكن حذف مؤلف مرتبط بروايات.')) remove.mutate({ id: author.id }); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="حذف"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
}

function GenresManager() {
  const utils = trpc.useUtils();
  const query = trpc.admin.genres.list.useQuery();
  const create = trpc.admin.genres.create.useMutation({ onSuccess: () => { toast.success('تمت إضافة التصنيف'); reset(); void utils.admin.genres.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const update = trpc.admin.genres.update.useMutation({ onSuccess: () => { toast.success('تم تحديث التصنيف'); reset(); void utils.admin.genres.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.admin.genres.delete.useMutation({ onSuccess: () => { toast.success('تم حذف التصنيف'); void utils.admin.genres.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ slug: '', name: '', description: '', icon: '✦' });
  const reset = () => { setEditing(null); setForm({ slug: '', name: '', description: '', icon: '✦' }); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const data = { slug: form.slug, name: form.name, description: form.description || undefined, icon: form.icon || '✦' };
    editing ? update.mutate({ id: editing, data }) : create.mutate(data);
  };
  return (
    <ManagerShell title="التصنيفات" description="نظّم أبواب الاكتشاف والتصنيفات الظاهرة للقراء.">
      <form onSubmit={submit} className="mb-8 grid gap-3 rounded-[20px] border border-border bg-card p-5 md:grid-cols-2">
        <Field label="اسم التصنيف" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} />
        <Field label="الرابط المختصر" value={form.slug} required onChange={(value) => setForm({ ...form, slug: value })} />
        <Field label="الأيقونة" value={form.icon} onChange={(value) => setForm({ ...form, icon: value })} />
        <label className="grid gap-2 text-xs font-bold md:col-span-2"><span>الوصف</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#8279ee]" /></label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-4 py-3 text-xs font-bold text-white"><Save size={15} />{editing ? 'حفظ التعديلات' : 'إضافة التصنيف'}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-3 text-xs font-bold">إلغاء</button>}
        </div>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {(query.data ?? []).map((genre) => (
          <div key={genre.id} className="rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#efeeff] text-lg text-[#675de8]">{genre.icon}</span>
              <div className="min-w-0 flex-1"><strong className="block text-sm">{genre.name}</strong><span className="text-[10px] text-muted-foreground">{Number(genre.novelCount)} رواية · /{genre.slug}</span></div>
              <button onClick={() => { setEditing(genre.id); setForm({ slug: genre.slug, name: genre.name, description: genre.description ?? '', icon: genre.icon ?? '✦' }); }} className="text-[#675de8]" aria-label="تعديل"><Edit3 size={16} /></button>
              <button onClick={() => { if (window.confirm('حذف التصنيف؟ ستتم إزالة ارتباطه بالروايات.')) remove.mutate({ id: genre.id }); }} className="text-red-500" aria-label="حذف"><Trash2 size={16} /></button>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">{genre.description}</p>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
}

function UsersManager() {
  const utils = trpc.useUtils();
  const query = trpc.admin.users.list.useQuery();
  const updateRole = trpc.admin.users.updateRole.useMutation({ onSuccess: () => { toast.success('تم تحديث الدور'); void utils.admin.users.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const confirmEmail = trpc.admin.users.confirmEmail.useMutation({ onSuccess: () => { toast.success('تم تأكيد البريد'); void utils.admin.users.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  return (
    <ManagerShell title="المستخدمون والأدوار" description="راجع حسابات Supabase وامنح صلاحية المشرف عند الحاجة.">
      <div className="grid gap-3">
        {query.isLoading ? <Loader2 className="animate-spin" /> : (query.data ?? []).map((managedUser) => (
          <div key={managedUser.id} className="flex flex-col gap-4 rounded-[18px] border border-border bg-card p-4 sm:flex-row sm:items-center">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#efeeff] text-[#675de8]"><UserCog size={18} /></div>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{managedUser.name || 'مستخدم بلا اسم'}</strong>
              <span className="block truncate text-[10px] text-muted-foreground">{managedUser.email || managedUser.id}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">{managedUser.emailConfirmed ? <><CheckCircle2 size={12} className="text-emerald-500" /> البريد مؤكد</> : 'البريد غير مؤكد'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={managedUser.role} onChange={(event) => updateRole.mutate({ id: managedUser.id, role: event.target.value as 'user' | 'admin' })} className="rounded-lg border border-border bg-background px-2 py-2 text-xs font-bold">
                <option value="user">مستخدم</option>
                <option value="admin">مشرف</option>
              </select>
              {!managedUser.emailConfirmed && <button onClick={() => confirmEmail.mutate({ id: managedUser.id })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-[10px] font-bold"><ShieldCheck size={13} />تأكيد البريد</button>}
            </div>
          </div>
        ))}
      </div>
    </ManagerShell>
  );
}

function ManagerShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div><div className="mb-8"><h1 className="text-2xl font-extrabold">{title}</h1><p className="mt-2 text-xs text-muted-foreground">{description}</p></div>{children}</div>;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>(location.startsWith('/novels') ? 'novels' : 'overview');
  if (loading) return <div className="grid min-h-screen place-items-center">جارٍ التحقق من الصلاحيات...</div>;
  if (!user) return (
    <div className="grid min-h-screen place-items-center p-5">
      <div className="max-w-md rounded-[24px] border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-extrabold">لوحة الإدارة</h1>
        <p className="mt-3 text-sm text-muted-foreground">سجّل الدخول بحساب المشرف للوصول إلى إدارة المحتوى.</p>
        <button onClick={() => { window.location.href = window.location.hostname.startsWith('admin.') ? 'https://e7ketha.com/login' : '/login'; }} className="mt-6 rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">تسجيل الدخول</button>
      </div>
    </div>
  );
  if (user.role !== 'admin') return (
    <div className="grid min-h-screen place-items-center p-5">
      <div className="max-w-md rounded-[24px] border border-red-200 bg-red-50 p-8 text-center text-red-800">
        <h1 className="text-2xl font-extrabold">لا تملك صلاحية الوصول</h1>
        <p className="mt-3 text-sm">هذه الصفحة مخصصة للمشرفين فقط.</p>
        <a href="https://e7ketha.com/" className="mt-6 inline-flex rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">العودة للموقع</a>
      </div>
    </div>
  );
  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f4f6fb] text-[#121a38] dark:bg-[#080d1d] dark:text-white">
      <div className="flex min-h-screen">
        <AdminSidebar section={section} setSection={setSection} open={open} onClose={() => setOpen(false)} />
        {open && <button aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-[#e2e6f0] bg-white/85 px-4 backdrop-blur-xl dark:border-[#202a48] dark:bg-[#0d142d]/90 sm:px-5 md:px-8">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl border md:hidden" aria-label="فتح قائمة الإدارة"><Menu size={18} /></button>
            <div className="text-sm font-extrabold">إدارة محتوى 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</div>
            <a href="https://e7ketha.com/" className="text-xs font-bold text-[#675de8]">عرض الموقع</a>
          </header>
          <main className="p-4 sm:p-5 md:p-8">
            {section === 'overview' && <AdminOverview onSelect={(value) => { setSection(value); if (value === 'novels') navigate('/novels'); }} />}
            {section === 'novels' && <NovelsManager />}
            {section === 'quotes' && <AdminQuotesManager />}
            {section === 'authors' && <AuthorsManager />}
            {section === 'genres' && <GenresManager />}
            {section === 'users' && <UsersManager />}
            {section === 'reports' && <AdminReports />}
            {['audit', 'trash', 'notifications', 'messages', 'ads'].includes(section) && <AdminOperations section={section as 'audit' | 'trash' | 'notifications' | 'messages' | 'ads'} />}
          </main>
        </div>
      </div>
    </div>
  );
}
