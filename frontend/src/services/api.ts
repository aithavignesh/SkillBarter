import { insforge } from '../lib/insforge';

/**
 * SkillBarter API facade.
 *
 * Authentication is handled directly by InsForge in the browser. The legacy
 * FastAPI transport is intentionally disabled so production can never fall
 * back to the old Render/localhost API.
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
    throw new Error('This API endpoint has not yet been migrated to InsForge. Please use the InsForge database/auth service.');
  }

  /**
   * The original application tables use an integer users.id while InsForge
   * Auth uses its own string user id. Keep the existing application schema
   * usable by resolving/creating a lightweight app-profile row by email.
   */
  private async syncAppUser(authUser: any, profile: any = {}) {
    const email = authUser?.email ?? '';
    if (!email) throw new Error('Authenticated user has no email.');

    const existing = await insforge.database
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existing.error) {
      console.warn('App profile lookup warning:', existing.error);
    }

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
        .from('users')
        .update(updates)
        .eq('id', existing.data.id)
        .select('*')
        .single();

      if (error) console.warn('App profile sync warning:', error);
      return data ?? existing.data;
    }

    const { data, error } = await insforge.database
      .from('users')
      .insert({
        email,
        // Authentication is owned by InsForge Auth; this field exists only
        // because the legacy application schema requires a non-null value.
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
      .select('*')
      .single();

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

  // Auth - InsForge
  async login(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials');
    if (!data?.user) throw new Error('Login succeeded but no user was returned.');

    if (data.accessToken) this.setToken(data.accessToken);

    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    const user = this.authUserToLegacyUser(data.user, appUser);
    return {
      access_token: data.accessToken ?? '',
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: user.is_admin,
    };
  }

  async register(payload: any) {
    const { data, error } = await insforge.auth.signUp({
      email: payload.email,
      password: payload.password,
      name: payload.full_name,
    });

    if (error) throw new Error(error.message || 'Registration failed');
    if (!data?.user) throw new Error('Registration succeeded but no user was returned.');

    const profile = {
      nickname: payload.full_name,
      bio: payload.bio,
      avatar_url: payload.avatar_url,
      full_name: payload.full_name,
      address_display: payload.address_display,
      latitude: payload.latitude,
      longitude: payload.longitude,
      primary_intent: payload.primary_intent ?? 'EXCHANGE',
      onboarding_completed: false,
    };

    // Store the application's profile fields in the InsForge auth profile.
    const { error: profileError } = await insforge.auth.setProfile(profile as any);
    if (profileError) console.warn('InsForge profile update warning:', profileError);

    if (data.accessToken) this.setToken(data.accessToken);

    const appUser = await this.syncAppUser(data.user, profile);
    const user = this.authUserToLegacyUser(data.user, appUser);
    return {
      access_token: data.accessToken ?? '',
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: false,
    };
  }

  async demoSwitch(_userId: number) {
    throw new Error('Demo switching is not available until demo accounts are migrated to InsForge Auth.');
  }

  async getMe() {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user) throw new Error('Not authenticated');

    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    return this.authUserToLegacyUser(data.user, appUser);
  }

  async updateMe(payload: any) {
    const { data, error } = await insforge.auth.setProfile(payload);
    if (error) throw new Error(error.message || 'Unable to update profile');
    await this.syncAppUser(data?.user ?? {}, payload);
    return data;
  }

  async logout() {
    const { error } = await insforge.auth.signOut();
    this.clearToken();
    if (error) throw new Error(error.message || 'Logout failed');
  }

  // Legacy endpoints intentionally fail fast instead of calling Render.
  async getNearbyUsers(_radiusKm?: number) { return this.request<any[]>('/users/nearby'); }
  async getUserProfile(_userId: number) { return this.request<any>('/users/profile'); }
  async getSkills(_category?: string) { return this.request<any[]>('/skills'); }
  async searchSkills(_q: string) { return this.request<any[]>('/skills/search'); }
  async addUserSkill(_payload: any) { return this.request<any>('/skills/user/me'); }
  async deleteUserSkill(_userSkillId: number) { return this.request<any>('/skills/user/me'); }
  async getMatches() { return this.request<any[]>('/matches'); }
  async getExchanges(_status?: string) { return this.request<any[]>('/exchanges'); }
  async getExchangeDetails(_id: number) { return this.request<any>('/exchanges'); }
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
