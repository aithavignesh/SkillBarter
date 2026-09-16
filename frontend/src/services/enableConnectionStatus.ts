import { api } from './api';
import { insforge } from '../lib/insforge';

(api as any).getConnectionStatus = async (partnerId: number) => {
  const auth = await insforge.auth.getCurrentUser();
  if (auth.error || !auth.data?.user?.email) throw new Error('Not authenticated');
  const me = await insforge.database.from('users').select('id').eq('email', auth.data.user.email).maybeSingle();
  if (me.error || !me.data) throw new Error(me.error?.message || 'Profile not found');
  const pid = Number(partnerId);
  if (!pid || pid === Number(me.data.id)) return { connected: false };
  const result = await insforge.database.from('connections').select('id,status').or(`and(user_id.eq.${me.data.id},connected_user_id.eq.${pid}),and(user_id.eq.${pid},connected_user_id.eq.${me.data.id})`).eq('status','ACCEPTED').maybeSingle();
  if (result.error) throw new Error(result.error.message || 'Unable to check connection');
  return { connected: Boolean(result.data), status: result.data?.status ?? null };
};
