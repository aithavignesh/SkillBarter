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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // Current 2Factor v4 OTP API. The API accepts the approved template name
    // and OTP as variables; include both documented template field variants for
    // compatibility with accounts using the newer unified API.
    const response = await fetch(TWOFACTOR_OTP_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-API-Key': twoFactorApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        channel: 'SMS',
        template: twoFactorTemplate,
        template_name: twoFactorTemplate,
        var1: otp,
      }),
      signal: controller.signal,
    });

    const text = (await response.text()).trim();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Keep plain-text/gateway responses available for diagnostics.
    }

    const statusText = String(data?.status || data?.Status || '').toLowerCase();
    if (response.ok && (!statusText || ['success', 'sent', 'queued'].includes(statusText))) {
      return {
        provider: '2factor',
        sid: data?.session_id || data?.message_id || data?.id || null,
        status: data?.status || data?.Status || 'sent',
      };
    }

    // If the current endpoint is not available on this account, use the
    // documented custom-template manual OTP endpoint as a compatibility path.
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
  // 2Factor's documented custom-template Manual OTP API:
  // /API/V1/{api_key}/SMS/{phone_number}/{otp}/{template_name}
  const phoneDigits = phone.replace(/\D/g, '');
  const url = `${TWOFACTOR_BASE}/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(phoneDigits)}/${encodeURIComponent(otp)}/${encodeURIComponent(template)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json, text/plain, */*' },
  });

  const text = (await response.text()).trim();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Legacy endpoint may return plain text.
  }

  const statusText = String(data?.Status || data?.status || '').toLowerCase();
  const success = response.ok && (
    ['success', 'sent', 'queued'].includes(statusText) ||
    /success|sent|queued/i.test(text)
  );

  if (!success) {
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
