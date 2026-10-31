import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

export const isInsforgeConfigured = Boolean(baseUrl && anonKey);

const missingConfigMessage =
  'InsForge is not configured for this deployment. Set VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY in the Vercel environment, then redeploy.';

const unavailableClient = new Proxy(
  {},
  {
    get() {
      throw new Error(missingConfigMessage);
    },
  },
);

// Do not initialize the SDK with a persisted token. OTP sessions intentionally
// use short-lived access tokens without a browser-managed refresh cookie.
export const insforge: any = isInsforgeConfigured
  ? createClient({ baseUrl: baseUrl!, anonKey: anonKey! })
  : unavailableClient;

/** Keep the SDK and its underlying HTTP client on the same access token. */
export function syncInsforgeAccessToken(token: string | null) {
  try {
    insforge.setAccessToken(token);
  } catch {}
  try {
    insforge.getHttpClient?.().setAuthToken(token);
  } catch {}
}

const persistedToken =
  typeof window !== 'undefined' ? localStorage.getItem('skillbarter_token') ?? '' : '';

if (isInsforgeConfigured && persistedToken) {
  syncInsforgeAccessToken(persistedToken);
}
