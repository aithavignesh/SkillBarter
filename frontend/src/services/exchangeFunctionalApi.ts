import { insforge } from '../lib/insforge';

const fail = (error: any, fallback: string): never => {
  throw new Error(error?.message || fallback);
};

class ExchangeFunctionalApi {
  private async appUser() {
    const auth = await insforge.auth.getCurrentUser();
    if (auth.error || !auth.data?.user?.email) fail(auth.error, 'Not authenticated');
    const result = await insforge.database.from('users').select('*').eq('email', auth.data.user.email).maybeSingle();
    if (result.error || !result.data) fail(result.error, 'Application profile not found');
    return result.data;
  }

  async rejectExchange(id: number) {
    const me = await this.appUser();
    const e = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle();
    if (e.error || !e.data) fail(e.error, 'Exchange not found');
    if (Number(e.data.receiver_id) !== Number(me.id)) throw new Error('Only the recipient can decline this request.');
    if (e.data.status !== 'PENDING') throw new Error(`This exchange is already ${String(e.data.status).toLowerCase()}.`);
    const r = await insforge.database.from('exchanges').update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (r.error) fail(r.error, 'Unable to decline exchange');
    await insforge.database.from('notifications').insert({ user_id: Number(e.data.requester_id), type: 'EXCHANGE_REJECTED', title: 'Exchange declined', message: `${me.full_name} declined your skill exchange.`, link: `/exchanges/${id}` });
    return r.data;
  }

  async cancelExchange(id: number, reason = 'Cancelled by participant') {
    const me = await this.appUser();
    const e = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle();
    if (e.error || !e.data) fail(e.error, 'Exchange not found');
    const uid = Number(me.id);
    if (uid !== Number(e.data.requester_id) && uid !== Number(e.data.receiver_id)) throw new Error('Not authorized.');
    if (!['PENDING', 'ACTIVE'].includes(String(e.data.status))) throw new Error('Only pending or active exchanges can be cancelled.');
    const r = await insforge.database.from('exchanges').update({ status: 'CANCELLED', cancellation_reason: reason, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
    if (r.error) fail(r.error, 'Unable to cancel exchange');
    const partnerId = uid === Number(e.data.requester_id) ? Number(e.data.receiver_id) : Number(e.data.requester_id);
    await insforge.database.from('notifications').insert({ user_id: partnerId, type: 'EXCHANGE_CANCELLED', title: 'Exchange cancelled', message: `${me.full_name} cancelled the exchange.`, link: `/exchanges/${id}` });
    return r.data;
  }

  async getExchangeDetails(id: number) {
    const me = await this.appUser();
    const e = await insforge.database.from('exchanges').select('*').eq('id', id).maybeSingle();
    if (e.error || !e.data) fail(e.error, 'Exchange not found');
    const row: any = e.data;
    const uid = Number(me.id);
    if (uid !== Number(row.requester_id) && uid !== Number(row.receiver_id)) throw new Error('You do not have access to this exchange.');
    const [requester, receiver, requesterSkill, receiverSkill] = await Promise.all([
      insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,address_display').eq('id', row.requester_id).maybeSingle(),
      insforge.database.from('users').select('id,full_name,avatar_url,headline,trust_score,address_display').eq('id', row.receiver_id).maybeSingle(),
      row.requester_skill_id ? insforge.database.from('skills').select('name').eq('id', row.requester_skill_id).maybeSingle() : Promise.resolve({ data: null }),
      row.receiver_skill_id ? insforge.database.from('skills').select('name').eq('id', row.receiver_skill_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return {
      ...row,
      requester: requester.data,
      receiver: receiver.data,
      requester_skill_name: requesterSkill.data?.name || 'Skill exchange',
      receiver_skill_name: receiverSkill.data?.name || 'Skill exchange',
      user_can_review: row.status === 'COMPLETED',
    };
  }
}

export const exchangeFunctionalApi = new ExchangeFunctionalApi();
