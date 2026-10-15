import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isTokenVersionCurrent } from "../utils/security.js";

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured.");
    const payload = jwt.verify(token, secret, { issuer: "skillbarter-api", audience: "skillbarter-web" });
    if (typeof payload !== "object" || !payload.sub) {
      return res.status(401).json({ error: "Invalid session." });
    }
    const user = await User.findById(payload.sub).select("_id email username fullName isAdmin isActive onboardingCompleted skillsToTeach skillsToLearn tokenVersion");
    if (!user || !user.isActive) return res.status(401).json({ error: "Account is unavailable." });

    // Tokens issued before a password reset (or another explicit revocation)
    // are rejected even if their JWT expiry has not been reached.
    const tokenVersion = Number.isInteger(payload.tokenVersion) ? payload.tokenVersion : 0;
    if (!isTokenVersionCurrent(tokenVersion, user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: "Session has been revoked. Please sign in again." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Session is invalid or expired." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: "Administrator access required." });
  return next();
}
