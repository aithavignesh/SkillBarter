import { getEnvConfig } from './_utils.js';

const TWOFACTOR_OTP_ENDPOINT = 'https://2factor.in/API/V1/OTP/SEND';
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
  // SkillBarter targets India first, so 2Factor is the default provider. An
  // explicit SMS_PROVIDER can still select Twilio for another deployment.
  const provider = clean(process.env.SMS_PROVIDER || '2factor').toLowerCase();
  const twoFactorTemplate = clean(process.env.TWOFACTOR_TEMPLATE_NAME || 'LOGIN_OTP');

  return { provider, twoFactorApiKey, twoFactorTemplate };
}

export function getSmsProviderDiagnostics() {
  const config = getSmsProviderConfig();
  return {
    provider: config.provider,
    configured: config.provider === '2factor'
      ? Boolean(config.twoFactorApiKey)
      : Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM_NUMBER && (process.env.TWILIO_API_KEY_SID || process.env.TWILIO_AUTH_TOKEN)),
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(TWOFACTOR_OTP_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': twoFactorApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        template_name: twoFactorTemplate,
        var1: otp,
      }),
      signal: controller.signal,
    });

    const text = (await response.text()).trim();
    let data = null;
    try { data = JSON.parse(text); } catch {}

    const statusText = String(data?.status || data?.Status || '').toLowerCase();
    if (response.ok && (!statusText || ['success', 'sent', 'queued'].includes(statusText))) {
      return {
        provider: '2factor',
        sid: data?.session_id || data?.message_id || data?.id || null,
        status: data?.status || data?.Status || 'sent',
      };
    }

    // Compatibility fallback for accounts still routed through the legacy
    // API contract.
    if (response.status === 404 || response.status === 405) {
      return await sendVia2FactorLegacy(phone, otp, twoFactorApiKey, twoFactorTemplate);
    }

    const gatewayMessage = safeGatewayText(
      data?.message || data?.error || data?.detail || data?.Details || data?.details || text || '2Factor rejected the SMS request'
    );
    const error = new Error(`SMS delivery failed: ${gatewayMessage}`);
    error.code = `TWOFACTOR_${data?.code || data?.Code || response.status}`;
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('SMS service timed out. Please try again.');
      timeoutError.code = 'SMS_GATEWAY_TIMEOUT';
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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

  if (provider === 'twilio') {
    const config = getEnvConfig();
    if (!config.twilioAccountSid || !config.twilioFromNumber || !(config.twilioApiKeySid || config.twilioAuthToken)) {
      throw new Error('Twilio SMS provider is not configured correctly.');
    }
    const { sendSmsOtp } = await import('./_utils.js');
    return sendSmsOtp(phone, otp);
  }

  throw new Error(`Unsupported SMS_PROVIDER '${provider}'. Use '2factor' or 'twilio'.`);
}
