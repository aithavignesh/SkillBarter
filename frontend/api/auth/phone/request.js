import { normalizePhone, response, twilioVerifyRequest } from './_utils.js';

export default async function handler(req) {
  if (req.method === 'OPTIONS') return response({ ok: true });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  try {
    const phone = normalizePhone(req.body?.phone);
    await twilioVerifyRequest(phone);
    return response({ success: true, phone });
  } catch (error) {
    console.error('Phone OTP request failed:', error);
    return response({ error: error?.message || 'Unable to send OTP' }, 400);
  }
}
