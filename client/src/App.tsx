import { useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { SiteShell } from '@/components/SiteShell';
import Home from '@/pages/Home';
import { ExplorePage, SearchPage } from '@/pages/ExplorePages';
import NovelPage from '@/pages/NovelPage';
import { AuthorPage, GenrePage, SeriesPage } from '@/pages/ProfilePages';
import DiscoverPage from '@/pages/DiscoverPage';
import { AuthCallbackPage, AuthPage, PasswordResetPage, ProfilePage, ReadingListPage } from '@/pages/AccountPages';
import AdminPage from '@/pages/AdminPage';
import NotFound from '@/pages/NotFound';
import QuotesPage from '@/pages/QuotesPage';
import { AboutPage, ContactPage, FaqPage, HowItWorksPage, PrivacyPage, ReportPage, TermsPage } from '@/pages/InfoPages';

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return <SiteShell theme={theme} onThemeToggle={onThemeToggle}><Switch>
    <Route path="/" component={Home} /><Route path="/explore" component={ExplorePage} /><Route path="/search" component={SearchPage} />
    <Route path="/quotes" component={QuotesPage} /><Route path="/books/:slug" component={NovelPage} /><Route path="/novel/:slug" component={NovelPage} /><Route path="/novels/:slug" component={NovelPage} />
    <Route path="/authors/:slug" component={AuthorPage} /><Route path="/genres/:slug" component={GenrePage} /><Route path="/series/:slug" component={SeriesPage} />
    <Route path="/discover" component={DiscoverPage} /><Route path="/my-list" component={ReadingListPage} /><Route path="/profile" component={ProfilePage} />
    <Route path="/login"><AuthPage /></Route><Route path="/register"><AuthPage register /></Route><Route path="/auth/callback" component={AuthCallbackPage} /><Route path="/reset-password" component={PasswordResetPage} />
    <Route path="/about" component={AboutPage} /><Route path="/how-it-works" component={HowItWorksPage} /><Route path="/privacy" component={PrivacyPage} /><Route path="/terms" component={TermsPage} />
    <Route path="/contact" component={ContactPage} /><Route path="/report" component={ReportPage} /><Route path="/faq" component={FaqPage} />
    <Route component={NotFound} />
  </Switch></SiteShell>;
}

export default function App() {
  const [location] = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('riwaya-theme') as 'light' | 'dark') || 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('riwaya-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  if (location.startsWith('/admin')) return <><AdminPage /><Toaster position="bottom-left" /></>;
  return <><PublicRoutes theme={theme} onThemeToggle={toggleTheme} /><Toaster position="bottom-left" /></>;
}
