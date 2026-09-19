import { insforge } from '../lib/insforge';

const currentUser = async () => {
  const auth = await insforge.auth.getCurrentUser();
  if (auth.error || !auth.data?.user?.email) throw new Error('Not authenticated');
  const row = await insforge.database.from('users').select('*').eq('email', auth.data.user.email).maybeSingle();
  if (row.error || !row.data) throw new Error(row.error?.message || 'Profile not found');
  return row.data;
};

const publicUser = async (id: number) => {
  const row = await insforge.database.from('users').select('id,full_name,avatar_url,headline,address_display,trust_score,reliability_score,completed_exchanges_count,verified,premium,featured_until').eq('id', id).maybeSingle();
  if (row.error || !row.data) throw new Error(row.error?.message || 'User not found');
  return row.data;
};

export const connectionRequestsApi = {
  async connectNeighbor(id: number) {
    const me = await currentUser();
    if (Number(id) === Number(me.id)) throw new Error('You cannot connect to yourself.');

    const [outgoing, incoming] = await Promise.all([
      insforge.database.from('connections').select('*').eq('user_id', me.id).eq('connected_user_id', id).maybeSingle(),
      insforge.database.from('connections').select('*').eq('user_id', id).eq('connected_user_id', me.id).maybeSingle(),
    ]);
    if (outgoing.error) throw new Error(outgoing.error.message);
    if (incoming.error) throw new Error(incoming.error.message);
    if (outgoing.data) {
      if (outgoing.data.status === 'PENDING') throw new Error('Connection request already sent.');
      return outgoing.data;
    }
    if (incoming.data) {
      if (incoming.data.status === 'PENDING') throw new Error('This person has already sent you a connection request. Check Connection Requests.');
      return incoming.data;
    }

    const created = await insforge.database.from('connections').insert({
      user_id: me.id,
      connected_user_id: id,
      status: 'PENDING',
    }).select('*').single();
    if (created.error) throw new Error(created.error.message || 'Unable to send connection request');

    const notice = await insforge.database.from('notifications').insert({
      user_id: id,
      type: 'CONNECTION_REQUEST',
      title: 'New connection request',
      message: `${me.full_name} wants to connect with you.`,
      link: '/connections',
    });
    if (notice.error) console.warn('Connection created but notification failed:', notice.error);
    return created.data;
  },

  async getConnectionRequests() {
    const me = await currentUser();
    const rows = await insforge.database.from('connections').select('*').eq('connected_user_id', me.id).eq('status', 'PENDING').order('created_at', { ascending: false });
    if (rows.error) throw new Error(rows.error.message || 'Unable to load connection requests');
    return Promise.all((rows.data || []).map(async (row: any) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      requester: await publicUser(Number(row.user_id)),
    })));
  },

  async acceptConnectionRequest(id: number) {
    const me = await currentUser();
    const existing = await insforge.database.from('connections').select('*').eq('id', id).eq('connected_user_id', me.id).maybeSingle();
    if (existing.error || !existing.data) throw new Error(existing.error?.message || 'Connection request not found');
    if (existing.data.status !== 'PENDING') throw new Error('This connection request is no longer pending.');

    const updated = await insforge.database.from('connections').update({ status: 'ACCEPTED' }).eq('id', id).eq('connected_user_id', me.id).select('*').single();
    if (updated.error) throw new Error(updated.error.message || 'Unable to accept connection request');

    await insforge.database.from('notifications').insert({
      user_id: Number(existing.data.user_id),
      type: 'CONNECTION_ACCEPTED',
      title: 'Connection request accepted',
      message: `${me.full_name} accepted your connection request.`,
      link: `/profile/${me.id}`,
    });
    return updated.data;
  },

  async rejectConnectionRequest(id: number) {
    const me = await currentUser();
    const existing = await insforge.database.from('connections').select('*').eq('id', id).eq('connected_user_id', me.id).maybeSingle();
    if (existing.error || !existing.data) throw new Error(existing.error?.message || 'Connection request not found');
    if (existing.data.status !== 'PENDING') throw new Error('This connection request is no longer pending.');

    const removed = await insforge.database.from('connections').delete().eq('id', id).eq('connected_user_id', me.id).eq('status', 'PENDING');
    if (removed.error) throw new Error(removed.error.message || 'Unable to decline connection request');
    return true;
  },

  async getConnectionStatus(id: number) {
    const me = await currentUser();
    const [outgoing, incoming] = await Promise.all([
      insforge.database.from('connections').select('id,status').eq('user_id', me.id).eq('connected_user_id', id).maybeSingle(),
      insforge.database.from('connections').select('id,status').eq('user_id', id).eq('connected_user_id', me.id).maybeSingle(),
    ]);
    if (outgoing.error) throw new Error(outgoing.error.message);
    if (incoming.error) throw new Error(incoming.error.message);
    const row = outgoing.data || incoming.data;
    return {
      connected: row?.status === 'ACCEPTED',
      pending: row?.status === 'PENDING',
      direction: outgoing.data ? 'OUTGOING' : incoming.data ? 'INCOMING' : null,
      connection_id: row?.id ?? null,
    };
  },
};
