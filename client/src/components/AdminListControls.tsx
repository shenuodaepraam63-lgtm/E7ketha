import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export function AdminSearch({
  value,
  onChange,
  placeholder = 'بحث…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block min-w-[200px] flex-1">
      <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-background pr-9 pl-3 text-xs outline-none focus:border-[#8279ee]"
      />
    </label>
  );
}

export function AdminPager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {total} عنصر
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="text-muted-foreground">
        صفحة {page} من {pages} · {total} عنصر
      </span>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 font-bold disabled:opacity-40"
      >
        <ChevronRight size={14} /> السابق
      </button>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 font-bold disabled:opacity-40"
      >
        التالي <ChevronLeft size={14} />
      </button>
    </div>
  );
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function filterByQuery<T>(items: T[], q: string, pick: (item: T) => string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => pick(item).toLowerCase().includes(needle));
}
