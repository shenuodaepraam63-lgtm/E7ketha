import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

export function AutoMarquee({ children, className = '', speed = 0.24, direction = 1 }: { children: ReactNode; className?: string; speed?: number; direction?: 1 | -1 }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);
  const directionRef = useRef(1);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  const resumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    directionRef.current = direction;
    const startFrame = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport && direction === -1) viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    });
    let last = performance.now();
    const tick = (now: number) => {
      const viewport = viewportRef.current;
      const elapsed = Math.min(now - last, 40);
      last = now;
      if (viewport && !draggingRef.current && !pausedRef.current) {
        const max = viewport.scrollWidth - viewport.clientWidth;
        if (max > 0) {
          viewport.scrollLeft += directionRef.current * speed * elapsed;
          if (viewport.scrollLeft >= max - 1) {
            viewport.scrollLeft = max;
            directionRef.current = -1;
          } else if (viewport.scrollLeft <= 1) {
            viewport.scrollLeft = 0;
            directionRef.current = 1;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(startFrame);
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, [direction, speed]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    draggingRef.current = true;
    dragStartRef.current = { x: event.clientX, scrollLeft: viewport.scrollLeft };
    viewport.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !draggingRef.current) return;
    viewport.scrollLeft = dragStartRef.current.scrollLeft - (event.clientX - dragStartRef.current.x);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = viewport.scrollLeft - dragStartRef.current.scrollLeft;
    if (Math.abs(delta) > 2) directionRef.current = delta > 0 ? 1 : -1;
    draggingRef.current = false;
    pausedRef.current = true;
    viewport.releasePointerCapture?.(event.pointerId);
    resumeTimerRef.current = window.setTimeout(() => { pausedRef.current = false; }, 900);
  };

  return (
    <div ref={viewportRef} className={`auto-marquee ${className}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="auto-marquee-track">{children}</div>
    </div>
  );
}
