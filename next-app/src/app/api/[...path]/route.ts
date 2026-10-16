import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "skillbarter_token";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const apiBase = process.env.API_BASE_URL?.replace(/\/+$/, "");
  if (!apiBase) return NextResponse.json({ error: "API_BASE_URL is not configured on the server." }, { status: 503 });

  const apiPath = path.join("/");
  const isLogout = apiPath === "auth/logout" && request.method === "POST";

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (token) headers.set("authorization", `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase}/api/${apiPath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      cache: "no-store"
    });
  } catch {
    const response = NextResponse.json({ error: "The SkillBarter API is unavailable." }, { status: 502 });
    // Clear the browser session even if the API is temporarily unreachable.
    if (isLogout) response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }

  if (isLogout) {
    const data = await upstream.json().catch(() => ({}));
    const response = NextResponse.json(data, { status: upstream.status });
    response.cookies.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }

  if (apiPath === "auth/login" || apiPath === "auth/register" || apiPath === "auth/otp/verify") {
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });
    if (typeof data?.token !== "string" || !data.token) {
      return NextResponse.json({ error: "Authentication response did not include a session." }, { status: 502 });
    }
    const response = NextResponse.json({ user: data.user }, { status: upstream.status });
    response.cookies.set(COOKIE_NAME, data.token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60
    });
    return response;
  }

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json", "cache-control": "no-store" }
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
