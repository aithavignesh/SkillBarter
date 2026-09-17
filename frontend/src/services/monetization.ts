import { insforge } from '../lib/insforge';

export type MonetizationState = {
  premium: boolean;
  premiumUntil: string | null;
  verified: boolean;
  verificationRequestedAt: string | null;
  featuredUntil: string | null;
  priorityMatching: boolean;
  credits: number;
  workshopsEnabled: boolean;
  corporateInterest: boolean;
  sponsoredEnabled: boolean;
  leadGenerationEnabled: boolean;
};

export type MonetizationUsage = {
  priorityMatchesUsed: number;
  priorityMatchesDate: string;
  boostsUsed: number;
  lastBoostAt: string | null;
};

export type Entitlement =
  | 'premium' | 'priority_matching' | 'profile_boost' | 'verified_badge'
  | 'workshops' | 'lead_generation' | 'sponsored';

const stateKey = (userId: number) => `skillbarter_monetization_${userId}`;
const usageKey = (userId: number) => `skillbarter_monetization_usage_${userId}`;

const defaults: MonetizationState = {
  premium: false, premiumUntil: null, verified: false, verificationRequestedAt: null,
  featuredUntil: null, priorityMatching: false, credits: 100, workshopsEnabled: false,
  corporateInterest: false, sponsoredEnabled: false, leadGenerationEnabled: false,
};

const usageDefaults: MonetizationUsage = { priorityMatchesUsed: 0, priorityMatchesDate: '', boostsUsed: 0, lastBoostAt: null };

const read = <T extends Record<string, unknown>>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : { ...fallback }; }
  catch { return { ...fallback }; }
};
const write = <T extends Record<string, unknown>>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));

export function getMonetizationState(userId: number): MonetizationState {
  if (!userId) return { ...defaults };
  const state = read(stateKey(userId), defaults);
  if (state.premiumUntil && new Date(state.premiumUntil).getTime() <= Date.now()) {
    const expired = { ...state, premium: false, premiumUntil: null, priorityMatching: false };
    write(stateKey(userId), expired);
    return expired;
  }
  return state;
}

/** Load the persistent entitlement record first; localStorage is retained as an offline/UI fallback. */
export async function hydrateMonetizationState(userId: number): Promise<MonetizationState> {
  const local = getMonetizationState(userId);
  if (!userId) return local;
  try {
    const auth = await insforge.auth.getCurrentUser();
    if (auth.error || !auth.data?.user?.email) return local;
    const result = await insforge.database.from('users').select(
      'premium,premium_until,verified,verification_requested_at,featured_until,priority_matching,credits,workshops_enabled,corporate_interest,sponsored_enabled,lead_generation_enabled,priority_matches_used,priority_matches_date,boosts_used,last_boost_at'
    ).eq('email', auth.data.user.email).maybeSingle();
    if (result.error || !result.data) return local;
    const row = result.data as any;
    const state: MonetizationState = {
      premium: Boolean(row.premium),
      premiumUntil: row.premium_until ?? null,
      verified: Boolean(row.verified),
      verificationRequestedAt: row.verification_requested_at ?? null,
      featuredUntil: row.featured_until ?? null,
      priorityMatching: Boolean(row.priority_matching),
      credits: Number(row.credits ?? 100),
      workshopsEnabled: Boolean(row.workshops_enabled),
      corporateInterest: Boolean(row.corporate_interest),
      sponsoredEnabled: Boolean(row.sponsored_enabled),
      leadGenerationEnabled: Boolean(row.lead_generation_enabled),
    };
    const hydrated = getMonetizationState(userId);
    const merged = state.premiumUntil && new Date(state.premiumUntil).getTime() <= Date.now()
      ? { ...state, premium: false, premiumUntil: null, priorityMatching: false }
      : state;
    write(stateKey(userId), merged);
    write(usageKey(userId), {
      priorityMatchesUsed: Number(row.priority_matches_used ?? 0),
      priorityMatchesDate: row.priority_matches_date ?? '',
      boostsUsed: Number(row.boosts_used ?? 0),
      lastBoostAt: row.last_boost_at ?? null,
    });
    return merged ?? hydrated;
  } catch { return local; }
}

