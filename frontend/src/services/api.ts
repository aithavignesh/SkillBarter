import { insforge } from '../lib/insforge';

/**
 * SkillBarter API facade.
 * Production data access is direct from the browser to InsForge.
 */
class ApiClient {
  private getToken(): string | null { return sessionStorage.getItem('skillbarter_token'); }
  public setToken(token: string) { sessionStorage.setItem('skillbarter_token', token); }
  public clearToken() { sessionStorage.removeItem('skillbarter_token'); }

  private async request<T>(_endpoint: string, _options: RequestInit = {}): Promise<T> {
    throw new Error('This API endpoint has not yet been migrated to InsForge.');
  }

  private async getAppUser() {
    // Phone OTP sessions are intentionally access-token based and do not expose
    // a refresh token to the browser. Avoid calling getCurrentUser() for those
    // sessions because the SDK may attempt a refresh and show "No refresh token provided".
    const phone = sessionStorage.getItem('skillbarter_phone');
    if (phone) {
      // Never trust the client-controlled sessionStorage user id as an identity
      // selector. Bind the phone-authenticated session to its InsForge auth user.
      const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
      if (authError || !authData?.user?.email) throw new Error(authError?.message || 'Not authenticated');
      const result = await insforge.database.from('users').select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').eq('email', authData.user.email).maybeSingle();
      if (result.error) throw new Error(result.error.message || 'Unable to load application profile');
      if (!result.data) throw new Error('Application profile not found');
      return { authUser: authData.user, appUser: result.data };
    }
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user?.email) throw new Error('Not authenticated');
    const result = await insforge.database.from('users').select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').eq('email', data.user.email).maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Unable to load application profile');
    if (!result.data) throw new Error('Application profile not found');
    return { authUser: data.user, appUser: result.data };
  }

  private async syncAppUser(authUser: any, profile: any = {}) {
    const email = authUser?.email ?? '';
    if (!email) throw new Error('Authenticated user has no email.');
    const rawLatitude = profile.latitude;
    const rawLongitude = profile.longitude;
    const latitude = rawLatitude === null || rawLatitude === undefined || rawLatitude === '' ? undefined : Number(rawLatitude);
    const longitude = rawLongitude === null || rawLongitude === undefined || rawLongitude === '' ? undefined : Number(rawLongitude);
    if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) throw new Error('Invalid latitude.');
    if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) throw new Error('Invalid longitude.');
    const existing = await insforge.database.from('users').select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').eq('email', email).maybeSingle();
    if (existing.error) console.warn('App profile lookup warning:', existing.error);
    if (existing.data) {
      const updates = {
        full_name: profile.full_name ?? profile.nickname ?? authUser?.name ?? existing.data.full_name,
        avatar_url: profile.avatar_url ?? existing.data.avatar_url,
        bio: profile.bio ?? existing.data.bio,
        headline: profile.headline ?? existing.data.headline,
        address_display: profile.address_display ?? existing.data.address_display,
        latitude: latitude ?? existing.data.latitude,
        longitude: longitude ?? existing.data.longitude,
        primary_intent: profile.primary_intent ?? existing.data.primary_intent ?? 'EXCHANGE',
        onboarding_completed: profile.onboarding_completed ?? existing.data.onboarding_completed,
      };
      const { data, error } = await insforge.database.from('users').update(updates).eq('id', existing.data.id).select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').single();
      if (error) console.warn('App profile sync warning:', error);
      return data ?? existing.data;
    }
    const { data, error } = await insforge.database.from('users').insert({
      email,
      password_hash: 'insforge-managed',
      full_name: profile.full_name ?? profile.nickname ?? authUser?.name ?? email.split('@')[0],
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      headline: profile.headline,
      address_display: profile.address_display,
      latitude,
      longitude,
      primary_intent: profile.primary_intent ?? 'EXCHANGE',
      onboarding_completed: profile.onboarding_completed ?? false,
      is_active: true,
    }).select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').single();
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
      trust_score: Number(appUser?.trust_score ?? metadata.trust_score ?? 0),
      reliability_score: Number(appUser?.reliability_score ?? metadata.reliability_score ?? 0),
      response_rate: Number(appUser?.response_rate ?? metadata.response_rate ?? 0),
      skill_quality_score: Number(appUser?.skill_quality_score ?? metadata.skill_quality_score ?? 0),
      completed_exchanges_count: Number(appUser?.completed_exchanges_count ?? metadata.completed_exchanges_count ?? 0),
      reviews_count: Number(appUser?.reviews_count ?? metadata.reviews_count ?? 0),
      badges: Array.isArray(appUser?.badges) ? appUser.badges : (Array.isArray(metadata.badges) ? metadata.badges : []),
      is_active: appUser?.is_active !== false && metadata.is_active !== false,
      is_admin: appUser?.is_admin === true || metadata.is_admin === true,
      onboarding_completed: appUser?.onboarding_completed !== false && metadata.onboarding_completed !== false,
      created_at: appUser?.created_at ?? authUser?.createdAt ?? new Date().toISOString(),
      skills: [],
    };
  }

  private async getUserSkills(userId: number) {
    const { data, error } = await insforge.database.from('user_skills').select('id,user_id,skill_id,skill_type,experience_level,description,created_at,skills(id,name,category,icon)').eq('user_id', userId).order('created_at', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load skills');
    return (data ?? []).map((row: any) => ({
      id: row.id, user_id: row.user_id, skill_id: row.skill_id,
      skill_name: row.skills?.name ?? 'Unknown', category: row.skills?.category ?? 'Other', icon: row.skills?.icon ?? 'Wrench',
      skill_type: row.skill_type, experience_level: row.experience_level, description: row.description, created_at: row.created_at,
    }));
  }

  async login(email: string, password: string) {
    // A stale token from a previous browser session must not be reused for a new login.
    this.clearToken();
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials');
    if (!data?.user) throw new Error('Login succeeded but no user was returned.');
    if (data.accessToken) this.setToken(data.accessToken);
    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    const user = this.authUserToLegacyUser(data.user, appUser);
    return { access_token: data.accessToken ?? '', user_id: user.id, email: user.email, full_name: user.full_name, is_admin: user.is_admin };
  }

  async sendResetPasswordEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: normalizedEmail, redirectTo });
    if (error) throw new Error(error.message || 'Unable to send password reset email.');
    return true;
  }

  async resetPassword(newPassword: string, otp: string) {
    if (!otp) throw new Error('This password reset link is missing or expired.');
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
    const { error } = await insforge.auth.resetPassword({ newPassword, otp });
    if (error) throw new Error(error.message || 'Unable to reset password.');
    return true;
  }

  async register(payload: any) {
    // Do not let an expired token from an older session contaminate signup.
    this.clearToken();

    const { data, error } = await insforge.auth.signUp({ email: payload.email, password: payload.password, name: payload.full_name });
    if (error) {
      const message = String(error.message || 'Registration failed');
      if (/already|exist|registered/i.test(message)) throw new Error('An account with this email already exists. Please log in instead.');
      throw new Error(message);
    }
    if (!data?.user) throw new Error('Registration succeeded but no user was returned.');

    // Some InsForge projects require email verification and therefore return a user
    // without an access token. Try an immediate password sign-in when possible.
    let authUser = data.user;
    let accessToken = data.accessToken;
    if (!accessToken) {
      const signIn = await insforge.auth.signInWithPassword({ email: payload.email, password: payload.password });
      if (signIn.data?.user && signIn.data?.accessToken) {
        authUser = signIn.data.user;
        accessToken = signIn.data.accessToken;
      } else {
        const verificationMessage = String(signIn.error?.message || '');
        if (/verify|confirm|verification/i.test(verificationMessage)) {
          throw new Error('Account created. Please verify your email, then log in to continue setup.');
        }
        throw new Error('Account created, but SkillBarter could not start your session. Please log in and continue setup.');
      }
    }

    if (accessToken) this.setToken(accessToken);

    const profile = {
      nickname: payload.full_name,
      bio: payload.bio,
      avatar_url: payload.avatar_url,
      full_name: payload.full_name,
      headline: payload.headline,
      address_display: payload.address_display,
      latitude: payload.latitude,
      longitude: payload.longitude,
      primary_intent: payload.primary_intent ?? 'EXCHANGE',
      onboarding_completed: false,
    };

    // Profile metadata is useful but should never turn a successful account creation
    // into the generic "Invalid token" screen. Retry once after sign-in and continue
    // with the application profile when the auth provider accepts the session.
    try {
      const profileResult = await insforge.auth.setProfile(profile as any);
      if (profileResult.error) console.warn('InsForge profile update warning:', profileResult.error);
    } catch (profileError) {
      console.warn('InsForge profile update warning:', profileError);
    }

    try {
      const appUser = await this.syncAppUser(authUser, profile);
      if (appUser && typeof payload.primary_skill === 'string' && payload.primary_skill.trim()) {
        try {
          await this.addUserSkill({
            skill_name: payload.primary_skill.trim(),
            skill_type: 'OFFERED',
            category: typeof payload.primary_category === 'string' ? payload.primary_category.trim().slice(0, 80) : 'Other',
          });
        } catch (skillError) {
          console.warn('Initial skill setup warning:', skillError);
        }
      }
      const user = this.authUserToLegacyUser(authUser, appUser);
      return { access_token: accessToken ?? '', user_id: user.id, email: user.email, full_name: user.full_name, is_admin: false };
    } catch (syncError: any) {
      const message = String(syncError?.message || '');
      if (/invalid token|token.*invalid|unauthorized|not authenticated/i.test(message)) {
        throw new Error('Your account was created, but the session expired. Please log in again to continue setup.');
      }
      throw syncError;
    }
  }

  async demoSwitch(_userId: number) { throw new Error('Demo switching is not available until demo accounts are migrated to InsForge Auth.'); }

  async getMe() {
    const phone = sessionStorage.getItem('skillbarter_phone');
    if (phone) {
      const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
      if (authError || !authData?.user?.email) throw new Error(authError?.message || 'Not authenticated');
      const result = await insforge.database.from('users').select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at').eq('email', authData.user.email).maybeSingle();
      if (result.error) throw new Error(result.error.message || 'Unable to load current user');
      if (!result.data) throw new Error('Application profile not found');
      const user = { ...result.data, id: Number(result.data.id) };
      user.skills = await this.getUserSkills(user.id);
      return user;
    }
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error) throw new Error(error.message || 'Unable to load current user');
    if (!data?.user) throw new Error('Not authenticated');
    const appUser = await this.syncAppUser(data.user, data.user?.profile ?? {});
    const user = this.authUserToLegacyUser(data.user, appUser);
    user.skills = await this.getUserSkills(user.id);
    return user;
  }

  async updateMe(payload: any) {
    const profilePayload = {
      full_name: typeof payload.full_name === 'string' ? payload.full_name.trim().slice(0, 120) : undefined,
      headline: typeof payload.headline === 'string' ? payload.headline.trim().slice(0, 160) : undefined,
      bio: typeof payload.bio === 'string' ? payload.bio.trim().slice(0, 2000) : undefined,
      address_display: typeof payload.address_display === 'string' ? payload.address_display.trim().slice(0, 200) : undefined,
      availability: typeof payload.availability === 'string' ? payload.availability.trim().slice(0, 500) : undefined,
      location_visibility: typeof payload.location_visibility === 'boolean' ? payload.location_visibility : undefined,
      exchange_radius_km: payload.exchange_radius_km === undefined ? undefined : Math.min(100, Math.max(1, Number(payload.exchange_radius_km))),
      onboarding_completed: typeof payload.onboarding_completed === 'boolean' ? payload.onboarding_completed : undefined,
      primary_intent: typeof payload.primary_intent === 'string' ? payload.primary_intent.trim().slice(0, 30) : undefined,
    };
    // Keep privileged account fields out of profile-form updates.
    const phone = sessionStorage.getItem('skillbarter_phone');
    if (phone) {
      const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
      if (authError || !authData?.user?.email) throw new Error(authError?.message || 'Not authenticated');
      const { data, error } = await insforge.database
        .from('users')
        .update({ ...profilePayload, updated_at: new Date().toISOString() })
        .eq('email', authData.user.email)
        .select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at')
        .single();
      if (error) throw new Error(error.message || 'Unable to update profile');
      return { user: data };
    }

    const { data, error } = await insforge.auth.setProfile(profilePayload);
    if (error) throw new Error(error.message || 'Unable to update profile');
    const authUser = data?.user ?? (await insforge.auth.getCurrentUser()).data?.user;
    if (authUser) await this.syncAppUser(authUser, profilePayload);
    return data;
  }

  async logout() {
    const { error } = await insforge.auth.signOut();
    this.clearToken();
    sessionStorage.removeItem('skillbarter_user_id');
    sessionStorage.removeItem('skillbarter_phone');
    // Remove any in-progress phone OTP challenge so a signed-out session cannot reuse it.
    sessionStorage.removeItem('skillbarter_otp_challenge');
    if (error) throw new Error(error.message || 'Logout failed');
  }

  async getSkills(category?: string) {
    let query: any = insforge.database.from('skills').select('id,name,category,icon,description,popularity').order('popularity', { ascending: false }).order('name', { ascending: true });
    if (category && category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load skills');
    return data ?? [];
  }

  async searchSkills(q: string) {
    let query: any = insforge.database.from('skills').select('id,name,category,icon,description,popularity').limit(20);
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
    if (skillType !== 'OFFERED' && skillType !== 'NEEDED') throw new Error('Invalid skill type.');
    if (skillName.length > 120) throw new Error('Skill name must be 120 characters or less.');
    const experienceLevel = String(payload.experience_level ?? 'Intermediate').trim();
    if (experienceLevel.length > 50) throw new Error('Experience level is too long.');
    const skillDescription = typeof payload.description === 'string' ? payload.description.trim().slice(0, 1000) : undefined;
    let { data: skill, error } = await insforge.database.from('skills').select('id,name,category,icon,description,popularity').ilike('name', skillName).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to find skill');
    if (!skill) {
      const created = await insforge.database.from('skills').insert({ name: skillName, category: payload.category ?? 'Other', icon: payload.icon ?? 'Sparkles', description: payload.description, popularity: 0 }).select('id,name,category,icon,description,popularity').single();
      if (created.error) throw new Error(created.error.message || 'Unable to create skill');
      skill = created.data;
    }
    const existing = await insforge.database.from('user_skills').select('id,user_id,skill_id,skill_type,experience_level,description').eq('user_id', appUser.id).eq('skill_id', skill.id).eq('skill_type', skillType).maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check skill');
    if (existing.data) {
      const updated = await insforge.database.from('user_skills').update({ experience_level: experienceLevel || existing.data.experience_level, description: skillDescription ?? existing.data.description }).eq('id', existing.data.id).eq('user_id', appUser.id).select('id,user_id,skill_id,skill_type,experience_level,description').single();
      if (updated.error) throw new Error(updated.error.message || 'Unable to update skill');
      return { ...updated.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
    }
    const createdMapping = await insforge.database.from('user_skills').insert({ user_id: appUser.id, skill_id: skill.id, skill_type: skillType, experience_level: experienceLevel || 'Intermediate', description: skillDescription }).select('id,user_id,skill_id,skill_type,experience_level,description').single();
    if (createdMapping.error) throw new Error(createdMapping.error.message || 'Unable to add skill');
    // Skill popularity is derived data and must not be incremented from the browser;
    // concurrent clients could otherwise inflate it. Keep the mapping creation authoritative.
    return { ...createdMapping.data, skill_name: skill.name, category: skill.category, icon: skill.icon };
  }

  async deleteUserSkill(userSkillId: number) {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('user_skills').delete().eq('id', userSkillId).eq('user_id', appUser.id).select('id,user_id,skill_id,skill_type,experience_level,description');
    if (error) throw new Error(error.message || 'Unable to remove skill');
    return { message: 'Skill removed successfully', data };
  }

  async getUserProfile(userId: number) {
    const { appUser } = await this.getAppUser();
    const { data, error } = await insforge.database.from('users').select('id,full_name,avatar_url,bio,headline,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,onboarding_completed,primary_intent,created_at').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to load user profile');
    if (!data) throw new Error('User not found');
    const skills = await this.getUserSkills(userId);
    const isSelf = Number(appUser.id) === Number(userId);
    const safeProfile = { ...data, address_display: isSelf || data.location_visibility !== false ? data.address_display : null };
    return { ...safeProfile, skills, skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), skills_detail: skills };
  }

  async getNearbyUsers(radiusKm = 10) {
    const { appUser } = await this.getAppUser();
    if (appUser.latitude == null || appUser.longitude == null) return [];
    const centerLat = Number(appUser.latitude);
    const centerLon = Number(appUser.longitude);
    const { data, error } = await insforge.database.from('users').select('id,full_name,avatar_url,headline,latitude,longitude,address_display,location_visibility,exchange_radius_km,availability,trust_score,reliability_score,completed_exchanges_count,badges,is_active').eq('is_active', true).limit(100);
    if (error) throw new Error(error.message || 'Unable to load nearby users');
    const distance = (lat: number, lon: number) => {
      const toRad = (v: number) => v * Math.PI / 180;
      const dLat = toRad(lat - centerLat), dLon = toRad(lon - centerLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(centerLat)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const results: any[] = [];
    for (const user of data ?? []) {
      if (Number(user.id) === Number(appUser.id) || user.latitude == null || user.longitude == null || user.location_visibility === false) continue;
      const dist = distance(Number(user.latitude), Number(user.longitude));
      if (dist > radiusKm) continue;
      const skills = await this.getUserSkills(Number(user.id));
      results.push({ id: user.id, full_name: user.full_name, avatar_url: user.avatar_url, headline: user.headline, address_display: user.location_visibility === false ? null : user.address_display, distance_km: dist, distance_display: `${dist.toFixed(1)} km`, trust_score: user.trust_score, reliability_score: user.reliability_score, completed_exchanges_count: user.completed_exchanges_count, badges: user.badges ?? [], skills_offered: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), skills_needed: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), availability: user.availability });
    }
    return results.sort((a, b) => a.distance_km - b.distance_km);
  }

  async getMatches() {
    const { appUser } = await this.getAppUser();
    const mySkills = await this.getUserSkills(Number(appUser.id));
    const myOffered = mySkills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => String(s.skill_name).toLowerCase());
    const myNeeded = mySkills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => String(s.skill_name).toLowerCase());
    if (!myOffered.length && !myNeeded.length) return [];
    const blocked = await insforge.database.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${appUser.id},blocked_id.eq.${appUser.id}`);
    const excluded = new Set<number>([Number(appUser.id)]);
    for (const b of blocked.data ?? []) { excluded.add(Number(b.blocker_id)); excluded.add(Number(b.blocked_id)); }
    const users = await insforge.database.from('users').select('id,full_name,avatar_url,headline,latitude,longitude,address_display,exchange_radius_km,availability,trust_score,reliability_score,completed_exchanges_count,badges,is_active').eq('is_active', true).limit(100);
    if (users.error) throw new Error(users.error.message || 'Unable to load members');
    const distFn = (aLat: number, aLon: number, bLat: number, bLon: number) => {
      const toRad = (v: number) => v * Math.PI / 180;
      const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    const myLat = Number(appUser.latitude), myLon = Number(appUser.longitude);
    const results: any[] = [];
    for (const candidate of users.data ?? []) {
      const cid = Number(candidate.id);
      if (excluded.has(cid)) continue;

      // Match common student skill aliases instead of requiring exact text equality.
      // This keeps useful matches working when users write equivalent names such as
      // "AI / ML" vs "AI / Machine Learning" or "DSA" vs "Data Structures & Algorithms".
      const normalizeSkill = (value: string) => {
        const key = value.trim().toLowerCase().replace(/&/g, 'and').replace(/[._/-]+/g, ' ').replace(/\s+/g, ' ');
        const aliases: Record<string, string> = {
          'ai ml': 'artificial intelligence machine learning',
          'ai machine learning': 'artificial intelligence machine learning',
          'machine learning': 'machine learning',
          'artificial intelligence': 'artificial intelligence machine learning',
          'dsa': 'data structures algorithms',
          'data structures algorithms': 'data structures algorithms',
          'data structures and algorithms': 'data structures algorithms',
          'web development': 'web development',
          'frontend': 'frontend web development',
          'front end': 'frontend web development',
          'backend': 'backend web development',
          'back end': 'backend web development',
          'full stack': 'full stack web development',
          'fullstack': 'full stack web development',
        };
        return aliases[key] ?? key;
      };
      const skills = await this.getUserSkills(cid);
      const theirOffered = skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => normalizeSkill(String(s.skill_name)));
      const theirNeeded = skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => normalizeSkill(String(s.skill_name)));
      const normalizedMyOffered = myOffered.map(normalizeSkill);
      const normalizedMyNeeded = myNeeded.map(normalizeSkill);
      const youOfferTheyNeed = normalizedMyOffered.filter((s: string) => theirNeeded.includes(s));
      const theyOfferYouNeed = theirOffered.filter((s: string) => normalizedMyNeeded.includes(s));
      const reciprocal = youOfferTheyNeed.length > 0 && theyOfferYouNeed.length > 0;
      if (!youOfferTheyNeed.length && !theyOfferYouNeed.length) continue;

      const hasMyLocation = appUser.latitude != null && appUser.longitude != null;
      const hasCandidateLocation = candidate.location_visibility !== false && candidate.latitude != null && candidate.longitude != null;
      const hasDistance = hasMyLocation && hasCandidateLocation;
      const distance = hasDistance
        ? distFn(myLat, myLon, Number(candidate.latitude), Number(candidate.longitude))
        : null;
      const maxRadius = Math.max(Number(appUser.exchange_radius_km ?? 10), Number(candidate.exchange_radius_km ?? 10), 1);
      // Location is optional at signup. Missing coordinates should not hide a
      // valid learning match; treat it as neutral proximity until location is set.
      const proximityFactor = hasDistance
        ? (distance! > maxRadius ? Math.max(0, 1 - distance! / (maxRadius * 1.5)) : Math.max(0, 1 - distance! / maxRadius))
        : 0.5;
      const skillScore = reciprocal ? 50 : 25;
      const trust = Math.min(Math.max(Number(candidate.trust_score ?? 0), 0), 100) / 100 * 20;
      const myAvail = String(appUser.availability ?? 'flexible').toLowerCase(), theirAvail = String(candidate.availability ?? 'flexible').toLowerCase();
      const availability = myAvail.includes('flexible') || theirAvail.includes('flexible') || myAvail === theirAvail ? 10 : (myAvail.split(/\s+/).some((w: string) => theirAvail.includes(w)) ? 7 : 4);
      const score = Math.min(Math.max(Math.round(skillScore + proximityFactor * 20 + trust + availability), 10), 99);
      const reasons: string[] = [];
      if (reciprocal) reasons.push(`Strong peer-learning fit: You can teach '${youOfferTheyNeed[0]}' while learning '${theyOfferYouNeed[0]}'`);
      else if (theyOfferYouNeed.length) reasons.push(`They offer '${theyOfferYouNeed[0]}' which you need`);
      else reasons.push(`You offer '${youOfferTheyNeed[0]}' which they need`);
      if (distance == null) reasons.push('Location not set yet — open to online learning');
      else if (distance <= 3) reasons.push(`Nearby learning partner (${distance.toFixed(1)} km)`);
      else if (distance <= maxRadius) reasons.push(`Within your ${maxRadius.toFixed(0)} km learning zone (${distance.toFixed(1)} km)`);
      else reasons.push(`${distance.toFixed(1)} km away`);
      const trustScore = Number(candidate.trust_score);
      if (Number.isFinite(trustScore) && trustScore >= 90) reasons.push(`High community trust score (${Math.round(trustScore)}/100)`);
      else if (Number.isFinite(trustScore) && trustScore >= 80) reasons.push(`Good community standing (${Math.round(trustScore)}/100`);
      if (availability >= 7) reasons.push(`Compatible availability (${candidate.availability ?? 'Flexible'})`);
      results.push({ candidate: { id: candidate.id, full_name: candidate.full_name, avatar_url: candidate.avatar_url, headline: candidate.headline, address_display: candidate.location_visibility === false ? null : candidate.address_display, trust_score: candidate.trust_score, reliability_score: candidate.reliability_score, completed_exchanges_count: candidate.completed_exchanges_count, badges: candidate.badges ?? [] }, match_score: score, distance_km: distance, distance_display: distance == null ? 'Online / location not set' : `${distance.toFixed(1)} km`, is_reciprocal: reciprocal, they_offer: skills.filter((s: any) => s.skill_type === 'OFFERED').map((s: any) => s.skill_name), they_need: skills.filter((s: any) => s.skill_type === 'NEEDED').map((s: any) => s.skill_name), matched_you_offer: youOfferTheyNeed, matched_they_offer: theyOfferYouNeed, reasons, score_breakdown: { skill_compatibility: Math.round(skillScore), location_proximity: Math.round(proximityFactor * 20), trust: Math.round(trust), availability: Math.round(availability) } });
    }
    return results.sort((a, b) => b.match_score - a.match_score || a.distance_km - b.distance_km).slice(0, 20);
  }

  private async getExchangeRow(id: number) {
    const exchangeId = Number(id);
    if (!Number.isInteger(exchangeId) || exchangeId <= 0) throw new Error('Invalid exchange.');
    const { data, error } = await insforge.database.from('exchanges').select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at').eq('id', exchangeId).maybeSingle();
    if (error) throw new Error(error.message || 'Unable to load exchange');
    if (!data) throw new Error('Exchange not found');
    return data;
  }

  private async serializeExchange(exchange: any, currentUserId: number) {
    const requesterResult = await insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,address_display,location_visibility').eq('id', exchange.requester_id).maybeSingle();
    const receiverResult = await insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,address_display,location_visibility').eq('id', exchange.receiver_id).maybeSingle();
    const requesterSkill = exchange.requester_skill_id ? await insforge.database.from('skills').select('id,name,category,icon').eq('id', exchange.requester_skill_id).maybeSingle() : { data: null, error: null };
    const receiverSkill = exchange.receiver_skill_id ? await insforge.database.from('skills').select('id,name,category,icon').eq('id', exchange.receiver_skill_id).maybeSingle() : { data: null, error: null };
    const review = await insforge.database.from('reviews').select('id').eq('exchange_id', exchange.id).eq('reviewer_id', currentUserId).maybeSingle();
    if (requesterResult.error) throw new Error(requesterResult.error.message);
    if (receiverResult.error) throw new Error(receiverResult.error.message);
    if (review.error) throw new Error(review.error.message);
    const reqUser = requesterResult.data, recUser = receiverResult.data;
    const safeAddress = (user: any) => Number(user?.id) === Number(currentUserId) || user?.location_visibility !== false ? user?.address_display : null;
    return {
      ...exchange,
      requester_skill_name: requesterSkill.data?.name ?? 'Custom Skill',
      receiver_skill_name: receiverSkill.data?.name ?? 'Custom Skill',
      estimated_hours: exchange.estimated_hours ?? 2,
      requester: reqUser ? { id: reqUser.id, full_name: reqUser.full_name, avatar_url: reqUser.avatar_url, headline: reqUser.headline, trust_score: reqUser.trust_score, address_display: safeAddress(reqUser) } : { id: exchange.requester_id, full_name: 'Member', trust_score: 0 },
      receiver: recUser ? { id: recUser.id, full_name: recUser.full_name, avatar_url: recUser.avatar_url, headline: recUser.headline, trust_score: recUser.trust_score, address_display: safeAddress(recUser) } : { id: exchange.receiver_id, full_name: 'Member', trust_score: 0 },
      user_can_review: exchange.status === 'COMPLETED' && !review.data,
      has_reviewed: Boolean(review.data),
    };
  }

  async getExchanges(status?: string) {
    const { appUser } = await this.getAppUser();
    const allowedStatuses = ['PENDING', 'ACCEPTED', 'ACTIVE', 'COUNTERED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
    const normalizedStatus = status ? String(status).toUpperCase() : '';
    if (normalizedStatus && !allowedStatuses.includes(normalizedStatus)) throw new Error('Invalid exchange status.');
    let query: any = insforge.database
      .from('exchanges')
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .or(`requester_id.eq.${appUser.id},receiver_id.eq.${appUser.id}`)
      .order('created_at', { ascending: false });
    if (normalizedStatus) query = query.eq('status', normalizedStatus);
    const { data, error } = await query;
    if (error) throw new Error(error.message || 'Unable to load exchanges');
    return Promise.all((data || []).map((e: any) => this.serializeExchange(e, Number(appUser.id))));
  }

  async proposeExchange(payload: any) {
    const { appUser } = await this.getAppUser();
    const requesterId = Number(appUser.id);
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot send learning requests.');
    const receiverId = Number(payload.receiver_id);
    if (!Number.isInteger(receiverId) || receiverId <= 0) throw new Error('Choose a valid learning partner.');
    if (receiverId === requesterId) throw new Error('You cannot send a learning request to yourself.');

    const receiverResult = await insforge.database
      .from('users')
      .select('id,email,full_name,avatar_url,bio,headline,latitude,longitude,address_display,exchange_radius_km,location_visibility,availability,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,premium,verified,is_active,is_admin,onboarding_completed,primary_intent,created_at,updated_at')
      .eq('id', receiverId)
      .eq('is_active', true)
      .maybeSingle();
    if (receiverResult.error) throw new Error(receiverResult.error.message || 'Unable to load learning partner.');
    if (!receiverResult.data) throw new Error('Learning partner not found or inactive.');

    const blocked = await insforge.database
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${requesterId},blocked_id.eq.${requesterId}`);
    if (blocked.error) throw new Error(blocked.error.message || 'Unable to check connection safety.');
    if ((blocked.data ?? []).some((b: any) => {
      const blocker = Number(b.blocker_id), blockedId = Number(b.blocked_id);
      return (blocker === requesterId && blockedId === receiverId) || (blocker === receiverId && blockedId === requesterId);
    })) {
      throw new Error('You cannot send a learning request to this member.');
    }

    const existingResult = await insforge.database
      .from('exchanges')
      .select('id,status,requester_id,receiver_id')
      .or(`requester_id.eq.${requesterId},receiver_id.eq.${requesterId}`);
    if (existingResult.error) throw new Error(existingResult.error.message || 'Unable to check existing learning requests.');
    const hasOpenExchange = (existingResult.data ?? []).some((exchange: any) => {
      const isSamePair =
        (Number(exchange.requester_id) === requesterId && Number(exchange.receiver_id) === receiverId) ||
        (Number(exchange.requester_id) === receiverId && Number(exchange.receiver_id) === requesterId);
      return isSamePair && ['PENDING', 'COUNTERED', 'ACTIVE'].includes(String(exchange.status).toUpperCase());
    });
    if (hasOpenExchange) {
      throw new Error('You already have an open learning request with this member.');
    }

    const requesterSkillName = String(payload.requester_skill_name ?? '').trim();
    const receiverSkillName = String(payload.receiver_skill_name ?? '').trim();
    const proposalMessage = String(payload.proposal_message ?? '').trim();
    const preferredDate = String(payload.preferred_date ?? '').trim();
    const locationArea = String(payload.location_area ?? '').trim();
    const estimatedHours = Number(payload.estimated_hours ?? 2);

    if (!requesterSkillName) throw new Error('Choose a skill you can teach.');
    if (!receiverSkillName) throw new Error('Choose a skill you want to learn.');
    if (!proposalMessage) throw new Error('Tell your learning partner what you want to learn.');
    if (proposalMessage.length > 2000) throw new Error('Your learning request is too long. Keep it under 2000 characters.');
    if (!Number.isFinite(estimatedHours) || estimatedHours < 0.5 || estimatedHours > 24) throw new Error('Session length must be between 0.5 and 24 hours.');
    if (preferredDate.length > 200) throw new Error('Preferred session time must be 200 characters or less.');
    if (locationArea.length > 200) throw new Error('Session location must be 200 characters or less.');

    const requesterSkills = await this.getUserSkills(requesterId);
    const receiverSkills = await this.getUserSkills(receiverId);
    const requesterSkill = requesterSkills.find((skill: any) =>
      skill.skill_type === 'OFFERED' && String(skill.skill_name).trim().toLowerCase() === requesterSkillName.toLowerCase()
    );
    const receiverSkill = receiverSkills.find((skill: any) =>
      skill.skill_type === 'OFFERED' && String(skill.skill_name).trim().toLowerCase() === receiverSkillName.toLowerCase()
    );
    if (!requesterSkill) throw new Error('The selected teaching skill is not in your offered skills.');
    if (!receiverSkill) throw new Error('That learning skill is not currently offered by this partner.');

    const { data, error } = await insforge.database.from('exchanges').insert({
      requester_id: requesterId,
      receiver_id: receiverId,
      requester_skill_id: Number(requesterSkill.skill_id),
      receiver_skill_id: Number(receiverSkill.skill_id),
      status: 'PENDING',
      proposal_message: proposalMessage,
      preferred_date: preferredDate || 'This week',
      estimated_hours: estimatedHours,
      location_area: locationArea || 'Online or a shared campus space',
      requester_completed: false,
      receiver_completed: false,
    }).select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at').single();
    if (error) throw new Error(error.message || 'Unable to send learning request.');

    const notification = await insforge.database.from('notifications').insert({
      user_id: receiverId,
      type: 'EXCHANGE_REQUEST',
      title: 'New learning request',
      message: `${appUser.full_name} wants to learn ${receiverSkillName} and can teach ${requesterSkillName}.`,
      link: `/exchanges/${data.id}`,
    });
    if (notification.error) console.warn('Learning request notification warning:', notification.error);

    return await this.serializeExchange(data, requesterId);
  }

  async acceptExchange(id: number) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    if (Number(e.receiver_id) !== Number(appUser.id)) throw new Error('Only the recipient can accept this request.');
    if (e.status !== 'PENDING') throw new Error(`This exchange is already ${String(e.status).toLowerCase()}.`);

    const { data, error } = await insforge.database
      .from('exchanges')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('receiver_id', appUser.id)
      .eq('status', 'PENDING')
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to accept exchange');
    if (!data) throw new Error('This learning request is no longer pending.');
    await insforge.database.from('notifications').insert({
      user_id: Number(e.requester_id),
      type: 'EXCHANGE_ACCEPTED',
      title: 'Learning request accepted',
      message: `${appUser.full_name} accepted your learning request.`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, Number(appUser.id));
  }

  async rejectExchange(id: number) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    if (Number(e.receiver_id) !== Number(appUser.id)) throw new Error('Only the recipient can decline this request.');
    if (e.status !== 'PENDING') throw new Error(`This exchange is already ${String(e.status).toLowerCase()}.`);

    const { data, error } = await insforge.database
      .from('exchanges')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('receiver_id', appUser.id)
      .eq('status', 'PENDING')
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to decline exchange');
    if (!data) throw new Error('This learning request is no longer pending.');
    await insforge.database.from('notifications').insert({
      user_id: Number(e.requester_id),
      type: 'EXCHANGE_REJECTED',
      title: 'Learning request declined',
      message: `${appUser.full_name} declined your learning request.`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, Number(appUser.id));
  }

  async withdrawExchange(id: number) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    if (Number(e.requester_id) !== Number(appUser.id)) throw new Error('Only the requester can withdraw this proposal.');
    if (e.status !== 'PENDING') throw new Error(`This proposal is already ${String(e.status).toLowerCase()}.`);

    const { data, error } = await insforge.database
      .from('exchanges')
      .update({
        status: 'CANCELLED',
        cancellation_reason: 'Withdrawn by requester',
        cancelled_by_id: appUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('requester_id', appUser.id)
      .eq('status', 'PENDING')
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to withdraw proposal');
    if (!data) throw new Error('This learning request is no longer pending.');
    await insforge.database.from('notifications').insert({
      user_id: Number(e.receiver_id),
      type: 'EXCHANGE_WITHDRAWN',
      title: 'Learning request withdrawn',
      message: `${appUser.full_name} withdrew the learning request.`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, Number(appUser.id));
  }

  async cancelExchange(id: number, reason: string) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    if (Number(e.requester_id) !== Number(appUser.id) && Number(e.receiver_id) !== Number(appUser.id)) throw new Error('Not authorized to cancel this exchange.');
    if (e.status !== 'ACTIVE') throw new Error('Only active exchanges can be cancelled.');
    const clean = String(reason || '').trim();
    if (!clean) throw new Error('Please provide a cancellation reason.');
    if (clean.length > 500) throw new Error('Cancellation reason must be 500 characters or less.');

    const { data, error } = await insforge.database
      .from('exchanges')
      .update({
        status: 'CANCELLED',
        cancellation_reason: clean,
        cancelled_by_id: appUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('status', ['ACTIVE'])
      .or(`requester_id.eq.${appUser.id},receiver_id.eq.${appUser.id}`)
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to cancel exchange');
    if (!data) throw new Error('This learning exchange is no longer active.');
    const partnerId = Number(e.requester_id) === Number(appUser.id) ? Number(e.receiver_id) : Number(e.requester_id);
    await insforge.database.from('notifications').insert({
      user_id: partnerId,
      type: 'EXCHANGE_CANCELLED',
      title: 'Learning exchange cancelled',
      message: `${appUser.full_name} cancelled the learning exchange. Reason: ${clean}`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, Number(appUser.id));
  }

  async startExchange(id: number) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    const uid = Number(appUser.id);
    if (uid !== Number(e.requester_id) && uid !== Number(e.receiver_id)) throw new Error('Not authorized.');
    if (e.status !== 'ACTIVE' && e.status !== 'ACCEPTED') throw new Error('This exchange is not ready to start.');

    if (e.status === 'ACTIVE') return this.serializeExchange(e, uid);

    const { data, error } = await insforge.database
      .from('exchanges')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['ACCEPTED'])
      .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to start exchange');
    if (!data) throw new Error('This learning exchange is no longer ready to start.');
    return this.serializeExchange(data, uid);
  }

  async updateExchangeSchedule(id: number, payload: { preferred_date?: string; estimated_hours?: number; location_area?: string }) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    const uid = Number(appUser.id);
    if (uid !== Number(e.requester_id) && uid !== Number(e.receiver_id)) throw new Error('Not authorized.');
    if (e.status !== 'ACTIVE') throw new Error('Schedule details can be updated after the learning request is accepted.');
    const preferredDate = String(payload.preferred_date || '').trim();
    const location = String(payload.location_area || '').trim();
    const hours = Number(payload.estimated_hours);
    if (!preferredDate) throw new Error('Please choose a preferred date or time.');
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) throw new Error('Estimated hours must be between 0.5 and 24.');
    if (preferredDate.length > 200) throw new Error('Preferred session time must be 200 characters or less.');
    if (location.length > 200) throw new Error('Session location must be 200 characters or less.');

    const patch = {
      preferred_date: preferredDate,
      estimated_hours: hours,
      location_area: location || e.location_area || 'Online or a shared campus space',
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await insforge.database
      .from('exchanges')
      .update(patch)
      .eq('id', id)
      .eq('status', 'ACTIVE')
      .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
      .select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Unable to update exchange schedule');
    if (!data) throw new Error('This learning exchange is no longer editable.');
    const partnerId = uid === Number(e.requester_id) ? Number(e.receiver_id) : Number(e.requester_id);
    await insforge.database.from('notifications').insert({
      user_id: partnerId,
      type: 'EXCHANGE_SCHEDULE_UPDATED',
      title: 'Learning session updated',
      message: `${appUser.full_name} updated the session schedule to ${preferredDate}.`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, uid);
  }

  async completeExchange(id: number) {
    const { appUser } = await this.getAppUser();
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot modify learning exchanges.');
    const e = await this.getExchangeRow(id);
    const uid = Number(appUser.id);
    if (uid !== Number(e.requester_id) && uid !== Number(e.receiver_id)) throw new Error('Not authorized.');
    if (e.status !== 'ACTIVE') throw new Error('Only active exchanges can be completed.');

    const alreadyCompleted = uid === Number(e.requester_id) ? Boolean(e.requester_completed) : Boolean(e.receiver_completed);
    if (alreadyCompleted) throw new Error('You have already confirmed completion for this learning session.');

    const patch: any = uid === Number(e.requester_id) ? { requester_completed: true } : { receiver_completed: true };
    const both = uid === Number(e.requester_id) ? Boolean(e.receiver_completed) : Boolean(e.requester_completed);
    if (both) patch.status = 'COMPLETED';

    let query: any = insforge.database.from('exchanges').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'ACTIVE');
    query = uid === Number(e.requester_id) ? query.eq('requester_completed', false) : query.eq('receiver_completed', false);
    query = query.or(`requester_id.eq.${uid},receiver_id.eq.${uid}`);
    const { data, error } = await query.select('id,requester_id,receiver_id,requester_skill_id,receiver_skill_id,status,proposal_message,preferred_date,estimated_hours,location_area,requester_completed,receiver_completed,cancellation_reason,cancelled_by_id,created_at,updated_at').maybeSingle();
    if (error) throw new Error(error.message || 'Unable to confirm completion');
    if (!data) throw new Error('Completion was already confirmed or the learning exchange changed state.');

    const partnerId = uid === Number(e.requester_id) ? Number(e.receiver_id) : Number(e.requester_id);
    await insforge.database.from('notifications').insert({
      user_id: partnerId,
      type: patch.status === 'COMPLETED' ? 'EXCHANGE_COMPLETED' : 'EXCHANGE_COMPLETION_PENDING',
      title: patch.status === 'COMPLETED' ? 'Learning exchange completed' : 'Completion confirmed',
      message: patch.status === 'COMPLETED'
        ? `${appUser.full_name} confirmed the learning session and it is now completed.`
        : `${appUser.full_name} confirmed their side of the learning session.`,
      link: `/exchanges/${id}`,
    });
    return this.serializeExchange(data, uid);
  }

  async getExchange(id: number) { const { appUser } = await this.getAppUser(); const e = await this.getExchangeRow(id); if (Number(e.requester_id) !== Number(appUser.id) && Number(e.receiver_id) !== Number(appUser.id)) throw new Error('Not authorized.'); return this.serializeExchange(e, Number(appUser.id)); }

  async getNotifications() {
    const { appUser } = await this.getAppUser();
    const r = await insforge.database.from('notifications')
      .select('id,user_id,type,title,message,link,is_read,created_at')
      .eq('user_id', appUser.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (r.error) throw new Error(r.error.message || 'Unable to load notifications');
    return r.data || [];
  }
  async markNotificationRead(id: number) {
    const { appUser } = await this.getAppUser();
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) throw new Error('Invalid notification.');
    const r = await insforge.database.from('notifications')
      .update({ is_read: true })
      .eq('id', Number(id))
      .eq('user_id', appUser.id)
      .select('id,user_id,type,title,message,link,is_read,created_at')
      .single();
    if (r.error) throw new Error(r.error.message || 'Unable to mark notification');
    return r.data;
  }
  async markAllNotificationsRead() { const { appUser } = await this.getAppUser(); const r = await insforge.database.from('notifications').update({ is_read: true }).eq('user_id', appUser.id).eq('is_read', false); if (r.error) throw new Error(r.error.message || 'Unable to update notifications'); return true; }

  async sendMessage(payload: any) {
    const { appUser } = await this.getAppUser();
    const senderId = Number(appUser.id);
    const receiverId = Number(payload.receiver_id);
    const content = String(payload.content || '').trim();
    const exchangeId = payload.exchange_id == null || payload.exchange_id === '' ? null : Number(payload.exchange_id);
    if (!Number.isInteger(receiverId) || receiverId <= 0 || receiverId === senderId) throw new Error('Choose a valid recipient.');
    if (appUser.is_active === false) throw new Error('Your account is inactive and cannot send messages.');
    if (!content) throw new Error('Message cannot be empty.');

    const recipient = await insforge.database.from('users').select('id,is_active').eq('id', receiverId).maybeSingle();
    if (recipient.error) throw new Error(recipient.error.message || 'Unable to verify recipient.');
    if (!recipient.data || recipient.data.is_active === false) throw new Error('This member is inactive and cannot receive messages.');
    const blockCheck = await insforge.database.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${senderId},blocked_id.eq.${senderId}`);
    if (blockCheck.error) throw new Error(blockCheck.error.message || 'Unable to check communication settings.');
    if ((blockCheck.data ?? []).some((b: any) => (Number(b.blocker_id) === senderId && Number(b.blocked_id) === receiverId) || (Number(b.blocker_id) === receiverId && Number(b.blocked_id) === senderId))) {
      throw new Error('Communication is not available with this member.');
    }
    if (content.length > 2000) throw new Error('Message is too long. Keep it under 2000 characters.');

    if (exchangeId !== null) {
      if (!Number.isInteger(exchangeId) || exchangeId <= 0) throw new Error('Choose a valid learning exchange.');
      const exchange = await this.getExchangeRow(exchangeId);
      const isParticipant = senderId === Number(exchange.requester_id) || senderId === Number(exchange.receiver_id);
      if (!isParticipant) throw new Error('You are not a participant in this learning exchange.');
      const partnerId = senderId === Number(exchange.requester_id) ? Number(exchange.receiver_id) : Number(exchange.requester_id);
      if (receiverId !== partnerId) throw new Error('Messages for this exchange can only be sent to your learning partner.');
      if (!['PENDING', 'COUNTERED', 'ACTIVE', 'ACCEPTED', 'COMPLETED'].includes(String(exchange.status).toUpperCase())) {
        throw new Error('Messaging is unavailable for this exchange.');
      }
    } else {
      const relationship = await insforge.database
        .from('exchanges')
        .select('id,status,requester_id,receiver_id')
        .or(`requester_id.eq.${senderId},receiver_id.eq.${senderId}`);
      if (relationship.error) throw new Error(relationship.error.message || 'Unable to verify learning relationship.');
      const allowed = (relationship.data ?? []).some((exchange: any) =>
        (Number(exchange.requester_id) === senderId && Number(exchange.receiver_id) === receiverId ||
         Number(exchange.requester_id) === receiverId && Number(exchange.receiver_id) === senderId) &&
        ['PENDING', 'COUNTERED', 'ACTIVE', 'ACCEPTED', 'COMPLETED'].includes(String(exchange.status).toUpperCase())
      );
      if (!allowed) throw new Error('Start a learning exchange before messaging this member.');
    }

    const r = await insforge.database.from('messages').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      exchange_id: exchangeId,
    }).select('id,sender_id,receiver_id,content,is_read,created_at,exchange_id').single();
    if (r.error) throw new Error(r.error.message || 'Unable to send message');
    await insforge.database.from('notifications').insert({
      user_id: receiverId,
      type: 'MESSAGE',
      title: 'New message',
      message: `${appUser.full_name} sent you a message.`,
      link: `/messages/${senderId}`,
    });
    return r.data;
  }

  async getConversations() {
    const { appUser } = await this.getAppUser();
    const uid = Number(appUser.id);

    const [messagesResult, exchangesResult, blocksResult] = await Promise.all([
      insforge.database
        .from('messages')
        .select('id,sender_id,receiver_id,content,is_read,created_at,exchange_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(500),
      insforge.database
        .from('exchanges')
        .select('id,requester_id,receiver_id,status,created_at')
        .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false }),
      insforge.database
        .from('blocks')
        .select('blocker_id,blocked_id')
        .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`),
    ]);

    if (messagesResult.error) throw new Error(messagesResult.error.message || 'Unable to load conversations');
    if (exchangesResult.error) throw new Error(exchangesResult.error.message || 'Unable to load learning exchanges');
    if (blocksResult.error) throw new Error(blocksResult.error.message || 'Unable to load communication settings');

    const blocked = new Set<number>();
    for (const block of blocksResult.data ?? []) {
      const blocker = Number(block.blocker_id), blockedId = Number(block.blocked_id);
      if (blocker === uid) blocked.add(blockedId);
      if (blockedId === uid) blocked.add(blocker);
    }

    const partnerIds = new Set<number>();
    for (const message of messagesResult.data ?? []) {
      const partnerId = Number(message.sender_id) === uid ? Number(message.receiver_id) : Number(message.sender_id);
      if (partnerId && partnerId !== uid && !blocked.has(partnerId)) partnerIds.add(partnerId);
    }
    for (const exchange of exchangesResult.data ?? []) {
      const partnerId = Number(exchange.requester_id) === uid ? Number(exchange.receiver_id) : Number(exchange.requester_id);
      if (partnerId && partnerId !== uid && !blocked.has(partnerId)) partnerIds.add(partnerId);
    }

    const conversations: any[] = [];
    for (const partnerId of partnerIds) {
      const partnerResult = await insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,is_active').eq('id', partnerId).eq('is_active', true).maybeSingle();
      if (partnerResult.error) throw new Error(partnerResult.error.message || 'Unable to load conversation partner');
      if (!partnerResult.data) continue;

      const pairMessages = (messagesResult.data ?? []).filter((message: any) =>
        (Number(message.sender_id) === uid && Number(message.receiver_id) === partnerId) ||
        (Number(message.sender_id) === partnerId && Number(message.receiver_id) === uid)
      );

      const pairExchanges = (exchangesResult.data ?? []).filter((exchange: any) =>
        (Number(exchange.requester_id) === uid && Number(exchange.receiver_id) === partnerId) ||
        (Number(exchange.requester_id) === partnerId && Number(exchange.receiver_id) === uid)
      );
      const hasMessagingRelationship = pairExchanges.some((exchange: any) =>
        ['PENDING', 'COUNTERED', 'ACTIVE', 'ACCEPTED', 'COMPLETED'].includes(String(exchange.status).toUpperCase())
      );
      // Do not expose stale conversations after every learning relationship has ended.
      if (!hasMessagingRelationship) continue;

      const lastMessage = pairMessages[0] ?? null;
      const unreadCount = pairMessages.filter((message: any) => Number(message.sender_id) === partnerId && Number(message.receiver_id) === uid && !message.is_read).length;
      const activeExchange = pairExchanges.find((exchange: any) => ['PENDING', 'COUNTERED', 'ACTIVE', 'ACCEPTED'].includes(String(exchange.status).toUpperCase()))
        ?? pairExchanges.find((exchange: any) => String(exchange.status).toUpperCase() === 'COMPLETED')
        ?? null;

      conversations.push({
        partner: {
          id: partnerResult.data.id,
          full_name: partnerResult.data.full_name,
          avatar_url: partnerResult.data.avatar_url,
          headline: partnerResult.data.headline,
          trust_score: partnerResult.data.trust_score,
        },
        last_message: lastMessage ? { id: lastMessage.id, content: lastMessage.content, created_at: lastMessage.created_at } : null,
        last_message_at: lastMessage?.created_at ?? activeExchange?.created_at ?? null,
        unread_count: unreadCount,
        active_exchange_id: activeExchange?.id ?? null,
        active_exchange_status: activeExchange?.status ?? null,
      });
    }

    return conversations.sort((a, b) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
    );
  }

  async getMessages(partnerId: number) {
    const { appUser } = await this.getAppUser();
    const uid = Number(appUser.id);
    const pid = Number(partnerId);
    if (!Number.isInteger(pid) || pid <= 0 || pid === uid) throw new Error('Choose a valid learning partner.');

    const blocksResult = await insforge.database
      .from('blocks')
      .select('blocker_id,blocked_id')
      .or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`);
    if (blocksResult.error) throw new Error(blocksResult.error.message || 'Unable to check communication settings.');
    if ((blocksResult.data ?? []).some((block: any) => {
      const a = Number(block.blocker_id), b = Number(block.blocked_id);
      return (a === uid && b === pid) || (a === pid && b === uid);
    })) {
      throw new Error('Communication is not available with this member.');
    }

    const [exchangeResult, existingMessagesResult] = await Promise.all([
      insforge.database
        .from('exchanges')
        .select('id,status,requester_id,receiver_id')
        .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`),
      insforge.database
        .from('messages')
        .select('id,sender_id,receiver_id,content,is_read,created_at,exchange_id')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: true })
        .limit(500),
    ]);
    if (exchangeResult.error) throw new Error(exchangeResult.error.message || 'Unable to check learning relationship.');
    if (existingMessagesResult.error) throw new Error(existingMessagesResult.error.message || 'Unable to load messages.');

    const pairExchanges = (exchangeResult.data ?? []).filter((exchange: any) =>
      (Number(exchange.requester_id) === uid && Number(exchange.receiver_id) === pid) ||
      (Number(exchange.requester_id) === pid && Number(exchange.receiver_id) === uid)
    );
    const hasLearningRelationship = pairExchanges.some((exchange: any) =>
      ['PENDING', 'COUNTERED', 'ACTIVE', 'ACCEPTED', 'COMPLETED'].includes(String(exchange.status).toUpperCase())
    );
    const pairMessages = (existingMessagesResult.data ?? []).filter((message: any) =>
      (Number(message.sender_id) === uid && Number(message.receiver_id) === pid) ||
      (Number(message.sender_id) === pid && Number(message.receiver_id) === uid)
    );

    if (!hasLearningRelationship) {
      throw new Error('Start a learning exchange before messaging this member.');
    }

    const unreadIds = pairMessages
      .filter((message: any) => Number(message.sender_id) === pid && Number(message.receiver_id) === uid && !message.is_read)
      .map((message: any) => message.id);
    if (unreadIds.length) {
      const readResult = await insforge.database
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds)
        .eq('receiver_id', uid);
      if (readResult.error) throw new Error(readResult.error.message || 'Unable to mark messages as read.');
      for (const message of pairMessages) {
        if (unreadIds.includes(message.id)) message.is_read = true;
      }
    }

    return pairMessages;
  }

  async getFeed(type?: string) {
    const { appUser } = await this.getAppUser();
    const q: any = insforge.database.from('posts')
      .select('id,author_id,post_type,title,content,likes_count,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (type) q.eq('post_type', type);
    const r = await q;
    if (r.error) throw new Error(r.error.message || 'Unable to load feed');
    const blocked = await insforge.database.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${appUser.id},blocked_id.eq.${appUser.id}`);
    if (blocked.error) throw new Error(blocked.error.message || 'Unable to load community safety settings');
    const excluded = new Set<number>();
    for (const b of blocked.data ?? []) { excluded.add(Number(b.blocker_id)); excluded.add(Number(b.blocked_id)); }
    return (r.data ?? []).filter((post: any) => !excluded.has(Number(post.author_id)));
  }

  async createPost(payload: any) {
    const { appUser } = await this.getAppUser();
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();
    if (!content) throw new Error('Post content cannot be empty.');
    if (title.length > 120) throw new Error('Post title must be 120 characters or fewer.');
    if (content.length > 2000) throw new Error('Post content must be 2000 characters or fewer.');
    const postType = String(payload.post_type || 'COMMUNITY').trim().toUpperCase();
    const allowedTypes = new Set(['COMMUNITY', 'SKILL_OFFER', 'SKILL_REQUEST', 'UPDATE']);
    if (!allowedTypes.has(postType)) throw new Error('Unsupported community post type.');
    const recent = await insforge.database.from('posts').select('id,created_at').eq('author_id', appUser.id).order('created_at', { ascending: false }).limit(5);
    if (recent.error) throw new Error(recent.error.message || 'Unable to check posting limits');
    const now = Date.now();
    const recentCount = (recent.data ?? []).filter((p: any) => now - new Date(p.created_at).getTime() < 10 * 60 * 1000).length;
    if (recentCount >= 5) throw new Error('Posting limit reached. Please wait a few minutes before sharing more updates.');
    const r = await insforge.database.from('posts').insert({ author_id: appUser.id, post_type: postType, title: title || null, content, likes_count: 0 }).select('id,author_id,post_type,title,content,likes_count,created_at').single();
    if (r.error) throw new Error(r.error.message || 'Unable to publish post');
    return r.data;
  }

  async likePost(id: number) {
    const { appUser } = await this.getAppUser();
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) throw new Error('Invalid post.');
    const post = await insforge.database.from('posts').select('id,likes_count,author_id').eq('id', postId).maybeSingle();
    if (post.error || !post.data) throw new Error(post.error?.message || 'Post not found');
    const blocked = await insforge.database.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${appUser.id},blocked_id.eq.${appUser.id}`);
    if (blocked.error) throw new Error(blocked.error.message || 'Unable to check community safety settings');
    if ((blocked.data ?? []).some((b: any) => Number(b.blocker_id) === Number(post.data.author_id) || Number(b.blocked_id) === Number(post.data.author_id))) {
      throw new Error('You cannot interact with this member’s post.');
    }
    const existing = await insforge.database.from('post_likes').select('id').eq('post_id', postId).eq('user_id', appUser.id).maybeSingle();
    if (!existing.error && existing.data) throw new Error('You already liked this update.');
    if (existing.error) {
      const message = String(existing.error.message || '').toLowerCase();
      // If the likes table is missing, do not silently mutate a denormalized
      // counter that cannot enforce one-like-per-user safely.
      if (message.includes('relation') || message.includes('does not exist') || message.includes('not found')) {
        throw new Error('Likes are temporarily unavailable while community reactions are being secured.');
      }
      throw new Error(existing.error.message || 'Unable to check like status');
    }

    const like = await insforge.database.from('post_likes').insert({
      post_id: postId,
      user_id: appUser.id,
    }).select('id,post_id,user_id').single();
    if (like.error) {
      if (/duplicate|unique|already exists/i.test(String(like.error.message || ''))) {
        throw new Error('You already liked this update.');
      }
      throw new Error(like.error.message || 'Unable to like post');
    }

    // Only increment the visible counter after the durable like record exists.
    const updated = await insforge.database
      .from('posts')
      .update({ likes_count: Number(post.data.likes_count || 0) + 1 })
      .eq('id', postId)
      .select('id,likes_count')
      .single();
    if (updated.error) {
      // Keep the durable reaction from being presented as successful if the
      // denormalized counter cannot be updated.
      await insforge.database.from('post_likes').delete().eq('id', like.data.id).eq('user_id', appUser.id);
      throw new Error(updated.error.message || 'Unable to update like count');
    }
    return updated.data;
  }
  private async recalculateTrustScore(userId: number) {
    const [reviewsResult, exchangesResult] = await Promise.all([
      insforge.database.from('reviews').select('rating,reliability_score,skill_quality_score,would_exchange_again').eq('reviewee_id', userId),
      insforge.database.from('exchanges').select('status,cancelled_by_id,requester_id,receiver_id').or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
    ]);
    if (reviewsResult.error) throw new Error(reviewsResult.error.message || 'Unable to recalculate trust score');
    if (exchangesResult.error) throw new Error(exchangesResult.error.message || 'Unable to recalculate trust score');

    const reviews = reviewsResult.data ?? [];
    const exchanges = exchangesResult.data ?? [];
    const reviewsCount = reviews.length;
    const avgRating = reviewsCount ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / reviewsCount : 4.5;
    const avgSkillQuality = reviewsCount ? reviews.reduce((sum: number, r: any) => sum + Number(r.skill_quality_score || 0), 0) / reviewsCount : 4.5;
    const avgReliability = reviewsCount ? reviews.reduce((sum: number, r: any) => sum + Number(r.reliability_score || 0), 0) / reviewsCount : 4.5;
    const wouldAgainRatio = reviewsCount ? reviews.filter((r: any) => Boolean(r.would_exchange_again)).length / reviewsCount : 1;
    const reviewQualityScore = reviewsCount ? ((avgRating / 5) * 30) + (wouldAgainRatio * 10) : 36;

    const completedCount = exchanges.filter((e: any) => e.status === 'COMPLETED').length;
    const cancelledByUserCount = exchanges.filter((e: any) => e.status === 'CANCELLED' && Number(e.cancelled_by_id) === userId).length;
    const totalSettled = completedCount + cancelledByUserCount;
    const completionRatio = totalSettled ? completedCount / totalSettled : 1;
    const reliabilityScorePts = totalSettled ? completionRatio * 25 : 22.5;

    const receivedProposals = exchanges.filter((e: any) => Number(e.receiver_id) === userId);
    const answeredProposals = receivedProposals.filter((e: any) => e.status !== 'PENDING');
    const responseRatio = receivedProposals.length ? answeredProposals.length / receivedProposals.length : 1;
    const responseRatePts = receivedProposals.length ? responseRatio * 15 : 14;

    const volumePts = completedCount > 0 ? Math.min(10, (Math.log(1 + completedCount) / Math.log(11)) * 10) : 7;

    const reportsResult = await insforge.database.from('safety_reports').select('id').eq('reported_user_id', userId).eq('status', 'RESOLVED');
    if (reportsResult.error) throw new Error(reportsResult.error.message || 'Unable to recalculate safety standing');
    const safetyPenalty = Math.min(10, (reportsResult.data?.length ?? 0) * 5);
    const safetyPts = Math.max(0, 10 - safetyPenalty);

    const finalScore = Math.min(Math.max(Math.round(reviewQualityScore + reliabilityScorePts + responseRatePts + volumePts + safetyPts), 10), 100);
    const calcReliability = Math.round((completionRatio * 0.6 + (avgReliability / 5) * 0.4) * 100);
    const calcSkillQuality = Math.round((avgSkillQuality / 5) * 100);
    const calcResponseRate = Math.round(responseRatio * 100);

    const currentSkills = await this.getUserSkills(userId);
    const categories = new Set(currentSkills.map((skill: any) => skill.category));
    const badges: string[] = [];
    if (completedCount >= 5 && avgRating >= 4.5) badges.push('Reliable Exchanger');
    if (categories.size >= 3) badges.push('Community Helper');
    if (finalScore >= 90 && completedCount >= 5) badges.push('Top Contributor');
    if (completedCount >= 10) badges.push('10+ Successful Exchanges');

    const { data, error } = await insforge.database.from('users').update({
      trust_score: finalScore,
      reliability_score: calcReliability,
      response_rate: calcResponseRate,
      skill_quality_score: calcSkillQuality,
      completed_exchanges_count: completedCount,
      reviews_count: reviewsCount,
      badges,
      updated_at: new Date().toISOString(),
    }).eq('id', userId).select('id,trust_score,reliability_score,response_rate,skill_quality_score,completed_exchanges_count,reviews_count,badges,updated_at').single();
    if (error) throw new Error(error.message || 'Unable to update trust score');
    return data;
  }

  private async requireAdmin() {
    const { appUser } = await this.getAppUser();
    if (appUser?.is_admin !== true) throw new Error('Administrative privileges required.');
    return appUser;
  }

  async getAdminStats() {
    await this.requireAdmin();
    const [users, exchanges, reports] = await Promise.all([
      insforge.database.from('users').select('id,is_active,trust_score'),
      insforge.database.from('exchanges').select('id,status'),
      insforge.database.from('reports').select('id,status'),
    ]);
    if (users.error) throw new Error(users.error.message || 'Unable to load admin users');
    if (exchanges.error) throw new Error(exchanges.error.message || 'Unable to load admin exchanges');
    if (reports.error) throw new Error(reports.error.message || 'Unable to load safety reports');
    const userRows = users.data ?? [];
    const exchangeRows = exchanges.data ?? [];
    const reportRows = reports.data ?? [];
    const trustValues = userRows.map((u: any) => Number(u.trust_score)).filter((v: number) => Number.isFinite(v));
    return {
      total_users: userRows.length,
      active_users: userRows.filter((u: any) => u.is_active !== false).length,
      total_exchanges: exchangeRows.length,
      completed_exchanges: exchangeRows.filter((e: any) => String(e.status).toUpperCase() === 'COMPLETED').length,
      pending_reports: reportRows.filter((r: any) => String(r.status).toUpperCase() === 'PENDING').length,
      average_trust_score: trustValues.length ? Math.round((trustValues.reduce((a: number, b: number) => a + b, 0) / trustValues.length) * 10) / 10 : 0,
    };
  }

  async getAdminUsers() {
    await this.requireAdmin();
    const result = await insforge.database.from('users').select('id,email,full_name,headline,trust_score,completed_exchanges_count,is_active,is_admin,created_at').order('id', { ascending: true }).limit(100);
    if (result.error) throw new Error(result.error.message || 'Unable to load admin users');
    return result.data ?? [];
  }

  async toggleAdminUserActive(userId: number) {
    const admin = await this.requireAdmin();
    const targetId = Number(userId);
    if (!Number.isInteger(targetId) || targetId <= 0) throw new Error('Invalid user.');
    if (targetId === Number(admin.id)) throw new Error('You cannot deactivate your own admin account.');
    const target = await insforge.database.from('users').select('id,is_active,is_admin').eq('id', targetId).maybeSingle();
    if (target.error) throw new Error(target.error.message || 'Unable to load user');
    if (!target.data) throw new Error('User not found.');
    if (target.data.is_admin) throw new Error('Admin accounts cannot be deactivated from this view.');
    const result = await insforge.database.from('users').update({ is_active: target.data.is_active === false }).eq('id', targetId).select('id,is_active').single();
    if (result.error) throw new Error(result.error.message || 'Unable to change user status');
    return result.data;
  }

  async getAdminReports() {
    await this.requireAdmin();
    const result = await insforge.database.from('reports').select('id,reporter_id,reported_user_id,category,details,status,admin_note,created_at').order('created_at', { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message || 'Unable to load safety reports');
    const rows = result.data ?? [];
    const ids = new Set<number>();
    rows.forEach((r: any) => { if (r.reporter_id) ids.add(Number(r.reporter_id)); if (r.reported_user_id) ids.add(Number(r.reported_user_id)); });
    const profiles = new Map<number, any>();
    if (ids.size) {
      const users = await insforge.database.from('users').select('id,full_name').in('id', [...ids]);
      if (users.error) throw new Error(users.error.message || 'Unable to load report users');
      (users.data ?? []).forEach((u: any) => profiles.set(Number(u.id), u));
    }
    return rows.map((r: any) => ({ ...r, reporter_name: profiles.get(Number(r.reporter_id))?.full_name ?? 'Unknown', reported_name: profiles.get(Number(r.reported_user_id))?.full_name ?? 'N/A' }));
  }

  async resolveAdminReport(reportId: number, status: 'RESOLVED' | 'DISMISSED', adminNote?: string) {
    const admin = await this.requireAdmin();
    const id = Number(reportId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Invalid report.');
    const cleanNote = String(adminNote || '').trim();
    if (cleanNote.length > 2000) throw new Error('Admin note must be 2000 characters or less.');
    const result = await insforge.database.from('reports').update({ status, admin_note: cleanNote || null }).eq('id', id).eq('status', 'PENDING').select('id,reporter_id,reported_user_id,status,admin_note,created_at').maybeSingle();
    if (result.error) throw new Error(result.error.message || 'Unable to resolve report');
    if (!result.data) throw new Error('Report is missing or has already been resolved.');
    if (status === 'RESOLVED' && result.data.reported_user_id) await this.recalculateTrustScore(Number(result.data.reported_user_id));
    return result.data;
  }

  async getAdminExchanges() {
    await this.requireAdmin();
    const result = await insforge.database.from('exchanges').select('id,requester_id,receiver_id,status,proposal_message,created_at').order('created_at', { ascending: false }).limit(30);
    if (result.error) throw new Error(result.error.message || 'Unable to load exchange audit log');
    const rows = result.data ?? [];
    const ids = new Set<number>();
    rows.forEach((e: any) => { ids.add(Number(e.requester_id)); ids.add(Number(e.receiver_id)); });
    const profiles = new Map<number, any>();
    if (ids.size) {
      const users = await insforge.database.from('users').select('id,full_name').in('id', [...ids]);
      if (users.error) throw new Error(users.error.message || 'Unable to load exchange users');
      (users.data ?? []).forEach((u: any) => profiles.set(Number(u.id), u));
    }
    return rows.map((e: any) => ({ ...e, requester_name: profiles.get(Number(e.requester_id))?.full_name ?? 'User', receiver_name: profiles.get(Number(e.receiver_id))?.full_name ?? 'User' }));
  }

  async submitReview(payload: any) {
    const { appUser } = await this.getAppUser();
    const exchangeId = Number(payload.exchange_id);
    if (!Number.isInteger(exchangeId) || exchangeId <= 0) throw new Error('Exchange is required.');
    const exchange = await this.getExchangeRow(exchangeId);
    const uid = Number(appUser.id);
    if (uid !== Number(exchange.requester_id) && uid !== Number(exchange.receiver_id)) throw new Error('Only participants can review this learning exchange.');
    if (exchange.status !== 'COMPLETED') throw new Error('Reviews can only be submitted after both participants complete the learning session.');
    const existing = await insforge.database.from('reviews').select('id').eq('exchange_id', exchangeId).eq('reviewer_id', uid).maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check existing review');
    if (existing.data) throw new Error('You have already submitted a review for this learning exchange.');
    const revieweeId = uid === Number(exchange.requester_id) ? Number(exchange.receiver_id) : Number(exchange.requester_id);
    const rating = Number(payload.rating), reliabilityScore = Number(payload.reliability_score), skillQualityScore = Number(payload.skill_quality_score);
    const comment = String(payload.comment || '').trim();
    if (comment.length > 2000) throw new Error('Review comment must be 2000 characters or less.');
    if (![rating, reliabilityScore, skillQualityScore].every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) throw new Error('Ratings must be between 1 and 5.');
    const { data, error } = await insforge.database.from('reviews').insert({ exchange_id: exchangeId, reviewer_id: uid, reviewee_id: revieweeId, rating, reliability_score: reliabilityScore, skill_quality_score: skillQualityScore, would_exchange_again: Boolean(payload.would_exchange_again), comment: comment || null }).select('id,exchange_id,reviewer_id,reviewee_id,rating,reliability_score,skill_quality_score,would_exchange_again,comment,created_at').single();
    if (error) throw new Error(error.message || 'Unable to submit review');
    await this.recalculateTrustScore(revieweeId);
    await insforge.database.from('notifications').insert({ user_id: revieweeId, type: 'NEW_REVIEW', title: 'New learning review', message: appUser.full_name + ' left you a ' + rating + '-star learning review.', link: '/profile/' + revieweeId });
    return data;
  }
  async getUserReviews(userId: number) {
    return this.getReviews(userId);
  }

  async createReport(payload: any) {
    const { appUser } = await this.getAppUser();
    const reportedUserId = Number(payload?.reported_user_id);
    if (!Number.isInteger(reportedUserId) || reportedUserId <= 0) throw new Error('Invalid reported user.');
    if (reportedUserId === Number(appUser.id)) throw new Error('You cannot report your own profile.');
    const category = String(payload?.category || '').trim().slice(0, 120);
    const details = String(payload?.details || '').trim();
    if (!category) throw new Error('Report category is required.');
    if (!details) throw new Error('Please provide details for the report.');
    if (details.length > 2000) throw new Error('Report details must be 2000 characters or less.');

    const target = await insforge.database.from('users').select('id,is_active').eq('id', reportedUserId).maybeSingle();
    if (target.error) throw new Error(target.error.message || 'Unable to verify reported user.');
    if (!target.data) throw new Error('User not found.');

    const existing = await insforge.database.from('reports')
      .select('id,status')
      .eq('reporter_id', Number(appUser.id))
      .eq('reported_user_id', reportedUserId)
      .eq('status', 'PENDING')
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message || 'Unable to check existing report.');
    if (existing.data) throw new Error('You already have a pending report for this user.');

    const result = await insforge.database.from('reports')
      .insert({
        reporter_id: Number(appUser.id),
        reported_user_id: reportedUserId,
        category,
        details,
        status: 'PENDING',
        admin_note: null,
      })
      .select('id,reporter_id,reported_user_id,category,details,status,admin_note,created_at')
      .single();
    if (result.error) throw new Error(result.error.message || 'Unable to submit report.');
    return result.data;
  }

  async getReviews(userId: number) {
    const targetUserId = Number(userId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) throw new Error('Invalid user.');
    const r = await insforge.database.from('reviews')
      .select('id,exchange_id,reviewer_id,reviewee_id,rating,reliability_score,skill_quality_score,would_exchange_again,comment,created_at')
      .eq('reviewee_id', targetUserId)
      .order('created_at', { ascending: false });
    if (r.error) throw new Error(r.error.message || 'Unable to load reviews');
    return r.data || [];
  }
}

export const api = new ApiClient();
