import { createClient } from '@insforge/sdk';

const baseUrl = import.meta.env.VITE_INSFORGE_URL;
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error('Missing VITE_INSFORGE_URL or VITE_INSFORGE_ANON_KEY');
}

// The SDK's generated database query types are project-schema dependent and
// can become incompatible with this legacy application's dynamic table schema.
// Keep the runtime client unchanged while allowing the application data layer
// to use the PostgREST-style query builder without false compile-time errors.
export const insforge: any = createClient({
  baseUrl,
  anonKey,
});
