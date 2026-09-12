import { api } from './api';
import { insforge } from '../lib/insforge';

const getAppUser = async () => {
  const { data: auth, error: authError } = await insforge.auth.getCurrentUser();
  if (authError || !auth?.user?.email) throw new Error(authError?.message || 'Not authenticated');
  const { data, error } = await insforge.database.from('users').select('*').eq('email', auth.user.email).maybeSingle();
  if (error) throw new Error(error.message || 'Unable to load application profile');
  if (!data) throw new Error('Application profile not found');
  return data;
};

const requireAdmin = async () => {
  const user = await getAppUser();
  if (user.is_admin !== true) throw new Error('Admin access required');
  return user;
};

const userSummary = (u: any) => u ? ({
  id: u.id, full_name: u.full_name, email: u.email, avatar_url: u.avatar_url,
  headline: u.headline, address_display: u.address_display, trust_score: u.trust_score,
  reliability_score: u.reliability_score, completed_exchanges_count: u.completed_exchanges_count,
}) : null;

const patch = api as any;

patch.submitReview = async (payload: any) => {
  const me = await getAppUser();
  const exchangeId = Number(payload.exchange_id);
  if (!exchangeId) throw new Error('Exchange is required');
  const { data: exchange, error: exchangeError } = await insforge.database.from('exchanges').select('*').eq('id', exchangeId).maybeSingle();
  if (exchangeError) throw new Error(exchangeError.message);
  if (!exchange || exchange.status !== 'COMPLETED') throw new Error('Only completed exchanges can be reviewed');
  if (Number(exchange.requester_id) !== Number(me.id) && Number(exchange.receiver_id) !== Number(me.id)) throw new Error('Not authorized');
  const revieweeId = Number(exchange.requester_id) === Number(me.id) ? Number(exchange.receiver_id) : Number(exchange.requester_id);
  const existing = await insforge.database.from('reviews').select('id').eq('exchange_id', exchangeId).eq('reviewer_id', Number(me.id)).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) throw new Error('You have already reviewed this exchange');
  const row = {
    exchange_id: exchangeId, reviewer_id: Number(me.id), reviewee_id: revieweeId,
    rating: Number(payload.rating), reliability_score: Number(payload.reliability_score ?? payload.rating),
    skill_quality_score: Number(payload.skill_quality_score ?? payload.rating),
    would_exchange_again: payload.would_exchange_again !== false, comment: payload.comment ?? null,
  };
  if (row.rating < 1 || row.rating > 5) throw new Error('Rating must be between 1 and 5');
  const { data, error } = await insforge.database.from('reviews').insert(row).select('*').single();
  if (error) throw new Error(error.message || 'Unable to submit review');
  await patch._recalculateTrust(revieweeId);
  return data;
};

patch.getUserReviews = async (userId: number) => {
  const { data, error } = await insforge.database.from('reviews').select('*').eq('reviewee_id', Number(userId)).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load reviews');
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: any) => Number(r.reviewer_id)))];
  const users = ids.length ? await insforge.database.from('users').select('*').in('id', ids) : { data: [], error: null } as any;
  const map = new Map((users.data ?? []).map((u: any) => [Number(u.id), u]));
  return rows.map((r: any) => ({ ...r, reviewer: userSummary(map.get(Number(r.reviewer_id))) }));
};

patch._recalculateTrust = async (userId: number) => {
  const { data: reviews, error } = await insforge.database.from('reviews').select('rating,reliability_score,skill_quality_score').eq('reviewee_id', Number(userId));
  if (error) return;
  const rows = reviews ?? [];
  if (!rows.length) return;
  const avg = (field: string) => rows.reduce((s: number, r: any) => s + Number(r[field] ?? 0), 0) / rows.length;
  const rating = avg('rating');
  const reliability = avg('reliability_score');
  const quality = avg('skill_quality_score');
  const trust = Math.round(Math.min(100, Math.max(0, rating / 5 * 40 + reliability / 5 * 30 + quality / 5 * 30)));
  await insforge.database.from('users').update({ trust_score: trust, reliability_score: Math.round(reliability * 20), skill_quality_score: Math.round(quality * 20), reviews_count: rows.length }).eq('id', Number(userId));
};

