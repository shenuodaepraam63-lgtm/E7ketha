import type { ReactNode } from 'react';
import { SiteHeader, MobileBottomNav } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { useLocation } from 'wouter';
import { CartDrawer } from '@/pages/ShopPage';

export function SiteShell({ children, theme, onThemeToggle, footer = true }: { children: ReactNode; theme: 'light' | 'dark'; onThemeToggle: () => void; footer?: boolean }) {
  const [location] = useLocation();
  return <div dir="rtl" className="min-h-screen overflow-x-hidden"><SiteHeader theme={theme} onThemeToggle={onThemeToggle} /><main key={location} className="page-transition">{children}</main>{footer && <SiteFooter />}<MobileBottomNav /><CartDrawer /></div>;
}

export function Breadcrumbs({ items }: { items: string[] }) {
  return <div className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>الرئيسية</span>{items.map((item) => <span key={item} className="flex items-center gap-2"><span className="text-border">/</span><span className="text-foreground/75">{item}</span></span>)}</div>;
}

export function PageIntro({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="mb-10 max-w-2xl">{eyebrow && <div className="section-label mb-3">{eyebrow}</div>}<h1 className="text-3xl font-extrabold tracking-[-.07em] md:text-5xl">{title}</h1>{description && <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{description}</p>}</div>;
}

export function EmptyState({ title, description, action, href = '/explore' }: { title: string; description: string; action?: string; href?: string }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-card/60 px-6 text-center"><div className="mb-5 grid size-14 place-items-center rounded-[18px] bg-[#f0eeff] text-xl text-[#6e64e9] dark:bg-[#24224c]">✦</div><h2 className="text-lg font-extrabold">{title}</h2><p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">{description}</p>{action && <a href={href} className="mt-5 rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white dark:bg-[#eeeefe] dark:text-[#101936]">{action}</a>}</div>;
}
