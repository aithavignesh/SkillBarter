import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDatabase } from "./config/db.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import skillRoutes from "./routes/skills.js";
import exchangeRoutes from "./routes/exchanges.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const port = Number(process.env.PORT || 4000);
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
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON request body." });
  if (error?.message === "Origin is not allowed by CORS.") return res.status(403).json({ error: error.message });
  console.error("[API error]", error?.message || error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

try {
  await connectDatabase();
  app.listen(port, () => console.info(`SkillBarter API listening on port ${port}`));
} catch (error) {
  console.error("API startup failed:", error.message);
  process.exitCode = 1;
}
