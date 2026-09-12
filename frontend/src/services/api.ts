const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.clearToken();
      // Only redirect if not already on login or landing
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || response.statusText;
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } catch {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ access_token: string; user_id: number; email: string; full_name: string; is_admin: boolean }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    this.setToken(data.access_token);
    return data;
  }

  async register(payload: any) {
    const data = await this.request<{ access_token: string; user_id: number; email: string; full_name: string; is_admin: boolean }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    this.setToken(data.access_token);
    return data;
  }

  async demoSwitch(userId: number) {
    const data = await this.request<{ access_token: string; user_id: number; email: string; full_name: string; is_admin: boolean }>(
      `/auth/demo-switch/${userId}`,
      { method: 'POST' }
    );
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request<any>('/users/me');
  }

  async updateMe(payload: any) {
    return this.request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async logout() {
    this.clearToken();
  }

  // Users & Nearby
  async getNearbyUsers(radiusKm?: number) {
    const query = radiusKm ? `?radius_km=${radiusKm}` : '';
    return this.request<any[]>(`/users/nearby${query}`);
  }

  async getUserProfile(userId: number) {
    return this.request<any>(`/users/${userId}`);
  }

  // Skills
  async getSkills(category?: string) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<any[]>(`/skills${query}`);
  }

  async searchSkills(q: string) {
    return this.request<any[]>(`/skills/search?q=${encodeURIComponent(q)}`);
  }

  async addUserSkill(payload: { skill_name: string; category?: string; skill_type: 'OFFERED' | 'NEEDED'; experience_level?: string; description?: string }) {
    return this.request<any>('/skills/user/me', { method: 'POST', body: JSON.stringify(payload) });
  }

  async deleteUserSkill(userSkillId: number) {
    return this.request<any>(`/skills/user/me/${userSkillId}`, { method: 'DELETE' });
  }

  // Matching
  async getMatches() {
    return this.request<any[]>('/matches');
  }

  // Exchanges
  async getExchanges(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/exchanges${query}`);
  }

  async getExchangeDetails(id: number) {
    return this.request<any>(`/exchanges/${id}`);
  }

  async proposeExchange(payload: {
    receiver_id: number;
    requester_skill_name?: string;
    receiver_skill_name?: string;
    proposal_message: string;
    preferred_date?: string;
    estimated_hours?: number;
    location_area?: string;
  }) {
    return this.request<any>('/exchanges', { method: 'POST', body: JSON.stringify(payload) });
  }

  async acceptExchange(id: number) {
    return this.request<any>(`/exchanges/${id}/accept`, { method: 'PATCH' });
  }

  async counterExchange(id: number, payload: { counter_message: string; preferred_date?: string; estimated_hours?: number }) {
    return this.request<any>(`/exchanges/${id}/counter`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async rejectExchange(id: number) {
    return this.request<any>(`/exchanges/${id}/reject`, { method: 'PATCH' });
  }

  async startExchange(id: number) {
    return this.request<any>(`/exchanges/${id}/start`, { method: 'PATCH' });
  }

  async completeExchange(id: number) {
    return this.request<any>(`/exchanges/${id}/complete`, { method: 'PATCH' });
  }

  async cancelExchange(id: number, cancellation_reason: string) {
    return this.request<any>(`/exchanges/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ cancellation_reason }) });
  }

  // Reviews
  async submitReview(payload: {
    exchange_id: number;
    rating: number;
    reliability_score?: number;
    skill_quality_score?: number;
    would_exchange_again?: boolean;
    comment?: string;
  }) {
    return this.request<any>('/reviews', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getUserReviews(userId: number) {
    return this.request<any[]>(`/reviews/user/${userId}`);
  }

  // Trust Score
  async getTrustDetails(userId: number) {
    return this.request<any>(`/trust/user/${userId}`);
  }

  // Messages
  async getConversations() {
    return this.request<any[]>('/messages/conversations');
  }

  async getMessages(partnerId: number) {
    return this.request<any[]>(`/messages/${partnerId}`);
  }

  async sendMessage(payload: { receiver_id: number; content: string; exchange_id?: number }) {
    return this.request<any>('/messages', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Notifications
  async getNotifications() {
    return this.request<any[]>('/notifications');
  }

  async getUnreadNotificationCount() {
    return this.request<{ unread_count: number }>('/notifications/unread-count');
  }

  async markNotificationRead(id: number) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PATCH' });
  }

  // Connections
  async getConnections() {
    return this.request<any[]>('/connections');
  }

  async connectNeighbor(userId: number) {
    return this.request<any>(`/connections/${userId}`, { method: 'POST' });
  }

  async disconnectNeighbor(userId: number) {
    return this.request<any>(`/connections/${userId}`, { method: 'DELETE' });
  }

  async getConnectionSuggestions() {
    return this.request<any[]>('/connections/suggestions');
  }

  // Feed
  async getFeed(postType?: string) {
    const query = postType ? `?post_type=${postType}` : '';
    return this.request<any[]>(`/feed${query}`);
  }

  async createPost(payload: { post_type: string; title: string; content: string; skill_name?: string }) {
    return this.request<any>('/feed', { method: 'POST', body: JSON.stringify(payload) });
  }

  async likePost(postId: number) {
    return this.request<any>(`/feed/${postId}/like`, { method: 'POST' });
  }

  // Community
  async getCommunityStats() {
    return this.request<any>('/community/stats');
  }

  // Search
  async search(q: string, category?: string, minTrust?: number) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (category) params.append('category', category);
    if (minTrust) params.append('min_trust', minTrust.toString());
    return this.request<{ people: any[]; skills: any[]; posts: any[] }>(`/search?${params.toString()}`);
  }

  // Safety & Moderation
  async createReport(payload: { reported_user_id?: number; reported_exchange_id?: number; category: string; details: string }) {
    return this.request<any>('/reports', { method: 'POST', body: JSON.stringify(payload) });
  }

  async blockUser(userId: number) {
    return this.request<any>(`/blocks/${userId}`, { method: 'POST' });
  }

  async unblockUser(userId: number) {
    return this.request<any>(`/blocks/${userId}`, { method: 'DELETE' });
  }

  async getBlocks() {
    return this.request<any[]>('/blocks');
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async toggleAdminUserActive(userId: number) {
    return this.request<any>(`/admin/users/${userId}/toggle-active`, { method: 'PATCH' });
  }

  async getAdminReports(status?: string) {
    const query = status ? `?status_filter=${status}` : '';
    return this.request<any[]>(`/admin/reports${query}`);
  }

  async resolveAdminReport(reportId: number, status: 'RESOLVED' | 'DISMISSED', adminNote?: string) {
    const params = new URLSearchParams({ resolution_status: status });
    if (adminNote) params.append('admin_note', adminNote);
    return this.request<any>(`/admin/reports/${reportId}/resolve?${params.toString()}`, { method: 'PATCH' });
  }

  async getAdminExchanges() {
    return this.request<any[]>('/admin/exchanges');
  }
}

export const api = new ApiClient();
