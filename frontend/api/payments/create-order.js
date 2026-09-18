import crypto from 'node:crypto';

function json(res, body, status=200) {
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  return res.status(status).json(body);
}
function env(name){ return String(process.env[name]||'').trim(); }
async function body(req){
  if(req.body && typeof req.body==='object') return req.body;
  try{return typeof req.json==='function'?await req.json():JSON.parse(req.body||'{}');}catch{return {};}
}
async function authUser(req){
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token) throw new Error('Not authenticated');
  const base=env('INSFORGE_URL')||env('VITE_INSFORGE_URL');
  if(!base) throw new Error('INSFORGE_URL is not configured');
  const r=await fetch(base.replace(/\/+$/,'')+'/api/auth/me',{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
  const data=await r.json().catch(()=>null);
  if(!r.ok||!data) throw new Error('Your session has expired. Please sign in again.');
  return {token,email:data.email||data.user?.email,base};
}
export default async function handler(req,res){
  if(req.method==='OPTIONS') return json(res,{ok:true});
  if(req.method!=='POST') return json(res,{error:'Method not allowed'},405);
  try{
    const {token,email,base}=await authUser(req);
    if(!email) return json(res,{error:'Authenticated account has no email.'},400);
    const {plan='premium_monthly'}=await body(req);
    if(plan!=='premium_monthly') return json(res,{error:'Unknown membership plan.'},400);
    const key=env('RAZORPAY_KEY_ID'), secret=env('RAZORPAY_KEY_SECRET');
    if(!key||!secret) return json(res,{error:'Razorpay is not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the deployment environment.'},503);
    const amount=14900;
    const orderBody={amount,currency:'INR',receipt:'sb_'+Date.now().toString(36),notes:{product:'SkillBarter Premium Membership',plan:'premium_monthly',email}};
    const auth=Buffer.from(key+':'+secret).toString('base64');
    const r=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/json'},body:JSON.stringify(orderBody)});
    const data=await r.json().catch(()=>null);
    if(!r.ok||!data?.id) return json(res,{error:data?.error?.description||'Unable to create payment order.'},502);
    return json(res,{order_id:data.id,amount:data.amount,currency:data.currency,key_id:key,prefill:{email}});
  }catch(e){ return json(res,{error:e?.message||'Unable to start payment.'},401); }
}