patch.getTrustDetails = async (userId: number) => {
  const { data: user, error } = await insforge.database.from('users').select('*').eq('id', Number(userId)).maybeSingle();
  if (error) throw new Error(error.message);
  if (!user) throw new Error('User not found');
  const { data: reviews, error: reviewError } = await insforge.database.from('reviews').select('rating,reliability_score,skill_quality_score,would_exchange_again').eq('reviewee_id', Number(userId));
  if (reviewError) throw new Error(reviewError.message);
  const rows = reviews ?? [];
  const avg = (field: string) => rows.length ? rows.reduce((s: number, r: any) => s + Number(r[field] ?? 0), 0) / rows.length : Number(user[field] ?? 0);
  return {
    user_id: user.id, trust_score: Number(user.trust_score ?? 0), reliability_score: Number(user.reliability_score ?? 0),
    skill_quality_score: Number(user.skill_quality_score ?? 0), response_rate: Number(user.response_rate ?? 0),
    reviews_count: rows.length, average_rating: rows.length ? avg('rating') : 0,
    average_reliability: rows.length ? avg('reliability_score') : 0,
    average_skill_quality: rows.length ? avg('skill_quality_score') : 0,
    would_exchange_again_rate: rows.length ? rows.filter((r: any) => r.would_exchange_again).length / rows.length * 100 : 0,
    completed_exchanges_count: Number(user.completed_exchanges_count ?? 0), badges: user.badges ?? [],
  };
};

patch.getConversations = async () => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('messages').select('*').or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load conversations');
  const latest = new Map<number, any>();
  for (const m of data ?? []) {
    const partner = Number(m.sender_id) === Number(me.id) ? Number(m.receiver_id) : Number(m.sender_id);
    if (!latest.has(partner)) latest.set(partner, m);
  }
  const ids = [...latest.keys()];
  const users = ids.length ? await insforge.database.from('users').select('*').in('id', ids) : { data: [], error: null } as any;
  const userMap = new Map((users.data ?? []).map((u: any) => [Number(u.id), u]));
  return [...latest.entries()].map(([partnerId, m]) => ({
    user: userSummary(userMap.get(partnerId)), partner: userSummary(userMap.get(partnerId)),
    user_id: partnerId, last_message: m.content, last_message_at: m.created_at,
    unread_count: (data ?? []).filter((x: any) => Number(x.sender_id) === partnerId && Number(x.receiver_id) === Number(me.id) && !x.is_read).length,
  }));
};

patch.getMessages = async (partnerId: number) => {
  const me = await getAppUser();
  const pid = Number(partnerId);
  const { data, error } = await insforge.database.from('messages').select('*')
    .or(`and(sender_id.eq.${me.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${me.id})`).order('created_at', { ascending: true });
  if (error) throw new Error(error.message || 'Unable to load messages');
  await insforge.database.from('messages').update({ is_read: true }).eq('sender_id', pid).eq('receiver_id', Number(me.id)).eq('is_read', false);
  return data ?? [];
};

patch.sendMessage = async (payload: any) => {
  const me = await getAppUser();
  const receiverId = Number(payload.receiver_id ?? payload.partner_id);
  if (!receiverId || receiverId === Number(me.id)) throw new Error('Invalid recipient');
  const content = String(payload.content ?? '').trim();
  if (!content) throw new Error('Message cannot be empty');
  const { data, error } = await insforge.database.from('messages').insert({ sender_id: Number(me.id), receiver_id: receiverId, exchange_id: payload.exchange_id ? Number(payload.exchange_id) : null, content, is_read: false }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to send message');
  return data;
};

patch.getNotifications = async () => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('notifications').select('*').eq('user_id', Number(me.id)).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load notifications');
  return data ?? [];
};
patch.getUnreadNotificationCount = async () => {
  const me = await getAppUser();
  const { count, error } = await insforge.database.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', Number(me.id)).eq('is_read', false);
  if (error) throw new Error(error.message || 'Unable to load notification count');
  return { count: count ?? 0 };
};
patch.markNotificationRead = async (id: number) => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('notifications').update({ is_read: true }).eq('id', Number(id)).eq('user_id', Number(me.id)).select('*').maybeSingle();
  if (error) throw new Error(error.message || 'Unable to mark notification read');
  return data;
};
patch.markAllNotificationsRead = async () => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('notifications').update({ is_read: true }).eq('user_id', Number(me.id)).eq('is_read', false).select('*');
  if (error) throw new Error(error.message || 'Unable to mark notifications read');
  return data ?? [];
};

