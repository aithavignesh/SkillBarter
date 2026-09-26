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
const persistedToken =
  typeof window !== 'undefined' ? sessionStorage.getItem('skillbarter_token') ?? undefined : undefined;

export const insforge: any = isInsforgeConfigured
  ? createClient({
      baseUrl: baseUrl!,
      anonKey: anonKey!,
      accessToken: persistedToken,
    })
  : unavailableClient;
