import crypto from 'node:crypto';

function json(res, body, status=200){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.status(status).json(body);}
function env(n){return String(process.env[n]||'').trim();}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;try{return typeof req.json==='function'?await req.json():JSON.parse(req.body||'{}')}catch{return {}}}
async function authUser(req){
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,''); if(!token) throw new Error('Not authenticated');
  const base=env('INSFORGE_URL')||env('VITE_INSFORGE_URL'); if(!base) throw new Error('INSFORGE_URL is not configured');
  const r=await fetch(base.replace(/\/+$/,'')+'/api/auth/me',{headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
  const data=await r.json().catch(()=>null); if(!r.ok||!data) throw new Error('Your session has expired. Please sign in again.');
  return {token,email:data.email||data.user?.email,base};
}
export default async function handler(req,res){
  if(req.method!=='POST') return json(res,{error:'Method not allowed'},405);
  try{
    const {token,email,base}=await authUser(req);
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=await body(req);
    if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature) return json(res,{error:'Incomplete payment response.'},400);
    const secret=env('RAZORPAY_KEY_SECRET'); if(!secret) return json(res,{error:'Razorpay is not configured yet.'},503);
    const expected=crypto.createHmac('sha256',secret).update(razorpay_order_id+'|'+razorpay_payment_id).digest('hex');
    if(expected.length!==razorpay_signature.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature))) return json(res,{error:'Payment signature verification failed.'},400);
    const until=new Date(); until.setMonth(until.getMonth()+1);
    const r=await fetch(base.replace(/\/+$/,'')+'/api/database/records/users?email=eq.'+encodeURIComponent(email),{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json',Prefer:'return=representation'},body:JSON.stringify({premium:true,premium_until:until.toISOString(),priority_matching:true,updated_at:new Date().toISOString()})});
    const data=await r.json().catch(()=>null);
    if(!r.ok) return json(res,{error:data?.message||data?.error||'Payment succeeded, but membership activation could not be saved. Please contact support with payment ID '+razorpay_payment_id+'.'},502);
    return json(res,{success:true,premium_until:until.toISOString(),payment_id:razorpay_payment_id});
  }catch(e){return json(res,{error:e?.message||'Unable to verify payment.'},401);}
}
