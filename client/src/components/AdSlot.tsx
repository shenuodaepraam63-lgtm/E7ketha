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
