export type FunnelEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'matches_viewed'
  | 'exchange_request_sent'
  | 'referral_shared';

const STORAGE_KEY = 'skillbarter_analytics_session';

const getSessionId = () => {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = globalThis.crypto?.randomUUID?.() || `sb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return 'anonymous';
  }
};

export const trackEvent = (event: FunnelEvent, properties: Record<string, string | number | boolean | undefined> = {}) => {
  const payload = {
    event,
    session_id: getSessionId(),
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    properties: Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)),
  };

  // Configure VITE_ANALYTICS_ENDPOINT when a first-party analytics collector is ready.
  // Until then, events are intentionally not sent to a third party.
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  if (!endpoint) return;

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Analytics must never interrupt the product flow.
  }
};
