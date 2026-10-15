import rateLimit from "express-rate-limit";

function createWriteLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message }
  });
}

export const messageLimiter = createWriteLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  message: "Too many messages sent. Please wait before sending more."
});

export const postLimiter = createWriteLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many post actions. Please try again later."
});

export const reportLimiter = createWriteLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many reports submitted. Please try again later."
});

export const reviewLimiter = createWriteLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many reviews submitted. Please try again later."
});

export const blockLimiter = createWriteLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: "Too many block actions. Please try again later."
});

export const exchangeLimiter = createWriteLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many exchange actions. Please try again later."
});
