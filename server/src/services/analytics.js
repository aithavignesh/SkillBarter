import mongoose from "mongoose";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

// Analytics is best-effort: an analytics write must never fail a user action.
export async function recordAnalyticsEvent({ actor, name, path = "" }) {
  if (mongoose.connection.readyState !== 1 || !actor) return;
  try {
    await AnalyticsEvent.create({ actor, name, path, properties: {} });
  } catch {
    // Intentionally swallow analytics failures so core workflows remain available.
  }
}
