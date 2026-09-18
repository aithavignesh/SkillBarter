import crypto from 'node:crypto';

function json(res, body, status=200){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.status(status).json(body);}
function env(n){return String(process.env[n]||'').trim();}
async function body(req){if(req.body&&typeof req.body==='object')return req.body;try{return typeof req.json==='function'?await req.json():JSON.parse(req.body||'{}')}catch{return {}}}
async function authUser(req){
  const token=String(req.headers?.authorization||'').replace(/^Bearer\s+/i,''); if(!token) throw new Error('Not authenticated');
  const base=env('INSFORGE_URL')||env('VITE_INSFORGE_URL'); const anonKey=env('INSFORGE_ANON_KEY')||env('VITE_INSFORGE_ANON_KEY');
  if(!base) throw new Error('INSFORGE_URL is not configured'); if(!anonKey) throw new Error('INSFORGE_ANON_KEY is not configured');
  const {createClient}=await import('@insforge/sdk');
  const client=createClient({baseUrl:base,anonKey,accessToken:token});
  const result=await client.auth.getCurrentUser();
  if(result.error||!result.data?.user) throw new Error('Your session has expired. Please sign in again.');
  const email=result.data.user.email; if(!email) throw new Error('Authenticated account has no email.');
  return {token,email,base,client};
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
    const {data: updatedUser, error: updateError}=await client.database.from('users').update({
      premium:true,
      premium_until:until.toISOString(),
      priority_matching:true,
      updated_at:new Date().toISOString(),
    }).eq('email',email).select('id,premium,premium_until').maybeSingle();
    if(updateError || !updatedUser) return json(res,{error:updateError?.message||'Payment succeeded, but membership activation could not be saved. Please contact support with payment ID '+razorpay_payment_id+'.'},502);
    return json(res,{success:true,premium_until:until.toISOString(),payment_id:razorpay_payment_id});
  }catch(e){return json(res,{error:e?.message||'Unable to verify payment.'},401);}
}
