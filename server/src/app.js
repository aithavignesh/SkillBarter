import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import userRoutes from "./routes/users.js";
import skillRoutes from "./routes/skills.js";
import exchangeRoutes from "./routes/exchanges.js";
import adminRoutes from "./routes/admin.js";
import messageRoutes from "./routes/messages.js";
import reviewRoutes from "./routes/reviews.js";
import reportRoutes from "./routes/reports.js";
import blockRoutes from "./routes/blocks.js";
import postRoutes from "./routes/posts.js";
import notificationRoutes from "./routes/notifications.js";
import matchRoutes from "./routes/matches.js";
import analyticsRoutes from "./routes/analytics.js";

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS."));
}, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/", (_req, res) => res.json({ service: "SkillBarter API", health: "/api/health" }));
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth/password-reset", passwordResetRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body exceeds the 1 MB limit." });
  }
  if (error?.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ error: "Origin is not allowed by CORS." });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "Request contains invalid data." });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: "A record with the supplied unique value already exists." });
  }

  // Do not log request bodies, provider payloads, database details, or secrets.
  // Keep the public error generic and log only a bounded error category.
  const category = typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(error.name)
    ? error.name
    : "UnknownError";
  console.error("[API error]", category);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
