import { insforge } from '../lib/insforge';

export type MonetizationState = {
  premium: boolean; premiumUntil: string | null; verified: boolean; verificationRequestedAt: string | null;
  featuredUntil: string | null; priorityMatching: boolean; credits: number; workshopsEnabled: boolean;
  corporateInterest: boolean; sponsoredEnabled: boolean; leadGenerationEnabled: boolean;
};
export type MonetizationUsage = { priorityMatchesUsed: number; priorityMatchesDate: string; boostsUsed: number; lastBoostAt: string | null };
export type Entitlement = 'premium'|'priority_matching'|'profile_boost'|'verified_badge'|'workshops'|'lead_generation'|'sponsored';
const stateKey=(id:number)=>`skillbarter_monetization_${id}`;
const usageKey=(id:number)=>`skillbarter_monetization_usage_${id}`;
const defaults:MonetizationState={premium:false,premiumUntil:null,verified:false,verificationRequestedAt:null,featuredUntil:null,priorityMatching:false,credits:100,workshopsEnabled:false,corporateInterest:false,sponsoredEnabled:false,leadGenerationEnabled:false};
const usageDefaults:MonetizationUsage={priorityMatchesUsed:0,priorityMatchesDate:'',boostsUsed:0,lastBoostAt:null};
const read=<T extends Record<string,unknown>>(key:string,fallback:T):T=>{try{const raw=localStorage.getItem(key);return raw?{...fallback,...(JSON.parse(raw) as Partial<T>)}:{...fallback};}catch{return {...fallback};}};
const write=<T extends Record<string,unknown>>(key:string,value:T)=>localStorage.setItem(key,JSON.stringify(value));

export function getMonetizationState(userId:number):MonetizationState{
  if(!userId)return {...defaults};
  const state=read(stateKey(userId),defaults);
  if(state.premiumUntil&&new Date(state.premiumUntil).getTime()<=Date.now()){const expired={...state,premium:false,premiumUntil:null,priorityMatching:false};write(stateKey(userId),expired);return expired;}
  return state;
}

export async function hydrateMonetizationState(userId:number):Promise<MonetizationState>{
  const local=getMonetizationState(userId); if(!userId)return local;
  try{
    const auth=await insforge.auth.getCurrentUser(); if(auth.error||!auth.data?.user?.email)return local;
    const result=await insforge.database.from('users').select('premium,premium_until,verified,verification_requested_at,featured_until,priority_matching,credits,workshops_enabled,corporate_interest,sponsored_enabled,lead_generation_enabled,priority_matches_used,priority_matches_date,boosts_used,last_boost_at').eq('email',auth.data.user.email).maybeSingle();
    if(result.error||!result.data)return local;
    const r=result.data as any;
    const state:MonetizationState={premium:Boolean(r.premium),premiumUntil:r.premium_until??null,verified:Boolean(r.verified),verificationRequestedAt:r.verification_requested_at??null,featuredUntil:r.featured_until??null,priorityMatching:Boolean(r.priority_matching),credits:Number(r.credits??100),workshopsEnabled:Boolean(r.workshops_enabled),corporateInterest:Boolean(r.corporate_interest),sponsoredEnabled:Boolean(r.sponsored_enabled),leadGenerationEnabled:Boolean(r.lead_generation_enabled)};
    const effective=state.premiumUntil&&new Date(state.premiumUntil).getTime()<=Date.now()?{...state,premium:false,premiumUntil:null,priorityMatching:false}:state;
    write(stateKey(userId),effective);
    write(usageKey(userId),{priorityMatchesUsed:Number(r.priority_matches_used??0),priorityMatchesDate:r.priority_matches_date??'',boostsUsed:Number(r.boosts_used??0),lastBoostAt:r.last_boost_at??null});
    return effective;
  }catch{return local;}
}

export async function persistMonetizationState(userId:number,state:MonetizationState):Promise<MonetizationState>{
  // Entitlements are server-controlled. Keep this helper local-only until a
  // trusted payment/verification endpoint exists; never let the browser write
  // premium, verification, credits, boosts, or other privileged fields.
  if(userId)write(stateKey(userId),state);
  return state;
}

export function saveMonetizationState(userId:number,state:MonetizationState){if(userId)write(stateKey(userId),state);}
export function updateMonetizationState(userId:number,patch:Partial<MonetizationState>){const next={...getMonetizationState(userId),...patch};saveMonetizationState(userId,next);void persistMonetizationState(userId,next);return next;}

export function getMonetizationUsage(userId:number):MonetizationUsage{
  if(!userId)return {...usageDefaults}; const usage=read(usageKey(userId),usageDefaults); const today=new Date().toISOString().slice(0,10);
  if(usage.priorityMatchesDate!==today){const reset={...usage,priorityMatchesUsed:0,priorityMatchesDate:today};write(usageKey(userId),reset);return reset;} return usage;
}
export function consumePriorityMatch(userId:number):MonetizationUsage{
  // Usage counters must be enforced server-side to prevent client-side
  // tampering. Keep a local display counter only.
  const usage=getMonetizationUsage(userId);
  const next={...usage,priorityMatchesUsed:usage.priorityMatchesUsed+1};
  write(usageKey(userId),next);
  return next;
}

export function canUse(userId:number,entitlement:Entitlement):boolean{const state=getMonetizationState(userId);switch(entitlement){case'premium':return state.premium;case'priority_matching':return state.premium&&state.priorityMatching;case'profile_boost':return state.credits>=50;case'verified_badge':return state.verified;case'workshops':return state.premium||state.workshopsEnabled;case'lead_generation':return state.premium||state.leadGenerationEnabled;case'sponsored':return state.premium||state.sponsoredEnabled;default:return false;}}
export function getPriorityMatchLimit(userId:number){return getMonetizationState(userId).premium?20:0;}
export function getPriorityMatchRemaining(userId:number){return Math.max(0,getPriorityMatchLimit(userId)-getMonetizationUsage(userId).priorityMatchesUsed);}
export function recordBoost(_userId:number,_days=7):MonetizationState{
  throw new Error('Profile boosts are unavailable until credits and entitlements are enforced server-side.');
}

export function activatePremium(_userId:number,_months=1):MonetizationState{
  throw new Error('Premium activation requires verified server-side payment.');
}
