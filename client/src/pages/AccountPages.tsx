import { Check, Eye, EyeOff, Heart, LockKeyhole, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { NovelCard } from '@/components/NovelCard';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { requireSupabase, supabase, supabaseConfigured } from '@/lib/supabase';
import { toNovel } from '@/lib/data';

const publicOrigin = () => {
  if (typeof window === 'undefined') return 'https://e7ketha.com';
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return window.location.origin;
  return 'https://e7ketha.com';
};

const redirectUrl = (path: string) => `${publicOrigin()}${path}`;

/** Password field with show/hide eye toggle */
function PasswordInput({
  name,
  value,
  onChange,
  required,
  minLength,
  tabIndex,
  className,
  placeholder = '••••••••',
  autoComplete = 'current-password',
  onFocus,
  onBlur,
  withLockIcon = false,
  lockActive = false,
  eyeClassName = 'text-white/40 hover:text-white/80',
}: {
  name?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  minLength?: number;
  tabIndex?: number;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  withLockIcon?: boolean;
  lockActive?: boolean;
  eyeClassName?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {withLockIcon && (
        <LockKeyhole
          size={16}
          className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
            lockActive ? 'text-[#aaa4ff]' : 'text-white/35'
          }`}
        />
      )}
      <input
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        dir="ltr"
        autoComplete={autoComplete}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${className ?? ''} ${withLockIcon ? 'pr-11' : ''} pl-11`}
      />
      <button
        type="button"
        tabIndex={tabIndex !== undefined && tabIndex < 0 ? -1 : 0}
        onClick={() => setShow((v) => !v)}
        className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 transition ${eyeClassName}`}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
      >
        {show ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

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
    if (!supabaseConfigured || !supabase) {
      toast.error('لم يتم إعداد المصادقة بعد');
      return;
    }
    const email = resetEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('أدخل بريدًا إلكترونيًا صالحًا');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl('/reset-password'),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('إذا كان البريد مسجلاً، ستصلك رسالة برابط استعادة كلمة المرور خلال دقائق. افتح الرابط من نفس المتصفح.');
    setForgotOpen(false);
    setResetEmail('');
  };

  const inputClass = (key: string) =>
    `auth-input w-full rounded-2xl border bg-white/5 py-3.5 pr-11 pl-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 ${
      focused === key
        ? 'auth-input-focus border-[#675de8] bg-white/10'
        : 'border-white/10 hover:border-white/25 hover:bg-white/[0.07]'
    }`;

  const faceCard = (mode: 'login' | 'register') => {
    const reg = mode === 'register';
    const active = isRegister === reg;
    return (
      <div className="auth-card-shell flex h-full flex-col rounded-[26px] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[26px] bg-gradient-to-r from-transparent via-[#675de8]/80 to-transparent" />
        <div className="auth-stagger mb-5 shrink-0 sm:mb-6">
          <div className="mb-5 flex justify-center">
            <div className="auth-logo-pulse grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#675de8] to-[#4a42b8] shadow-lg shadow-[#675de8]/40 sm:size-14">
              <Sparkles size={20} className="text-white" strokeWidth={1.7} />
            </div>
          </div>
          <div className="auth-tabs mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button type="button" tabIndex={active ? 0 : -1} onClick={() => flipTo(false)} className={`rounded-xl py-2.5 text-xs font-extrabold transition-all duration-300 ${!reg ? 'bg-gradient-to-l from-[#675de8] to-[#7067ef] text-white shadow-lg shadow-[#675de8]/30' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>تسجيل الدخول</button>
            <button type="button" tabIndex={active ? 0 : -1} onClick={() => flipTo(true)} className={`rounded-xl py-2.5 text-xs font-extrabold transition-all duration-300 ${reg ? 'bg-gradient-to-l from-[#675de8] to-[#7067ef] text-white shadow-lg shadow-[#675de8]/30' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>إنشاء حساب</button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">{reg ? 'ابدأ رحلتك مع رِواية' : 'مرحبًا بعودتك'}</h1>
            <p className="mt-1.5 text-sm leading-6 text-white/50">{reg ? 'أنشئ حسابًا واحفظ الروايات التي تهمك.' : 'ادخل إلى مساحتك وأكمل من حيث توقفت.'}</p>
          </div>
        </div>

        <form onSubmit={submit} className="auth-form-stagger grid grid-cols-1 gap-3.5">
          {reg && (
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>الاسم</span>
              <input name="name" required={active} placeholder="اسمك" className={inputClass(`${mode}-name`)} onFocus={() => setFocused(`${mode}-name`)} onBlur={() => setFocused(null)} tabIndex={active ? 0 : -1} />
            </label>
          )}
          <label className="grid gap-2 text-[11px] font-bold text-white/70">
            <span>البريد الإلكتروني</span>
            <div className="relative">
              <Mail size={16} className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focused === `${mode}-email` ? 'text-[#aaa4ff]' : 'text-white/35'}`} />
              <input name="email" required={active} type="email" placeholder="you@example.com" dir="ltr" className={inputClass(`${mode}-email`)} onFocus={() => setFocused(`${mode}-email`)} onBlur={() => setFocused(null)} tabIndex={active ? 0 : -1} />
            </div>
          </label>
          <label className="grid gap-2 text-[11px] font-bold text-white/70">
            <span>كلمة المرور</span>
            <PasswordInput
              name="password"
              required={active}
              minLength={6}
              withLockIcon
              lockActive={focused === `${mode}-password`}
              className={inputClass(`${mode}-password`)}
              onFocus={() => setFocused(`${mode}-password`)}
              onBlur={() => setFocused(null)}
              tabIndex={active ? 0 : -1}
              autoComplete={reg ? 'new-password' : 'current-password'}
            />
          </label>
          {reg && (
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>تأكيد كلمة المرور</span>
              <PasswordInput
                name="confirmPassword"
                required={active}
                minLength={6}
                className={inputClass(`${mode}-confirm`)}
                onFocus={() => setFocused(`${mode}-confirm`)}
                onBlur={() => setFocused(null)}
                tabIndex={active ? 0 : -1}
                autoComplete="new-password"
              />
            </label>
          )}
          <button disabled={loading || !active} type="submit" tabIndex={active ? 0 : -1} className="auth-btn-shine mt-1 rounded-2xl py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#675de8]/30 transition-all duration-300 hover:shadow-[#675de8]/50 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {loading && active ? (<span className="inline-flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />جارٍ التحقق...</span>) : reg ? 'إنشاء الحساب' : 'تسجيل الدخول'}
          </button>
        </form>

        {!reg && (
          <button type="button" tabIndex={active ? 0 : -1} onClick={() => setForgotOpen((v) => !v)} className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 text-xs font-bold text-[#aaa4ff] transition hover:text-white">
            <RefreshCw size={13} className={forgotOpen ? 'rotate-180 transition' : 'transition'} />
            {forgotOpen ? 'إخفاء استعادة كلمة المرور' : 'نسيت كلمة المرور؟'}
          </button>
        )}

        {!reg && forgotOpen && (
          <form onSubmit={requestReset} className="mt-3 shrink-0 space-y-3 rounded-2xl border border-[#675de8]/30 bg-[#675de8]/10 p-4">
            <p className="text-center text-[11px] leading-5 text-white/55">أدخل بريدك وسنرسل رابطًا. افتحه من <strong className="text-white/80">نفس المتصفح</strong> الذي طلبت منه الاستعادة.</p>
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>البريد الإلكتروني</span>
              <div className="relative">
                <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required type="email" autoComplete="email" placeholder="you@example.com" dir="ltr" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-11 pl-3 text-sm text-white outline-none transition focus:border-[#675de8] placeholder:text-white/30" />
              </div>
            </label>
            <button disabled={loading} type="submit" className="auth-btn-shine w-full rounded-xl py-3 text-xs font-extrabold text-white shadow-lg shadow-[#675de8]/25 transition hover:brightness-110 disabled:opacity-60">
              {loading ? (<span className="inline-flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />جارٍ الإرسال...</span>) : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}

        <div className="mt-auto pt-5">
          <p className="pb-1 text-center text-[10px] leading-5 text-white/35">تتم حماية حسابك بواسطة Supabase Auth مع تأكيد البريد الإلكتروني.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[#0b1025]" />
      <div className="auth-aurora pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(103,93,232,0.35),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(170,164,255,0.2),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(23,30,66,0.8),transparent_40%)]" />
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
      <div className="auth-orb auth-orb-1 pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-[#675de8]/30 blur-3xl" />
      <div className="auth-orb auth-orb-2 pointer-events-none absolute -right-16 bottom-1/4 size-80 rounded-full bg-[#aaa4ff]/25 blur-3xl" />
      <div className="auth-orb auth-orb-3 pointer-events-none absolute left-1/3 top-0 size-56 rounded-full bg-[#7067ef]/20 blur-3xl" />

      <style>{`
        @keyframes auth-float-1 { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(30px, -40px, 0) scale(1.08); } }
        @keyframes auth-float-2 { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(-25px, 35px, 0) scale(1.05); } }
        @keyframes auth-float-3 { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(20px, 25px, 0); } }
        @keyframes auth-shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        .auth-orb-1 { animation: auth-float-1 12s ease-in-out infinite; }
        .auth-orb-2 { animation: auth-float-2 14s ease-in-out infinite; }
        .auth-orb-3 { animation: auth-float-3 10s ease-in-out infinite; }
        .auth-input-focus { box-shadow: 0 0 0 3px rgba(103, 93, 232, 0.28), 0 0 24px rgba(103, 93, 232, 0.18); }
        .auth-btn-shine { background-size: 200% auto; background-image: linear-gradient(105deg, #675de8 0%, #8b83f0 40%, #aaa4ff 50%, #8b83f0 60%, #675de8 100%); position: relative; overflow: hidden; }
        .auth-btn-shine:hover:not(:disabled) { animation: auth-shine 1.2s linear infinite; }
        .auth-flip-scene { perspective: 1600px; width: 100%; max-width: 420px; }
        .auth-flip-tilt { transform-style: preserve-3d; transition: transform 0.35s ease-out; }
        .auth-flip-tilt.is-flipping { transition: none; }
        .auth-flip-inner { position: relative; width: 100%; min-height: 640px; transform-style: preserve-3d; transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1); }
        .auth-flip-inner.is-flipped { transform: rotateY(180deg); }
        .auth-flip-face { position: absolute; inset: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .auth-flip-face-front { transform: rotateY(0deg); }
        .auth-flip-face-back { transform: rotateY(180deg); }
        .auth-card-shell { position: relative; height: 100%; background: linear-gradient(165deg, rgba(24, 30, 62, 0.98) 0%, rgba(14, 18, 42, 0.98) 100%); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.55); }
        .auth-card-glow { pointer-events: none; position: absolute; inset: -18px; border-radius: 40px; background: radial-gradient(ellipse at 50% 40%, rgba(103, 93, 232, 0.45), transparent 65%); filter: blur(22px); z-index: -1; }
        .auth-edge-shine { pointer-events: none; position: absolute; inset: 0; border-radius: 26px; background: linear-gradient(125deg, rgba(255,255,255,0.14) 0%, transparent 40%); mix-blend-mode: screen; }
        .auth-aurora { background: radial-gradient(ellipse 60% 50% at 20% 30%, rgba(103,93,232,0.4), transparent 55%), radial-gradient(ellipse 50% 40% at 80% 70%, rgba(170,164,255,0.28), transparent 50%); animation: auth-aurora-shift 18s ease-in-out infinite alternate; }
        @keyframes auth-aurora-shift { 0% { transform: scale(1); } 100% { transform: scale(1.05); } }
        .auth-grid { background-image: linear-gradient(rgba(170,164,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(170,164,255,0.35) 1px, transparent 1px); background-size: 48px 48px; mask-image: radial-gradient(ellipse at center, black 20%, transparent 70%); }
        .auth-logo-pulse { animation: auth-logo-breathe 3.5s ease-in-out infinite; }
        @keyframes auth-logo-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .auth-form-stagger > * { animation: auth-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .auth-form-stagger > *:nth-child(1) { animation-delay: 0.05s; }
        .auth-form-stagger > *:nth-child(2) { animation-delay: 0.1s; }
        .auth-form-stagger > *:nth-child(3) { animation-delay: 0.15s; }
        .auth-form-stagger > *:nth-child(4) { animation-delay: 0.2s; }
        @keyframes auth-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div ref={sceneRef} className="auth-flip-scene relative z-10" onMouseMove={onSceneMove} onMouseLeave={onSceneLeave}>
        <div className={`auth-card-glow ${flipping ? 'is-flipping' : ''}`} />
        <div className={`auth-flip-tilt ${flipping ? 'is-flipping' : ''}`} style={{ transform: flipping ? undefined : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
          <div className={`auth-flip-inner ${isRegister ? 'is-flipped' : ''} ${flipping ? 'is-animating' : ''}`}>
            <div className="auth-flip-face auth-flip-face-front">{faceCard('login')}<div className="auth-edge-shine" /></div>
            <div className="auth-flip-face auth-flip-face-back">{faceCard('register')}<div className="auth-edge-shine" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCallbackPage() {
  const [message, setMessage] = useState('جارٍ تأكيد بريدك الإلكتروني...');
  useEffect(() => {
    if (!supabase) { setMessage('لم يتم إعداد المصادقة بعد.'); return; }
    let redirected = false;
    const go = () => { if (!redirected) { redirected = true; window.location.replace(window.location.hostname.toLowerCase().startsWith('admin.') ? '/' : '/profile'); } };
    void supabase.auth.getSession().then(({ data }) => { if (data.session) go(); else setMessage('تم تأكيد البريد. يمكنك تسجيل الدخول الآن.'); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) go(); });
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="container grid min-h-[calc(100vh-72px)] place-items-center py-16">
      <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center">
        <Mail className="mx-auto text-[#675de8]" size={32} />
        <h1 className="mt-5 text-2xl font-extrabold">تأكيد البريد الإلكتروني</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{message}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">العودة لتسجيل الدخول</Link>
      </div>
    </div>
  );
}

export function PasswordResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      setErrorMsg('لم يتم إعداد المصادقة بعد.');
      return;
    }

    let cancelled = false;
    let settled = false;

    const markReady = () => {
      if (cancelled || settled) return;
      settled = true;
      setReady(true);
      setChecking(false);
      setErrorMsg(null);
    };

    const markFail = (msg: string) => {
      if (cancelled || settled) return;
      settled = true;
      setReady(false);
      setChecking(false);
      setErrorMsg(msg);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') markReady();
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) markReady();
    });

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlError = params.get('error_description') || params.get('error');
        if (urlError) {
          markFail(decodeURIComponent(urlError.replace(/\+/g, ' ')));
          return;
        }

        const code = params.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            markFail(
              error.message.includes('verifier') || error.message.includes('code challenge')
                ? 'يجب فتح رابط الإيميل من نفس المتصفح والجهاز الذي طلبت منه «نسيت كلمة المرور». اطلب رابطًا جديدًا وافتحه فورًا من نفس المتصفح.'
                : error.message || 'رابط الاستعادة غير صالح أو منتهي.',
            );
            return;
          }
          if (data.session) {
            window.history.replaceState({}, '', '/reset-password');
            markReady();
            return;
          }
        }

        const tokenHash = params.get('token_hash') || params.get('token');
        const type = params.get('type');
        if (tokenHash && (type === 'recovery' || type === 'email' || type === 'magiclink')) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type === 'email' ? 'email' : type === 'magiclink' ? 'magiclink' : 'recovery') as 'recovery' | 'email' | 'magiclink',
          });
          if (error) {
            markFail(error.message || 'رابط الاستعادة غير صالح أو منتهي.');
            return;
          }
          if (data.session) {
            window.history.replaceState({}, '', '/reset-password');
            markReady();
            return;
          }
        }

        const hash = window.location.hash.replace(/^#/, '');
        if (hash) {
          const hp = new URLSearchParams(hash);
          const access_token = hp.get('access_token');
          const refresh_token = hp.get('refresh_token');
          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              markFail(error.message || 'تعذر تفعيل جلسة الاستعادة.');
              return;
            }
            if (data.session) {
              window.history.replaceState({}, '', '/reset-password');
              markReady();
              return;
            }
          }
        }

        for (let i = 0; i < 8 && !cancelled && !settled; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            markReady();
            return;
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!settled) {
          const hasLinkParams = Boolean(code || tokenHash || hash);
          markFail(
            hasLinkParams
              ? 'تعذر تفعيل الرابط. اطلب رابطًا جديدًا من تسجيل الدخول وافتحه من نفس المتصفح خلال دقائق (لا تنسخ الرابط لمتصفح آخر).'
              : 'هذه الصفحة تعمل فقط من رابط الإيميل. من تسجيل الدخول اضغط «نسيت كلمة المرور؟» واطلب رابطًا جديدًا.',
          );
        }
      } catch (e) {
        markFail(e instanceof Error ? e.message : 'حدث خطأ أثناء التحقق من الرابط.');
      }
    })();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف.');
      return;
    }
    if (password !== confirm) {
      toast.error('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (!supabase) {
      toast.error('لم يتم إعداد المصادقة بعد');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('تم تحديث كلمة المرور بنجاح.');
    await supabase.auth.signOut();
    window.location.replace('/login');
  };

  const inputCls = (key: string) =>
    `w-full rounded-2xl border bg-white/5 py-3.5 px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 ${
      focused === key
        ? 'border-[#675de8] bg-white/10 shadow-[0_0_0_3px_rgba(103,93,232,0.25)]'
        : 'border-white/10 hover:border-white/20'
    }`;

  return (
    <div className="relative flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[#0b1025]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(103,93,232,0.3),transparent_50%)]" />
      <div className="relative z-10 w-full max-w-md rounded-[26px] border border-white/10 bg-[#11183a] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#675de8] to-[#4a42b8] shadow-lg shadow-[#675de8]/40">
            <LockKeyhole size={22} className="text-white" strokeWidth={1.7} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">كلمة مرور جديدة</h1>
          <p className="mt-2 text-sm leading-7 text-white/50">أدخل كلمة المرور الجديدة ثم أكّدها واضغط تحديث.</p>
        </div>

        {checking ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <RefreshCw size={22} className="animate-spin text-[#aaa4ff]" />
            <p className="text-sm text-white/50">جارٍ تجهيز صفحة الاستعادة...</p>
          </div>
        ) : ready ? (
          <form onSubmit={submit} className="grid gap-3.5">
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>كلمة السر الجديدة</span>
              <PasswordInput
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                onFocus={() => setFocused('pw')}
                onBlur={() => setFocused(null)}
                className={inputCls('pw')}
              />
            </label>
            <label className="grid gap-2 text-[11px] font-bold text-white/70">
              <span>تأكيد كلمة السر</span>
              <PasswordInput
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                onFocus={() => setFocused('cf')}
                onBlur={() => setFocused(null)}
                className={inputCls('cf')}
              />
            </label>
            <button disabled={saving} type="submit" className="mt-1 rounded-2xl bg-gradient-to-l from-[#675de8] to-[#7067ef] py-3.5 text-xs font-extrabold text-white shadow-lg shadow-[#675de8]/30 transition hover:brightness-110 disabled:opacity-60">
              {saving ? (<span className="inline-flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />جارٍ التحديث...</span>) : 'تحديث كلمة السر'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-7 text-white/55">{errorMsg}</p>
            <Link href="/login" className="inline-flex justify-center rounded-xl bg-[#675de8] px-5 py-3 text-xs font-bold text-white transition hover:brightness-110">تسجيل الدخول / نسيت كلمة المرور</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReadingListPage() {
  const [tab, setTab] = useState<'want_to_read' | 'reading' | 'finished'>('want_to_read');
  const { user, loading } = useAuth();
  const query = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) });
  const visible = (query.data ?? []).filter((item) => item.status === tab).map((item) => toNovel({ id: item.novelId, slug: item.slug, title: item.title, coverUrl: item.coverUrl, description: item.description, rating: item.rating, parts: item.parts, status: item.novelStatus, author: item.author, authorSlug: item.authorSlug }));
  if (!loading && !user) return (<div className="container py-16"><EmptyState title="سجّل الدخول لقائمتك" description="احفظ اختياراتك بشكل دائم من أي جهاز." action="تسجيل الدخول" href="/login" /></div>);
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['المحفوظات']} />
      <h1 className="text-4xl font-extrabold">المحفوظات</h1>
      <div className="my-8 flex gap-2 border-b border-border pb-3">
        {([['want_to_read', 'المحفوظات'], ['reading', 'أقرأها الآن'], ['finished', 'أنهيتها']] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className={tab === value ? 'px-4 pb-2 text-xs font-bold border-b-2 border-[#7067ef] text-[#675de8]' : 'px-4 pb-2 text-xs font-bold text-muted-foreground'}>{label}</button>
        ))}
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">جارٍ تحميل قائمتك...</p> : visible.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">{visible.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div>
      ) : <EmptyState title="لا توجد روايات هنا بعد" description="ابدأ باكتشاف رواية وأضفها إلى قائمتك." action="استكشف الروايات" />}
    </div>
  );
}

export function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const list = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(user) });
  const quoteList = trpc.quotes.saved.useQuery(undefined, { enabled: Boolean(user) });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const stats = { saved: list.data?.length ?? 0, finished: list.data?.filter((item) => item.status === 'finished').length ?? 0 };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) { toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف.'); return; }
    if (newPassword !== confirmPassword) { toast.error('كلمتا المرور غير متطابقتين.'); return; }
    if (!supabase) { toast.error('لم يتم إعداد المصادقة بعد'); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم تغيير كلمة المرور بنجاح.');
    setNewPassword('');
    setConfirmPassword('');
    setShowPwForm(false);
  };

  if (loading) return <div className="container py-20 text-center">جارٍ تحميل الحساب...</div>;
  if (!user) return (<div className="container py-16"><EmptyState title="سجّل الدخول إلى حسابك" description="أنشئ حسابًا للوصول إلى قائمتك وتقييماتك." action="تسجيل الدخول" href="/login" /></div>);

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['حسابي']} />
      <section className="flex flex-col gap-5 rounded-[24px] border border-border bg-card p-6 sm:flex-row sm:items-center">
        <div className="grid size-20 place-items-center rounded-[24px] bg-[#eceaff] text-2xl font-extrabold text-[#675de8]">{(user.name ?? 'ر')[0]}</div>
        <div>
          <h1 className="text-2xl font-extrabold">مرحبًا، {user.name ?? 'قارئ رِواية'}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
        </div>
        <button onClick={() => void logout()} className="sm:mr-auto rounded-xl border border-border px-4 py-3 text-xs font-bold">تسجيل الخروج</button>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[18px] border border-border bg-card p-5"><Heart size={18} className="mb-4 text-[#7067ef]" /><strong className="block text-2xl font-extrabold">{stats.saved}</strong><span className="mt-1 block text-xs text-muted-foreground">رواية محفوظة</span></div>
        <div className="rounded-[18px] border border-border bg-card p-5"><Heart size={18} className="mb-4 text-[#675de8]" fill="currentColor" /><strong className="block text-2xl font-extrabold">{quoteList.data?.length ?? 0}</strong><Link href="/saved-quotes" className="mt-1 block text-xs font-bold text-[#675de8]">اقتباس محفوظ</Link></div>
        <div className="rounded-[18px] border border-border bg-card p-5"><Check size={18} className="mb-4 text-emerald-500" /><strong className="block text-2xl font-extrabold">{stats.finished}</strong><span className="mt-1 block text-xs text-muted-foreground">روايات تمت قراءتها</span></div>
      </div>

      <section className="mt-10 rounded-[24px] border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">تغيير كلمة المرور</h2>
            <p className="mt-1 text-xs text-muted-foreground">حدّث كلمة مرور حسابك وأنت مسجّل الدخول.</p>
          </div>
          <button type="button" onClick={() => setShowPwForm((v) => !v)} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-[#675de8]">{showPwForm ? 'إخفاء' : 'تغيير كلمة المرور'}</button>
        </div>
        {showPwForm && (
          <form onSubmit={changePassword} className="mt-5 grid max-w-md gap-3">
            <label className="grid gap-2 text-xs font-bold">كلمة المرور الجديدة
              <PasswordInput
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pr-3 text-sm text-foreground outline-none"
                eyeClassName="text-muted-foreground hover:text-foreground"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold">تأكيد كلمة المرور
              <PasswordInput
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pr-3 text-sm text-foreground outline-none"
                eyeClassName="text-muted-foreground hover:text-foreground"
              />
            </label>
            <button disabled={savingPw} type="submit" className="rounded-xl bg-[#675de8] py-3 text-xs font-extrabold text-white transition hover:brightness-110 disabled:opacity-60">{savingPw ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}</button>
          </form>
        )}
      </section>
    </div>
  );
}

export function SavedQuotesPage() {
  const { user, loading } = useAuth();
  const query = trpc.quotes.saved.useQuery(undefined, { enabled: Boolean(user) });
  if (loading) return <div className="container py-20 text-center">جارٍ تحميل حسابك...</div>;
  if (!user) return (<div className="container py-16"><EmptyState title="سجّل الدخول لمحفوظاتك" description="احفظ الاقتباسات التي تلمس قلبك." action="تسجيل الدخول" href="/login" /></div>);
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['حسابي', 'اقتباساتي المحفوظة']} />
      <h1 className="mt-2 text-4xl font-extrabold">اقتباساتي المحفوظة</h1>
      {query.isLoading ? <p className="mt-10 text-sm text-muted-foreground">جارٍ تحميل محفوظاتك...</p> : query.data?.length ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2">{query.data.map((item) => (
          <article key={item.id} className="rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <blockquote className="text-lg font-extrabold leading-9">“{item.quote_text}”</blockquote>
            <Link href={`/quotes/${item.id}`} className="mt-4 inline-block text-xs font-extrabold text-[#675de8]">فتح الاقتباس</Link>
          </article>
        ))}</div>
      ) : (<div className="mt-10"><EmptyState title="لم تحفظ اقتباسات بعد" description="اضغط زر حفظ الاقتباس في أي صفحة اقتباس." action="تصفح الاقتباسات" href="/quotes" /></div>)}
    </div>
  );
}
