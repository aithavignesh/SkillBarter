import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Report from "../src/models/Report.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Report schema exposes target, category/reason, status, and resolution fields", () => {
  assert.equal(Report.modelName, "Report");
  assert.equal(Report.schema.path("reporter").options.ref, "User");
  assert.equal(Report.schema.path("targetType").isRequired, true);
  assert.equal(Report.schema.path("targetId").isRequired, true);
  assert.equal(Report.schema.path("reason").options.maxlength, 120);
  assert.equal(Report.schema.path("details").options.maxlength, 2000);
  assert.ok(Report.schema.path("status").options.enum.includes("resolved"));
  assert.ok(Report.schema.path("resolutionNote"));
  assert.ok(Report.schema.path("resolvedBy"));
});

test("reports mapping remains pending until source categories, targets, statuses, and notes are mapped", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const reports = contract.tables.find((table) => table.name === "reports");
  assert.ok(reports);
  assert.equal(reports.status, "pending");
  assert.equal(reports.proposedTarget, "Report");
  assert.match(reports.reason, /reporter_id/i);
  assert.match(reports.reason, /reported_exchange_id/i);
  assert.match(reports.reason, /category String\(50\)/i);
  assert.match(reports.reason, /admin_note Text/i);
  assert.match(reports.reason, /PENDING\/RESOLVED\/DISMISSED/i);
  assert.match(reports.reason, /created_at/i);
  assert.match(reports.reason, /RLS/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
