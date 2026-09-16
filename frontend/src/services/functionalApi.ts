import { insforge } from '../lib/insforge';

const fail = (error: any, fallback: string): never => { throw new Error(error?.message || fallback); };

class FunctionalApi {
  private async appUser() {
    const auth = await insforge.auth.getCurrentUser();
    if (auth.error || !auth.data?.user?.email) fail(auth.error, 'Not authenticated');
    const result = await insforge.database.from('users').select('*').eq('email', auth.data.user.email).maybeSingle();
    if (result.error || !result.data) fail(result.error, 'Application profile not found');
    return result.data;
  }

  private async skillsFor(userId: number) {
    const result = await insforge.database.from('user_skills').select('*, skills(*)').eq('user_id', userId).order('created_at', { ascending: true });
    if (result.error) fail(result.error, 'Unable to load skills');
    return (result.data || []).map((r: any) => ({ ...r, skill_name: r.skills?.name || 'Unknown', category: r.skills?.category || 'Other' }));
  }

  async getMe() {
    const u = await this.appUser();
    return { ...u, skills: await this.skillsFor(Number(u.id)) };
  }

  async getUserProfile(id: number) {
    const result = await insforge.database.from('users').select('*').eq('id', id).maybeSingle();
    if (result.error || !result.data) fail(result.error, 'User not found');
    const skills = await this.skillsFor(id);
    return { ...result.data, skills, skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name) };
  }

  async updateMe(payload: any) {
    const u = await this.appUser();
    const result = await insforge.database.from('users').update(payload).eq('id', u.id).select('*').single();
    if (result.error) fail(result.error, 'Unable to update profile');
    return result.data;
  }

  async getNearbyUsers(radiusKm = 100) {
    const me = await this.appUser();
    const result = await insforge.database.from('users').select('*').eq('is_active', true).limit(100);
    if (result.error) fail(result.error, 'Unable to load members');
    const lat0 = Number(me.latitude ?? 17.4485), lon0 = Number(me.longitude ?? 78.3748);
    const rad = (v:number) => v * Math.PI / 180;
    const distance = (lat:number, lon:number) => { const a = Math.sin(rad(lat-lat0)/2)**2 + Math.cos(rad(lat0))*Math.cos(rad(lat))/1*Math.sin(rad(lon-lon0)/2)**2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); };
    const rows:any[] = [];
    for (const u of result.data || []) {
      if (Number(u.id) === Number(me.id)) continue;
      const d = u.latitude == null || u.longitude == null ? 999 : distance(Number(u.latitude), Number(u.longitude));
      if (d > radiusKm) continue;
      const skills = await this.skillsFor(Number(u.id));
      rows.push({ id:u.id, full_name:u.full_name, avatar_url:u.avatar_url, headline:u.headline, address_display:u.address_display, distance_km:d, distance_display:d === 999 ? 'Local' : `${d.toFixed(1)} km`, trust_score:u.trust_score, reliability_score:u.reliability_score, skills_offered:skills.filter((s:any)=>s.skill_type==='OFFERED').map((s:any)=>s.skill_name), skills_needed:skills.filter((s:any)=>s.skill_type==='NEEDED').map((s:any)=>s.skill_name), availability:u.availability });
    }
    return rows.sort((a,b)=>a.distance_km-b.distance_km);
  }

  async addUserSkill(payload:any) {
    const me = await this.appUser(); const name = String(payload.skill_name || '').trim(); if (!name) throw new Error('Skill name is required');
    let found = await insforge.database.from('skills').select('*').ilike('name', name).maybeSingle();
    if (found.error) fail(found.error, 'Unable to find skill');
    let skill = found.data;
    if (!skill) { const created = await insforge.database.from('skills').insert({ name, category:'Other', icon:'Sparkles', popularity:0 }).select('*').single(); if (created.error) fail(created.error, 'Unable to create skill'); skill=created.data; }
    const existing = await insforge.database.from('user_skills').select('*').eq('user_id', me.id).eq('skill_id', skill.id).eq('skill_type', payload.skill_type || 'OFFERED').maybeSingle();
    if (existing.error) fail(existing.error, 'Unable to check skill');
    if (existing.data) return existing.data;
    const created = await insforge.database.from('user_skills').insert({ user_id:me.id, skill_id:skill.id, skill_type:payload.skill_type || 'OFFERED', experience_level:payload.experience_level || 'Intermediate', description:payload.description || null }).select('*').single();
    if (created.error) fail(created.error, 'Unable to save skill');
    return created.data;
  }

  async deleteUserSkill(id:number) { const me=await this.appUser(); const r=await insforge.database.from('user_skills').delete().eq('id',id).eq('user_id',me.id); if(r.error) fail(r.error,'Unable to remove skill'); return r.data; }

  async connectNeighbor(id:number) {
    const me=await this.appUser(); if(Number(id)===Number(me.id)) throw new Error('You cannot connect to yourself.');
    const exists=await insforge.database.from('connections').select('*').eq('user_id',me.id).eq('connected_user_id',id).maybeSingle();
    if(exists.error) fail(exists.error,'Unable to check connection'); if(exists.data) return exists.data;
    const reverse=await insforge.database.from('connections').select('*').eq('user_id',id).eq('connected_user_id',me.id).maybeSingle();
    if(reverse.error) fail(reverse.error,'Unable to check connection');
    if(reverse.data) return reverse.data;
    const created=await insforge.database.from('connections').insert({user_id:me.id,connected_user_id:id,status:'ACCEPTED'}).select('*').single(); if(created.error) fail(created.error,'Unable to create connection'); return created.data;
  }

  async disconnectNeighbor(id:number) { const me=await this.appUser(); const a=await insforge.database.from('connections').delete().eq('user_id',me.id).eq('connected_user_id',id); const b=await insforge.database.from('connections').delete().eq('user_id',id).eq('connected_user_id',me.id); if(a.error&&b.error) fail(a.error,'Unable to remove connection'); return true; }

  async getMatches() {
    const me=await this.appUser(); const mine=await this.skillsFor(Number(me.id)); const offered=mine.filter((s:any)=>s.skill_type==='OFFERED').map((s:any)=>String(s.skill_name).toLowerCase()); const needed=mine.filter((s:any)=>s.skill_type==='NEEDED').map((s:any)=>String(s.skill_name).toLowerCase());
    const users=await this.getNearbyUsers(100); return users.map((u:any)=>{const theirOffer=(u.skills_offered||[]).map((s:string)=>s.toLowerCase()), theirNeed=(u.skills_needed||[]).map((s:string)=>s.toLowerCase()); const a=offered.filter((s:string)=>theirNeed.includes(s)), b=theirOffer.filter((s:string)=>needed.includes(s)); const reciprocal=a.length&&b.length; if(!a.length&&!b.length)return null; return {candidate:u,match_score:Math.min(99,reciprocal?90:70),distance_display:u.distance_display,is_reciprocal:Boolean(reciprocal),reasons:[reciprocal?'Two-way skill compatibility':'One-way skill compatibility',u.distance_display]};}).filter(Boolean).sort((a:any,b:any)=>b.match_score-a.match_score);
  }

  async proposeExchange(payload:any) {
    const me=await this.appUser(); const receiverId=Number(payload.receiver_id); if(!receiverId||receiverId===Number(me.id))throw new Error('Choose another member.');
    const receiver=await insforge.database.from('users').select('id,full_name').eq('id',receiverId).eq('is_active',true).maybeSingle(); if(receiver.error||!receiver.data)fail(receiver.error,'Partner not found');
    const resolve=async(name:any)=>{if(!name)return null;const r=await insforge.database.from('skills').select('id').ilike('name',String(name).trim()).maybeSingle();if(r.data)return r.data.id;const c=await insforge.database.from('skills').insert({name:String(name).trim(),category:'Other',icon:'Sparkles',popularity:0}).select('id').single();if(c.error)fail(c.error,'Unable to create skill');return c.data.id;};
    const row=await insforge.database.from('exchanges').insert({requester_id:me.id,receiver_id:receiverId,requester_skill_id:await resolve(payload.requester_skill_name),receiver_skill_id:await resolve(payload.receiver_skill_name),status:'PENDING',proposal_message:payload.proposal_message||'Skill exchange proposal',preferred_date:payload.preferred_date||'This week',estimated_hours:2,location_area:me.address_display||'Local'}).select('*').single(); if(row.error)fail(row.error,'Unable to create exchange');
    await insforge.database.from('notifications').insert({user_id:receiverId,type:'EXCHANGE_REQUEST',title:'New Skill Barter Proposal',message:`${me.full_name} sent you an exchange proposal.`,link:`/exchanges/${row.data.id}`}); return row.data;
  }

  async getExchanges() {
    const me=await this.appUser(); const r=await insforge.database.from('exchanges').select('*').or(`requester_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at',{ascending:false}); if(r.error)fail(r.error,'Unable to load exchanges');
    return Promise.all((r.data||[]).map(async(e:any)=>{const [a,b]=await Promise.all([insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score').eq('id',e.requester_id).maybeSingle(),insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score').eq('id',e.receiver_id).maybeSingle()]); return {...e,requester:a.data,receiver:b.data,requester_skill_name:'Skill exchange',receiver_skill_name:'Skill exchange'};}));
  }

  async acceptExchange(id:number){const me=await this.appUser();const e=await insforge.database.from('exchanges').select('*').eq('id',id).maybeSingle();if(e.error||!e.data)fail(e.error,'Exchange not found');if(Number(e.data.receiver_id)!==Number(me.id))throw new Error('Only the recipient can accept this request.');const r=await insforge.database.from('exchanges').update({status:'ACTIVE',updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(r.error)fail(r.error,'Unable to accept exchange');return r.data;}
  async completeExchange(id:number){const me=await this.appUser();const e=await insforge.database.from('exchanges').select('*').eq('id',id).maybeSingle();if(e.error||!e.data)fail(e.error,'Exchange not found');const uid=Number(me.id);if(uid!==Number(e.data.requester_id)&&uid!==Number(e.data.receiver_id))throw new Error('Not authorized.');const patch=uid===Number(e.data.requester_id)?{requester_completed:true}:{receiver_completed:true};const both=uid===Number(e.data.requester_id)?e.data.receiver_completed:e.data.requester_completed;if(both)(patch as any).status='COMPLETED';const r=await insforge.database.from('exchanges').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();if(r.error)fail(r.error,'Unable to complete exchange');return r.data;}

  async getNotifications(){const me=await this.appUser();const r=await insforge.database.from('notifications').select('*').eq('user_id',me.id).order('created_at',{ascending:false}).limit(50);if(r.error)fail(r.error,'Unable to load notifications');return r.data||[];}
  async markNotificationRead(id:number){const me=await this.appUser();const r=await insforge.database.from('notifications').update({is_read:true}).eq('id',id).eq('user_id',me.id).select('*').single();if(r.error)fail(r.error,'Unable to mark notification');return r.data;}
  async markAllNotificationsRead(){const me=await this.appUser();const r=await insforge.database.from('notifications').update({is_read:true}).eq('user_id',me.id).eq('is_read',false);if(r.error)fail(r.error,'Unable to update notifications');return true;}

  async sendMessage(payload:any){const me=await this.appUser();const r=await insforge.database.from('messages').insert({sender_id:me.id,receiver_id:Number(payload.receiver_id),content:String(payload.content).trim(),exchange_id:payload.exchange_id||null}).select('*').single();if(r.error)fail(r.error,'Unable to send message');await insforge.database.from('notifications').insert({user_id:Number(payload.receiver_id),type:'MESSAGE',title:'New message',message:`${me.full_name} sent you a message.`,link:`/messages/${me.id}`});return r.data;}

  async getFeed(){const r=await insforge.database.from('posts').select('*').order('created_at',{ascending:false}).limit(50);if(r.error)fail(r.error,'Unable to load feed');return r.data||[];}
  async createPost(payload:any){const me=await this.appUser();const r=await insforge.database.from('posts').insert({author_id:me.id,post_type:payload.post_type||'COMMUNITY',title:payload.title,content:payload.content,likes_count:0}).select('*').single();if(r.error)fail(r.error,'Unable to publish post');return r.data;}
  async likePost(id:number){const r=await insforge.database.from('posts').select('likes_count').eq('id',id).maybeSingle();if(r.error||!r.data)fail(r.error,'Post not found');const u=await insforge.database.from('posts').update({likes_count:Number(r.data.likes_count||0)+1}).eq('id',id).select('likes_count').single();if(u.error)fail(u.error,'Unable to save like');return u.data;}
}
export const functionalApi = new FunctionalApi();
