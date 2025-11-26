import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ANALYTICS_CONFIG, API_CONFIG } from './constants/app';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Lightweight Web Vitals collection without external deps
(function setupWebVitals() {
  if (!ANALYTICS_CONFIG.ENABLE_PERFORMANCE_MONITORING) return;
  const sample = Math.random() < (ANALYTICS_CONFIG.SAMPLE_RATE || 0);
  if (!sample) return;

  const metrics: Record<string, number> = {};
  let clsValue = 0;

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) metrics.LCP = last.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true } as any);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const first = list.getEntries()[0] as any;
      if (first) metrics.FID = first.processingStart - first.startTime;
    });
    fidObserver.observe({ type: 'first-input', buffered: true } as any);

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) clsValue += entry.value || 0;
      }
      metrics.CLS = clsValue;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true } as any);

    const send = () => {
      try {
        const payload = {
          url: window.location.href,
          ts: Date.now(),
          metrics,
          ua: navigator.userAgent,
        };
        const endpoint = API_CONFIG.BACKEND_URL + '/api/metrics/web-vitals';
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
        }
      } catch {}
    };

    // When tab becomes hidden or on unload, send what we have
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') send();
    });
    window.addEventListener('pagehide', send);
  } catch {}
})();
