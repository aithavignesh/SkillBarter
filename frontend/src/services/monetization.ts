export type MonetizationState = {
  premium: boolean;
  verified: boolean;
  featuredUntil: string | null;
  priorityMatching: boolean;
  credits: number;
  workshopsEnabled: boolean;
  corporateInterest: boolean;
  sponsoredEnabled: boolean;
  leadGenerationEnabled: boolean;
};

const keyFor = (userId: number) => `skillbarter_monetization_${userId}`;

const defaults: MonetizationState = {
  premium: false,
  verified: false,
  featuredUntil: null,
  priorityMatching: false,
  credits: 100,
  workshopsEnabled: false,
  corporateInterest: false,
  sponsoredEnabled: false,
  leadGenerationEnabled: false,
};

export function getMonetizationState(userId: number): MonetizationState {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function saveMonetizationState(userId: number, state: MonetizationState) {
  localStorage.setItem(keyFor(userId), JSON.stringify(state));
}

export function updateMonetizationState(userId: number, patch: Partial<MonetizationState>) {
  const next = { ...getMonetizationState(userId), ...patch };
  saveMonetizationState(userId, next);
  return next;
}
