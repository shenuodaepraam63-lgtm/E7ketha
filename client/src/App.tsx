import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { SiteShell } from '@/components/SiteShell';
import { LoadingPage } from '@/components/LoadingPage';
import { trpc } from '@/lib/trpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { Toaster } from 'sonner';
import { AnalyticsRouteTracker } from '@/components/AnalyticsRouteTracker';

const Home = lazy(() => import('@/pages/Home'));
const ExplorePage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.ExplorePage })));
const SearchPage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.SearchPage })));
const ArticlesPage = lazy(() => import('@/pages/ArticlesPages').then((m) => ({ default: m.ArticlesPage })));
const ArticlePage = lazy(() => import('@/pages/ArticlesPages').then((m) => ({ default: m.ArticlePage })));
const SavedQuotesPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.SavedQuotesPage })));
const ReadingListPage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.ReadingListPage })));
const ProfilePage = lazy(() => import('@/pages/AccountPages').then((module) => ({ default: module.ProfilePage })));
const QuotesPage = lazy(() => import('@/pages/QuotesPage'));
const QuotePage = lazy(() => import('@/pages/QuotesPage').then((module) => ({ default: module.QuotePage })));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const QuoteCategoriesPage = lazy(() => import('@/pages/QuoteLandingPages'));
const QuoteCategoryPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.QuoteCategoryPage })));
const AuthorQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.AuthorQuotesPage })));
const BookQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((module) => ({ default: module.BookQuotesPage })));
const NovelPage = lazy(() => import('@/pages/ProfilePages').then((m) => ({ default: m.NovelPage })));
const AuthorPage = lazy(() => import('@/pages/ProfilePages').then((m) => ({ default: m.AuthorPage })));
const GenrePage = lazy(() => import('@/pages/ProfilePages').then((m) => ({ default: m.GenrePage })));
const SeriesPage = lazy(() => import('@/pages/ProfilePages').then((m) => ({ default: m.SeriesPage })));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const TopicsPage = lazy(() => import('@/pages/TopicPages').then((m) => ({ default: m.TopicsPage })));
const TopicPage = lazy(() => import('@/pages/TopicPages').then((m) => ({ default: m.TopicPage })));
const StaticPage = lazy(() => import('@/pages/StaticPages').then((m) => ({ default: m.StaticPage })));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AdminApp = lazy(() => import('@/pages/AdminApp'));

const SITE_NAME = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚';
const SITE_URL = 'https://e7ketha.com';

