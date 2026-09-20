import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { SiteShell } from '@/components/SiteShell';
import { BookLoader } from '@/components/BookLoader';
// Homepage must not be lazy: SSR shell must align with the initial React tree.
import Home from '@/pages/Home';

const ExplorePage = lazy(() => import('@/pages/ExplorePages').then((module) => ({ default: module.ExplorePage })));
const SearchPage = lazy(() => import('@/pages/ExplorePages').then((module) => ({ default: module.SearchPage })));
const NovelPage = lazy(() => import('@/pages/NovelPage'));
const AuthorPage = lazy(() => import('@/pages/ProfilePages').then((module) => ({ default: module.AuthorPage })));
const GenrePage = lazy(() => import('@/pages/ProfilePages').then((module) => ({ default: module.GenrePage })));
const SeriesPage = lazy(() => import('@/pages/ProfilePages').then((module) => ({ default: module.SeriesPage })));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.AuthCallbackPage })));
const AuthPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.AuthPage })));
const PasswordResetPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.PasswordResetPage })));
const ProfilePage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.ProfilePage })));
const ReadingListPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.ReadingListPage })));
const SavedQuotesPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.SavedQuotesPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const QuotesPage = lazy(() => import('@/pages/QuotesPage'));
const QuotePage = lazy(() => import('@/pages/QuotesPage').then((module) => ({ default: module.QuotePage })));
const QuoteLandingPages = lazy(() => import('@/pages/QuoteLandingPages'));
const QuoteCategoriesPage = lazy(() => import('@/pages/QuoteLandingPages'));
const TopicsPage = lazy(() => import('@/pages/TopicPages').then((module) => ({ default: module.TopicsPage })));
const TopicPage = lazy(() => import('@/pages/TopicPages').then((module) => ({ default: module.TopicPage })));
const QuoteCategoryPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.QuoteCategoryPage })));
const AuthorQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.AuthorQuotesPage })));
const BookQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.BookQuotesPage })));
const AboutPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.ContactPage })));
const FaqPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.FaqPage })));
const HowItWorksPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.HowItWorksPage })));
const PrivacyPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.PrivacyPage })));
const ReportPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.ReportPage })));
const TermsPage = lazy(() => import('@/pages/InfoPages').then((module) => ({ default: module.TermsPage })));

function LoadingPage() { return <div className="grid min-h-[45vh] place-items-center"><BookLoader label="نجهز الصفحة" /></div>; }

const SITE_URL = 'https://e7ketha.com';
const SITE_NAME = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚';
const HOME_TITLE = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 📖 | كُـل رِوَايـة لَهـا حِڪَايـة ✍︎';
const DEFAULT_DESCRIPTION = 'هنا تبدأ حكايتك مع عالم الروايات… 📚✨ اكتشف روايات تستحق القراءة، أشهر الكُتّاب وأعمالهم، واستكشف عوالم الغموض والرعب والرومانسية والدراما والخيال… بدون حرق 🔥 | ترشيحات · كتّاب · نبذات · اقتباسات';

