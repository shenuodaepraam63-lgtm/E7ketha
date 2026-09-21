import { Check, Heart, LockKeyhole, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { NovelCard } from '@/components/NovelCard';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { requireSupabase, supabase, supabaseConfigured } from '@/lib/supabase';
import { toNovel } from '@/lib/data';

const redirectUrl = (path: string) => `${window.location.origin}${path}`;

export function AuthPage({ register = false }: { register?: boolean }) {
  const [, navigate] = useLocation();
  const [isRegister, setIsRegister] = useState(register);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const sceneRef = useRef<HTMLDivElement | null>(null);

  // Sync only when landing from outside (not during our own flip)
  useEffect(() => {
    if (!flipping) setIsRegister(register);
  }, [register, flipping]);

  const onSceneMove = (e: MouseEvent<HTMLDivElement>) => {
    if (flipping || !sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -10, y: px * 12 });
  };

  const onSceneLeave = () => setTilt({ x: 0, y: 0 });

  const flipTo = (nextRegister: boolean) => {
    if (nextRegister === isRegister || flipping) return;
    setFlipping(true);
    setForgotOpen(false);
    setFocused(null);
    setIsRegister(nextRegister);
    navigate(nextRegister ? '/register' : '/login', { replace: true });
    window.setTimeout(() => setFlipping(false), 800);
  };

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
    if (isRegister && password !== String(form.get('confirmPassword') ?? '')) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const result = isRegister
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
    if (isRegister && !result.data.session) {
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

  const inputClass = (key: string) =>
    `w-full rounded-2xl border bg-white/5 py-3.5 pr-11 pl-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 ${
      focused === key
        ? 'border-[#675de8] bg-white/10 shadow-[0_0_0_3px_rgba(103,93,232,0.25)]'
        : 'border-white/10 hover:border-white/20'
    }`;

  const faceCard = (mode: 'login' | 'register') => {
    const reg = mode === 'register';
    const active = isRegister === reg;
    return (
      <div className="flex h-full flex-col rounded-[26px] border border-white/10 bg-[#11183a] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[26px] bg-gradient-to-r from-transparent via-[#675de8]/80 to-transparent" />
        <div className="mb-6 shrink-0 text-center sm:mb-7">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#675de8] to-[#4a42b8] shadow-lg shadow-[#675de8]/40">
            <Sparkles size={22} className="text-white" strokeWidth={1.7} />
          </div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
            {reg ? 'ابدأ رحلتك مع رِواية' : 'مرحبًا بعودتك'}
          </h1>
          <p className="mt-2 text-sm leading-7 text-white/50">
            {reg ? 'أنشئ حسابًا واحفظ الروايات التي تهمك.' : 'ادخل إلى مساحتك وأكمل من حيث توقفت.'}
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-3.5">
          {reg && (
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>الاسم</span>
              <input
                name="name"
                required={active}
                placeholder="اسمك"
                className={inputClass(`${mode}-name`)}
                onFocus={() => setFocused(`${mode}-name`)}
                onBlur={() => setFocused(null)}
                tabIndex={active ? 0 : -1}
              />
            </label>
          )}
          <label className="grid gap-2 text-[11px] font-bold text-white/70">
            <span>البريد الإلكتروني</span>
            <div className="relative">
              <Mail
                size={16}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                  focused === `${mode}-email` ? 'text-[#aaa4ff]' : 'text-white/35'
                }`}
              />
              <input
                name="email"
                required={active}
                type="email"
                placeholder="you@example.com"
                dir="ltr"
                className={inputClass(`${mode}-email`)}
                onFocus={() => setFocused(`${mode}-email`)}
                onBlur={() => setFocused(null)}
                tabIndex={active ? 0 : -1}
              />
            </div>
          </label>
          <label className="grid gap-2 text-[11px] font-bold text-white/70">
            <span>كلمة المرور</span>
            <div className="relative">
              <LockKeyhole
                size={16}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                  focused === `${mode}-password` ? 'text-[#aaa4ff]' : 'text-white/35'
                }`}
              />
              <input
                name="password"
                required={active}
                minLength={6}
                type="password"
                placeholder="••••••••"
                dir="ltr"
                className={inputClass(`${mode}-password`)}
                onFocus={() => setFocused(`${mode}-password`)}
                onBlur={() => setFocused(null)}
                tabIndex={active ? 0 : -1}
              />
            </div>
          </label>
          {reg && (
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>تأكيد كلمة المرور</span>
              <input
                name="confirmPassword"
                required={active}
                type="password"
                placeholder="••••••••"
                dir="ltr"
                className={inputClass(`${mode}-confirm`)}
                onFocus={() => setFocused(`${mode}-confirm`)}
                onBlur={() => setFocused(null)}
                tabIndex={active ? 0 : -1}
              />
            </label>
          )}
          <button
            disabled={loading || !active}
            type="submit"
            tabIndex={active ? 0 : -1}
            className="auth-btn-shine mt-1 rounded-2xl py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#675de8]/30 transition-all duration-300 hover:shadow-[#675de8]/50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && active ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                جارٍ التحقق...
              </span>
            ) : reg ? (
              'إنشاء الحساب'
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        {!reg && (
          <button
            type="button"
            tabIndex={active ? 0 : -1}
            onClick={() => setForgotOpen((v) => !v)}
            className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 text-xs font-bold text-[#aaa4ff] transition hover:text-white"
          >
            <RefreshCw size={13} />
            نسيت كلمة المرور؟
          </button>
        )}

        {!reg && forgotOpen && (
          <form onSubmit={requestReset} className="mt-3 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>أرسل رابط الاستعادة</span>
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

        <div className="mt-auto pt-5">
          <p className="text-center text-[10px] leading-5 text-white/35">
            تتم حماية حسابك بواسطة Supabase Auth مع تأكيد البريد الإلكتروني.
          </p>
          <div className="mt-3 pb-1 text-center text-xs leading-6 text-white/45">
            {reg ? 'لديك حساب بالفعل؟ ' : 'ليس لديك حساب؟ '}
            <button
              type="button"
              tabIndex={active ? 0 : -1}
              onClick={() => flipTo(!reg)}
              className="font-bold text-[#aaa4ff] transition hover:text-white"
            >
              {reg ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[#0b1025]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(103,93,232,0.35),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(170,164,255,0.2),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(23,30,66,0.8),transparent_40%)]" />
      <div className="auth-orb auth-orb-1 pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-[#675de8]/30 blur-3xl" />
      <div className="auth-orb auth-orb-2 pointer-events-none absolute -right-16 bottom-1/4 size-80 rounded-full bg-[#aaa4ff]/25 blur-3xl" />
      <div className="auth-orb auth-orb-3 pointer-events-none absolute left-1/3 top-0 size-56 rounded-full bg-[#7067ef]/20 blur-3xl" />

      <style>{`
        @keyframes auth-float-1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(30px, -40px, 0) scale(1.08); }
        }
        @keyframes auth-float-2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-25px, 35px, 0) scale(1.05); }
        }
        @keyframes auth-float-3 {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(20px, 25px, 0); }
        }
        @keyframes auth-shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes auth-glow-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }
        @keyframes auth-spark {
          0% { transform: translate3d(0, 20px, 0) scale(0); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translate3d(var(--sx), var(--sy), 0) scale(1); opacity: 0; }
        }
        .auth-orb-1 { animation: auth-float-1 12s ease-in-out infinite; }
        .auth-orb-2 { animation: auth-float-2 14s ease-in-out infinite; }
        .auth-orb-3 { animation: auth-float-3 10s ease-in-out infinite; }
        .auth-btn-shine {
          background-size: 200% auto;
          background-image: linear-gradient(105deg, #675de8 0%, #8b83f0 40%, #aaa4ff 50%, #8b83f0 60%, #675de8 100%);
        }
        .auth-btn-shine:hover:not(:disabled) {
          animation: auth-shine 1.2s linear infinite;
        }
        .auth-flip-scene {
          perspective: 1600px;
          -webkit-perspective: 1600px;
          perspective-origin: 50% 45%;
          width: 100%;
          max-width: 420px;
        }
        .auth-flip-tilt {
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 0.35s ease-out;
          will-change: transform;
        }
        .auth-flip-tilt.is-flipping {
          transition: none;
        }
        .auth-flip-inner {
          position: relative;
          width: 100%;
          min-height: 640px;
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .auth-flip-inner.is-flipped {
          transform: rotateY(180deg) translateZ(0);
        }
        .auth-flip-inner.is-animating {
          animation: auth-depth-pulse 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes auth-depth-pulse {
          0% { filter: brightness(1); }
          45% { filter: brightness(1.12); }
          100% { filter: brightness(1); }
        }
        .auth-flip-face {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
        .auth-flip-face-front {
          transform: rotateY(0deg) translateZ(2px);
          -webkit-transform: rotateY(0deg) translateZ(2px);
        }
        .auth-flip-face-back {
          transform: rotateY(180deg) translateZ(2px);
          -webkit-transform: rotateY(180deg) translateZ(2px);
        }
        .auth-flip-face > div {
          position: relative;
          height: 100%;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(103, 93, 232, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .auth-edge-shine {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: 26px;
          background: linear-gradient(
            125deg,
            rgba(255, 255, 255, 0.14) 0%,
            transparent 28%,
            transparent 62%,
            rgba(170, 164, 255, 0.08) 100%
          );
          opacity: 0.85;
          mix-blend-mode: screen;
        }
        .auth-card-glow {
          pointer-events: none;
          position: absolute;
          inset: -18px;
          border-radius: 40px;
          background: radial-gradient(ellipse at 50% 40%, rgba(103, 93, 232, 0.45), transparent 65%);
          filter: blur(22px);
          animation: auth-glow-pulse 5s ease-in-out infinite;
          z-index: -1;
        }
        .auth-card-glow.is-flipping {
          animation: auth-glow-pulse 0.6s ease-in-out 2;
          background: radial-gradient(ellipse at 50% 40%, rgba(170, 164, 255, 0.55), transparent 60%);
        }
        .auth-spark {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #aaa4ff;
          box-shadow: 0 0 8px 2px rgba(170, 164, 255, 0.7);
          pointer-events: none;
          opacity: 0;
        }
        .auth-spark.run {
          animation: auth-spark 0.85s ease-out forwards;
        }
      `}</style>

      <div
        ref={sceneRef}
        className="auth-flip-scene relative z-10"
        onMouseMove={onSceneMove}
        onMouseLeave={onSceneLeave}
      >
        <div className={`auth-card-glow ${flipping ? 'is-flipping' : ''}`} />
        <div
          className={`auth-flip-tilt ${flipping ? 'is-flipping' : ''}`}
          style={{
            transform: flipping
              ? undefined
              : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          }}
        >
          <div className={`auth-flip-inner ${isRegister ? 'is-flipped' : ''} ${flipping ? 'is-animating' : ''}`}>
            <div className="auth-flip-face auth-flip-face-front">
              {faceCard('login')}
              <div className="auth-edge-shine" />
            </div>
            <div className="auth-flip-face auth-flip-face-back">
              {faceCard('register')}
              <div className="auth-edge-shine" />
            </div>
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
