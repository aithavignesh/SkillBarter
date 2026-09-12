import { insforge } from '../lib/insforge';

/**
 * SkillBarter API facade.
 *
 * Authentication and the first application data features run directly against
 * InsForge. The legacy FastAPI transport is intentionally disabled so
 * production can never fall back to Render/localhost.
 */
class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('skillbarter_token');
  }

  public setToken(token: string) {
    localStorage.setItem('skillbarter_token', token);
  }

  public clearToken() {
    localStorage.removeItem('skillbarter_token');
  }

  private async request<T>(_endpoint: string, _options: RequestInit = {}): Promise<T> {
    throw new Error('This API endpoint has not yet been migrated to InsForge.');
  }

  /** Resolve the existing integer application-profile row by authenticated email. */
  private async getAppUser() {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user?.email) throw new Error('Not authenticated');

    const result = await insforge.database
      .from('users')
      .select('*')
      .eq('email', data.user.email)
      .maybeSingle();

    if (result.error) throw new Error(result.error.message || 'Unable to load application profile');
    if (!result.data) throw new Error('Application profile not found');
    return { authUser: data.user, appUser: result.data };
  }

  /**
   * The original application tables use an integer users.id while InsForge
   * Auth uses its own string user id. Keep those layers connected by email.
   */
  private async syncAppUser(authUser: any, profile: any = {}) {
    const email = authUser?.email ?? '';
    if (!email) throw new Error('Authenticated user has no email.');

    const existing = await insforge.database
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

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
      const { data, error } = await insforge.database
        .from('users').update(updates).eq('id', existing.data.id).select('*').single();
      if (error) console.warn('App profile sync warning:', error);
      return data ?? existing.data;
    }

    const { data, error } = await insforge.database
      .from('users')
      .insert({
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
      })
      .select('*').single();

    if (error) {
      console.warn('App profile creation warning:', error);
      return null;
    }
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
    const { data, error } = await insforge.database
      .from('user_skills')
      .select('*, skills(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load skills');
    return (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      skill_id: row.skill_id,
      skill_name: row.skills?.name ?? 'Unknown',
      category: row.skills?.category ?? 'Other',
      icon: row.skills?.icon ?? 'Wrench',
      skill_type: row.skill_type,
      experience_level: row.experience_level,
      description: row.description,
      created_at: row.created_at,
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
      nickname: payload.full_name, bio: payload.bio, avatar_url: payload.avatar_url,
      full_name: payload.full_name, address_display: payload.address_display,
      latitude: payload.latitude, longitude: payload.longitude,
      primary_intent: payload.primary_intent ?? 'EXCHANGE', onboarding_completed: false,
    };
    const { error: profileError } = await insforge.auth.setProfile(profile as any);
    if (profileError) console.warn('InsForge profile update warning:', profileError);
    if (data.accessToken) this.setToken(data.accessToken);

    const appUser = await this.syncAppUser(data.user, profile);
    const user = this.authUserToLegacyUser(data.user, appUser);
    return { access_token: data.accessToken ?? '', user_id: user.id, email: user.email, full_name: user.full_name, is_admin: false };
  }

  async demoSwitch(_userId: number) {
    throw new Error('Demo switching is not available until demo accounts are migrated to InsForge Auth.');
  }

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
    let query = insforge.database.from('skills').select('*').order('popularity', { ascending: false }).order('name', { ascending: true });
    if (category && category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load skills');
    return data ?? [];
  }

  async searchSkills(q: string) {
    let query = insforge.database.from('skills').select('*').limit(20);
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
      const created = await insforge.database.from('skills').insert({
        name: skillName,
        category: payload.category ?? 'Other',
        icon: payload.icon ?? 'Sparkles',
        description: payload.description,
        popularity: 0,
      }).select('*').single();
      if (created.error) throw new Error(created.error.message || 'Unable to create skill');
      skill = created.data;
    }

    const existing = await insforge.database.from('user_skills').select('*')
      .eq('user_id', appUser.id).eq('skill_id', skill.id).eq('skill_type', skillType).maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check skill');

    if (existing.data) {
      const updated = await insforge.database.from('user_skills').update({
        experience_level: payload.experience_level ?? existing.data.experience_level,
        description: payload.description ?? existing.data.description,
      }).eq('id', existing.data.id).select('*').single();
      if (updated.error) throw new Error(updated.error.message || 'Unable to update skill');
      return { ...updated.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
    }

    const createdMapping = await insforge.database.from('user_skills').insert({
      user_id: appUser.id,
      skill_id: skill.id,
      skill_type: skillType,
      experience_level: payload.experience_level ?? 'Intermediate',
      description: payload.description,
    }).select('*').single();
    if (createdMapping.error) throw new Error(createdMapping.error.message || 'Unable to add skill');

    await insforge.database.from('skills').update({ popularity: Number(skill.popularity ?? 0) + 1 }).eq('id', skill.id);
    return { ...createdMapping.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
  }

  async deleteUserSkill(userSkillId: number) {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('user_skills').delete()
      .eq('id', userSkillId).eq('user_id', appUser.id).select('*');
    if (error) throw new Error(error.message || 'Unable to remove skill');
    return { message: 'Skill removed successfully', data };
  }

  async getUserProfile(userId: number) {
    const { data, error } = await insforge.database.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to load user profile');
    if (!data) throw new Error('User not found');
    const skills = await this.getUserSkills(userId);
    return {
      ...data,
      skills,
      skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name),
      skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name),
      skills_detail: skills,
    };
  }

  async getNearbyUsers(radiusKm = 10) {
    const { appUser } = await this.getAppUser();
    const centerLat = Number(appUser.latitude ?? 17.4485);
    const centerLon = Number(appUser.longitude ?? 78.3748);
    const { data, error } = await insforge.database.from('users').select('*').eq('is_active', true).limit(100);
    if (error) throw new Error(error.message || 'Unable to load nearby users');

    const distance = (lat: number, lon: number) => {
      const toRad = (v: number) => v * Math.PI / 180;
      const dLat = toRad(lat - centerLat);
      const dLon = toRad(lon - centerLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(centerLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const results = [];
    for (const user of data ?? []) {
      if (Number(user.id) === Number(appUser.id)) continue;
      if (user.latitude == null || user.longitude == null) continue;
      const dist = distance(Number(user.latitude), Number(user.longitude));
      if (dist > radiusKm) continue;
      const skills = await this.getUserSkills(Number(user.id));
      results.push({
        id: user.id, full_name: user.full_name, avatar_url: user.avatar_url, headline: user.headline,
        address_display: user.address_display, distance_km: dist, distance_display: `${dist.toFixed(1)} km`,
        trust_score: user.trust_score, reliability_score: user.reliability_score,
        completed_exchanges_count: user.completed_exchanges_count, badges: user.badges ?? [],
        skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name),
        skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name),
        availability: user.availability,
      });
    }
    return results.sort((a: any, b: any) => a.distance_km - b.distance_km);
  }

  // Remaining legacy endpoints will be migrated in subsequent passes.
  async getMatches() { return this.request<any[]>('/matches'); }
  async getExchangeDetails(_id: number) { return this.request<any>('/exchanges'); }
  async getExchanges(_status?: string) { return this.request<any[]>('/exchanges'); }
  async proposeExchange(_payload: any) { return this.request<any>('/exchanges'); }
  async acceptExchange(_id: number) { return this.request<any>('/exchanges'); }
  async counterExchange(_id: number, _payload: any) { return this.request<any>('/exchanges'); }
  async rejectExchange(_id: number) { return this.request<any>('/exchanges'); }
  async startExchange(_id: number) { return this.request<any>('/exchanges'); }
  async completeExchange(_id: number) { return this.request<any>('/exchanges'); }
  async cancelExchange(_id: number, _reason: string) { return this.request<any>('/exchanges'); }
  async submitReview(_payload: any) { return this.request<any>('/reviews'); }
  async getUserReviews(_userId: number) { return this.request<any[]>('/reviews'); }
  async getTrustDetails(_userId: number) { return this.request<any>('/trust'); }
  async getConversations() { return this.request<any[]>('/messages/conversations'); }
  async getMessages(_partnerId: number) { return this.request<any[]>('/messages'); }
  async sendMessage(_payload: any) { return this.request<any>('/messages'); }
  async getNotifications() { return this.request<any[]>('/notifications'); }
  async getUnreadNotificationCount() { return this.request<any>('/notifications/unread-count'); }
  async markNotificationRead(_id: number) { return this.request<any>('/notifications/read'); }
  async markAllNotificationsRead() { return this.request<any>('/notifications/read-all'); }
  async getConnections() { return this.request<any[]>('/connections'); }
  async connectNeighbor(_userId: number) { return this.request<any>('/connections'); }
  async disconnectNeighbor(_userId: number) { return this.request<any>('/connections'); }
  async getConnectionSuggestions() { return this.request<any[]>('/connections/suggestions'); }
  async getFeed(_postType?: string) { return this.request<any[]>('/feed'); }
  async createPost(_payload: any) { return this.request<any>('/feed'); }
  async likePost(_postId: number) { return this.request<any>('/feed/like'); }
  async getCommunityStats() { return this.request<any>('/community/stats'); }
  async search(_q: string, _category?: string, _minTrust?: number) { return this.request<any>('/search'); }
  async createReport(_payload: any) { return this.request<any>('/reports'); }
  async blockUser(_userId: number) { return this.request<any>('/blocks'); }
  async unblockUser(_userId: number) { return this.request<any>('/blocks'); }
  async getBlocks() { return this.request<any[]>('/blocks'); }
  async getAdminStats() { return this.request<any>('/admin/stats'); }
  async getAdminUsers() { return this.request<any[]>('/admin/users'); }
  async toggleAdminUserActive(_userId: number) { return this.request<any>('/admin/users'); }
  async getAdminReports(_status?: string) { return this.request<any[]>('/admin/reports'); }
  async resolveAdminReport(_reportId: number, _status: 'RESOLVED' | 'DISMISSED', _adminNote?: string) { return this.request<any>('/admin/reports'); }
  async getAdminExchanges() { return this.request<any[]>('/admin/exchanges'); }
}

export const api = new ApiClient();