import { lazy, Suspense, useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { Toaster } from 'sonner';
import { trpc } from '@/lib/trpc';
import { SiteShell } from '@/components/SiteShell';
import { AnalyticsRouteTracker } from '@/components/AnalyticsRouteTracker';
import { SeoManager } from '@/components/SeoManager';

const Home = lazy(() => import('@/pages/Home'));
const ExplorePage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.ExplorePage })));
const SearchPage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.SearchPage })));
const ArticlesPage = lazy(() => import('@/pages/ArticlesPages').then((m) => ({ default: m.ArticlesPage })));
const ArticlePage = lazy(() => import('@/pages/ArticlesPages').then((m) => ({ default: m.ArticlePage })));
const QuotesPage = lazy(() => import('@/pages/QuotesPage'));
const QuoteCategoriesPage = lazy(() => import('@/pages/QuoteLandingPages').then((m) => ({ default: m.QuoteCategoriesPage })));
const QuoteCategoryPage = lazy(() => import('@/pages/QuoteLandingPages').then((m) => ({ default: m.QuoteCategoryPage })));
const QuotePage = lazy(() => import('@/pages/QuotesPage').then((m) => ({ default: m.QuotePage })));
const TopicsPage = lazy(() => import('@/pages/TopicPages').then((m) => ({ default: m.TopicsPage })));
const TopicPage = lazy(() => import('@/pages/TopicPages').then((m) => ({ default: m.TopicPage })));
const BookQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((m) => ({ default: m.BookQuotesPage })));
const NovelPage = lazy(() => import('@/pages/NovelPage'));
const AuthorQuotesPage = lazy(() => import('@/pages/QuoteLandingPages').then((m) => ({ default: m.AuthorQuotesPage })));
const AuthorPage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.AuthorPage })));
const GenrePage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.GenrePage })));
const SeriesPage = lazy(() => import('@/pages/ExplorePages').then((m) => ({ default: m.SeriesPage })));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const ReadingListPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.ReadingListPage })));
const SavedQuotesPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.SavedQuotesPage })));
const ProfilePage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.ProfilePage })));
const AuthPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() => import('@/pages/AccountPages').then((m) => ({ default: m.ResetPasswordPage })));
const StaticPage = lazy(() => import('@/pages/InfoPages').then((m) => ({ default: m.StaticPage })));
const NotFound = lazy(() => import('@/pages/NotFound'));
const AdminApp = lazy(() => import('@/pages/AdminApp'));

function LoadingPage() {
  return <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">جارٍ التحميل…</div>;
}

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return (
    <SiteShell theme={theme} onThemeToggle={onThemeToggle}>
      <Suspense fallback={<LoadingPage />}>
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
        try {
          const { hasAuthHint, getSupabase } = await import('@/lib/supabase');
          if (!hasAuthHint()) return {};
          const sb = await getSupabase();
          if (!sb) return {};
          const { data } = await sb.auth.getSession();
          return data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {};
        } catch {
          return {};
        }
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
