import { Check, Heart, LockKeyhole, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
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
  const [focused, setFocused] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabaseConfigured) {
      toast.error('لم يتم إعداد Supabase Auth بعد');
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    if (register && password !== String(form.get('confirmPassword') ?? '')) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const result = register
      ? await client.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: redirectUrl('/auth/callback') },
        })
      : await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (register && !result.data.session) {
      toast.success('تم إنشاء الحساب. راجع بريدك لتأكيد الحساب.');
      return;
    }
    const next = new URLSearchParams(window.location.search).get('next');
    const isAdminHost = window.location.hostname.toLowerCase().startsWith('admin.');
    window.location.href = next || (isAdminHost ? '/' : '/profile');
  };

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: redirectUrl('/reset-password'),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('أرسلنا رابط استعادة كلمة المرور إلى بريدك.');
    setForgotOpen(false);
  };

  const inputClass = (name: string) =>
    `w-full rounded-2xl border bg-white/5 py-3.5 pr-11 pl-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 ${
      focused === name
        ? 'border-[#675de8] bg-white/10 shadow-[0_0_0_3px_rgba(103,93,232,0.25)]'
        : 'border-white/10 hover:border-white/20'
    }`;

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[#0b1025]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(103,93,232,0.35),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(170,164,255,0.2),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(23,30,66,0.8),transparent_40%)]" />
      <div className="auth-orb auth-orb-1 pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-[#675de8]/30 blur-3xl" />
      <div className="auth-orb auth-orb-2 pointer-events-none absolute -right-16 bottom-1/4 size-80 rounded-full bg-[#aaa4ff]/25 blur-3xl" />
      <div className="auth-orb auth-orb-3 pointer-events-none absolute left-1/3 top-0 size-56 rounded-full bg-[#7067ef]/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      <style>{`
        @keyframes auth-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.08); }
        }
        @keyframes auth-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 35px) scale(1.05); }
        }
        @keyframes auth-float-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 25px); }
        }
        @keyframes auth-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes auth-shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .auth-orb-1 { animation: auth-float-1 12s ease-in-out infinite; }
        .auth-orb-2 { animation: auth-float-2 14s ease-in-out infinite; }
        .auth-orb-3 { animation: auth-float-3 10s ease-in-out infinite; }
        .auth-card { animation: auth-card-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .auth-btn-shine {
          background-size: 200% auto;
          background-image: linear-gradient(105deg, #675de8 0%, #8b83f0 40%, #aaa4ff 50%, #8b83f0 60%, #675de8 100%);
        }
        .auth-btn-shine:hover:not(:disabled) {
          animation: auth-shine 1.2s linear infinite;
        }
      `}</style>

      <div className="auth-card relative z-10 w-full max-w-[420px]">
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-br from-[#675de8]/40 via-transparent to-[#aaa4ff]/30 opacity-60 blur-xl" />

        <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#11183a]/75 p-7 shadow-2xl backdrop-blur-2xl sm:p-9">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#675de8]/80 to-transparent" />

          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#675de8] to-[#4a42b8] shadow-lg shadow-[#675de8]/40">
              <Sparkles size={22} className="text-white" strokeWidth={1.7} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {register ? 'ابدأ رحلتك مع رِواية' : 'مرحبًا بعودتك'}
            </h1>
            <p className="mt-2 text-sm leading-7 text-white/50">
              {register ? 'أنشئ حسابًا واحفظ الروايات التي تهمك.' : 'ادخل إلى مساحتك وأكمل من حيث توقفت.'}
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            {register && (
              <label className="grid gap-2 text-[11px] font-bold text-white/70">
                الاسم
                <input
                  name="name"
                  required
                  placeholder="اسمك"
                  className={inputClass('name')}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                />
              </label>
            )}
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              البريد الإلكتروني
              <div className="relative">
                <Mail
                  size={16}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    focused === 'email' ? 'text-[#aaa4ff]' : 'text-white/35'
                  }`}
                />
                <input
                  name="email"
                  required
                  type="email"
                  placeholder="you@example.com"
                  dir="ltr"
                  className={inputClass('email')}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </label>
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              كلمة المرور
              <div className="relative">
                <LockKeyhole
                  size={16}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                    focused === 'password' ? 'text-[#aaa4ff]' : 'text-white/35'
                  }`}
                />
                <input
                  name="password"
                  required
                  minLength={6}
                  type="password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={inputClass('password')}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </label>
            {register && (
              <label className="grid gap-2 text-[11px] font-bold text-white/70">
                تأكيد كلمة المرور
                <input
                  name="confirmPassword"
                  required
                  type="password"
                  placeholder="••••••••"
                  dir="ltr"
                  className={inputClass('confirm')}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                />
              </label>
            )}
            <button
              disabled={loading}
              type="submit"
              className="auth-btn-shine mt-1 rounded-2xl py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#675de8]/30 transition-all duration-300 hover:shadow-[#675de8]/50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  جارٍ التحقق...
                </span>
              ) : register ? (
                'إنشاء الحساب'
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {!register && (
            <button
              type="button"
              onClick={() => setForgotOpen((v) => !v)}
              className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold text-[#aaa4ff] transition hover:text-white"
            >
              <RefreshCw size={13} />
              نسيت كلمة المرور؟
            </button>
          )}

          {forgotOpen && (
            <form
              onSubmit={requestReset}
              className="mt-4 animate-[auth-card-in_0.4s_ease] rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <label className="grid gap-2 text-[11px] font-bold text-white/70">
                أرسل رابط الاستعادة
                <input
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="you@example.com"
                  dir="ltr"
                  className="mt-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition focus:border-[#675de8] placeholder:text-white/30"
                />
              </label>
              <button
                disabled={loading}
                className="mt-3 w-full rounded-xl bg-[#675de8] py-3 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                إرسال الرابط
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-[10px] leading-5 text-white/35">
            تتم حماية حسابك بواسطة Supabase Auth مع تأكيد البريد الإلكتروني.
          </p>
          <div className="mt-6 text-center text-xs text-white/45">
            {register ? 'لديك حساب بالفعل؟ ' : 'ليس لديك حساب؟ '}
            <Link
              href={register ? '/login' : '/register'}
              className="font-bold text-[#aaa4ff] transition hover:text-white"
            >
              {register ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCallbackPage() {
  const [message, setMessage] = useState('جارٍ تأكيد بريدك الإلكتروني...');
  useEffect(() => {
    if (!supabase) {
      setMessage('لم يتم إعداد المصادقة بعد.');
      return;
    }
    let redirected = false;
    const go = () => {
      if (!redirected) {
        redirected = true;
        window.location.replace(window.location.hostname.toLowerCase().startsWith('admin.') ? '/' : '/profile');
      }
    };
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
      else setMessage('تم تأكيد البريد. يمكنك تسجيل الدخول الآن.');
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) go();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="container grid min-h-[calc(100vh-72px)] place-items-center py-16">
      <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center">
        <Mail className="mx-auto text-[#675de8]" size={32} />
        <h1 className="mt-5 text-2xl font-extrabold">تأكيد البريد الإلكتروني</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">
          العودة لتسجيل الدخول
        </Link>
      </div>
    </div>
  );
}

export function PasswordResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6 || password !== confirm) {
      toast.error('تأكد من تطابق كلمتي المرور وأن لا تقل عن 6 أحرف.');
      return;
    }
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('تم تحديث كلمة المرور بنجاح.');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  return (
    <div className="container grid min-h-[calc(100vh-72px)] place-items-center py-16">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8">
        <LockKeyhole className="text-[#675de8]" size={28} />
        <h1 className="mt-5 text-2xl font-extrabold">إنشاء كلمة مرور جديدة</h1>
        {ready ? (
          <form onSubmit={submit} className="mt-7 grid gap-4">
            <label className="grid gap-2 text-xs font-bold">
              كلمة المرور الجديدة
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-3 text-sm"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold">
              تأكيد كلمة المرور
              <input
                required
                minLength={6}
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-3 text-sm"
              />
            </label>
            <button disabled={saving} className="rounded-xl bg-[#171e42] py-3.5 text-xs font-bold text-white">
              {saving ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            افتح رابط استعادة كلمة المرور من بريدك الإلكتروني للوصول إلى هذه الصفحة.
          </p>
        )}
      </div>
    </div>
  );
}

export function ReadingListPage() {
  const [tab, setTab] = useState<'want_to_read' | 'reading' | 'finished'>('want_to_read');
  const { user, loading } = useAuth();
  const query = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) });
  const visible = (query.data ?? [])
    .filter((item) => item.status === tab)
    .map((item) =>
      toNovel({
        id: item.novelId,
        slug: item.slug,
        title: item.title,
        coverUrl: item.coverUrl,
        description: item.description,
        rating: item.rating,
        parts: item.parts,
        status: item.novelStatus,
        author: item.author,
        authorSlug: item.authorSlug,
      }),
    );
  if (!loading && !user)
    return (
      <div className="container py-16">
        <EmptyState title="سجّل الدخول لقائمتك" description="احفظ اختياراتك بشكل دائم من أي جهاز." action="تسجيل الدخول" href="/login" />
      </div>
    );
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['المحفوظات']} />
      <h1 className="text-4xl font-extrabold">المحفوظات</h1>
      <p className="mt-3 text-sm text-muted-foreground">كل الروايات التي اخترت الاحتفاظ بها في حسابك، مع بقاء زر القلب متاحًا دائمًا.</p>
      <div className="my-8 flex gap-2 border-b border-border pb-3">
        {(
          [
            ['want_to_read', 'المحفوظات'],
            ['reading', 'أقرأها الآن'],
            ['finished', 'أنهيتها'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 pb-2 text-xs font-bold ${tab === value ? 'border-b-2 border-[#7067ef] text-[#675de8]' : 'text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل قائمتك...</p>
      ) : visible.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد روايات هنا بعد" description="ابدأ باكتشاف رواية وأضفها إلى قائمتك." action="استكشف الروايات" />
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const list = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) });
  const quoteList = trpc.quotes.saved.useQuery(undefined, { enabled: Boolean(user) });
  const stats = {
    saved: list.data?.length ?? 0,
    finished: list.data?.filter((item) => item.status === 'finished').length ?? 0,
  };
  if (loading) return <div className="container py-20 text-center">جارٍ تحميل الحساب...</div>;
  if (!user)
    return (
      <div className="container py-16">
        <EmptyState title="سجّل الدخول إلى حسابك" description="أنشئ حسابًا للوصول إلى قائمتك وتقييماتك." action="تسجيل الدخول" href="/login" />
      </div>
    );
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['حسابي']} />
      <section className="flex flex-col gap-5 rounded-[24px] border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="grid size-20 place-items-center rounded-[24px] bg-[#eceaff] text-2xl font-extrabold text-[#675de8]">
          {(user.name ?? 'ر')[0]}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">مرحبًا، {user.name ?? 'قارئ رِواية'}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button onClick={() => void logout()} className="sm:mr-auto rounded-xl border border-border px-4 py-3 text-xs font-bold">
          تسجيل الخروج
        </button>
      </section>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border bg-card p-5">
          <Heart size={18} className="mb-4 text-[#7067ef]" />
          <strong className="block text-2xl font-extrabold">{stats.saved}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">رواية محفوظة</span>
        </div>
        <div className="rounded-[18px] border border-border bg-card p-5">
          <Heart size={18} className="mb-4 text-[#675de8]" fill="currentColor" />
          <strong className="block text-2xl font-extrabold">{quoteList.data?.length ?? 0}</strong>
          <Link href="/saved-quotes" className="mt-1 block text-xs font-bold text-[#675de8]">
            اقتباس محفوظ
          </Link>
        </div>
        <div className="rounded-[18px] border border-border bg-card p-5">
          <Check size={18} className="mb-4 text-emerald-500" />
          <strong className="block text-2xl font-extrabold">{stats.finished}</strong>
          <span className="mt-1 block text-xs text-muted-foreground">روايات تمت قراءتها</span>
        </div>
      </div>
      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">رواياتك المحفوظة</h2>
          <Link href="/my-list" className="text-xs font-bold text-[#675de8]">
            عرض القائمة
          </Link>
        </div>
        {list.data?.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {list.data.slice(0, 4).map((item) => (
              <NovelCard
                key={item.id}
                novel={toNovel({
                  id: item.novelId,
                  slug: item.slug,
                  title: item.title,
                  coverUrl: item.coverUrl,
                  description: item.description,
                  rating: item.rating,
                  parts: item.parts,
                  status: item.novelStatus,
                  author: item.author,
                  authorSlug: item.authorSlug,
                })}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="ابدأ بناء قائمتك" description="لم تحفظ روايات بعد." action="استكشف الروايات" />
        )}
      </section>
      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">اقتباساتك المحفوظة</h2>
          <Link href="/saved-quotes" className="text-xs font-bold text-[#675de8]">
            عرض الكل
          </Link>
        </div>
        {quoteList.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {quoteList.data.slice(0, 2).map((item) => (
              <Link key={item.id} href={`/quotes/${item.id}`} className="rounded-2xl border border-border bg-card p-5 text-sm font-bold leading-8">
                “{item.quote_text}”
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="احفظ أول اقتباس" description="اضغط زر الحفظ في صفحة أي اقتباس." action="تصفح الاقتباسات" href="/quotes" />
        )}
      </section>
    </div>
  );
}

export function SavedQuotesPage() {
  const { user, loading } = useAuth();
  const query = trpc.quotes.saved.useQuery(undefined, { enabled: Boolean(user) });
  if (loading) return <div className="container py-20 text-center">جارٍ تحميل حسابك...</div>;
  if (!user)
    return (
      <div className="container py-16">
        <EmptyState
          title="سجّل الدخول لمحفوظاتك"
          description="احفظ الاقتباسات التي تلمس قلبك وارجع إليها من أي جهاز."
          action="تسجيل الدخول"
          href="/login"
        />
      </div>
    );
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['حسابي', 'اقتباساتي المحفوظة']} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#675de8]">مكتبتك الشخصية</p>
          <h1 className="mt-2 text-4xl font-extrabold">اقتباساتي المحفوظة</h1>
          <p className="mt-3 text-sm text-muted-foreground">مجموعة الاقتباسات التي اخترت الاحتفاظ بها لتعود إليها عندما تحتاجها.</p>
        </div>
        <Link href="/quotes" className="inline-flex rounded-xl bg-[#171e42] px-4 py-3 text-xs font-extrabold text-white">
          اكتشف اقتباسات جديدة
        </Link>
      </div>
      {query.isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">جارٍ تحميل محفوظاتك...</p>
      ) : query.data?.length ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {query.data.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
              <Heart className="mb-5 text-[#675de8]" size={19} fill="currentColor" />
              <blockquote className="text-lg font-extrabold leading-9">“{item.quote_text}”</blockquote>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">
                  {item.author_name || item.speaker || 'القائل غير محدد'}
                  {item.book_title ? ` · ${item.book_title}` : ''}
                </span>
                <Link href={`/quotes/${item.id}`} className="font-extrabold text-[#675de8]">
                  فتح الاقتباس
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="لم تحفظ اقتباسات بعد"
            description="اضغط زر حفظ الاقتباس في أي صفحة اقتباس لبناء مجموعتك الخاصة."
            action="تصفح الاقتباسات"
            href="/quotes"
          />
        </div>
      )}
    </div>
  );
}
