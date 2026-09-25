/** Group admin sidebar + URL deep-links. Idempotent. */
import fs from 'node:fs';

const f = 'client/src/pages/AdminPage.tsx';
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');

if (!s.includes('navGroups')) {
  const m = s.match(/const nav = \[[\s\S]*?\];/);
  if (m) {
    const newNav = `const navGroups: Array<{ title: string; items: Array<{ key: string; label: string; icon: typeof LayoutDashboard }> }> = [
  { title: 'لوحة التحكم', items: [{ key: 'overview', label: 'نظرة عامة', icon: LayoutDashboard }] },
  { title: 'المحتوى', items: [
    { key: 'novels', label: 'الروايات', icon: BookOpen },
    { key: 'authors', label: 'المؤلفون', icon: Users },
    { key: 'genres', label: 'التصنيفات', icon: Tags },
    { key: 'quotes', label: 'الاقتباسات', icon: WandSparkles },
    { key: 'articles', label: 'المقالات', icon: FileText },
  ]},
  { title: 'المستخدمون والتفاعل', items: [
    { key: 'users', label: 'المستخدمون', icon: UserCog },
    { key: 'reports', label: 'التقارير', icon: BarChart3 },
  ]},
  { title: 'التشغيل', items: [
    { key: 'ads', label: 'الإعلانات', icon: Megaphone },
    { key: 'notifications', label: 'الإشعارات', icon: Bell },
    { key: 'messages', label: 'الرسائل', icon: Send },
    { key: 'audit', label: 'سجل النشاط', icon: FileClock },
    { key: 'trash', label: 'سلة المهملات', icon: Trash2 },
  ]},
];
const nav = navGroups.flatMap((g) => g.items);`;
    s = s.replace(m[0], newNav);
  }
}

if (s.includes('navGroups') && s.includes('{nav.map((item)')) {
  s = s.replace(
    /\{nav\.map\(\(item\) => \{[\s\S]*?\}\)\}/,
    `{navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <div className="mb-1.5 px-3 text-[10px] font-bold tracking-wide text-white/35">{group.title}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSection(item.key as Section);
                    onClose();
                    if (item.key === 'overview') navigate('/admin');
                    else navigate(\`/admin?s=\${item.key}\`);
                  }}
                  className={\`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-xs font-semibold transition \${section === item.key ? 'bg-[#6259dd] text-white shadow-sm' : 'text-white/55 hover:bg-white/5 hover:text-white'}\`}
                >
                  <Icon size={16} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}`,
  );
}

s = s.replace(
  "onSelect={(value) => { setSection(value); if (value === 'novels') navigate('/novels'); }}",
  "onSelect={(value) => { setSection(value); navigate(value === 'overview' ? '/admin' : `/admin?s=${value}`); }}",
);

if (!s.includes('sectionFromUrl')) {
  s = s.replace(
    "const [section, setSection] = useState<Section>(location.startsWith('/novels') ? 'novels' : 'overview');",
    `const sectionFromUrl = (() => {
    try {
      const q = new URLSearchParams(window.location.search).get('s');
      if (q && nav.some((n) => n.key === q)) return q as Section;
    } catch { /* ignore */ }
    if (location.startsWith('/novels')) return 'novels' as Section;
    return 'overview' as Section;
  })();
  const [section, setSection] = useState<Section>(sectionFromUrl);
  useEffect(() => { setSection(sectionFromUrl); }, [location, sectionFromUrl]);`,
  );
}

fs.writeFileSync(f, s);
console.log('[patch-admin-shell] done');
