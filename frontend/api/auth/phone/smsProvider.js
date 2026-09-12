import { getEnvConfig } from './_utils.js';

const TWOFACTOR_BASE = 'https://2factor.in/API/V1';

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/^[\"'`]|[\"'`]$/g, '').trim() : '';
}

function safeGatewayText(value) {
  return String(value || '')
    .replace(/(?:X-API-Key|api[_ -]?key|token|authorization)[\s:=]+[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export function getSmsProviderConfig() {
  const twoFactorApiKey = clean(process.env.TWOFACTOR_API_KEY);
  const provider = clean(process.env.SMS_PROVIDER || (twoFactorApiKey ? '2factor' : 'twilio')).toLowerCase();
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
    credentialLength: config.twoFactorApiKey.length,
    templateConfigured: Boolean(config.twoFactorTemplate),
  };
}

async function sendVia2Factor(phone, otp) {
  const { twoFactorApiKey, twoFactorTemplate } = getSmsProviderConfig();
  if (!twoFactorApiKey) {
    const error = new Error('SMS service is not configured yet. Add TWOFACTOR_API_KEY in Vercel Production environment variables.');
    error.code = 'TWOFACTOR_NOT_CONFIGURED';
    error.statusCode = 500;
    throw error;
  }

  // 2Factor's approved custom OTP template API uses:
  // /API/V1/{api_key}/SMS/{phone_number}/{otp}/{template_name}
  // Phone number is sent as country code + national number, without '+'.
  const phoneDigits = phone.replace(/\D/g, '');
  const url = `${TWOFACTOR_BASE}/${encodeURIComponent(twoFactorApiKey)}/SMS/${encodeURIComponent(phoneDigits)}/${encodeURIComponent(otp)}/${encodeURIComponent(twoFactorTemplate)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });

    const text = (await response.text()).trim();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // The legacy OTP endpoint may return plain text.
    }

    const statusText = String(data?.Status || data?.status || '').toLowerCase();
    const success = response.ok && (
      ['success', 'sent', 'queued'].includes(statusText) ||
      /success|sent|queued/i.test(text)
    );

    if (!success) {
      // Never include the request URL because it contains the API key.
      const gatewayMessage = safeGatewayText(
        data?.Details || data?.details || data?.message || data?.error || text || '2Factor rejected the SMS request'
      );
      const error = new Error(`SMS delivery failed: ${gatewayMessage}`);
      error.code = `TWOFACTOR_${data?.Code || response.status}`;
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    return {
      provider: '2factor',
      sid: data?.Details || data?.details || data?.session_id || data?.message_id || data?.id || null,
      status: data?.Status || data?.status || 'sent',
    };
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

export async function sendSmsOtpViaProvider(phone, otp) {
  const { provider } = getSmsProviderConfig();

  if (provider === '2factor' || provider === '2factor.in') {
    return sendVia2Factor(phone, otp);
  }

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
