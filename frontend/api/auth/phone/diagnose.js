import { checkTwilioAuthentication, getEnvConfig, sendJson } from './_utils.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, { ok: true }, 200);
  }

  try {
    const env = getEnvConfig();
    const authTest = await checkTwilioAuthentication();

    const safeReport = {
      success: authTest.authOk,
      accountSidPrefix: authTest.diagnostics?.accountSidPrefix || '',
      accountSidLength: authTest.diagnostics?.accountSidLength || 0,
      authCredentialLength: authTest.diagnostics?.authCredentialLength || 0,
      authCredentialType: authTest.diagnostics?.authCredentialType || '',
      fromNumberPrefix: authTest.diagnostics?.fromNumberPrefix || '',
      fromNumberLength: authTest.diagnostics?.fromNumberLength || 0,
      fromNumberType: authTest.diagnostics?.fromNumberType || '',
      hasWhitespaceOrQuotes: Boolean(authTest.diagnostics?.hasWhitespaceOrQuotes),
      twilioHttpStatus: authTest.httpStatus,
      twilioErrorCode: authTest.twilioCode,
      twilioSafeMessage: authTest.twilioMessage,
      senderSmsCapable: authTest.diagnostics?.senderSmsCapable ?? null,
      phoneAuthSecretConfigured: Boolean(env.phoneAuthSecret),
      insforgeConfigured: Boolean(env.insforgeUrl && env.insforgeAnonKey),
    };

    return sendJson(res, safeReport, authTest.authOk ? 200 : 400);
  } catch (err) {
    return sendJson(res, { error: err.message }, 500);
  }
}
