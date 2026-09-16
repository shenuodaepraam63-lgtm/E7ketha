import { useEffect, useRef } from 'react';

type AdSlotProps = {
  /** Unique slot id for debugging */
  slot?: string;
  /** Preferred format for layout stability */
  format?: 'horizontal' | 'rectangle' | 'auto';
  className?: string;
};

/**
 * AdSense-friendly reserved container.
 * - Stable min-height reduces CLS while ads load / are blocked / empty
 * - Separated from interactive UI (no overlap with nav/buttons)
 * - Does not inject fake ads; only loads when adsbygoogle is present
 */
export function AdSlot({ slot = 'main', format = 'auto', className = '' }: AdSlotProps) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    const w = window as Window & { adsbygoogle?: unknown[] };
    if (!w.adsbygoogle) return;
    try {
      w.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* ad blocker or not ready */
    }
  }, []);

  const minH =
    format === 'horizontal' ? 'min-h-[90px] sm:min-h-[100px]' :
    format === 'rectangle' ? 'min-h-[250px]' :
    'min-h-[100px] sm:min-h-[120px]';

  return (
    <aside
      className={`ad-slot my-6 overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/20 ${minH} ${className}`}
      aria-label="مساحة إعلانية"
      data-ad-slot={slot}
    >
      <ins
        ref={ref}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: format === 'rectangle' ? 250 : 90 }}
        data-ad-client="ca-pub-1874360923595437"
        data-ad-slot={slot}
        data-ad-format={format === 'auto' ? 'auto' : format === 'horizontal' ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="true"
      />
    </aside>
  );
}

export function FeedAdSlot({ className = '' }: { className?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    const w = window as Window & { adsbygoogle?: unknown[] };
    const pushAd = () => {
      if (pushed.current || !w.adsbygoogle) return;
      try { w.adsbygoogle.push({}); pushed.current = true; } catch { /* AdSense may be blocked or not ready */ }
    };
    if (w.adsbygoogle) pushAd();
    const timer = window.setTimeout(pushAd, 1200);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <aside className={`feed-ad-slot col-span-full my-3 overflow-hidden rounded-2xl border border-border/50 bg-card/40 px-2 py-3 ${className}`} aria-label="إعلان ضمن الخلاصة">
      <p className="mb-2 text-center text-[10px] font-bold text-muted-foreground">إعلان</p>
      <ins
        className="adsbygoogle block w-full"
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-ez-2k-4l-ce+1jx"
        data-ad-client="ca-pub-1874360923595437"
        data-ad-slot="2847493871"
      />
    </aside>
  );
}