patch.getConnections = async () => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('connections').select('*').or(`user_id.eq.${me.id},connected_user_id.eq.${me.id}`).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load connections');
  const ids = [...new Set((data ?? []).map((c: any) => Number(c.user_id) === Number(me.id) ? Number(c.connected_user_id) : Number(c.user_id)))];
  const users = ids.length ? await insforge.database.from('users').select('*').in('id', ids) : { data: [], error: null } as any;
  const map = new Map((users.data ?? []).map((u: any) => [Number(u.id), u]));
  return (data ?? []).map((c: any) => ({ ...c, user: userSummary(map.get(Number(c.user_id) === Number(me.id) ? Number(c.connected_user_id) : Number(c.user_id))) }));
};
patch.connectNeighbor = async (userId: number) => {
  const me = await getAppUser(); const id = Number(userId);
  if (!id || id === Number(me.id)) throw new Error('Invalid connection target');
  const existing = await insforge.database.from('connections').select('*').eq('user_id', Number(me.id)).eq('connected_user_id', id).maybeSingle();
  if (existing.data) return existing.data;
  const reverse = await insforge.database.from('connections').select('*').eq('user_id', id).eq('connected_user_id', Number(me.id)).maybeSingle();
  if (reverse.data) return reverse.data;
  const { data, error } = await insforge.database.from('connections').insert({ user_id: Number(me.id), connected_user_id: id, status: 'PENDING' }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to connect');
  return data;
};
patch.disconnectNeighbor = async (userId: number) => {
  const me = await getAppUser(); const id = Number(userId);
  const a = await insforge.database.from('connections').delete().eq('user_id', Number(me.id)).eq('connected_user_id', id).select('*');
  const b = await insforge.database.from('connections').delete().eq('user_id', id).eq('connected_user_id', Number(me.id)).select('*');
  if (a.error) throw new Error(a.error.message); if (b.error) throw new Error(b.error.message);
  return { message: 'Connection removed successfully' };
};
patch.getConnectionSuggestions = async () => {
  const me = await getAppUser();
  const connections = await insforge.database.from('connections').select('user_id,connected_user_id').or(`user_id.eq.${me.id},connected_user_id.eq.${me.id}`);
  const excluded = new Set<number>([Number(me.id)]);
  for (const c of connections.data ?? []) { excluded.add(Number(c.user_id)); excluded.add(Number(c.connected_user_id)); }
  const { data, error } = await insforge.database.from('users').select('*').eq('is_active', true).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((u: any) => !excluded.has(Number(u.id))).slice(0, 10).map(userSummary);
};

patch.getFeed = async (postType?: string) => {
  const { data, error } = await insforge.database.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message || 'Unable to load community feed');
  let rows = data ?? [];
  if (postType && postType !== 'ALL') rows = rows.filter((p: any) => p.post_type === String(postType).toUpperCase());
  const ids = [...new Set(rows.map((p: any) => Number(p.author_id)).filter(Boolean))];
  const users = ids.length ? await insforge.database.from('users').select('*').in('id', ids) : { data: [], error: null } as any;
  const map = new Map((users.data ?? []).map((u: any) => [Number(u.id), u]));
  return rows.map((p: any) => ({ ...p, author: userSummary(map.get(Number(p.author_id))) }));
};
patch.createPost = async (payload: any) => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('posts').insert({
    author_id: Number(me.id), post_type: String(payload.post_type ?? 'COMMUNITY').toUpperCase(), title: payload.title,
    content: payload.content, skill_id: payload.skill_id ? Number(payload.skill_id) : null,
    exchange_id: payload.exchange_id ? Number(payload.exchange_id) : null, partner_id: payload.partner_id ? Number(payload.partner_id) : null, likes_count: 0,
  }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to create post');
  return data;
};
patch.likePost = async (postId: number) => {
  const { data: post, error } = await insforge.database.from('posts').select('likes_count').eq('id', Number(postId)).maybeSingle();
  if (error) throw new Error(error.message); if (!post) throw new Error('Post not found');
  const { data, error: updateError } = await insforge.database.from('posts').update({ likes_count: Number(post.likes_count ?? 0) + 1 }).eq('id', Number(postId)).select('*').single();
  if (updateError) throw new Error(updateError.message);
  return data;
};
patch.getCommunityStats = async () => {
  const [users, exchanges, posts, reviews] = await Promise.all([
    insforge.database.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
    insforge.database.from('exchanges').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    insforge.database.from('posts').select('id', { count: 'exact', head: true }),
    insforge.database.from('reviews').select('id', { count: 'exact', head: true }),
  ]);
  return { active_users: users.count ?? 0, completed_exchanges: exchanges.count ?? 0, posts: posts.count ?? 0, reviews: reviews.count ?? 0 };
};

