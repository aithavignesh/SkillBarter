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
  | 'premium'
  | 'priority_matching'
  | 'profile_boost'
  | 'verified_badge'
  | 'workshops'
  | 'lead_generation'
  | 'sponsored';

const stateKey = (userId: number) => `skillbarter_monetization_${userId}`;
const usageKey = (userId: number) => `skillbarter_monetization_usage_${userId}`;

const defaults: MonetizationState = {
  premium: false,
  premiumUntil: null,
  verified: false,
  verificationRequestedAt: null,
  featuredUntil: null,
  priorityMatching: false,
  credits: 100,
  workshopsEnabled: false,
  corporateInterest: false,
  sponsoredEnabled: false,
  leadGenerationEnabled: false,
};

const usageDefaults: MonetizationUsage = {
  priorityMatchesUsed: 0,
  priorityMatchesDate: '',
  boostsUsed: 0,
  lastBoostAt: null,
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
};

const write = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

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

export function saveMonetizationState(userId: number, state: MonetizationState) {
  if (userId) write(stateKey(userId), state);
}

export function updateMonetizationState(userId: number, patch: Partial<MonetizationState>) {
  const next = { ...getMonetizationState(userId), ...patch };
  saveMonetizationState(userId, next);
  return next;
}

export function getMonetizationUsage(userId: number): MonetizationUsage {
  if (!userId) return { ...usageDefaults };
  const usage = read(usageKey(userId), usageDefaults);
  const today = new Date().toISOString().slice(0, 10);
  if (usage.priorityMatchesDate !== today) {
    const reset = { ...usage, priorityMatchesUsed: 0, priorityMatchesDate: today };
    write(usageKey(userId), reset);
    return reset;
  }
  return usage;
}

export function consumePriorityMatch(userId: number): MonetizationUsage {
  const usage = getMonetizationUsage(userId);
  const next = { ...usage, priorityMatchesUsed: usage.priorityMatchesUsed + 1 };
  write(usageKey(userId), next);
  return next;
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

export function getPriorityMatchLimit(userId: number): number {
  return getMonetizationState(userId).premium ? 20 : 0;
}

export function getPriorityMatchRemaining(userId: number): number {
  const limit = getPriorityMatchLimit(userId);
  return Math.max(0, limit - getMonetizationUsage(userId).priorityMatchesUsed);
}

export function recordBoost(userId: number, days = 7): MonetizationState {
  const state = getMonetizationState(userId);
  if (state.credits < 50) throw new Error('Not enough skill credits');
  const usage = getMonetizationUsage(userId);
  const nextUsage = { ...usage, boostsUsed: usage.boostsUsed + 1, lastBoostAt: new Date().toISOString() };
  write(usageKey(userId), nextUsage);
  return updateMonetizationState(userId, {
    credits: state.credits - 50,
    featuredUntil: new Date(Date.now() + days * 86400000).toISOString(),
  });
}

export function activatePremium(userId: number, months = 1): MonetizationState {
  const until = new Date();
  until.setMonth(until.getMonth() + months);
  return updateMonetizationState(userId, {
    premium: true,
    premiumUntil: until.toISOString(),
    priorityMatching: true,
  });
}
