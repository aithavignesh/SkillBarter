const TWOFACTOR_BASE = 'https://2factor.in/API/V1';

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/^[\"'`]|[\"'`]$/g, '').trim() : '';
}

function safeGatewayText(value) {
  return String(value || '')
    .replace(/(?:X-API-Key|api[_ -]?key|token|authorization)[\s:=]+[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

export function getSmsProviderConfig() {
  const twoFactorApiKey = clean(process.env.TWOFACTOR_API_KEY);
  const provider = clean(process.env.SMS_PROVIDER || '2factor').toLowerCase();
  const twoFactorTemplate = clean(process.env.TWOFACTOR_TEMPLATE_NAME || 'LOGIN_OTP');
  return { provider, twoFactorApiKey, twoFactorTemplate };
}

export function getSmsProviderDiagnostics() {
  const config = getSmsProviderConfig();
  return {
    provider: config.provider,
    configured: config.provider === '2factor' || config.provider === '2factor.in' ? Boolean(config.twoFactorApiKey) : false,
    templateConfigured: Boolean(config.twoFactorTemplate),
  };
}

async function sendVia2Factor(phone, otp) {
  const { twoFactorApiKey, twoFactorTemplate } = getSmsProviderConfig();
  if (!twoFactorApiKey) {
    const error = new Error('SMS service is not configured yet. Add TWOFACTOR_API_KEY in the Vercel Production environment.');
    error.code = 'TWOFACTOR_NOT_CONFIGURED';
    error.statusCode = 500;
    throw error;
  }

  // Use 2Factor's explicit SMS OTP endpoint. This intentionally avoids the
  // voice/OBD channel and sends the verification code as an SMS message.
  return sendVia2FactorLegacy(phone, otp, twoFactorApiKey, twoFactorTemplate);
}

async function sendVia2FactorLegacy(phone, otp, apiKey, template) {
  const phoneDigits = phone.replace(/\D/g, '');
  const url = `${TWOFACTOR_BASE}/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(phoneDigits)}/${encodeURIComponent(otp)}/${encodeURIComponent(template)}`;
  const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json, text/plain, */*' } });
  const text = (await response.text()).trim();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  const statusText = String(data?.Status || data?.status || '').toLowerCase();
  const success = response.ok && (['success', 'sent', 'queued'].includes(statusText) || /success|sent|queued/i.test(text));
  if (!success) {
    const gatewayMessage = safeGatewayText(data?.Details || data?.details || data?.message || data?.error || text || '2Factor rejected the SMS request');
    const error = new Error(`SMS delivery failed: ${gatewayMessage}`);
    error.code = `TWOFACTOR_${data?.Code || response.status}`;
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return { provider: '2factor', sid: data?.Details || data?.details || data?.session_id || data?.message_id || data?.id || null, status: data?.Status || data?.status || 'sent' };
}

export async function sendSmsOtpViaProvider(phone, otp) {
  const { provider } = getSmsProviderConfig();
  if (provider === '2factor' || provider === '2factor.in') return sendVia2Factor(phone, otp);
  throw new Error(`Unsupported SMS_PROVIDER '${provider}'. This deployment supports 2Factor for OTP delivery.`);
}