patch.search = async (q: string, category?: string, minTrust?: number) => {
  const term = String(q ?? '').trim();
  if (!term) return [];
  const users = await insforge.database.from('users').select('*').eq('is_active', true).limit(100);
  if (users.error) throw new Error(users.error.message);
  const skills = await insforge.database.from('skills').select('*').ilike('name', `%${term}%`).limit(50);
  if (skills.error) throw new Error(skills.error.message);
  const matchedSkillIds = new Set((skills.data ?? []).map((s: any) => Number(s.id)));
  const mappings = matchedSkillIds.size ? await insforge.database.from('user_skills').select('*').in('skill_id', [...matchedSkillIds]) : { data: [], error: null } as any;
  if (mappings.error) throw new Error(mappings.error.message);
  const skillUsers = new Set((mappings.data ?? []).map((m: any) => Number(m.user_id)));
  return (users.data ?? []).filter((u: any) => {
    const text = `${u.full_name ?? ''} ${u.headline ?? ''} ${u.bio ?? ''} ${u.address_display ?? ''}`.toLowerCase();
    const okText = text.includes(term.toLowerCase()) || skillUsers.has(Number(u.id));
    const okCategory = !category || category === 'All' || [...(mappings.data ?? [])].some((m: any) => Number(m.user_id) === Number(u.id) && matchedSkillIds.has(Number(m.skill_id)));
    const okTrust = minTrust == null || Number(u.trust_score ?? 0) >= Number(minTrust);
    return okText && okCategory && okTrust;
  }).map(userSummary);
};

patch.createReport = async (payload: any) => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('reports').insert({
    reporter_id: Number(me.id), reported_user_id: payload.reported_user_id ? Number(payload.reported_user_id) : null,
    reported_exchange_id: payload.reported_exchange_id ? Number(payload.reported_exchange_id) : null,
    category: payload.category, details: payload.details, status: 'PENDING',
  }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to submit report');
  return data;
};
patch.blockUser = async (userId: number) => {
  const me = await getAppUser(); const id = Number(userId);
  if (!id || id === Number(me.id)) throw new Error('Invalid user');
  const existing = await insforge.database.from('blocks').select('*').eq('blocker_id', Number(me.id)).eq('blocked_id', id).maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await insforge.database.from('blocks').insert({ blocker_id: Number(me.id), blocked_id: id }).select('*').single();
  if (error) throw new Error(error.message || 'Unable to block user');
  return data;
};
patch.unblockUser = async (userId: number) => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('blocks').delete().eq('blocker_id', Number(me.id)).eq('blocked_id', Number(userId)).select('*');
  if (error) throw new Error(error.message || 'Unable to unblock user');
  return data;
};
patch.getBlocks = async () => {
  const me = await getAppUser();
  const { data, error } = await insforge.database.from('blocks').select('*').eq('blocker_id', Number(me.id)).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load blocked users');
  const ids = (data ?? []).map((b: any) => Number(b.blocked_id));
  const users = ids.length ? await insforge.database.from('users').select('*').in('id', ids) : { data: [], error: null } as any;
  const map = new Map((users.data ?? []).map((u: any) => [Number(u.id), u]));
  return (data ?? []).map((b: any) => ({ ...b, blocked_user: userSummary(map.get(Number(b.blocked_id))) }));
};

patch.getAdminStats = async () => {
  await requireAdmin();
  return patch.getCommunityStats();
};
patch.getAdminUsers = async () => {
  await requireAdmin();
  const { data, error } = await insforge.database.from('users').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message || 'Unable to load users');
  return data ?? [];
};
patch.toggleAdminUserActive = async (userId: number) => {
  await requireAdmin();
  const { data: user, error } = await insforge.database.from('users').select('id,is_active').eq('id', Number(userId)).maybeSingle();
  if (error) throw new Error(error.message); if (!user) throw new Error('User not found');
  const { data, error: updateError } = await insforge.database.from('users').update({ is_active: !user.is_active }).eq('id', Number(userId)).select('*').single();
  if (updateError) throw new Error(updateError.message);
  return data;
};
patch.getAdminReports = async (status?: string) => {
  await requireAdmin();
  let query: any = insforge.database.from('reports').select('*').order('created_at', { ascending: false });
  if (status && status !== 'ALL') query = query.eq('status', String(status).toUpperCase());
  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Unable to load reports');
  return data ?? [];
};
patch.resolveAdminReport = async (reportId: number, status: 'RESOLVED' | 'DISMISSED', adminNote?: string) => {
  await requireAdmin();
  const { data, error } = await insforge.database.from('reports').update({ status, admin_note: adminNote ?? null }).eq('id', Number(reportId)).select('*').single();
  if (error) throw new Error(error.message || 'Unable to resolve report');
  return data;
};
patch.getAdminExchanges = async () => {
  await requireAdmin();
  const { data, error } = await insforge.database.from('exchanges').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(error.message || 'Unable to load exchanges');
  return data ?? [];
};
