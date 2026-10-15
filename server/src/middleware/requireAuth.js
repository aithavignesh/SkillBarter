import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured.");
    const payload = jwt.verify(token, secret);
    if (typeof payload !== "object" || !payload.sub) {
      return res.status(401).json({ error: "Invalid session." });
    }
    const user = await User.findById(payload.sub).select("_id email username fullName isAdmin isActive onboardingCompleted");
    if (!user || !user.isActive) return res.status(401).json({ error: "Account is unavailable." });
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
