import { insforge } from '../lib/insforge';

const fail = (error: any, fallback: string): never => { throw new Error(error?.message || fallback); };

class FunctionalApi {
  private async appUser() {
    const phoneUserId = Number(localStorage.getItem('skillbarter_user_id') || 0);
    const phone = localStorage.getItem('skillbarter_phone');
    if (phone && phoneUserId) {
      const result = await insforge.database.from('users').select('*').eq('id', phoneUserId).maybeSingle();
      if (result.error || !result.data) fail(result.error, 'Application profile not found');
      return result.data;
    }
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

  async getMe() { const u = await this.appUser(); return { ...u, skills: await this.skillsFor(Number(u.id)) }; }

  async getUserProfile(id: number) {
    const result = await insforge.database.from('users').select('*').eq('id', id).maybeSingle();
    if (result.error || !result.data) fail(result.error, 'User not found');
    const skills = await this.skillsFor(id);
    return { ...result.data, premium: Boolean((result.data as any).premium), verified: Boolean((result.data as any).verified), featured: Boolean((result.data as any).featured_until && new Date((result.data as any).featured_until).getTime() > Date.now()), featured_until: (result.data as any).featured_until ?? null, skills, skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name) };
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
    const rad = (v: number) => v * Math.PI / 180;
    const distance = (lat: number, lon: number) => {
      const dLat = rad(lat - lat0), dLon = rad(lon - lon0);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat0)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    };
    const rows: any[] = [];
    for (const u of result.data || []) {
      if (Number(u.id) === Number(me.id)) continue;
      const d = u.latitude == null || u.longitude == null ? 999 : distance(Number(u.latitude), Number(u.longitude));
      if (d > radiusKm) continue;
      const skills = await this.skillsFor(Number(u.id));
      rows.push({ id: u.id, full_name: u.full_name, avatar_url: u.avatar_url, headline: u.headline, address_display: u.address_display, distance_km: d, distance_display: d === 999 ? 'Local' : `${d.toFixed(1)} km`, trust_score: u.trust_score, reliability_score: u.reliability_score, premium: Boolean(u.premium), verified: Boolean(u.verified), featured: Boolean(u.featured_until && new Date(u.featured_until).getTime() > Date.now()), featured_until: u.featured_until ?? null, skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), availability: u.availability });
    }
    return rows.sort((a, b) => a.distance_km - b.distance_km);
  }

  async addUserSkill(payload: any) {
    const me = await this.appUser(); const name = String(payload.skill_name || '').trim(); if (!name) throw new Error('Skill name is required');
    const found = await insforge.database.from('skills').select('*').ilike('name', name).maybeSingle();
    if (found.error) fail(found.error, 'Unable to find skill');
    let skill = found.data;
    if (!skill) { const created = await insforge.database.from('skills').insert({ name, category: 'Other', icon: 'Sparkles', popularity: 0 }).select('*').single(); if (created.error) fail(created.error, 'Unable to create skill'); skill = created.data; }
    const existing = await insforge.database.from('user_skills').select('*').eq('user_id', me.id).eq('skill_id', skill.id).eq('skill_type', payload.skill_type || 'OFFERED').maybeSingle();
    if (existing.error) fail(existing.error, 'Unable to check skill'); if (existing.data) return existing.data;
    const created = await insforge.database.from('user_skills').insert({ user_id: me.id, skill_id: skill.id, skill_type: payload.skill_type || 'OFFERED', experience_level: payload.experience_level || 'Intermediate', description: payload.description || null }).select('*').single();
    if (created.error) fail(created.error, 'Unable to save skill'); return created.data;
  }

  async deleteUserSkill(id: number) { const me = await this.appUser(); const r = await insforge.database.from('user_skills').delete().eq('id', id).eq('user_id', me.id); if (r.error) fail(r.error, 'Unable to remove skill'); return r.data; }

  async connectNeighbor(id: number) {
    const me = await this.appUser(); if (Number(id) === Number(me.id)) throw new Error('You cannot connect to yourself.');
    const exists = await insforge.database.from('connections').select('*').eq('user_id', me.id).eq('connected_user_id', id).maybeSingle();
    if (exists.error) fail(exists.error, 'Unable to check connection'); if (exists.data) return exists.data;
    const reverse = await insforge.database.from('connections').select('*').eq('user_id', id).eq('connected_user_id', me.id).maybeSingle();
    if (reverse.error) fail(reverse.error, 'Unable to check connection'); if (reverse.data) return reverse.data;
    const created = await insforge.database.from('connections').insert({ user_id: me.id, connected_user_id: id, status: 'ACCEPTED' }).select('*').single(); if (created.error) fail(created.error, 'Unable to create connection'); await insforge.database.from('notifications').insert({ user_id: Number(id), type: 'CONNECTION_ACCEPTED', title: 'New connection', message: `${me.full_name} connected with you on SkillBarter.`, link: `/profile/${me.id}` }); return created.data;
  }

  async disconnectNeighbor(id: number) { const me = await this.appUser(); const a = await insforge.database.from('connections').delete().eq('user_id', me.id).eq('connected_user_id', id); const b = await insforge.database.from('connections').delete().eq('user_id', id).eq('connected_user_id', me.id); if (a.error && b.error) fail(a.error, 'Unable to remove connection'); return true; }

  async getMatches() {
    const me = await this.appUser(); const mine = await this.skillsFor(Number(me.id));
    const offered = mine.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => String(s.skill_name).toLowerCase());
    const needed = mine.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => String(s.skill_name).toLowerCase());
    const users = await this.getNearbyUsers(100);
    return users.map((u: any) => {
      const theirOffer = (u.skills_offered || []).map((s: string) => s.toLowerCase()); const theirNeed = (u.skills_needed || []).map((s: string) => s.toLowerCase());
      const a = offered.filter((s: string) => theirNeed.includes(s)); const b = theirOffer.filter((s: string) => needed.includes(s)); const reciprocal = a.length > 0 && b.length > 0;
      if (!a.length && !b.length) return null;
      return { candidate: u, match_score: Math.min(99, reciprocal ? 90 : 70), distance_display: u.distance_display, is_reciprocal: reciprocal, reasons: [reciprocal ? 'Two-way skill compatibility' : 'One-way skill compatibility', u.distance_display] };
    }).filter(Boolean).sort((a: any, b: any) => b.match_score - a.match_score);
  }

  async proposeExchange(payload: any) {
    const me = await this.appUser(); const receiverId = Number(payload.receiver_id); if (!receiverId || receiverId === Number(me.id)) throw new Error('Choose another member.');
    const receiver = await insforge.database.from('users').select('id,full_name').eq('id', receiverId).eq('is_active', true).maybeSingle(); if (receiver.error || !receiver.data) fail(receiver.error, 'Partner not found');
    const resolve = async (name: any) => { if (!name) return null; const r = await insforge.database.from('skills').select('id').ilike('name', String(name).trim()).maybeSingle(); if (r.error) fail(r.error, 'Unable to find skill'); if (r.data) return r.data.id; const c = await insforge.database.from('skills').insert({ name: String(name).trim(), category: 'Other', icon: 'Sparkles', popularity: 0 }).select('id').single(); if (c.error) fail(c.error, 'Unable to create skill'); return c.data.id; };
    const requesterSkillId = await resolve(payload.requester_skill_name); const receiverSkillId = await resolve(payload.receiver_skill_name); if (!requesterSkillId || !receiverSkillId) throw new Error('Both exchange skills are required.');
    const existingExchange = await insforge.database.from('exchanges').select('id,status').or(`and(requester_id.eq.${me.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${me.id})`).in('status', ['PENDING', 'ACTIVE']).limit(1).maybeSingle();
    if (existingExchange.error) fail(existingExchange.error, 'Unable to check existing exchanges');
    if (existingExchange.data) throw new Error('You already have a pending or active exchange with this member.');
    const row = await insforge.database.from('exchanges').insert({ requester_id: me.id, receiver_id: receiverId, requester_skill_id: requesterSkillId, receiver_skill_id: receiverSkillId, status: 'PENDING', proposal_message: payload.proposal_message || 'Skill exchange proposal', preferred_date: payload.preferred_date || 'This week', estimated_hours: Number(payload.estimated_hours) || 2, location_area: payload.location_area || me.address_display || 'Local' }).select('*').single();
    if (row.error) fail(row.error, 'Unable to create exchange');
    const notice = await insforge.database.from('notifications').insert({ user_id: receiverId, type: 'EXCHANGE_REQUEST', title: 'New Skill Barter Proposal', message: `${me.full_name} sent you an exchange proposal.`, link: `/exchanges/${row.data.id}` });
    if (notice.error) console.warn('Exchange created but notification failed:', notice.error);
    return row.data;
  }

  async getExchanges() {
    const me = await this.appUser();
    const r = await insforge.database.from('exchanges').select('*').or(`requester_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at', { ascending: false });
    if (r.error) fail(r.error, 'Unable to load exchanges');
    return Promise.all((r.data || []).map(async (e: any) => {
      const [a, b, requesterSkill, receiverSkill] = await Promise.all([
        insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score').eq('id', e.requester_id).maybeSingle(),
        insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score').eq('id', e.receiver_id).maybeSingle(),
        e.requester_skill_id ? insforge.database.from('skills').select('name').eq('id', e.requester_skill_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        e.receiver_skill_id ? insforge.database.from('skills').select('name').eq('id', e.receiver_skill_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      return { ...e, requester: a.data, receiver: b.data, requester_skill_name: requesterSkill.data?.name || 'Skill exchange', receiver_skill_name: receiverSkill.data?.name || 'Skill exchange' };
    }));
  }

  async acceptExchange(id: number) {
    const me = await this.appUser(); const e = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle();
    if (e.error || !e.data) fail(e.error, 'Exchange not found'); if (Number(e.data.receiver_id) !== Number(me.id)) throw new Error('Only the recipient can accept this request.'); if (e.data.status !== 'PENDING') throw new Error(`This exchange is already ${String(e.data.status).toLowerCase()}.`);
    const r = await insforge.database.from('exchanges').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', id).select('*').single(); if (r.error) fail(r.error, 'Unable to accept exchange');
    await insforge.database.from('notifications').insert({ user_id: Number(e.data.requester_id), type: 'EXCHANGE_ACCEPTED', title: 'Exchange accepted', message: `${me.full_name} accepted your skill exchange.`, link: `/exchanges/${id}` });
    return r.data;
  }

  async updateExchangeSchedule(id: number, payload: { preferred_date: string; estimated_hours: number; location_area: string }) {
    const me = await this.appUser();
    const e = await insforge.database.from('exchanges').select('id,requester_id,receiver_id,status').eq('id', id).maybeSingle();
    if (e.error || !e.data) fail(e.error, 'Exchange not found');
    if (Number(e.data.requester_id) !== Number(me.id) && Number(e.data.receiver_id) !== Number(me.id)) throw new Error('Not authorized.');
    if (!['PENDING', 'ACTIVE'].includes(String(e.data.status))) throw new Error('Only pending or active exchanges can be rescheduled.');
    const preferredDate = String(payload.preferred_date || '').trim();
    const hours = Number(payload.estimated_hours);
    const locationArea = String(payload.location_area || '').trim();
    if (!preferredDate) throw new Error('Please choose a preferred date.');
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) throw new Error('Duration must be between 0.5 and 24 hours.');
    if (!locationArea) throw new Error('Please provide a meetup area.');
    const r = await insforge.database.from('exchanges').update({
      preferred_date: preferredDate,
      estimated_hours: hours,
      location_area: locationArea,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
    if (r.error) fail(r.error, 'Unable to update exchange schedule');
    const partnerId = Number(e.data.requester_id) === Number(me.id) ? Number(e.data.receiver_id) : Number(e.data.requester_id);
    await insforge.database.from('notifications').insert({
      user_id: partnerId,
      type: 'EXCHANGE_UPDATED',
      title: 'Exchange schedule updated',
      message: `${me.full_name} updated the exchange date, duration or meetup area.`,
      link: `/exchanges/${id}`,
    });
    return r.data;
  }

  async completeExchange(id: number) {
    const me = await this.appUser(); const e = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle(); if (e.error || !e.data) fail(e.error, 'Exchange not found');
    const uid = Number(me.id); if (uid !== Number(e.data.requester_id) && uid !== Number(e.data.receiver_id)) throw new Error('Not authorized.'); if (e.data.status !== 'ACTIVE') throw new Error('Only active exchanges can be completed.');
    const patch: any = uid === Number(e.data.requester_id) ? { requester_completed: true } : { receiver_completed: true }; const both = uid === Number(e.data.requester_id) ? e.data.receiver_completed : e.data.requester_completed; if (both) patch.status = 'COMPLETED';
    const r = await insforge.database.from('exchanges').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single(); if (r.error) fail(r.error, 'Unable to complete exchange');
    if (patch.status === 'COMPLETED') {
      const partnerId = uid === Number(e.data.requester_id) ? Number(e.data.receiver_id) : Number(e.data.requester_id);
      await insforge.database.from('notifications').insert({
        user_id: partnerId,
        type: 'EXCHANGE_COMPLETED',
        title: 'Exchange completed',
        message: 'Both participants confirmed completion. You can now leave a review.',
        link: `/exchanges/${id}`,
      });
    } else {
      const partnerId = uid === Number(e.data.requester_id) ? Number(e.data.receiver_id) : Number(e.data.requester_id);
      await insforge.database.from('notifications').insert({
        user_id: partnerId,
        type: 'EXCHANGE_COMPLETION_CONFIRMED',
        title: 'Completion confirmed',
        message: `${me.full_name} confirmed completion of the exchange.`,
        link: `/exchanges/${id}`,
      });
    }
    return r.data;
  }

  async getNotifications() { const me = await this.appUser(); const r = await insforge.database.from('notifications').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(50); if (r.error) fail(r.error, 'Unable to load notifications'); return r.data || []; }
  async markNotificationRead(id: number) { const me = await this.appUser(); const r = await insforge.database.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', me.id).select('*').single(); if (r.error) fail(r.error, 'Unable to mark notification'); return r.data; }
  async markAllNotificationsRead() { const me = await this.appUser(); const r = await insforge.database.from('notifications').update({ is_read: true }).eq('user_id', me.id).eq('is_read', false); if (r.error) fail(r.error, 'Unable to update notifications'); return true; }

  async sendMessage(payload: any) { const me = await this.appUser(); const receiverId = Number(payload.receiver_id); const content = String(payload.content || '').trim(); const exchangeId = payload.exchange_id ? Number(payload.exchange_id) : null; if (!receiverId || receiverId === Number(me.id)) throw new Error('Choose a valid recipient.'); if (!content) throw new Error('Message cannot be empty.'); if (exchangeId) { const exchange = await insforge.database.from('exchanges').select('id,requester_id,receiver_id,status').eq('id', exchangeId).maybeSingle(); if (exchange.error || !exchange.data) fail(exchange.error, 'Exchange not found'); const participant = Number(exchange.data.requester_id) === Number(me.id) || Number(exchange.data.receiver_id) === Number(me.id); const partner = Number(exchange.data.requester_id) === receiverId || Number(exchange.data.receiver_id) === receiverId; if (!participant || !partner) throw new Error('You can only send exchange messages to a participant.'); if (['CANCELLED','REJECTED'].includes(String(exchange.data.status))) throw new Error('This exchange is no longer active.'); } const r = await insforge.database.from('messages').insert({ sender_id: me.id, receiver_id: receiverId, content, exchange_id: exchangeId }).select('*').single(); if (r.error) fail(r.error, 'Unable to send message'); await insforge.database.from('notifications').insert({ user_id: receiverId, type: 'MESSAGE', title: 'New message', message: `${me.full_name} sent you a message.`, link: `/messages/${me.id}` }); return r.data; }

  async getFeed(postType?: string) {
    const me = await this.appUser();
    let q: any = insforge.database.from('posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (postType) q = q.eq('post_type', postType);
    const r = await q;
    if (r.error) fail(r.error, 'Unable to load feed');
    return Promise.all((r.data || []).map(async (post: any) => {
      const [author, skill] = await Promise.all([
        insforge.database.from('users').select('id,full_name,avatar_url,headline,address_display,trust_score,reliability_score,verified,premium,featured_until').eq('id', post.author_id).maybeSingle(),
        post.skill_id ? insforge.database.from('skills').select('id,name,category,icon').eq('id', post.skill_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (author.error) fail(author.error, 'Unable to load post author');
      if (skill.error) fail(skill.error, 'Unable to load post skill');
      const a = author.data;
      return {
        ...post,
        author: a ? { ...a, verified: Boolean(a.verified), premium: Boolean(a.premium), featured: Boolean(a.featured_until && new Date(a.featured_until).getTime() > Date.now()) } : null,
        skill: skill.data || null,
        distance_display: Number(post.author_id) === Number(me.id) ? 'You' : undefined,
      };
    }));
  }

  async createPost(payload: any) {
    const me = await this.appUser();
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();
    const postType = String(payload.post_type || 'COMMUNITY').toUpperCase();
    const allowedTypes = ['OFFER', 'REQUEST', 'COMPLETED_EXCHANGE', 'COMMUNITY', 'RECOMMENDATION', 'WORKSHOP'];
    if (!allowedTypes.includes(postType)) throw new Error('Unsupported post type.');
    if (!title) throw new Error('Post title is required.');
    if (!content) throw new Error('Post content cannot be empty.');
    let skillId: number | null = null;
    if (payload.skill_name) {
      const skillName = String(payload.skill_name).trim();
      const existing = await insforge.database.from('skills').select('id').ilike('name', skillName).maybeSingle();
      if (existing.error) fail(existing.error, 'Unable to find skill');
      if (existing.data) skillId = Number(existing.data.id);
      else {
        const createdSkill = await insforge.database.from('skills').insert({ name: skillName, category: 'Other', icon: 'Sparkles', popularity: 0 }).select('id').single();
        if (createdSkill.error) fail(createdSkill.error, 'Unable to create skill');
        skillId = Number(createdSkill.data.id);
      }
    }
    const r = await insforge.database.from('posts').insert({ author_id: me.id, post_type: postType, title, content, skill_id: skillId, likes_count: 0 }).select('*').single();
    if (r.error) fail(r.error, 'Unable to publish post');
    return r.data;
  }

  async likePost(id: number) { const r = await insforge.database.from('posts').select('likes_count').eq('id', id).maybeSingle(); if (r.error || !r.data) fail(r.error, 'Post not found'); const u = await insforge.database.from('posts').update({ likes_count: Number(r.data.likes_count || 0) + 1 }).eq('id', id).select('likes_count').single(); if (u.error) fail(u.error, 'Unable to save like'); return u.data; }
}

export const functionalApi = new FunctionalApi();
