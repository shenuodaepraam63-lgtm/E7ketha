export type NovelLink = { id?: number; label: string; url: string; type: 'read' | 'download'; displayOrder?: number };
export type Novel = { id: string; slug: string; title: string; author: string; authorSlug: string; cover: string; genres: string[]; rating: number; parts: number; status: string; description: string; accent: string; publicationYear?: number | null; language?: string | null; links?: NovelLink[] };
export type Author = { id?: number; name: string; slug: string; avatar: string; bio: string; books: number; genres: string[] };
export type Genre = { id?: number; name: string; slug: string; count: number; icon: string; description: string };
export type Series = { id?: number; title: string; slug: string; author: string; parts: number; status: string; cover: string; books: Array<{ title: string; slug: string }> };

export const coverFallback = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88';
export const navItems = [{ label: 'الرئيسية', href: '/' }, { label: 'استكشف', href: '/explore' }, { label: 'التصنيفات', href: '/genres/fantasy' }, { label: 'المؤلفون', href: '/authors/amr-abdel-hamid' }, { label: 'السلاسل', href: '/series/zikola' }];
export const statusStyles: Record<string, string> = { مكتملة: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', مستمرة: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', منفردة: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
export const statusLabels: Record<string, string> = { completed: 'مكتملة', ongoing: 'مستمرة', standalone: 'منفردة' };

export function toNovel(row: { id: number; slug: string; title: string; coverUrl: string | null; description: string | null; rating: number; parts: number; status: string; author: string; authorSlug: string; publicationYear?: number | null; language?: string | null; links?: NovelLink[] }): Novel {
  return { id: String(row.id), slug: row.slug, title: row.title, author: row.author, authorSlug: row.authorSlug, cover: row.coverUrl ?? coverFallback, genres: [], rating: row.rating / 100, parts: row.parts, status: statusLabels[row.status] ?? row.status, description: row.description ?? '', accent: '#7067ef', publicationYear: row.publicationYear, language: row.language, links: row.links ?? [] };
}
export function toAuthor(row: { id?: number; slug: string; name: string; bio: string | null; avatarUrl: string | null; bookCount: number }): Author { return { id: row.id, slug: row.slug, name: row.name, bio: row.bio ?? '', avatar: row.avatarUrl ?? '', books: row.bookCount, genres: [] }; }
export function toGenre(row: { id?: number; slug: string; name: string; description: string | null; icon: string | null; novelCount?: number }): Genre { return { id: row.id, slug: row.slug, name: row.name, description: row.description ?? '', icon: row.icon ?? '✦', count: Number(row.novelCount ?? 0) }; }
export function formatCount(count: number) { return new Intl.NumberFormat('ar-EG').format(count); }
export function getInitials(name: string) { return name.split(' ').slice(0, 2).map((part) => part[0]).join(''); }
