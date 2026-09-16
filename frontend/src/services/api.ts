import { insforge } from '../lib/insforge';

/**
 * SkillBarter API facade.
 * Production data access is direct from the browser to InsForge.
 */
class ApiClient {
  private getToken(): string | null { return localStorage.getItem('skillbarter_token'); }
  public setToken(token: string) { localStorage.setItem('skillbarter_token', token); }
  public clearToken() { localStorage.removeItem('skillbarter_token'); }

  private async request<T>(_endpoint: string, _options: RequestInit = {}): Promise<T> {
    throw new Error('This API endpoint has not yet been migrated to InsForge.');
  }

  private async getAppUser() {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user?.email) throw new Error('Not authenticated');
    const result = await insforge.database.from('users').select('*').eq('email', data.user.email).maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Unable to load application profile');
    if (!result.data) throw new Error('Application profile not found');
    return { authUser: data.user, appUser: result.data };
  }

  private async syncAppUser(authUser: any, profile: any = {}) {
    const email = authUser?.email ?? '';
    if (!email) throw new Error('Authenticated user has no email.');
    const existing = await insforge.database.from('users').select('*').eq('email', email).maybeSingle();
    if (existing.error) console.warn('App profile lookup warning:', existing.error);
    if (existing.data) {
      const updates = {
        full_name: profile.full_name ?? profile.nickname ?? authUser?.name ?? existing.data.full_name,
        avatar_url: profile.avatar_url ?? existing.data.avatar_url,
        bio: profile.bio ?? existing.data.bio,
        address_display: profile.address_display ?? existing.data.address_display,
        latitude: profile.latitude ?? existing.data.latitude,
        longitude: profile.longitude ?? existing.data.longitude,
        primary_intent: profile.primary_intent ?? existing.data.primary_intent ?? 'EXCHANGE',
        onboarding_completed: profile.onboarding_completed ?? existing.data.onboarding_completed,
      };
      const { data, error } = await insforge.database.from('users').update(updates).eq('id', existing.data.id).select('*').single();
      if (error) console.warn('App profile sync warning:', error);
      return data ?? existing.data;
    }
    const { data, error } = await insforge.database.from('users').insert({
      email,
      password_hash: 'insforge-managed',
      full_name: profile.full_name ?? profile.nickname ?? authUser?.name ?? email.split('@')[0],
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      address_display: profile.address_display,
      latitude: profile.latitude,
      longitude: profile.longitude,
      primary_intent: profile.primary_intent ?? 'EXCHANGE',
      onboarding_completed: profile.onboarding_completed ?? false,
      is_active: true,
    }).select('*').single();
    if (error) { console.warn('App profile creation warning:', error); return null; }
    return data;
  }

  private authUserToLegacyUser(authUser: any, appUser: any = null): any {
    const metadata = authUser?.profile ?? authUser?.metadata ?? {};
    return {
      id: Number(appUser?.id ?? metadata.legacy_id) || 0,
      email: authUser?.email ?? appUser?.email ?? '',
      full_name: appUser?.full_name ?? metadata.full_name ?? authUser?.name ?? metadata.nickname ?? '',
      avatar_url: appUser?.avatar_url ?? metadata.avatar_url,
      bio: appUser?.bio ?? metadata.bio,
      headline: appUser?.headline ?? metadata.headline,
      address_display: appUser?.address_display ?? metadata.address_display,
      latitude: appUser?.latitude ?? metadata.latitude,
      longitude: appUser?.longitude ?? metadata.longitude,
      exchange_radius_km: Number(appUser?.exchange_radius_km ?? metadata.exchange_radius_km ?? 10),
      location_visibility: appUser?.location_visibility ?? metadata.location_visibility ?? 'APPROXIMATE',
      availability: appUser?.availability ?? metadata.availability ?? 'Weekends & Evenings',
      primary_intent: appUser?.primary_intent ?? metadata.primary_intent ?? 'EXCHANGE',
      trust_score: Number(appUser?.trust_score ?? metadata.trust_score ?? 85),
      reliability_score: Number(appUser?.reliability_score ?? metadata.reliability_score ?? 90),
      response_rate: Number(appUser?.response_rate ?? metadata.response_rate ?? 95),
      skill_quality_score: Number(appUser?.skill_quality_score ?? metadata.skill_quality_score ?? 90),
      completed_exchanges_count: Number(appUser?.completed_exchanges_count ?? metadata.completed_exchanges_count ?? 0),
      reviews_count: Number(appUser?.reviews_count ?? metadata.reviews_count ?? 0),
      badges: Array.isArray(appUser?.badges) ? appUser.badges : (Array.isArray(metadata.badges) ? metadata.badges : ['Verified Member']),
      is_active: appUser?.is_active !== false && metadata.is_active !== false,
      is_admin: appUser?.is_admin === true || metadata.is_admin === true,
      onboarding_completed: appUser?.onboarding_completed !== false && metadata.onboarding_completed !== false,
      created_at: appUser?.created_at ?? authUser?.createdAt ?? new Date().toISOString(),
      skills: [],
    };
  }

  private async getUserSkills(userId: number) {
    const { data, error } = await insforge.database.from('user_skills').select('*, skills(*)').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load skills');
    return (data ?? []).map((row: any) => ({
      id: row.id, user_id: row.user_id, skill_id: row.skill_id,
      skill_name: row.skills?.name ?? 'Unknown', category: row.skills?.category ?? 'Other', icon: row.skills?.icon ?? 'Wrench',
      skill_type: row.skill_type, experience_level: row.experience_level, description: row.description, created_at: row.created_at,
    }));
  }

  // Auth - InsForge
  async login(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials');
    if (!data?.user) throw new Error('Login succeeded but no user was returned.');
    if (data.accessToken) this.setToken(data.accessToken);
    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    const user = this.authUserToLegacyUser(data.user, appUser);
    return { access_token: data.accessToken ?? '', user_id: user.id, email: user.email, full_name: user.full_name, is_admin: user.is_admin };
  }

  async register(payload: any) {
    const { data, error } = await insforge.auth.signUp({ email: payload.email, password: payload.password, name: payload.full_name });
    if (error) throw new Error(error.message || 'Registration failed');
    if (!data?.user) throw new Error('Registration succeeded but no user was returned.');
    const profile = {
      nickname: payload.full_name, bio: payload.bio, avatar_url: payload.avatar_url, full_name: payload.full_name,
      address_display: payload.address_display, latitude: payload.latitude, longitude: payload.longitude,
      primary_intent: payload.primary_intent ?? 'EXCHANGE', onboarding_completed: false,
    };
    const { error: profileError } = await insforge.auth.setProfile(profile as any);
    if (profileError) console.warn('InsForge profile update warning:', profileError);
    if (data.accessToken) this.setToken(data.accessToken);
    const appUser = await this.syncAppUser(data.user, profile);
    const user = this.authUserToLegacyUser(data.user, appUser);
    return { access_token: data.accessToken ?? '', user_id: user.id, email: user.email, full_name: user.full_name, is_admin: false };
  }

  async demoSwitch(_userId: number) { throw new Error('Demo switching is not available until demo accounts are migrated to InsForge Auth.'); }

  async getMe() {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user) throw new Error('Not authenticated');
    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    const user = this.authUserToLegacyUser(data.user, appUser);
    user.skills = await this.getUserSkills(user.id);
    return user;
  }

  async updateMe(payload: any) {
    const { data, error } = await insforge.auth.setProfile(payload);
    if (error) throw new Error(error.message || 'Unable to update profile');
    const authUser = data?.user ?? (await insforge.auth.getCurrentUser()).data?.user;
    if (authUser) await this.syncAppUser(authUser, payload);
    return data;
  }

  async logout() {
    const { error } = await insforge.auth.signOut();
    this.clearToken();
    if (error) throw new Error(error.message || 'Logout failed');
  }

  // Skills + profiles - InsForge
  async getSkills(category?: string) {
    let query: any = insforge.database.from('skills').select('*').order('popularity', { ascending: false }).order('name', { ascending: true });
    if (category && category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load skills');
    return data ?? [];
  }

  async searchSkills(q: string) {
    let query: any = insforge.database.from('skills').select('*').limit(20);
    if (q?.trim()) query = query.ilike('name', `%${q.trim()}%`);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to search skills');
    return data ?? [];
  }

  async addUserSkill(payload: any) {
    const { appUser } = await this.getAppUser();
    const skillName = String(payload.skill_name ?? '').trim();
    if (!skillName) throw new Error('Skill name is required');
    const skillType = String(payload.skill_type ?? 'OFFERED').toUpperCase();
    let { data: skill, error } = await insforge.database.from('skills').select('*').ilike('name', skillName).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to find skill');
    if (!skill) {
      const created = await insforge.database.from('skills').insert({ name: skillName, category: payload.category ?? 'Other', icon: payload.icon ?? 'Sparkles', description: payload.description, popularity: 0 }).select('*').single();
      if (created.error) throw new Error(created.error.message || 'Unable to create skill');
      skill = created.data;
    }
    const existing = await insforge.database.from('user_skills').select('*').eq('user_id', appUser.id).eq('skill_id', skill.id).eq('skill_type', skillType).maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check skill');
    if (existing.data) {
      const updated = await insforge.database.from('user_skills').update({ experience_level: payload.experience_level ?? existing.data.experience_level, description: payload.description ?? existing.data.description }).eq('id', existing.data.id).select('*').single();
      if (updated.error) throw new Error(updated.error.message || 'Unable to update skill');
      return { ...updated.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
    }
    const createdMapping = await insforge.database.from('user_skills').insert({ user_id: appUser.id, skill_id: skill.id, skill_type: skillType, experience_level: payload.experience_level ?? 'Intermediate', description: payload.description }).select('*').single();
    if (createdMapping.error) throw new Error(createdMapping.error.message || 'Unable to add skill');
    await insforge.database.from('skills').update({ popularity: Number(skill.popularity ?? 0) + 1 }).eq('id', skill.id);
    return { ...createdMapping.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
  }

  async deleteUserSkill(userSkillId: number) {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('user_skills').delete().eq('id', userSkillId).eq('user_id', appUser.id).select('*');
    if (error) throw new Error(error.message || 'Unable to remove skill');
    return { message: 'Skill removed successfully', data };
  }

  async getUserProfile(userId: number) {
    const { data, error } = await insforge.database.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to load user profile');
    if (!data) throw new Error('User not found');
    const skills = await this.getUserSkills(userId);
    return { ...data, skills, skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), skills_detail: skills };
  }

  async getNearbyUsers(radiusKm = 10) {
    const { appUser } = await this.getAppUser();
    const centerLat = Number(appUser.latitude ?? 17.4485);
    const centerLon = Number(appUser.longitude ?? 78.3748);
    const { data, error } = await insforge.database.from('users').select('*').eq('is_active', true).limit(100);
    if (error) throw new Error(error.message || 'Unable to load nearby users');
    const distance = (lat: number, lon: number) => {
      const toRad = (v: number) => v * Math.PI / 180;
      const dLat = toRad(lat - centerLat), dLon = toRad(lon - centerLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(centerLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const results: any[] = [];
    for (const user of data ?? []) {
      if (Number(user.id) === Number(appUser.id) || user.latitude == null || user.longitude == null) continue;
      const dist = distance(Number(user.latitude), Number(user.longitude));
      if (dist > radiusKm) continue;
      const skills = await this.getUserSkills(Number(user.id));
      results.push({ id: user.id, full_name: user.full_name, avatar_url: user.avatar_url, headline: user.headline, address_display: user.address_display, distance_km: dist, distance_display: `${dist.toFixed(1)} km`, trust_score: user.trust_score, reliability_score: user.reliability_score, completed_exchanges_count: user.completed_exchanges_count, badges: user.badges ?? [], skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), availability: user.availability });
    }
    return results.sort((a, b) => a.distance_km - b.distance_km);
  }

  // Matches - InsForge. Mirrors the original reciprocal/one-way scoring model.
  async getMatches() {
    const { appUser } = await this.getAppUser();
    const mySkills = await this.getUserSkills(Number(appUser.id));
    const myOffered = mySkills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => String(s.skill_name).toLowerCase());
    const myNeeded = mySkills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => String(s.skill_name).toLowerCase());
    if (!myOffered.length && !myNeeded.length) return [];

    const blocked = await insforge.database.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${appUser.id},blocked_id.eq.${appUser.id}`);
    const excluded = new Set<number>([Number(appUser.id)]);
    for (const b of blocked.data ?? []) {
      excluded.add(Number(b.blocker_id));
      excluded.add(Number(b.blocked_id));
    }

    const users = await insforge.database.from('users').select('*').eq('is_active', true).limit(100);
    if (users.error) throw new Error(users.error.message || 'Unable to load members');
    const distFn = (aLat: number, aLon: number, bLat: number, bLon: number) => {
      const toRad = (v: number) => v * Math.PI / 180;
      const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const myLat = Number(appUser.latitude ?? 17.4485), myLon = Number(appUser.longitude ?? 78.3748);
    const results: any[] = [];
    for (const candidate of users.data ?? []) {
      const cid = Number(candidate.id);
      if (excluded.has(cid) || candidate.latitude == null || candidate.longitude == null) continue;
      const skills = await this.getUserSkills(cid);
      const theirOffered = skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => String(s.skill_name).toLowerCase());
      const theirNeeded = skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => String(s.skill_name).toLowerCase());
      const youOfferTheyNeed = myOffered.filter((s: string) => theirNeeded.includes(s));
      const theyOfferYouNeed = theirOffered.filter((s: string) => myNeeded.includes(s));
      const reciprocal = youOfferTheyNeed.length > 0 && theyOfferYouNeed.length > 0;
      if (!youOfferTheyNeed.length && !theyOfferYouNeed.length) continue;
      const distance = distFn(myLat, myLon, Number(candidate.latitude), Number(candidate.longitude));
      const maxRadius = Math.max(Number(appUser.exchange_radius_km ?? 10), Number(candidate.exchange_radius_km ?? 10), 1);
      const proximityFactor = distance > maxRadius ? Math.max(0, 1 - distance / (maxRadius * 1.5)) : Math.max(0, 1 - distance / maxRadius);
      const skillScore = reciprocal ? 50 : 25;
      const trust = Math.min(Math.max(Number(candidate.trust_score ?? 80), 0), 100) / 100 * 20;
      const myAvail = String(appUser.availability ?? 'flexible').toLowerCase(), theirAvail = String(candidate.availability ?? 'flexible').toLowerCase();
      const availability = myAvail.includes('flexible') || theirAvail.includes('flexible') || myAvail === theirAvail ? 10 : (myAvail.split(/\s+/).some((w: string) => theirAvail.includes(w)) ? 7 : 4);
      const score = Math.min(Math.max(Math.round(skillScore + proximityFactor * 20 + trust + availability), 10), 99);
      const reasons: string[] = [];
      if (reciprocal) reasons.push(`Direct 2-way barter match: You can trade '${youOfferTheyNeed[0]}' for '${theyOfferYouNeed[0]}'`);
      else if (theyOfferYouNeed.length) reasons.push(`They offer '${theyOfferYouNeed[0]}' which you need`);
      else reasons.push(`You offer '${youOfferTheyNeed[0]}' which they need`);
      if (distance <= 3) reasons.push(`Hyperlocal neighbor (${distance.toFixed(1)} km)`);
      else if (distance <= maxRadius) reasons.push(`Within your ${maxRadius.toFixed(0)} km exchange zone (${distance.toFixed(1)} km)`);
      else reasons.push(`${distance.toFixed(1)} km`);
      if (Number(candidate.trust_score ?? 80) >= 90) reasons.push(`High community trust score (${Math.round(Number(candidate.trust_score))}/100)`);
      else if (Number(candidate.trust_score ?? 80) >= 80) reasons.push(`Good community standing (${Math.round(Number(candidate.trust_score))}/100)`);
      if (availability >= 7) reasons.push(`Compatible availability (${candidate.availability ?? 'Flexible'})`);
      results.push({
        candidate: { id: candidate.id, full_name: candidate.full_name, avatar_url: candidate.avatar_url, headline: candidate.headline, address_display: candidate.address_display, trust_score: candidate.trust_score, reliability_score: candidate.reliability_score, completed_exchanges_count: candidate.completed_exchanges_count, badges: candidate.badges ?? [] },
        match_score: score, distance_km: distance, distance_display: `${distance.toFixed(1)} km`, is_reciprocal: reciprocal,
        they_offer: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name),
        they_need: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name),
        matched_you_offer: youOfferTheyNeed, matched_they_offer: theyOfferYouNeed, reasons,
        score_breakdown: { skill_compatibility: Math.round(skillScore), location_proximity: Math.round(proximityFactor * 20), trust: Math.round(trust), availability: Math.round(availability) },
      });
    }
    return results.sort((a, b) => b.match_score - a.match_score || a.distance_km - b.distance_km).slice(0, 20);
  }

  // Exchange helpers
  private async getExchangeRow(id: number) {
    const { data, error } = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to load exchange');
    if (!data) throw new Error('Exchange not found');
    return data;
  }

  private async serializeExchange(exchange: any, currentUserId: number) {
    const requesterResult = await insforge.database.from('users').select('*').eq('id', exchange.requester_id).maybeSingle();
    const receiverResult = await insforge.database.from('users').select('*').eq('id', exchange.receiver_id).maybeSingle();
    const requesterSkill = exchange.requester_skill_id ? await insforge.database.from('skills').select('*').eq('id', exchange.requester_skill_id).maybeSingle() : { data: null, error: null };
    const receiverSkill = exchange.receiver_skill_id ? await insforge.database.from('skills').select('*').eq('id', exchange.receiver_skill_id).maybeSingle() : { data: null, error: null };
    const review = await insforge.database.from('reviews').select('id').eq('exchange_id', exchange.id).eq('reviewer_id', currentUserId).maybeSingle();
    if (requesterResult.error) throw new Error(requesterResult.error.message);
    if (receiverResult.error) throw new Error(receiverResult.error.message);
    if (review.error) throw new Error(review.error.message);
    const reqUser = requesterResult.data, recUser = receiverResult.data;
    return {
      ...exchange,
      requester_skill_name: requesterSkill.data?.name ?? 'Custom Skill', receiver_skill_name: receiverSkill.data?.name ?? 'Custom Skill',
      estimated_hours: exchange.estimated_hours ?? 2,
      requester: reqUser ? { id: reqUser.id, full_name: reqUser.full_name, avatar_url: reqUser.avatar_url, headline: reqUser.headline, trust_score: reqUser.trust_score, address_display: reqUser.address_display } : { id: 0, full_name: 'User', trust_score: 80 },
      receiver: recUser ? { id: recUser.id, full_name: recUser.full_name, avatar_url: recUser.avatar_url, headline: recUser.headline, trust_score: recUser.trust_score, address_display: recUser.address_display } : { id: 0, full_name: 'User', trust_score: 80 },
      requester_skill: requesterSkill.data, receiver_skill: receiverSkill.data,
      user_can_review: exchange.status === 'COMPLETED' && !review.data, has_reviewed: !!review.data,
    };
  }

  private async notify(userId: number, type: string, title: string, message: string, link: string) {
    const { error } = await insforge.database.from('notifications').insert({ user_id: userId, type, title, message, link });
    if (error) console.warn('Notification write warning:', error);
  }

  // Exchanges - InsForge
  async getExchangeDetails(id: number) {
    const { appUser } = await this.getAppUser();
    const exchange = await this.getExchangeRow(id);
    if (Number(appUser.id) !== Number(exchange.requester_id) && Number(appUser.id) !== Number(exchange.receiver_id) && appUser.is_admin !== true) throw new Error('Access denied to this exchange');
    return this.serializeExchange(exchange, Number(appUser.id));
  }

  async getExchanges(status?: string) {
    const { appUser } = await this.getAppUser();
    let query: any = insforge.database.from('exchanges').select('*').or(`requester_id.eq.${appUser.id},receiver_id.eq.${appUser.id}`).order('created_at', { ascending: false });
    if (status && status !== 'ALL') query = query.eq('status', status.toUpperCase());
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load exchanges');
    return Promise.all((data ?? []).map((e: any) => this.serializeExchange(e, Number(appUser.id))));
  }

  async proposeExchange(payload: any) {
    const { appUser } = await this.getAppUser();
    const receiverId = Number(payload.receiver_id);
    if (!receiverId || receiverId === Number(appUser.id)) throw new Error('Cannot propose a skill exchange with yourself');
    const receiver = await insforge.database.from('users').select('*').eq('id', receiverId).eq('is_active', true).maybeSingle();
    if (receiver.error) throw new Error(receiver.error.message);
    if (!receiver.data) throw new Error('Partner user not found');
    const resolveSkill = async (id: any, name: any) => {
      if (id) return Number(id);
      if (!name) return null;
      const found = await insforge.database.from('skills').select('*').ilike('name', String(name).trim()).maybeSingle();
      if (found.error) throw new Error(found.error.message);
      if (found.data) return found.data.id;
      const created = await insforge.database.from('skills').insert({ name: String(name).trim(), category: 'Other', icon: 'Sparkles', popularity: 0 }).select('*').single();
      if (created.error) throw new Error(created.error.message);
      return created.data.id;
    };
    const requesterSkillId = await resolveSkill(payload.requester_skill_id, payload.requester_skill_name);
    const receiverSkillId = await resolveSkill(payload.receiver_skill_id, payload.receiver_skill_name);
    const created = await insforge.database.from('exchanges').insert({
      requester_id: Number(appUser.id), receiver_id: receiverId, requester_skill_id: requesterSkillId, receiver_skill_id: receiverSkillId,
      status: 'PENDING', proposal_message: payload.proposal_message, preferred_date: payload.preferred_date ?? 'This week',
      estimated_hours: payload.estimated_hours ?? 2, location_area: payload.location_area ?? 'Local neighborhood', requester_completed: false, receiver_completed: false,
    }).select('*').single();
    if (created.error) throw new Error(created.error.message || 'Unable to create exchange');
    await this.notify(receiverId, 'EXCHANGE_REQUEST', 'New Skill Barter Proposal', `${appUser.full_name} proposed an exchange: ${String(created.data.proposal_message ?? '').slice(0, 60)}...`, `/exchanges/${created.data.id}`);
    return this.serializeExchange(created.data, Number(appUser.id));
  }

  async acceptExchange(id: number) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id);
    if (!['PENDING', 'COUNTERED'].includes(e.status)) throw new Error(`Cannot accept exchange in status ${e.status}`);
    if (e.status === 'PENDING' && Number(appUser.id) !== Number(e.receiver_id)) throw new Error('Only the recipient can accept this proposal');
    if (e.status === 'COUNTERED' && Number(appUser.id) !== Number(e.requester_id)) throw new Error('Only the proposer can accept this counter-proposal');
    const updated = await insforge.database.from('exchanges').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    const partnerId = Number(appUser.id) === Number(e.receiver_id) ? Number(e.requester_id) : Number(e.receiver_id);
    await this.notify(partnerId, 'EXCHANGE_ACCEPTED', 'Exchange Proposal Accepted! 🎉', `${appUser.full_name} accepted the skill barter. Your exchange is now ACTIVE.`, `/exchanges/${id}`);
    return this.serializeExchange(updated.data, Number(appUser.id));
  }

  async counterExchange(id: number, payload: any) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id);
    if (!['PENDING', 'COUNTERED'].includes(e.status)) throw new Error('Cannot counter exchange in current status');
    if (Number(appUser.id) !== Number(e.requester_id) && Number(appUser.id) !== Number(e.receiver_id)) throw new Error('Not authorized');
    const patch: any = { status: 'COUNTERED', counter_message: payload.counter_message, updated_at: new Date().toISOString() };
    if (payload.preferred_date) patch.preferred_date = payload.preferred_date;
    if (payload.estimated_hours) patch.estimated_hours = payload.estimated_hours;
    if (payload.location_area) patch.location_area = payload.location_area;
    const updated = await insforge.database.from('exchanges').update(patch).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    const partnerId = Number(appUser.id) === Number(e.receiver_id) ? Number(e.requester_id) : Number(e.receiver_id);
    await this.notify(partnerId, 'EXCHANGE_COUNTERED', 'Exchange Proposal Counter-Offered', `${appUser.full_name} suggested changes: '${payload.counter_message}'`, `/exchanges/${id}`);
    return this.serializeExchange(updated.data, Number(appUser.id));
  }

  async rejectExchange(id: number) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id);
    if (!['PENDING', 'COUNTERED'].includes(e.status)) throw new Error('Cannot reject exchange in current status');
    if (Number(appUser.id) !== Number(e.requester_id) && Number(appUser.id) !== Number(e.receiver_id)) throw new Error('Not authorized');
    const updated = await insforge.database.from('exchanges').update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    const partnerId = Number(appUser.id) === Number(e.receiver_id) ? Number(e.requester_id) : Number(e.receiver_id);
    await this.notify(partnerId, 'EXCHANGE_REJECTED', 'Exchange Declined', `${appUser.full_name} declined the barter proposal.`, `/exchanges/${id}`);
    return this.serializeExchange(updated.data, Number(appUser.id));
  }

  async startExchange(id: number) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id);
    if (e.status !== 'ACCEPTED') throw new Error('Only accepted exchanges can be moved to active');
    if (Number(appUser.id) !== Number(e.requester_id) && Number(appUser.id) !== Number(e.receiver_id)) throw new Error('Not authorized');
    const updated = await insforge.database.from('exchanges').update({ status: 'ACTIVE', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    return this.serializeExchange(updated.data, Number(appUser.id));
  }

  async completeExchange(id: number) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id);
    if (e.status !== 'ACTIVE') throw new Error(`Cannot complete an exchange in status '${e.status}'`);
    const uid = Number(appUser.id);
    if (uid !== Number(e.requester_id) && uid !== Number(e.receiver_id)) throw new Error('Not authorized');
    const patch: any = uid === Number(e.requester_id) ? { requester_completed: true } : { receiver_completed: true };
    const both = uid === Number(e.requester_id) ? Boolean(e.receiver_completed) : Boolean(e.requester_completed);
    if (both) patch.status = 'COMPLETED';
    patch.updated_at = new Date().toISOString();
    const updated = await insforge.database.from('exchanges').update(patch).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    const partnerId = uid === Number(e.requester_id) ? Number(e.receiver_id) : Number(e.requester_id);
    if (patch.status === 'COMPLETED') {
      await this.notify(uid, 'EXCHANGE_COMPLETED', 'Skill Barter Completed! 🏆', 'Both parties have confirmed completion. Please leave a review to build community trust.', `/exchanges/${id}`);
      await this.notify(partnerId, 'EXCHANGE_COMPLETED', 'Skill Barter Completed! 🏆', 'Both parties have confirmed completion. Please leave a review to build community trust.', `/exchanges/${id}`);
    } else {
      await this.notify(partnerId, 'EXCHANGE_PENDING_CONFIRMATION', 'Completion Confirmed by Partner', `${appUser.full_name} confirmed completion. Please mark complete on your end as well.`, `/exchanges/${id}`);
    }
    return this.serializeExchange(updated.data, uid);
  }

  async cancelExchange(id: number, reason: string) {
    const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id); const uid = Number(appUser.id);
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(e.status)) throw new Error(`Cannot cancel exchange in status '${e.status}'`);
    if (uid !== Number(e.requester_id) && uid !== Number(e.receiver_id)) throw new Error('Not authorized');
    const updated = await insforge.database.from('exchanges').update({ status: 'CANCELLED', cancellation_reason: reason, cancelled_by_id: uid, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    const partnerId = uid === Number(e.requester_id) ? Number(e.receiver_id) : Number(e.requester_id);
    await this.notify(partnerId, 'EXCHANGE_CANCELLED', 'Exchange Cancelled', `${appUser.full_name} cancelled the barter: '${reason}'`, `/exchanges/${id}`);
    return this.serializeExchange(updated.data, uid);
  }

  // Messaging - InsForge
  async getConversations() {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('messages').select('*').or(`sender_id.eq.${appUser.id},receiver_id.eq.${appUser.id}`).order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(error.message || 'Unable to load conversations');
    const latest = new Map<number, any>();
    for (const message of data ?? []) {
      const partnerId = Number(message.sender_id) === Number(appUser.id) ? Number(message.receiver_id) : Number(message.sender_id);
      if (!latest.has(partnerId)) latest.set(partnerId, message);
    }
    const ids = [...latest.keys()];
    const profiles = new Map<number, any>();
    await Promise.all(ids.map(async (id) => {
      const r = await insforge.database.from('users').select('id,full_name,avatar_url,headline').eq('id', id).maybeSingle();
      if (r.data) profiles.set(id, r.data);
    }));
    return [...latest.entries()].map(([partner_id, last_message]) => ({ partner_id, partner: profiles.get(partner_id) ?? { id: partner_id, full_name: 'Member' }, last_message }));
  }

  async getMessages(partnerId: number) {
    const { appUser } = await this.getAppUser();
    const pid = Number(partnerId);
    if (!pid || pid === Number(appUser.id)) return [];
    const r = await insforge.database.from('messages').select('*').or(`and(sender_id.eq.${appUser.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${appUser.id})`).order('created_at', { ascending: true }).limit(300);
    if (r.error) throw new Error(r.error.message || 'Unable to load messages');
    return r.data ?? [];
  }

  async sendMessage(payload: any) {
    const { appUser } = await this.getAppUser();
    const receiverId = Number(payload.receiver_id);
    const content = String(payload.content ?? '').trim();
    if (!receiverId || receiverId === Number(appUser.id)) throw new Error('Choose another member.');
    if (!content) throw new Error('Message cannot be empty.');
    const partner = await insforge.database.from('users').select('id,is_active').eq('id', receiverId).maybeSingle();
    if (partner.error) throw new Error(partner.error.message || 'Unable to find recipient');
    if (!partner.data || partner.data.is_active === false) throw new Error('Recipient is unavailable.');
    const r = await insforge.database.from('messages').insert({ sender_id: appUser.id, receiver_id: receiverId, content, exchange_id: payload.exchange_id ?? null }).select('*').single();
    if (r.error) throw new Error(r.error.message || 'Unable to send message');
    await this.notify(receiverId, 'MESSAGE', 'New message', `${appUser.full_name} sent you a message.`, `/messages/${appUser.id}`);
    return r.data;
  }

  // Notifications - InsForge
  async getNotifications() {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('notifications').select('*').eq('user_id', appUser.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message || 'Unable to load notifications');
    return data ?? [];
  }

  async getUnreadNotificationCount() {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', appUser.id).eq('is_read', false);
    if (r.error) throw new Error(r.error.message || 'Unable to load notification count');
    return { count: Number((r as any).count ?? 0) };
  }

  async markNotificationRead(id: number) {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', appUser.id).select('*').single();
    if (r.error) throw new Error(r.error.message || 'Unable to mark notification');
    return r.data;
  }

  async markAllNotificationsRead() {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('notifications').update({ is_read: true }).eq('user_id', appUser.id).eq('is_read', false);
    if (r.error) throw new Error(r.error.message || 'Unable to update notifications');
    return true;
  }

  // Connections - InsForge
  async getConnections() {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('connections').select('*').or(`user_id.eq.${appUser.id},connected_user_id.eq.${appUser.id}`).order('created_at', { ascending: false });
    if (r.error) throw new Error(r.error.message || 'Unable to load connections');
    const rows = r.data ?? [];
    const partnerIds = rows.map((row: any) => Number(row.user_id) === Number(appUser.id) ? Number(row.connected_user_id) : Number(row.user_id));
    const uniqueIds = [...new Set(partnerIds)];
    const profiles = new Map<number, any>();
    await Promise.all(uniqueIds.map(async (id) => {
      const p = await insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,reliability_score').eq('id', id).maybeSingle();
      if (p.data) profiles.set(id, p.data);
    }));
    return rows.map((row: any) => ({ ...row, partner_id: Number(row.user_id) === Number(appUser.id) ? Number(row.connected_user_id) : Number(row.user_id), partner: profiles.get(Number(row.user_id) === Number(appUser.id) ? Number(row.connected_user_id) : Number(row.user_id)) }));
  }

  async getConnectionStatus(userId: number) {
    const { appUser } = await this.getAppUser();
    const target = Number(userId);
    if (!target || target === Number(appUser.id)) return { connected: false, connection: null };
    const a = await insforge.database.from('connections').select('*').eq('user_id', appUser.id).eq('connected_user_id', target).maybeSingle();
    if (a.error) throw new Error(a.error.message || 'Unable to check connection');
    const b = await insforge.database.from('connections').select('*').eq('user_id', target).eq('connected_user_id', appUser.id).maybeSingle();
    if (b.error) throw new Error(b.error.message || 'Unable to check connection');
    return { connected: Boolean(a.data || b.data), connection: a.data ?? b.data ?? null };
  }

  async connectNeighbor(userId: number) {
    const { appUser } = await this.getAppUser();
    const target = Number(userId);
    if (!target || target === Number(appUser.id)) throw new Error('You cannot connect to yourself.');
    const current = await this.getConnectionStatus(target);
    if (current.connected) return current.connection;
    const targetUser = await insforge.database.from('users').select('id,is_active,full_name').eq('id', target).maybeSingle();
    if (targetUser.error) throw new Error(targetUser.error.message || 'Unable to find member');
    if (!targetUser.data || targetUser.data.is_active === false) throw new Error('Member is unavailable.');
    const created = await insforge.database.from('connections').insert({ user_id: appUser.id, connected_user_id: target, status: 'ACCEPTED' }).select('*').single();
    if (created.error) throw new Error(created.error.message || 'Unable to create connection');
    await this.notify(target, 'CONNECTION', 'New SkillBarter connection', `${appUser.full_name} connected with you.`, `/profile/${appUser.id}`);
    return created.data;
  }

  async disconnectNeighbor(userId: number) {
    const { appUser } = await this.getAppUser();
    const target = Number(userId);
    const a = await insforge.database.from('connections').delete().eq('user_id', appUser.id).eq('connected_user_id', target);
    const b = await insforge.database.from('connections').delete().eq('user_id', target).eq('connected_user_id', appUser.id);
    if (a.error && b.error) throw new Error(a.error.message || b.error?.message || 'Unable to remove connection');
    return true;
  }

  async getConnectionSuggestions() { return this.getNearbyUsers(100); }

  // Community feed - InsForge
  async getFeed(postType?: string) {
    let query: any = insforge.database.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
    if (postType && postType !== 'ALL') query = query.eq('post_type', postType);
    const r = await query;
    if (r.error) throw new Error(r.error.message || 'Unable to load feed');
    const posts = r.data ?? [];
    const authorIds = [...new Set(posts.map((p: any) => Number(p.author_id)).filter(Boolean))];
    const authors = new Map<number, any>();
    await Promise.all(authorIds.map(async (id) => {
      const a = await insforge.database.from('users').select('id,full_name,avatar_url,headline').eq('id', id).maybeSingle();
      if (a.data) authors.set(id, a.data);
    }));
    return posts.map((p: any) => ({ ...p, author: authors.get(Number(p.author_id)) }));
  }

  async createPost(payload: any) {
    const { appUser } = await this.getAppUser();
    const title = String(payload.title ?? '').trim();
    const content = String(payload.content ?? '').trim();
    if (!title || !content) throw new Error('Title and content are required.');
    const r = await insforge.database.from('posts').insert({ author_id: appUser.id, post_type: payload.post_type ?? 'COMMUNITY', title, content, likes_count: 0 }).select('*').single();
    if (r.error) throw new Error(r.error.message || 'Unable to publish post');
    return r.data;
  }

  async likePost(postId: number) {
    const { appUser } = await this.getAppUser();
    const id = Number(postId);
    if (!id) throw new Error('Invalid post.');
    const existing = await insforge.database.from('post_likes').select('*').eq('post_id', id).eq('user_id', appUser.id).maybeSingle();
    if (!existing.error && existing.data) return { liked: true, likes_count: undefined };
    if (existing.error && !String(existing.error.message || '').toLowerCase().includes('post_likes')) throw new Error(existing.error.message);
    const created = await insforge.database.from('post_likes').insert({ post_id: id, user_id: appUser.id }).select('*').maybeSingle();
    if (!created.error) {
      const p = await insforge.database.from('posts').select('likes_count').eq('id', id).maybeSingle();
      if (!p.error && p.data) {
        const updated = await insforge.database.from('posts').update({ likes_count: Number(p.data.likes_count ?? 0) + 1 }).eq('id', id).select('likes_count').single();
        if (!updated.error) return { liked: true, likes_count: Number(updated.data.likes_count ?? 0) };
      }
      return { liked: true, likes_count: undefined };
    }
    // Backward-compatible fallback for deployments that do not have post_likes yet.
    const p = await insforge.database.from('posts').select('likes_count').eq('id', id).maybeSingle();
    if (p.error || !p.data) throw new Error(p.error?.message || 'Post not found');
    const updated = await insforge.database.from('posts').update({ likes_count: Number(p.data.likes_count ?? 0) + 1 }).eq('id', id).select('likes_count').single();
    if (updated.error) throw new Error(updated.error.message || 'Unable to save like');
    return { liked: true, likes_count: Number(updated.data.likes_count ?? 0) };
  }

  async getCommunityStats() {
    const [posts, connections, exchanges] = await Promise.all([
      insforge.database.from('posts').select('id', { count: 'exact', head: true }),
      insforge.database.from('connections').select('id', { count: 'exact', head: true }),
      insforge.database.from('exchanges').select('id', { count: 'exact', head: true }),
    ]);
    return { posts: Number((posts as any).count ?? 0), connections: Number((connections as any).count ?? 0), exchanges: Number((exchanges as any).count ?? 0) };
  }

  // Search + safety
  async search(q: string, category?: string, minTrust?: number) {
    const rows = await this.getNearbyUsers(100);
    const text = String(q ?? '').trim().toLowerCase();
    return rows.filter((u: any) => {
      const hay = [u.full_name, u.headline, u.address_display, ...(u.skills_offered ?? []), ...(u.skills_needed ?? [])].join(' ').toLowerCase();
      const categoryOk = !category || category === 'All' || [...(u.skills_offered ?? []), ...(u.skills_needed ?? [])].some((s: string) => s.toLowerCase().includes(category.toLowerCase()));
      const trustOk = minTrust == null || Number(u.trust_score ?? 0) >= Number(minTrust);
      return (!text || hay.includes(text)) && categoryOk && trustOk;
    });
  }

  async createReport(payload: any) {
    const { appUser } = await this.getAppUser();
    const targetId = Number(payload.reported_user_id ?? payload.user_id);
    const reason = String(payload.reason ?? '').trim();
    if (!targetId || !reason) throw new Error('Reported user and reason are required.');
    const r = await insforge.database.from('reports').insert({ reporter_id: appUser.id, reported_user_id: targetId, reason, details: payload.details ?? null, status: 'OPEN' }).select('*').single();
    if (r.error) throw new Error(r.error.message || 'Unable to submit report');
    return r.data;
  }

  async blockUser(userId: number) {
    const { appUser } = await this.getAppUser();
    const target = Number(userId);
    if (!target || target === Number(appUser.id)) throw new Error('Invalid member.');
    const existing = await insforge.database.from('blocks').select('*').eq('blocker_id', appUser.id).eq('blocked_id', target).maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check block');
    if (existing.data) return existing.data;
    const r = await insforge.database.from('blocks').insert({ blocker_id: appUser.id, blocked_id: target }).select('*').single();
    if (r.error) throw new Error(r.error.message || 'Unable to block member');
    await this.disconnectNeighbor(target);
    return r.data;
  }

  async unblockUser(userId: number) {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('blocks').delete().eq('blocker_id', appUser.id).eq('blocked_id', Number(userId));
    if (r.error) throw new Error(r.error.message || 'Unable to unblock member');
    return true;
  }

  async getBlocks() {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('blocks').select('*').eq('blocker_id', appUser.id).order('created_at', { ascending: false });
    if (r.error) throw new Error(r.error.message || 'Unable to load blocked members');
    return r.data ?? [];
  }

  // Remaining admin endpoints intentionally retain migration guards.
  async getUserReviews(_userId: number) { return this.request<any[]>('/reviews'); }
  async submitReview(_payload: any) { return this.request<any>('/reviews'); }
  async getTrustDetails(_userId: number) { return this.request<any>('/trust'); }
  async getAdminStats() { return this.request<any>('/admin/stats'); }
  async getAdminUsers() { return this.request<any[]>('/admin/users'); }
  async toggleAdminUserActive(_userId: number) { return this.request<any>('/admin/users'); }
  async getAdminReports(_status?: string) { return this.request<any[]>('/admin/reports'); }
  async resolveAdminReport(_reportId: number, _status: 'RESOLVED' | 'DISMISSED', _adminNote?: string) { return this.request<any>('/admin/reports'); }
  async getAdminExchanges() { return this.request<any[]>('/admin/exchanges'); }
}

export const api = new ApiClient();
