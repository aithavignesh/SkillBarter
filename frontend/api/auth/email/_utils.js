import { sanitizeEnvValue } from '../phone/_utils.js';

export function getEmailAuthConfig() {
  return {
    insforgeUrl: sanitizeEnvValue(process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL),
    insforgeAnonKey: sanitizeEnvValue(process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY),
  };
}

export function sendJson(res, data, status = 200) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (res && typeof res.status === 'function') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(status).json(data);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export async function parseRequestBody(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (typeof req.json === 'function') {
    try { return await req.json(); } catch { return {}; }
  }
  return {};
}

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Enter a valid email address.');
    error.code = 'INVALID_EMAIL';
    error.statusCode = 400;
    throw error;
  }
  return email;
}

export async function findSkillBarterProfile(email) {
  const { insforgeUrl, insforgeAnonKey } = getEmailAuthConfig();
  if (!insforgeUrl || !insforgeAnonKey) {
    const error = new Error('InsForge server configuration is missing.');
    error.code = 'INSFORGE_NOT_CONFIGURED';
    error.statusCode = 500;
    throw error;
  }

  const url = `${insforgeUrl.replace(/\/+$/, '')}/api/database/records/users?email=eq.${encodeURIComponent(email)}&limit=1`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${insforgeAnonKey}`,
      Accept: 'application/json',
    },
  });
  const text = (await response.text()).trim();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || text || `Unable to verify SkillBarter account (${response.status})`);
    error.code = 'PROFILE_LOOKUP_FAILED';
    error.statusCode = 502;
    throw error;
  }

  const profile = Array.isArray(data) ? data[0] : data;
  return profile || null;
}

export async function insforgeRequest(path, method, body) {
  const { insforgeUrl, insforgeAnonKey } = getEmailAuthConfig();
  const response = await fetch(`${insforgeUrl.replace(/\/+$/, '')}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${insforgeAnonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = (await response.text()).trim();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data, text };
}
