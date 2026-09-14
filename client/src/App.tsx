import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { SiteShell } from '@/components/SiteShell';
import { BookLoader } from '@/components/BookLoader';

const Home = lazy(() => import('@/pages/Home'));
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
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const QuotesPage = lazy(() => import('@/pages/QuotesPage'));
const QuotePage = lazy(() => import('@/pages/QuotesPage').then((module) => ({ default: module.QuotePage })));
const QuoteCategoriesPage = lazy(() => import('@/pages/QuoteLandingPages'));
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

const SITE_URL = 'https://e7ketha.vercel.app';
const DEFAULT_DESCRIPTION = 'رِواية — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.';

function SeoManager({ location }: { location: string }) {
  useEffect(() => {
    const pathname = location.split('?')[0] || '/';
    const isPrivate = /^\/(admin|login|register|auth|reset-password|my-list|profile)(\/|$)/.test(pathname);
    const titles: Record<string, string> = {
      '/': 'رِواية — اكتشف روايتك القادمة', '/explore': 'استكشف الروايات العربية | رِواية', '/quotes': 'اقتباسات ملهمة من الروايات | رِواية',
      '/discover': 'اكتشف قراءتك القادمة | رِواية', '/about': 'عن رِواية | منصة اكتشاف الروايات العربية', '/how-it-works': 'كيف تعمل رِواية؟',
      '/faq': 'الأسئلة الشائعة | رِواية', '/contact': 'تواصل معنا | رِواية', '/privacy': 'سياسة الخصوصية | رِواية', '/terms': 'شروط الاستخدام | رِواية',
    };
    const title = titles[pathname] ?? (pathname.startsWith('/books/') || pathname.startsWith('/novel/') || pathname.startsWith('/novels/') ? 'تفاصيل الرواية | رِواية' : pathname.startsWith('/authors/') ? 'المؤلفون العرب | رِواية' : pathname.startsWith('/genres/') ? 'تصنيفات الروايات | رِواية' : pathname.startsWith('/series/') ? 'سلاسل روائية | رِواية' : 'رِواية — اكتشف روايتك القادمة');
    const description = isPrivate ? 'هذه الصفحة مخصصة للمستخدمين المسجلين في رِواية.' : DEFAULT_DESCRIPTION;
    const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
    document.title = title;
    const setMeta = (selector: string, attributes: Record<string, string>, content: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
      Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value)); element.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', { name: 'description' }, description); setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description); setMeta('meta[property="og:url"]', { property: 'og:url' }, canonical);
    setMeta('meta[name="robots"]', { name: 'robots' }, isPrivate ? 'noindex,nofollow' : 'index,follow');
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); } link.href = canonical;
    let jsonLd = document.head.querySelector('#site-structured-data') as HTMLScriptElement | null;
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'site-structured-data'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'رِواية', url: SITE_URL, description: DEFAULT_DESCRIPTION, inLanguage: 'ar' });
  }, [location]);
  return null;
}

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return <SiteShell theme={theme} onThemeToggle={onThemeToggle}><Suspense fallback={<LoadingPage />}><Switch>
    <Route path="/" component={Home} /><Route path="/explore" component={ExplorePage} /><Route path="/search" component={SearchPage} />
    <Route path="/quotes" component={QuotesPage} /><Route path="/quotes/categories" component={QuoteCategoriesPage} /><Route path="/quotes/category/:slug" component={QuoteCategoryPage} /><Route path="/quotes/:id" component={QuotePage} /><Route path="/books/:slug/quotes" component={BookQuotesPage} /><Route path="/books/:slug" component={NovelPage} /><Route path="/novel/:slug" component={NovelPage} /><Route path="/novels/:slug" component={NovelPage} />
    <Route path="/authors/:slug/quotes" component={AuthorQuotesPage} /><Route path="/authors/:slug" component={AuthorPage} /><Route path="/genres/:slug" component={GenrePage} /><Route path="/series/:slug" component={SeriesPage} />
    <Route path="/discover" component={DiscoverPage} /><Route path="/my-list" component={ReadingListPage} /><Route path="/profile" component={ProfilePage} />
    <Route path="/login">{() => <AuthPage />}</Route><Route path="/register">{() => <AuthPage register />}</Route><Route path="/auth/callback" component={AuthCallbackPage} /><Route path="/reset-password" component={PasswordResetPage} />
    <Route path="/about" component={AboutPage} /><Route path="/how-it-works" component={HowItWorksPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} />
    <Route path="/contact" component={ContactPage} /><Route path="/report" component={ReportPage} /><Route path="/faq" component={FaqPage} />
    <Route component={NotFound} />
  </Switch></Suspense></SiteShell>;
}

export default function App() {
  const [location] = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('riwaya-theme') as 'light' | 'dark') || 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('riwaya-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  if (location.startsWith('/admin')) return <><SeoManager location={location} /><Suspense fallback={<LoadingPage />}><AdminPage /></Suspense><Toaster position="bottom-left" /></>;
  return <><SeoManager location={location} /><PublicRoutes theme={theme} onThemeToggle={toggleTheme} /><Toaster position="bottom-left" /></>;
}
