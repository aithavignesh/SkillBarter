import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL?.replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error('Missing VITE_INSFORGE_URL or VITE_INSFORGE_ANON_KEY');
}

// Restore the persisted access token before the first database/auth call.
// This is especially important for the phone OTP flow because the OTP
// verification itself runs in a Vercel serverless function.
const persistedToken =
  typeof window !== 'undefined' ? sessionStorage.getItem('skillbarter_token') ?? undefined : undefined;

// The SDK's generated database query types are project-schema dependent and
// can become incompatible with this legacy application's dynamic table schema.
// Keep the runtime client unchanged while allowing the application data layer
// to use the PostgREST-style query builder without false compile-time errors.
export const insforge: any = createClient({
  baseUrl,
  anonKey,
  accessToken: persistedToken,
});
