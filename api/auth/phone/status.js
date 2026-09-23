import { getSmsProviderDiagnostics } from '../../../frontend/api/auth/phone/smsProvider.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const diagnostics = getSmsProviderDiagnostics();
  return res.status(200).json({
    provider: diagnostics.provider,
    configured: diagnostics.configured,
    templateConfigured: diagnostics.templateConfigured,
  });
}
