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

// Keep the app shell renderable even when deployment configuration is missing.
// API calls will fail with a clear configuration error instead of crashing the
// module graph before React mounts.
// Do not pass a persisted browser token into createClient(). For phone-OTP
// sessions SkillBarter intentionally has an access token but no refresh token;
// initializing the SDK with the token can make the auth layer attempt the
// browser refresh endpoint when that token expires, producing repeated 401s.
// Initialize the client without a token and attach the active token explicitly.
const persistedToken =
  typeof window !== 'undefined' ? localStorage.getItem('skillbarter_token') ?? '' : '';

export const insforge: any = isInsforgeConfigured
  ? createClient({
      baseUrl: baseUrl!,
      anonKey: anonKey!,
    })
  : unavailableClient;

if (isInsforgeConfigured && persistedToken) {
  try {
    insforge.setAccessToken(persistedToken);
  } catch {}
}