/** Persist the same entitlement shape used by the UI into the signed-in user's profile. */
export async function persistMonetizationState(userId: number, state: MonetizationState): Promise<MonetizationState> {
  if (!userId) return state;
  write(stateKey(userId), state);
  try {
    const auth = await insforge.auth.getCurrentUser();
    if (!auth.error && auth.data?.user?.email) {
      const { error } = await insforge.database.from('users').update({
        premium: state.premium, premium_until: state.premiumUntil,
        verified: state.verified, verification_requested_at: state.verificationRequestedAt,
        featured_until: state.featuredUntil, priority_matching: state.priorityMatching,
        credits: state.credits, workshops_enabled: state.workshopsEnabled,
        corporate_interest: state.corporateInterest, sponsored_enabled: state.sponsoredEnabled,
        lead_generation_enabled: state.leadGenerationEnabled,
      }).eq('email', auth.data.user.email);
      if (error) throw new Error(error.message || 'Unable to persist monetization state');
    }
  } catch (error) { console.warn('Monetization persistence fallback:', error); }
  return state;
}

export function saveMonetizationState(userId: number, state: MonetizationState) { if (userId) write(stateKey(userId), state); }
export function updateMonetizationState(userId: number, patch: Partial<MonetizationState>) {
  const next = { ...getMonetizationState(userId), ...patch }; saveMonetizationState(userId, next); return next;
}

export function getMonetizationUsage(userId: number): MonetizationUsage {
  if (!userId) return { ...usageDefaults };
  const usage = read(usageKey(userId), usageDefaults);
  const today = new Date().toISOString().slice(0, 10);
  if (usage.priorityMatchesDate !== today) {
    const reset = { ...usage, priorityMatchesUsed: 0, priorityMatchesDate: today }; write(usageKey(userId), reset); return reset;
  }
  return usage;
}
export function consumePriorityMatch(userId: number): MonetizationUsage {
  const usage = getMonetizationUsage(userId);
  const next = { ...usage, priorityMatchesUsed: usage.priorityMatchesUsed + 1 }; write(usageKey(userId), next); return next;
}

export function canUse(userId: number, entitlement: Entitlement): boolean {
  const state = getMonetizationState(userId);
  switch (entitlement) {
    case 'premium': return state.premium;
    case 'priority_matching': return state.premium && state.priorityMatching;
    case 'profile_boost': return state.credits >= 50;
    case 'verified_badge': return state.verified;
    case 'workshops': return state.premium || state.workshopsEnabled;
    case 'lead_generation': return state.premium || state.leadGenerationEnabled;
    case 'sponsored': return state.premium || state.sponsoredEnabled;
    default: return false;
  }
}
export function getPriorityMatchLimit(userId: number): number { return getMonetizationState(userId).premium ? 20 : 0; }
export function getPriorityMatchRemaining(userId: number): number { return Math.max(0, getPriorityMatchLimit(userId) - getMonetizationUsage(userId).priorityMatchesUsed); }

export function recordBoost(userId: number, days = 7): MonetizationState {
  const state = getMonetizationState(userId);
  if (state.credits < 50) throw new Error('Not enough skill credits');
  const usage = getMonetizationUsage(userId);
  write(usageKey(userId), { ...usage, boostsUsed: usage.boostsUsed + 1, lastBoostAt: new Date().toISOString() });
  return updateMonetizationState(userId, { credits: state.credits - 50, featuredUntil: new Date(Date.now() + days * 86400000).toISOString() });
}
export function activatePremium(userId: number, months = 1): MonetizationState {
  const until = new Date(); until.setMonth(until.getMonth() + months);
  return updateMonetizationState(userId, { premium: true, premiumUntil: until.toISOString(), priorityMatching: true });
}
