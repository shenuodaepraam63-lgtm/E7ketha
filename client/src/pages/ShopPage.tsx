import { ArrowUpLeft, Check, Loader2, Minus, Plus, ShoppingBag, Sparkles, Star, X } from 'lucide-react';
import { Link } from 'wouter';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { trpc } from '@/lib/trpc';
import { formatMoney } from '@/lib/format';
import type { Product } from '@shared/commerce/types';

function ProductCard({ product }: { product: Product }) {
  const { addItem, loading } = useCart();
  const variant = product.variants[0];
  const image = product.images[0];

  const handleAdd = async () => {
    if (!variant) return;
    try {
      await addItem(variant.id);
      toast.success('أُضيف المنتج إلى السلة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إضافة المنتج إلى السلة');
    }
  };

  return (
    <article className="group overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_16px_50px_-34px_rgba(22,30,70,.42)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_-30px_rgba(91,77,232,.35)]">
      <Link href={`/shop/${product.handle}`} className="block overflow-hidden bg-[#f0eeff] dark:bg-[#171d36]">
        {image ? <img src={image.url} alt={image.altText || product.title} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="grid aspect-square place-items-center text-4xl text-[#756beb]">✦</div>}
      </Link>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-[#f0eeff] px-2.5 py-1 font-bold text-[#675de8] dark:bg-[#24224c] dark:text-[#bcb7ff]">{product.productType || 'منتج رِواية'}</span>
          <span className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-[#e7a93a]" /> جديد</span>
        </div>
        <Link href={`/shop/${product.handle}`} className="block text-lg font-extrabold tracking-[-.04em] transition hover:text-[#675de8]">{product.title}</Link>
        <p className="mt-2 min-h-12 text-xs leading-6 text-muted-foreground">{product.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <strong className="text-lg font-extrabold">{formatMoney(product.priceRange.min)}</strong>
          <button onClick={handleAdd} disabled={!variant?.availableForSale || loading} className="inline-flex items-center gap-2 rounded-xl bg-[#171e42] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#2b3670] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#edeefe] dark:text-[#11182f]" aria-label={`أضف ${product.title} إلى السلة`}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
            {variant?.availableForSale ? 'أضف للسلة' : 'غير متوفر'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ShopPage() {
  const { data: products = [], isLoading, error } = trpc.commerce.products.list.useQuery({ first: 24 });
  const [activeTag, setActiveTag] = useState('الكل');
  const tags = useMemo(() => ['الكل', ...Array.from(new Set(products.flatMap(product => product.tags))).slice(0, 6)], [products]);
  const filteredProducts = activeTag === 'الكل' ? products : products.filter(product => product.tags.includes(activeTag));

  return (
    <div>
      <div className="container py-12 md:py-20">
        <div className="relative overflow-hidden rounded-[32px] bg-[#171e42] px-6 py-10 text-white md:px-12 md:py-14">
          <div className="absolute -left-16 -top-20 size-64 rounded-full bg-[#756beb]/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-[#c9c4ff]"><Sparkles size={15} /> متجر رِواية</div>
            <h1 className="text-3xl font-extrabold tracking-[-.07em] md:text-5xl">أشياء صغيرة،<br /><span className="text-[#c9c4ff]">تخلّي القراءة أقرب.</span></h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-white/70">منتجات مختارة لمحبي الكتب: دفتر يسجل رحلتك، وحقيبة ترافقك من صفحة إلى أخرى.</p>
          </div>
          <div className="absolute bottom-6 left-8 hidden size-28 rotate-12 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-md md:block"><div className="h-full rounded-2xl border border-white/10 bg-[#252d5c]" /></div>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
          <div><div className="section-label mb-2">تسوق بهدوء</div><h2 className="text-2xl font-extrabold tracking-[-.06em] md:text-3xl">منتجات مختارة للقارئ</h2></div>
          <div className="flex flex-wrap gap-2" aria-label="تصفية المنتجات">
            {tags.map(tag => <button key={tag} onClick={() => setActiveTag(tag)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${activeTag === tag ? 'border-[#675de8] bg-[#675de8] text-white' : 'border-border bg-card text-muted-foreground hover:border-[#9189f4] hover:text-[#675de8]'}`}>{tag}</button>)}
          </div>
        </div>

        {isLoading && <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-[#675de8]" /></div>}
        {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">تعذر تحميل منتجات المتجر الآن. حاول تحديث الصفحة.</div>}
        {!isLoading && !error && filteredProducts.length === 0 && <div className="mt-8 rounded-[24px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">لا توجد منتجات في هذا التصنيف حاليًا.</div>}
        {!isLoading && !error && filteredProducts.length > 0 && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map(product => <ProductCard key={product.id} product={product} />)}</div>}
      </div>
    </div>
  );
}

export function ShopProductPage({ params }: { params: { handle: string } }) {
  const { data: product, isLoading, error } = trpc.commerce.products.byHandle.useQuery({ handle: params.handle });
  const { addItem, loading } = useCart();
  const variant = product?.variants[0];

  const handleAdd = async () => {
    if (!variant) return;
    try {
      await addItem(variant.id);
      toast.success('أُضيف المنتج إلى السلة');
    } catch (addError) {
      toast.error(addError instanceof Error ? addError.message : 'تعذر إضافة المنتج إلى السلة');
    }
  };

  if (isLoading) return <div className="container grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-[#675de8]" /></div>;
  if (error || !product) return <div className="container py-20 text-center"><h1 className="text-2xl font-extrabold">المنتج غير موجود</h1><Link href="/shop" className="mt-5 inline-flex rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white">العودة للمتجر</Link></div>;

  const image = product.images[0];
  return <div className="container py-12 md:py-20"><Link href="/shop" className="mb-8 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-[#675de8]"><ArrowUpLeft size={15} /> العودة للمتجر</Link><div className="grid items-start gap-10 lg:grid-cols-[1.05fr_.95fr]"><div className="overflow-hidden rounded-[32px] bg-[#f0eeff] dark:bg-[#171d36]">{image ? <img src={image.url} alt={image.altText || product.title} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-5xl text-[#756beb]">✦</div>}</div><div className="pt-2"><div className="section-label mb-4">{product.productType || 'منتج رِواية'}</div><h1 className="text-4xl font-extrabold tracking-[-.08em] md:text-6xl">{product.title}</h1><p className="mt-6 text-sm leading-8 text-muted-foreground md:text-base">{product.description}</p><div className="my-8 h-px bg-border" /><div className="flex items-center justify-between gap-5"><span className="text-3xl font-extrabold">{formatMoney(product.priceRange.min)}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Check size={14} className="text-emerald-500" /> جاهز للطلب</span></div><button onClick={handleAdd} disabled={!variant?.availableForSale || loading} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171e42] px-5 py-4 text-sm font-extrabold text-white shadow-[0_18px_30px_-18px_#171e42] transition hover:-translate-y-0.5 hover:bg-[#2b3670] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#edeefe] dark:text-[#11182f]"><ShoppingBag size={18} />{loading ? 'جارٍ الإضافة…' : variant?.availableForSale ? 'أضف إلى السلة' : 'غير متوفر'}</button><p className="mt-4 text-center text-[11px] leading-6 text-muted-foreground">سيتم إكمال الدفع بأمان عبر متجر Shopify.</p></div></div></div>;
}

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateQuantity, removeItem, proceedToCheckout, loading } = useCart();
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="سلة التسوق"><button className="absolute inset-0 bg-[#080d1d]/45 backdrop-blur-sm" onClick={closeCart} aria-label="إغلاق السلة" /><aside className="absolute inset-y-0 left-0 flex w-full max-w-md flex-col bg-background p-5 shadow-2xl md:p-7"><div className="flex items-center justify-between border-b border-border pb-5"><div><div className="section-label mb-1">متجر رِواية</div><h2 className="text-xl font-extrabold">سلة التسوق <span className="text-sm text-muted-foreground">({cart?.itemCount ?? 0})</span></h2></div><button onClick={closeCart} className="grid size-10 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground" aria-label="إغلاق السلة"><X size={18} /></button></div>{!cart || cart.items.length === 0 ? <div className="grid flex-1 place-items-center text-center"><div><ShoppingBag size={32} className="mx-auto text-[#756beb]" /><p className="mt-4 text-sm font-bold">السلة فارغة</p><p className="mt-2 text-xs text-muted-foreground">أضف منتجًا لتبدأ التسوق.</p></div></div> : <><div className="flex-1 space-y-4 overflow-y-auto py-5">{cart.items.map(item => <div key={item.lineId} className="flex gap-3 rounded-2xl border border-border bg-card p-3"><img src={item.image?.url} alt={item.productTitle} className="size-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-bold">{item.productTitle}</p><button onClick={() => removeItem(item.lineId)} className="text-muted-foreground hover:text-red-500" aria-label={`حذف ${item.productTitle}`}><X size={14} /></button></div><p className="mt-1 text-xs text-muted-foreground">{formatMoney(item.unitPrice)}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1"><button onClick={() => updateQuantity(item.lineId, item.quantity - 1)} disabled={loading} aria-label="تقليل الكمية"><Minus size={13} /></button><span className="min-w-5 text-center text-xs font-bold">{item.quantity}</span><button onClick={() => updateQuantity(item.lineId, item.quantity + 1)} disabled={loading} aria-label="زيادة الكمية"><Plus size={13} /></button></div><strong className="text-sm">{formatMoney(item.lineTotal)}</strong></div></div></div>)}</div><div className="border-t border-border pt-5"><div className="mb-4 flex items-center justify-between text-sm"><span className="text-muted-foreground">الإجمالي</span><strong className="text-xl">{formatMoney(cart.total)}</strong></div><button onClick={() => { proceedToCheckout(); closeCart(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171e42] px-5 py-4 text-sm font-extrabold text-white transition hover:bg-[#2b3670] dark:bg-[#edeefe] dark:text-[#11182f]"><ShoppingBag size={17} /> إتمام الطلب عبر Shopify</button><p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">ستفتح صفحة الدفع الآمنة في نافذة جديدة.</p></div></>}</aside></div>;
}
