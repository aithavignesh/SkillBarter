import { hydrateMonetizationState } from './monetization';

// Monetization hydration is intentionally not executed at module import time.
// Startup auth must not call getCurrentUser() for phone OTP sessions because
// those sessions do not have the browser-managed refresh cookie. Feature pages
// can hydrate explicitly once an authenticated user is available.
export async function hydrateCurrentUserMonetization(userId: number) {
  if (sessionStorage.getItem('skillbarter_phone')) return;
  return hydrateMonetizationState(userId);
}