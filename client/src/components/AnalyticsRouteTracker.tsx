import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { getVisitorId } from '@/lib/visitorId';
import { trpc } from '@/lib/trpc';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = 'G-HJM7WK3Y6L';

/** GA4 + first-party page_view. Referrer sent only for server-side category (never stored raw). */
export function AnalyticsRouteTracker() {
  const [location] = useLocation();
  const firstGa = useRef(true);
  const track = trpc.analytics.trackPageView.useMutation();

  useEffect(() => {
    const path = (location.split('?')[0] || '/').replace(/\/$/, '') || '/';

    if (path.startsWith('/admin') || path.startsWith('/login')) return;

    if (firstGa.current) {
      firstGa.current = false;
    } else if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
        send_to: MEASUREMENT_ID,
      });
    }

    try {
      const visitorId = getVisitorId();
      if (visitorId.length >= 8) {
        track.mutate({
          visitorId,
          pagePath: path,
          referrer: typeof document !== 'undefined' ? document.referrer.slice(0, 400) : '',
          siteHost: typeof window !== 'undefined' ? window.location.hostname : '',
        });
      }
    } catch {
      /* never break navigation */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return null;
}
