import { getEnvConfig, sendJson } from './_utils.js';
import { getSmsProviderDiagnostics } from './smsProvider.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, { ok: true }, 200);
  }

  try {
    const env = getEnvConfig();
    const sms = getSmsProviderDiagnostics();

    return sendJson(
      res,
      {
        success: sms.configured,
        smsProvider: sms.provider,
        smsProviderConfigured: sms.configured,
        smsCredentialLength: sms.credentialLength,
        smsTemplateConfigured: sms.templateConfigured,
        phoneAuthSecretConfigured: Boolean(env.phoneAuthSecret),
        insforgeConfigured: Boolean(env.insforgeUrl && env.insforgeAnonKey),
        note: sms.configured
          ? 'SMS provider configuration is present. A real SMS is sent only through the configured provider.'
          : 'SMS provider credentials are missing. No OTP is sent until the provider is configured.',
      },
      sms.configured ? 200 : 500
    );
  } catch (err) {
    console.error('[Phone OTP Diagnosis Failed]', err.message);
    return sendJson(res, { error: 'Unable to diagnose SMS configuration.' }, 500);
  }
}
