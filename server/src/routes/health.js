import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

// Liveness: the process is running. This endpoint intentionally does not fail
// merely because MongoDB is temporarily unavailable.
router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "skillbarter-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Readiness: hosting platforms should route traffic only when the database is
// connected and the API can serve database-backed requests.
router.get("/ready", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  const status = databaseConnected ? 200 : 503;
  res.status(status).json({
    status: databaseConnected ? "ready" : "not_ready",
    service: "skillbarter-api",
    checks: { database: databaseConnected ? "connected" : "disconnected" },
    timestamp: new Date().toISOString()
  });
});

export default router;