function SeoManager({ location }: { location: string }) {
  useEffect(() => {
    const pathname = location.split('?')[0] || '/';
    const isPrivate = /^\/(admin|login|register|auth|reset-password|my-list|saved-quotes|profile)(\/|$)/.test(pathname);
    const isSearch = pathname === '/search';
    const titles: Record<string, string> = {
      '/': HOME_TITLE,
      '/explore': `استكشف الروايات العربية | ${SITE_NAME}`,
      '/quotes': `اقتباسات عربية ملهمة من الروايات | ${SITE_NAME}`,
      '/quotes/categories': `تصنيفات الاقتباسات العربية | ${SITE_NAME}`,
      '/discover': `اكتشف قراءتك القادمة | ${SITE_NAME}`,
      '/about': `عن ${SITE_NAME} | منصة اكتشاف الروايات العربية`,
      '/how-it-works': `كيف تعمل ${SITE_NAME}؟`,
      '/faq': `الأسئلة الشائعة | ${SITE_NAME}`,
      '/contact': `تواصل معنا | ${SITE_NAME}`,
      '/privacy': `سياسة الخصوصية | ${SITE_NAME}`,
      '/terms': `شروط الاستخدام | ${SITE_NAME}`,
    };
    const title = titles[pathname] ?? (pathname.startsWith('/books/') || pathname.startsWith('/novel/') || pathname.startsWith('/novels/') ? `تفاصيل الرواية | ${SITE_NAME}` : pathname.startsWith('/authors/') ? `المؤلفون العرب | ${SITE_NAME}` : pathname.startsWith('/genres/') ? `تصنيفات الروايات | ${SITE_NAME}` : pathname.startsWith('/series/') ? `سلاسل روائية | ${SITE_NAME}` : HOME_TITLE);
    const description = isPrivate ? `هذه الصفحة مخصصة للمستخدمين المسجلين في ${SITE_NAME}.` : pathname === '/quotes' ? 'اقرأ واقتبس وشارك أجمل الاقتباسات العربية عن الحب والحياة والفلسفة والقراءة من الروايات والكتّاب.' : DEFAULT_DESCRIPTION;
    const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
    document.title = title;
    const setMeta = (selector: string, attributes: Record<string, string>, content: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
      Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value)); element.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', { name: 'description' }, description);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    setMeta('meta[property="og:url"]', { property: 'og:url' }, canonical);
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    setMeta('meta[name="robots"]', { name: 'robots' }, isPrivate || isSearch ? 'noindex,nofollow' : 'index,follow');
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); } link.href = canonical;
    let jsonLd = document.head.querySelector('#site-structured-data') as HTMLScriptElement | null;
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'site-structured-data'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL, description: DEFAULT_DESCRIPTION, inLanguage: 'ar' });
  }, [location]);
  return null;
}

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return <SiteShell theme={theme} onThemeToggle={onThemeToggle}><Suspense fallback={<LoadingPage />}><Switch>
    <Route path="/" component={Home} /><Route path="/explore" component={ExplorePage} /><Route path="/search" component={SearchPage} />
    <Route path="/quotes" component={QuotesPage} /><Route path="/quotes/categories" component={QuoteCategoriesPage} /><Route path="/quotes/category/:slug" component={QuoteCategoryPage} /><Route path="/quotes/:id" component={QuotePage} /><Route path="/topics" component={TopicsPage} /><Route path="/topics/:slug" component={TopicPage} /><Route path="/books/:slug/quotes" component={BookQuotesPage} /><Route path="/books/:slug" component={NovelPage} /><Route path="/novel/:slug" component={NovelPage} /><Route path="/novels/:slug" component={NovelPage} />
    <Route path="/authors/:slug/quotes" component={AuthorQuotesPage} /><Route path="/authors/:slug" component={AuthorPage} /><Route path="/genres/:slug" component={GenrePage} /><Route path="/series/:slug" component={SeriesPage} />
    <Route path="/discover" component={DiscoverPage} /><Route path="/my-list" component={ReadingListPage} /><Route path="/saved-quotes" component={SavedQuotesPage} /><Route path="/profile" component={ProfilePage} />
    <Route path="/login">{() => <AuthPage />}</Route><Route path="/register">{() => <AuthPage register />}</Route><Route path="/auth/callback" component={AuthCallbackPage} /><Route path="/reset-password" component={PasswordResetPage} />
    <Route path="/about" component={AboutPage} /><Route path="/how-it-works" component={HowItWorksPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} />
    <Route path="/contact" component={ContactPage} /><Route path="/report" component={ReportPage} /><Route path="/faq" component={FaqPage} />
    <Route component={NotFound} />
  </Switch></Suspense></SiteShell>;
}

function getHostRole() {
  if (typeof window === 'undefined') return 'public' as const;
  const host = window.location.hostname.toLowerCase();
  if (host === 'admin.e7ketha.com' || host.startsWith('admin.')) return 'admin' as const;
  if (host === 'api.e7ketha.com' || host.startsWith('api.')) return 'api' as const;
  return 'public' as const;
}

export default function App() {
  const [location] = useLocation();
  const hostRole = getHostRole();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('riwaya-theme') as 'light' | 'dark') || 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('riwaya-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');

  if (hostRole === 'api') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b1025] p-6 text-center text-white" dir="rtl">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-xl font-extrabold">E7ketha API</h1>
          <p className="mt-3 text-sm text-white/70">نقطة النهاية: <code className="text-[#a5b4fc]">/api/trpc</code></p>
          <a href="https://e7ketha.com" className="mt-6 inline-block text-sm font-bold text-[#8d84f9]">العودة للموقع</a>
        </div>
      </div>
    );
  }

  if (hostRole === 'admin') {
    // Keep auth routes on the same host so Supabase session stays local (no cross-subdomain loop)
    if (location.startsWith('/login') || location.startsWith('/register') || location.startsWith('/auth') || location.startsWith('/reset-password')) {
      const isRegister = location.startsWith('/register');
      return (
        <>
          <SeoManager location={location} />
          <Suspense fallback={<LoadingPage />}>
            {location.startsWith('/auth') ? <AuthCallbackPage /> : location.startsWith('/reset-password') ? <PasswordResetPage /> : <AuthPage register={isRegister} />}
          </Suspense>
          <Toaster position="bottom-left" />
        </>
      );
    }
    return <><SeoManager location="/admin" /><Suspense fallback={<LoadingPage />}><AdminPage /></Suspense><Toaster position="bottom-left" /></>;
  }

  if (location.startsWith('/admin')) {
    if (typeof window !== 'undefined') {
      const path = location.replace(/^\/admin/, '') || '/';
      window.location.replace(`https://admin.e7ketha.com${path}`);
    }
    return <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">جارٍ التحويل للوحة الإدارة…</div>;
  }

  return <><SeoManager location={location} /><PublicRoutes theme={theme} onThemeToggle={toggleTheme} /><Toaster position="bottom-left" /></>;
}
