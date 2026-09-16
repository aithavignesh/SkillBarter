import { api } from './api';
import { insforge } from '../lib/insforge';

const current = async () => {
  const auth = await insforge.auth.getCurrentUser();
  if (auth.error || !auth.data?.user?.email) throw new Error('Not authenticated');
  const row = await insforge.database.from('users').select('*').eq('email', auth.data.user.email).maybeSingle();
  if (row.error || !row.data) throw new Error(row.error?.message || 'Profile not found');
  return row.data;
};
const user = async (id:number) => { const r=await insforge.database.from('users').select('id,full_name,avatar_url,headline,address_display,trust_score').eq('id',id).maybeSingle(); if(r.error||!r.data)throw new Error(r.error?.message||'User not found'); return r.data; };
const target=api as any;

target.getConnections=async()=>{const me=await current();const r=await insforge.database.from('connections').select('*').or(`user_id.eq.${me.id},connected_user_id.eq.${me.id}`).eq('status','ACCEPTED');if(r.error)throw new Error(r.error.message);return Promise.all((r.data||[]).map(async(c:any)=>{const pid=Number(c.user_id)===Number(me.id)?Number(c.connected_user_id):Number(c.user_id);return {id:c.id,partner:await user(pid),status:c.status,created_at:c.created_at};}));};
target.getConnectionSuggestions=async()=>{const me=await current();const r=await insforge.database.from('users').select('*').eq('is_active',true).neq('id',me.id).limit(30);if(r.error)throw new Error(r.error.message);const con=await insforge.database.from('connections').select('user_id,connected_user_id').or(`user_id.eq.${me.id},connected_user_id.eq.${me.id}`);const ids=new Set<number>();for(const c of con.data||[])ids.add(Number(c.user_id)===Number(me.id)?Number(c.connected_user_id):Number(c.user_id));return (r.data||[]).filter((u:any)=>!ids.has(Number(u.id))).map((u:any)=>({...u,distance_display:'Nearby'}));};
target.getConversations=async()=>{const me=await current();const r=await insforge.database.from('messages').select('*').or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at',{ascending:false});if(r.error)throw new Error(r.error.message);const map=new Map<number,any>();for(const m of r.data||[]){const pid=Number(m.sender_id)===Number(me.id)?Number(m.receiver_id):Number(m.sender_id);if(!map.has(pid))map.set(pid,{last_message:m.content,unread_count:0,last_message_at:m.created_at});if(Number(m.receiver_id)===Number(me.id)&&!m.is_read)map.get(pid).unread_count++;}return Promise.all([...map.entries()].map(async([pid,v])=>({partner:await user(pid),...v})));};
target.getMessages=async(partnerId:number)=>{const me=await current();const r=await insforge.database.from('messages').select('*').or(`and(sender_id.eq.${me.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${me.id})`).order('created_at',{ascending:true});if(r.error)throw new Error(r.error.message);await insforge.database.from('messages').update({is_read:true}).eq('sender_id',partnerId).eq('receiver_id',me.id);return r.data||[];};
target.getUnreadNotificationCount=async()=>{const me=await current();const r=await insforge.database.from('notifications').select('id').eq('user_id',me.id).eq('is_read',false);if(r.error)throw new Error(r.error.message);return {count:(r.data||[]).length};};
