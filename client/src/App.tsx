import { useEffect, useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'sonner';
import { SiteShell } from '@/components/SiteShell';
import Home from '@/pages/Home';
import { ExplorePage, SearchPage } from '@/pages/ExplorePages';
import NovelPage from '@/pages/NovelPage';
import { AuthorPage, GenrePage, SeriesPage } from '@/pages/ProfilePages';
import DiscoverPage from '@/pages/DiscoverPage';
import { AuthPage, ProfilePage, ReadingListPage } from '@/pages/AccountPages';
import AdminPage from '@/pages/AdminPage';
import NotFound from '@/pages/NotFound';
import { ShopPage, ShopProductPage } from '@/pages/ShopPage';

function PublicRoutes({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  return <SiteShell theme={theme} onThemeToggle={onThemeToggle}><Switch><Route path="/" component={Home} /><Route path="/explore" component={ExplorePage} /><Route path="/search" component={SearchPage} /><Route path="/shop" component={ShopPage} /><Route path="/shop/:handle" component={ShopProductPage} /><Route path="/books/:slug" component={NovelPage} /><Route path="/authors/:slug" component={AuthorPage} /><Route path="/genres/:slug" component={GenrePage} /><Route path="/series/:slug" component={SeriesPage} /><Route path="/discover" component={DiscoverPage} /><Route path="/my-list" component={ReadingListPage} /><Route path="/profile" component={ProfilePage} /><Route path="/login"><AuthPage /></Route><Route path="/register"><AuthPage register /></Route><Route path="/about"><InfoPage title="عن رِواية" text="رِواية منصة عربية تساعدك تكتشف الروايات، تفهم عوالمها، وتلاقي ما يناسب ذوقك — بدون استضافة ملفات الكتب." /></Route><Route path="/contact"><InfoPage title="تواصل معنا" text="لو عندك اقتراح، ملاحظة، أو معلومة تحتاج مراجعة، يسعدنا نسمع منك." /></Route><Route path="/report"><InfoPage title="الإبلاغ عن مشكلة" text="ساعدنا نخلي المعلومات أدق. أرسل البلاغ المناسب وسنراجعه في أقرب وقت." /></Route><Route component={NotFound} /></Switch></SiteShell>;
}

function InfoPage({ title, text }: { title: string; text: string }) { return <div className="container py-20"><div className="mx-auto max-w-2xl rounded-[28px] border border-border bg-card p-8 md:p-12"><div className="section-label mb-3">رِواية</div><h1 className="text-4xl font-extrabold tracking-[-.07em]">{title}</h1><p className="mt-5 text-sm leading-8 text-muted-foreground">{text}</p><div className="mt-8 rounded-2xl bg-[#f0eeff] p-5 text-xs leading-7 text-[#5f56d9] dark:bg-[#24224c] dark:text-[#bcb7ff]">هذه الواجهة جاهزة للربط مع المحتوى الفعلي لاحقًا. لا توجد بيانات خاصة أو ملفات كتب مستضافة هنا.</div></div></div>; }

export default function App() {
  const [location] = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('riwaya-theme') as 'light' | 'dark') || 'light');
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('riwaya-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme((current) => current === 'dark' ? 'light' : 'dark');
  if (location.startsWith('/admin')) return <><AdminPage /><Toaster position="bottom-left" /></>;
  return <><PublicRoutes theme={theme} onThemeToggle={toggleTheme} /><Toaster position="bottom-left" /></>;
}
