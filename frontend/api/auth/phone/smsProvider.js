import { getEnvConfig } from './_utils.js';

const TWOFACTOR_ENDPOINT = 'https://2factor.in/API/V1/OTP/SEND';

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/^["'`]|["'`]$/g, '').trim() : '';
}

export function getSmsProviderConfig() {
  const provider = clean(process.env.SMS_PROVIDER || '2factor').toLowerCase();
  const twoFactorApiKey = clean(process.env.TWOFACTOR_API_KEY);
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
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(TWOFACTOR_ENDPOINT, {
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

    const text = await response.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Keep an empty object for non-JSON gateway responses.
    }

    const status = String(data.status || '').toLowerCase();
    if (!response.ok || (status && !['sent', 'success', 'queued'].includes(status))) {
      const gatewayMessage = String(data.message || data.error || data.detail || '2Factor rejected the SMS request').slice(0, 180);
      const error = new Error(`SMS delivery failed: ${gatewayMessage}`);
      error.code = `TWOFACTOR_${data.code || response.status}`;
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    return {
      provider: '2factor',
      sid: data.session_id || data.message_id || data.id || null,
      status: data.status || 'sent',
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
