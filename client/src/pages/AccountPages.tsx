import { Check, Heart, LockKeyhole, Mail, RefreshCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Brand } from '@/components/Brand';
import { NovelCard } from '@/components/NovelCard';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { requireSupabase, supabase, supabaseConfigured } from '@/lib/supabase';
import { toNovel } from '@/lib/data';

const redirectUrl = (path: string) => `${window.location.origin}${path}`;

export function AuthPage({ register = false }: { register?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseConfigured) { toast.error('لم يتم إعداد Supabase Auth بعد'); return; }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    if (register && password !== String(form.get('confirmPassword') ?? '')) { toast.error('كلمتا المرور غير متطابقتين'); return; }
    setLoading(true);
    const client = requireSupabase();
    const result = register
      ? await client.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: redirectUrl('/auth/callback') } })
      : await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) { toast.error(result.error.message); return; }
    if (register && !result.data.session) { toast.success('تم إنشاء الحساب. راجع بريدك لتأكيد الحساب.'); return; }
    window.location.href = '/profile';
  };

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: redirectUrl('/reset-password') });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('أرسلنا رابط استعادة كلمة المرور إلى بريدك.');
    setForgotOpen(false);
  };

  return <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-2">
    <div className="hidden bg-[#11183a] p-12 text-white lg:flex lg:flex-col lg:justify-between"><Brand /><div><div className="section-label mb-4 text-[#aaa4ff]">مساحة أهدأ للقراءة</div><h1 className="max-w-md text-5xl font-extrabold leading-[1.15]">خلي الروايات<br /><span className="text-[#aaa4ff]">تلاقيك.</span></h1><p className="mt-5 max-w-md text-sm leading-8 text-white/55">احفظ اختياراتك، تابع المؤلفين، وخلي رحلتك مع القراءة أوضح.</p></div><p className="text-xs text-white/35">© 2026 رِواية</p></div>
    <div className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><Brand /></div><h1 className="text-3xl font-extrabold">{register ? 'ابدأ رحلتك مع رِواية' : 'مرحبًا بعودتك'}</h1><p className="mt-3 text-sm text-muted-foreground">{register ? 'أنشئ حسابًا واحفظ الروايات التي تهمك.' : 'ادخل إلى مساحتك واكمل من حيث توقفت.'}</p>
      <form onSubmit={submit} className="mt-8 grid gap-4">{register && <label className="grid gap-2 text-xs font-bold">الاسم<input name="name" required placeholder="اسمك" className="rounded-xl border border-border bg-card px-3 py-3 text-sm" /></label>}<label className="grid gap-2 text-xs font-bold">البريد الإلكتروني<div className="relative"><Mail size={16} className="absolute right-3 top-3 text-muted-foreground" /><input name="email" required type="email" placeholder="you@example.com" className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-3 text-sm" /></div></label><label className="grid gap-2 text-xs font-bold">كلمة المرور<div className="relative"><LockKeyhole size={16} className="absolute right-3 top-3 text-muted-foreground" /><input name="password" required minLength={6} type="password" placeholder="••••••••" className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-3 text-sm" /></div></label>{register && <label className="grid gap-2 text-xs font-bold">تأكيد كلمة المرور<input name="confirmPassword" required type="password" className="rounded-xl border border-border bg-card px-3 py-3 text-sm" /></label>}<button disabled={loading} className="rounded-xl bg-[#171e42] py-3.5 text-xs font-extrabold text-white disabled:opacity-60">{loading ? 'جارٍ التحقق...' : register ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button></form>
      {!register && <button type="button" onClick={() => setForgotOpen((value) => !value)} className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-bold text-[#675de8]"><RefreshCw size={14} />نسيت كلمة المرور؟</button>}
      {forgotOpen && <form onSubmit={requestReset} className="mt-4 rounded-2xl bg-muted p-4"><label className="grid gap-2 text-xs font-bold">أرسل رابط الاستعادة<input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required type="email" placeholder="you@example.com" className="mt-1 rounded-xl border border-border bg-card px-3 py-3 text-sm" /></label><button disabled={loading} className="mt-3 w-full rounded-xl bg-[#675de8] py-3 text-xs font-bold text-white">إرسال الرابط</button></form>}
      <p className="mt-4 text-center text-[10px] text-muted-foreground">تتم حماية حسابك بواسطة Supabase Auth مع تأكيد البريد الإلكتروني.</p><div className="mt-7 text-center text-xs text-muted-foreground">{register ? 'لديك حساب بالفعل؟ ' : 'ليس لديك حساب؟ '}<Link href={register ? '/login' : '/register'} className="font-bold text-[#675de8]">{register ? 'تسجيل الدخول' : 'إنشاء حساب'}</Link></div>
    </div></div>
  </div>;
}

export function AuthCallbackPage() {
  const [message, setMessage] = useState('جارٍ تأكيد بريدك الإلكتروني...');
  useEffect(() => {
    if (!supabase) { setMessage('لم يتم إعداد المصادقة بعد.'); return; }
    let redirected = false;
    const go = () => { if (!redirected) { redirected = true; window.location.replace('/profile'); } };
    void supabase.auth.getSession().then(({ data }) => { if (data.session) go(); else setMessage('تم تأكيد البريد. يمكنك تسجيل الدخول الآن.'); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) go(); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <div className="container grid min-h-[calc(100vh-72px)] place-items-center py-16"><div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center"><Mail className="mx-auto text-[#675de8]" size={32} /><h1 className="mt-5 text-2xl font-extrabold">تأكيد البريد الإلكتروني</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p><Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">العودة لتسجيل الدخول</Link></div></div>;
}

export function PasswordResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6 || password !== confirm) { toast.error('تأكد من تطابق كلمتي المرور وأن لا تقل عن 6 أحرف.'); return; }
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم تحديث كلمة المرور بنجاح.');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  return <div className="container grid min-h-[calc(100vh-72px)] place-items-center py-16"><div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8"><LockKeyhole className="text-[#675de8]" size={28} /><h1 className="mt-5 text-2xl font-extrabold">إنشاء كلمة مرور جديدة</h1>{ready ? <form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-2 text-xs font-bold">كلمة المرور الجديدة<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 text-sm" /></label><label className="grid gap-2 text-xs font-bold">تأكيد كلمة المرور<input required minLength={6} type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 text-sm" /></label><button disabled={saving} className="rounded-xl bg-[#171e42] py-3.5 text-xs font-bold text-white">{saving ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}</button></form> : <p className="mt-4 text-sm leading-7 text-muted-foreground">افتح رابط استعادة كلمة المرور من بريدك الإلكتروني للوصول إلى هذه الصفحة.</p>}</div></div>;
}

export function ReadingListPage() { const [tab, setTab] = useState<'want_to_read' | 'reading' | 'finished'>('want_to_read'); const { user, loading } = useAuth(); const query = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) }); const visible = (query.data ?? []).filter((item) => item.status === tab).map((item) => toNovel({ id: item.novelId, slug: item.slug, title: item.title, coverUrl: item.coverUrl, description: item.description, rating: item.rating, parts: item.parts, status: item.novelStatus, author: item.author, authorSlug: item.authorSlug })); if (!loading && !user) return <div className="container py-16"><EmptyState title="سجّل الدخول لقائمتك" description="احفظ اختياراتك بشكل دائم من أي جهاز." action="تسجيل الدخول" href="/login" /></div>; return <div className="container py-10 md:py-16"><Breadcrumbs items={['المحفوظات']} /><h1 className="text-4xl font-extrabold">المحفوظات</h1><p className="mt-3 text-sm text-muted-foreground">كل الروايات التي اخترت الاحتفاظ بها في حسابك، مع بقاء زر القلب متاحًا دائمًا.</p><div className="my-8 flex gap-2 border-b border-border pb-3">{[['want_to_read', 'المحفوظات'], ['reading', 'أقرأها الآن'], ['finished', 'أنهيتها']].map(([value, label]) => <button key={value} onClick={() => setTab(value as typeof tab)} className={`px-4 pb-2 text-xs font-bold ${tab === value ? 'border-b-2 border-[#7067ef] text-[#675de8]' : 'text-muted-foreground'}`}>{label}</button>)}</div>{query.isLoading ? <p className="text-sm text-muted-foreground">جارٍ تحميل قائمتك...</p> : visible.length ? <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{visible.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div> : <EmptyState title="لا توجد روايات هنا بعد" description="ابدأ باكتشاف رواية وأضفها إلى قائمتك." action="استكشف الروايات" />}</div>; }

export function ProfilePage() { const { user, loading, logout } = useAuth(); const list = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) }); const stats = { saved: list.data?.length ?? 0, finished: list.data?.filter((item) => item.status === 'finished').length ?? 0 }; if (loading) return <div className="container py-20 text-center">جارٍ تحميل الحساب...</div>; if (!user) return <div className="container py-16"><EmptyState title="سجّل الدخول إلى حسابك" description="أنشئ حسابًا للوصول إلى قائمتك وتقييماتك." action="تسجيل الدخول" href="/login" /></div>; return <div className="container py-10 md:py-16"><Breadcrumbs items={['حسابي']} /><section className="flex flex-col gap-5 rounded-[24px] border border-border bg-card p-6 sm:flex-row sm:items-center"><div className="grid size-20 place-items-center rounded-[24px] bg-[#eceaff] text-2xl font-extrabold text-[#675de8]">{(user.name ?? 'ر')[0]}</div><div><h1 className="text-2xl font-extrabold">مرحبًا، {user.name ?? 'قارئ رِواية'}</h1><p className="mt-1 text-xs text-muted-foreground">{user.email}</p></div><button onClick={() => void logout()} className="sm:mr-auto rounded-xl border border-border px-4 py-3 text-xs font-bold">تسجيل الخروج</button></section><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-[18px] border border-border bg-card p-5"><Heart size={18} className="mb-4 text-[#7067ef]" /><strong className="block text-2xl font-extrabold">{stats.saved}</strong><span className="mt-1 block text-xs text-muted-foreground">رواية محفوظة</span></div><div className="rounded-[18px] border border-border bg-card p-5"><Check size={18} className="mb-4 text-emerald-500" /><strong className="block text-2xl font-extrabold">{stats.finished}</strong><span className="mt-1 block text-xs text-muted-foreground">روايات تمت قراءتها</span></div></div><section className="mt-12"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-extrabold">رواياتك المحفوظة</h2><Link href="/my-list" className="text-xs font-bold text-[#675de8]">عرض القائمة</Link></div>{list.data?.length ? <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{list.data.slice(0, 4).map((item) => <NovelCard key={item.id} novel={toNovel({ id: item.novelId, slug: item.slug, title: item.title, coverUrl: item.coverUrl, description: item.description, rating: item.rating, parts: item.parts, status: item.novelStatus, author: item.author, authorSlug: item.authorSlug })} />)}</div> : <EmptyState title="ابدأ بناء قائمتك" description="لم تحفظ روايات بعد." action="استكشف الروايات" />}</section></div>; }
