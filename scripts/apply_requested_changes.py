from pathlib import Path

root = Path('/home/ubuntu/riwaya-work')

def replace(path, old, new):
    p = root / path
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'missing pattern in {path}: {old[:80]}')
    p.write_text(s.replace(old, new, 1))

replace('client/src/App.tsx', "import { ShopPage, ShopProductPage } from '@/pages/ShopPage';", "import QuotesPage from '@/pages/QuotesPage';")
replace('client/src/App.tsx', '<Route path="/shop" component={ShopPage} /><Route path="/shop/:handle" component={ShopProductPage} />', '<Route path="/quotes" component={QuotesPage} />')
replace('client/src/components/SiteShell.tsx', "import { CartDrawer } from '@/pages/ShopPage';\n", '')
replace('client/src/components/SiteShell.tsx', '<MobileBottomNav /><CartDrawer />', '<MobileBottomNav />')
replace('client/src/main.tsx', 'import { CartProvider } from "@/contexts/CartContext";\n', '')
replace('client/src/main.tsx', '      <CartProvider>\n        <App />\n      </CartProvider>', '      <App />')
replace('client/src/components/SiteHeader.tsx', "import { Bell, Menu, Moon, Search, ShoppingBag, Sun, X } from 'lucide-react';", "import { Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';")
replace('client/src/components/SiteHeader.tsx', "import { useCart } from '@/contexts/CartContext';\n", '')
replace('client/src/components/SiteHeader.tsx', '  const { itemCount, openCart } = useCart();\n', '')
replace('client/src/components/SiteHeader.tsx', '          <Link href="/shop" className={`relative text-[13px] font-semibold transition-colors hover:text-[#675de8] ${location.startsWith(\'/shop\') ? \'text-[#675de8]\' : \'text-muted-foreground\'}`}>المتجر</Link>\n', '')
replace('client/src/components/SiteHeader.tsx', '<GlobalSearch /><button onClick={openCart} className="relative grid size-11 place-items-center rounded-[14px] border border-border text-muted-foreground transition hover:border-[#9189f4] hover:text-[#675de8]" aria-label="فتح السلة"><ShoppingBag size={17} />{itemCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[#675de8] px-1 text-[9px] font-bold text-white">{itemCount}</span>}</button>{user && <NotificationBell />}', '<GlobalSearch />{user && <NotificationBell />}')
replace('client/src/components/SiteHeader.tsx', '<Link href="/shop" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">المتجر</Link><button onClick={() => { openCart(); setMenuOpen(false); }} className="flex rounded-xl px-3 py-3 text-right text-sm font-semibold text-muted-foreground hover:bg-muted">السلة {itemCount > 0 ? `(${itemCount})` : \'\'}</button><Link href="/my-list" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">قائمة قراءتي</Link>', '<Link href="/quotes" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">اقتباسات الكتب</Link><Link href="/my-list" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">المحفوظات</Link>')
replace('client/src/components/SiteHeader.tsx', "{ href: '/my-list', label: 'قائمتي', icon: '♡' }", "{ href: '/quotes', label: 'اقتباسات', icon: '❝' }, { href: '/my-list', label: 'المحفوظات', icon: '♡' }")
replace('client/src/components/SiteFooter.tsx', "import { ArrowUpLeft, Instagram, Twitter, MessageCircle } from 'lucide-react';", "import { ArrowUpLeft, Facebook, MessageCircle } from 'lucide-react';")
p = root / 'client/src/components/SiteFooter.tsx'
s = p.read_text()
s = s.replace('<a href="https://instagram.com" target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-[#675de8]" aria-label="Instagram"><Instagram size={15} /></a><a href="https://x.com" target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-[#675de8]" aria-label="X"><Twitter size={15} /></a>', '<a href="https://www.facebook.com/share/1EnkqsZn8e/" target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-[#1877f2]" aria-label="فيسبوك"><Facebook size={15} /></a>')
p.write_text(s)
replace('client/src/pages/AccountPages.tsx', "import { BookOpen, Check, Heart, LockKeyhole, Mail, RefreshCw, UserRound } from 'lucide-react';", "import { Check, Heart, LockKeyhole, Mail, RefreshCw } from 'lucide-react';")
replace('client/src/pages/AccountPages.tsx', "const [tab, setTab] = useState<'want_to_read' | 'reading' | 'finished'>('want_to_read');", "const [tab, setTab] = useState<'want_to_read' | 'reading' | 'finished'>('want_to_read');")
p = root / 'client/src/pages/AccountPages.tsx'
s = p.read_text().replace("<Breadcrumbs items={['قائمة قراءتي']} /><h1 className=\"text-4xl font-extrabold\">قائمة قراءتي</h1>", "<Breadcrumbs items={['المحفوظات']} /><h1 className=\"text-4xl font-extrabold\">المحفوظات</h1>")
s = s.replace("<p className=\"mt-3 text-sm text-muted-foreground\">كل الروايات التي اخترت الاحتفاظ بها في حسابك.</p>", "<p className=\"mt-3 text-sm text-muted-foreground\">كل الروايات التي اخترت الاحتفاظ بها في حسابك، مع بقاء زر القلب متاحًا دائمًا.</p>")
s = s.replace("[['want_to_read', 'أريد قراءتها'], ['reading', 'أقرأها الآن'], ['finished', 'أنهيتها']]", "[['want_to_read', 'المحفوظات'], ['reading', 'أقرأها الآن'], ['finished', 'أنهيتها']]")
p.write_text(s)
python3 /home/ubuntu/riwaya-work/scripts/apply_requested_changes.py
rm /home/ubuntu/riwaya-work/scripts/apply_requested_changes.py
