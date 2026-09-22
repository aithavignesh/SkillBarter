export type FunnelEvent =
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'matches_viewed'
  | 'exchange_request_sent'
  | 'referral_shared'
  | 'beta_feedback_submitted'
  | 'exchange_status_changed'
  | 'exchange_completed'
  | 'notification_opened'
  | 'activation_cta_clicked'
  | 'onboarding_step_viewed'
  | 'login_completed'
  | 'exchange_workspace_viewed'
  | 'exchange_message_sent'
  | 'exchange_schedule_saved';

const STORAGE_KEY = 'skillbarter_analytics_session';
const ATTRIBUTION_KEY = 'skillbarter_marketing_attribution';

const getMarketingAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];
  const current = Object.fromEntries(keys
    .map((key) => [key, params.get(key)])
    .filter(([, value]) => value));

  try {
    const existing = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Record<string, string>;
    const merged = { ...existing, ...current };
    if (Object.keys(current).length > 0) sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return current;
  }
};

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
  const attribution = getMarketingAttribution();
  const payload = {
    event,
    session_id: getSessionId(),
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    properties: Object.fromEntries(Object.entries({ ...attribution, ...properties }).filter(([, value]) => value !== undefined)),
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
