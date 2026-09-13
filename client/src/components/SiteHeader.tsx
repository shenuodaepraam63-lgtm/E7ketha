import { Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { Brand } from './Brand';
import { GlobalSearch } from './GlobalSearch';
import { navItems } from '@/lib/data';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const query = trpc.notifications.list.useQuery();
  const messages = trpc.messages.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => void query.refetch() });
  const unread = (query.data ?? []).filter((item) => !item.readAt).length;
  return <div className="relative"><button onClick={() => setOpen(!open)} className="relative grid size-11 place-items-center rounded-[14px] border border-border text-muted-foreground transition hover:border-[#9189f4] hover:text-[#675de8]" aria-label="الإشعارات"><Bell size={17} />{unread + (messages.data?.length ?? 0) > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#675de8] px-1 text-[9px] font-bold text-white">{unread + (messages.data?.length ?? 0)}</span>}</button>{open && <div className="absolute left-0 top-14 z-50 w-80 rounded-2xl border border-border bg-card p-3 shadow-xl"><div className="mb-2 flex items-center justify-between"><strong className="text-xs">الإشعارات والرسائل</strong><span className="text-[10px] text-muted-foreground">{unread} إشعار · {messages.data?.length ?? 0} رسالة</span></div><div className="grid max-h-72 gap-2 overflow-auto">{(query.data ?? []).slice(0, 8).map((item) => <button key={`n-${item.id}`} onClick={() => { if (!item.readAt) markRead.mutate({ id: item.id }); if (item.linkUrl) window.location.href = item.linkUrl; }} className={`rounded-xl border-r-4 p-3 text-right ${item.readAt ? 'bg-muted/40' : 'bg-[#f0eeff] dark:bg-[#24224c]'}`} style={{ borderRightColor: item.color || '#675de8' }}><strong className="block text-xs">{item.title}</strong><span className="mt-1 block text-[10px] leading-5 text-muted-foreground">{item.body}</span></button>)}{(messages.data ?? []).slice(0, 5).map((item) => <div key={`m-${item.id}`} className="rounded-xl bg-muted/40 p-3 text-right"><strong className="block text-xs">{item.subject}</strong><span className="mt-1 block text-[10px] leading-5 text-muted-foreground">{item.body}</span></div>)}{!query.data?.length && !messages.data?.length && <p className="p-4 text-center text-xs text-muted-foreground">لا توجد إشعارات أو رسائل.</p>}</div></div>}</div>;
}

export function SiteHeader({ theme, onThemeToggle }: { theme: 'light' | 'dark'; onThemeToggle: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  return <>
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between gap-5">
        <Brand />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="التنقل الرئيسي">
          {navItems.map((item) => <Link key={item.href} href={item.href} className={`relative text-[13px] font-semibold transition-colors hover:text-[#675de8] ${location === item.href ? 'text-[#675de8]' : 'text-muted-foreground'}`}>{item.label}{location === item.href && <span className="absolute -bottom-[27px] inset-x-1/3 h-0.5 rounded-full bg-[#7067ef]" />}</Link>)}
        </nav>
        <div className="hidden flex-1 justify-end gap-3 md:flex"><GlobalSearch />{user && <NotificationBell />}<button onClick={onThemeToggle} className="grid size-11 place-items-center rounded-[14px] border border-border text-muted-foreground transition hover:border-[#9189f4] hover:text-[#675de8]" aria-label="تبديل المظهر">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>{user ? <><Link href="/profile" className="rounded-[13px] border border-border px-4 py-2.5 text-xs font-bold">{user.name ?? 'حسابي'}</Link>{user.role === 'admin' && <Link href="/admin" className="rounded-[13px] bg-[#675de8] px-4 py-2.5 text-xs font-bold text-white">الإدارة</Link>}<button onClick={() => void logout()} className="text-xs font-bold text-muted-foreground hover:text-[#675de8]">خروج</button></> : <Link href="/login" className="rounded-[13px] bg-[#161d42] px-4 py-2.5 text-xs font-bold text-white dark:bg-[#edeefe] dark:text-[#11182f]">تسجيل الدخول</Link>}</div>
        <div className="flex items-center gap-2 md:hidden"><button onClick={() => navigate('/search')} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground" aria-label="البحث"><Search size={17} /></button><button onClick={() => setMenuOpen(!menuOpen)} className="grid size-10 place-items-center rounded-xl border border-border" aria-label="فتح القائمة">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button></div>
      </div>
      {menuOpen && <div className="border-t border-border bg-background px-5 pb-5 pt-4 md:hidden"><div className="mb-4"><GlobalSearch /></div><nav className="grid gap-1">{navItems.map((item) => <Link key={item.href} onClick={() => setMenuOpen(false)} href={item.href} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">{item.label}</Link>)}<Link href="/quotes" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">اقتباسات الكتب</Link><Link href="/my-list" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">المحفوظات</Link>{user?.role === 'admin' && <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold text-[#675de8]">لوحة الإدارة</Link>}</nav><div className="mt-3 flex gap-2"><button onClick={onThemeToggle} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-bold">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</button>{user ? <button onClick={() => void logout()} className="flex flex-1 items-center justify-center rounded-xl bg-[#161d42] px-4 py-3 text-xs font-bold text-white">خروج</button> : <Link href="/login" className="flex flex-1 items-center justify-center rounded-xl bg-[#161d42] px-4 py-3 text-xs font-bold text-white">تسجيل الدخول</Link>}</div></div>}
    </header>
  </>;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const items = [{ href: '/', label: 'الرئيسية', icon: '⌂' }, { href: '/explore', label: 'استكشف', icon: '✦' }, { href: '/search', label: 'بحث', icon: '⌕' }, { href: '/quotes', label: 'اقتباسات', icon: '❝' }, { href: '/profile', label: 'حسابي', icon: '◯' }];
  return <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(7px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">{items.map((item) => <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold ${location === item.href ? 'text-[#675de8]' : 'text-muted-foreground'}`}><span className="text-lg leading-5">{item.icon}</span>{item.label}</Link>)}</nav>;
}
