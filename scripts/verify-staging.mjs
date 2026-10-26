import { pathToFileURL } from "node:url";

function normalizeBaseUrl(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${label} must be a valid absolute URL.`); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${label} must use HTTP or HTTPS.`);
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must not contain credentials, query parameters, or fragments.`);
  }
  return parsed.toString().replace(/\/$/, "");
}

async function fetchWithTimeout(url, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { method: "GET", redirect: "error", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Smoke-test an already-deployed staging API and optional web URL; never mutates data. */
export async function verifyStaging({ apiUrl, webUrl, fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const apiBase = normalizeBaseUrl(apiUrl, "STAGING_API_URL");
  const results = [];
  for (const [path, expectedStatus] of [["/api/health", 200], ["/api/health/ready", 200]]) {
    let response;
    try {
      response = await fetchWithTimeout(`${apiBase}${path}`, timeoutMs, fetchImpl);
    } catch (error) {
      results.push({ url: path, ok: false, issue: error.name === "AbortError" ? "request timed out" : "request failed" });
      continue;
    }
    let body = null;
    try { body = await response.json(); } catch { /* non-JSON response is reported below */ }
    const healthOk = path === "/api/health"
      ? body?.status === "ok" && body?.service === "skillbarter-api"
      : body?.status === "ready" && body?.checks?.database === "connected";
    results.push({
      url: path,
      ok: response.status === expectedStatus && healthOk,
      status: response.status,
      ...(healthOk ? {} : { issue: "unexpected status or health payload" })
    });
  }
  if (webUrl) {
    const webBase = normalizeBaseUrl(webUrl, "STAGING_WEB_URL");
    try {
      const response = await fetchWithTimeout(webBase, timeoutMs, fetchImpl);
      results.push({ url: "/", ok: response.status >= 200 && response.status < 400, status: response.status,
        ...(response.status >= 200 && response.status < 400 ? {} : { issue: "frontend returned a non-success status" }) });
    } catch (error) {
      results.push({ url: "/", ok: false, issue: error.name === "AbortError" ? "request timed out" : "request failed" });
    }
  }
  return { valid: results.every((item) => item.ok), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await verifyStaging({
      apiUrl: process.env.STAGING_API_URL,
      webUrl: process.env.STAGING_WEB_URL
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Staging smoke test failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