function SeoManager() {
  const [location] = useLocation();
  useEffect(() => {
    const pathname = location.split('?')[0] || '/';
    const isPrivate = /^\/(admin|login|register|auth|reset-password|my-list|saved-quotes|profile)(\/|$)/.test(pathname);
    const isSearch = pathname === '/search';
    const titles: Record<string, string> = {
      '/': `${SITE_NAME} | كُـل رِوَايـة لَهـا حِڪَايـة`,
      '/explore': `استكشف الروايات العربية | ${SITE_NAME}`,
      '/articles': `مقالات أدبية وترشيحات قراءة | ${SITE_NAME}`,
      '/quotes': `اقتباسات عربية ملهمة من الروايات | ${SITE_NAME}`,
      '/quotes/categories': `تصنيفات الاقتباسات العربية | ${SITE_NAME}`,
      '/about': `عن المنصة | ${SITE_NAME}`,
      '/how-it-works': `كيف تعمل المنصة؟ | ${SITE_NAME}`,
      '/faq': `الأسئلة الشائعة | ${SITE_NAME}`,
      '/contact': `تواصل معنا | ${SITE_NAME}`,
      '/privacy': `سياسة الخصوصية | ${SITE_NAME}`,
      '/terms': `شروط الاستخدام | ${SITE_NAME}`,
      '/discover': `اكتشف روايتك القادمة | ${SITE_NAME}`,
      '/topics': `موضوعات الروايات العربية | ${SITE_NAME}`,
    };
    const isEntityPage =
      /^\/(books|novel|novels|authors|genres|series|articles|topics)\//.test(pathname) ||
      /^\/quotes\/\d+$/.test(pathname) ||
      pathname.startsWith('/quotes/category/');
    const title = titles[pathname] || `${SITE_NAME}`;
    const description =
      pathname === '/'
        ? '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.'
        : pathname === '/quotes'
          ? 'اكتشف اقتباسات مؤثرة عن الحب والحياة والفلسفة من أشهر الروايات والكتّاب العرب.'
          : 'رِواية تساعدك تفهم عالم الروايات العربية، وتلاقي ما يستحق وقتك.';
    const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname}`;
    if (!isEntityPage) {
      document.title = title;
      const setMeta = (sel: string, attrs: Record<string, string>, content: string) => {
        let el = document.head.querySelector(sel) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };
      setMeta('meta[name="description"]', { name: 'description' }, description);
      setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
      setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
      setMeta('meta[property="og:url"]', { property: 'og:url' }, canonical);
      setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
      setMeta('meta[name="robots"]', { name: 'robots' }, isPrivate || isSearch ? 'noindex,nofollow' : 'index,follow');
    }
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [location]);
  return null;
}

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  const [location] = useLocation();
  const isAuthPage = location === '/login' || location === '/register';

  return (
    <SiteShell theme={theme} onThemeToggle={onThemeToggle}>
      <Suspense fallback={<LoadingPage />}>
        {isAuthPage ? (
          <AuthPage register={location.startsWith('/register')} />
        ) : (
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/search" component={SearchPage} />
            <Route path="/articles" component={ArticlesPage} />
            <Route path="/articles/:slug" component={ArticlePage} />
            <Route path="/quotes" component={QuotesPage} />
            <Route path="/quotes/categories" component={QuoteCategoriesPage} />
            <Route path="/quotes/category/:slug" component={QuoteCategoryPage} />
            <Route path="/quotes/:id" component={QuotePage} />
            <Route path="/topics" component={TopicsPage} />
            <Route path="/topics/:slug" component={TopicPage} />
            <Route path="/books/:slug/quotes" component={BookQuotesPage} />
            <Route path="/books/:slug" component={NovelPage} />
            <Route path="/novel/:slug" component={NovelPage} />
            <Route path="/novels/:slug" component={NovelPage} />
            <Route path="/authors/:slug/quotes" component={AuthorQuotesPage} />
            <Route path="/authors/:slug" component={AuthorPage} />
            <Route path="/genres/:slug" component={GenrePage} />
            <Route path="/series/:slug" component={SeriesPage} />
            <Route path="/discover" component={DiscoverPage} />
            <Route path="/my-list" component={ReadingListPage} />
            <Route path="/saved-quotes" component={SavedQuotesPage} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/auth/callback" component={AuthPage} />
            <Route path="/login" component={AuthPage} />
            <Route path="/register" component={AuthPage} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="/about" component={StaticPage} />
            <Route path="/how-it-works" component={StaticPage} />
            <Route path="/faq" component={StaticPage} />
            <Route path="/contact" component={StaticPage} />
            <Route path="/privacy" component={StaticPage} />
            <Route path="/terms" component={StaticPage} />
            <Route path="/report" component={StaticPage} />
            <Route component={NotFound} />
          </Switch>
        )}
      </Suspense>
    </SiteShell>
  );
}

function AppInner() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  const onThemeToggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const [location] = useLocation();
  if (location.startsWith('/admin')) {
    return (
      <Suspense fallback={<LoadingPage />}>
        <AdminApp />
      </Suspense>
    );
  }
  return <PublicRoutes theme={theme} onThemeToggle={onThemeToggle} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function resolveTrpcUrl() {
  if (typeof window === 'undefined') return '/api/trpc';
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return '/api/trpc';
  if (host === 'api.e7ketha.com' || host.startsWith('api.')) return '/api/trpc';
  return 'https://api.e7ketha.com/api/trpc';
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: resolveTrpcUrl(),
      transformer: superjson,
      async headers() {
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: 'include' });
      },
    }),
  ],
});

export default function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SeoManager />
        <AnalyticsRouteTracker />
        <AppInner />
        <Toaster richColors position="top-center" dir="rtl" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
