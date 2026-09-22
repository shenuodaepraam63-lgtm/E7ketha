import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const MEASUREMENT_ID = "G-HJM7WK3Y6L";

/** Send GA4 page_view on every SPA route change (wouter). */
export function AnalyticsRouteTracker() {
  const [location] = useLocation();
  const first = useRef(true);

  useEffect(() => {
    // Skip the very first paint — gtag('config') already records the initial page view
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof window.gtag !== "function") return;

    const path = (location.split("?")[0] || "/").replace(/\/$/, "") || "/";
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: MEASUREMENT_ID,
    });
  }, [location]);

  return null;
}
