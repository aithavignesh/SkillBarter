import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Report from "../src/models/Report.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Report schema exposes its current review and resolution fields", () => {
  assert.equal(Report.modelName, "Report");
  assert.ok(Report.schema.path("reporter"));
  assert.ok(Report.schema.path("targetType"));
  assert.ok(Report.schema.path("targetId"));
  assert.ok(Report.schema.path("reason"));
  assert.ok(Report.schema.path("resolutionNote"));
  assert.ok(Report.schema.path("resolvedBy"));
  assert.deepEqual(Report.schema.path("status").options.enum, ["open", "reviewing", "resolved", "dismissed"]);
});

test("reports migration stays pending while source and target shapes differ", async () => {
  const contractPath = path.join(repositoryRoot, "migrations/source-to-target-contract.json");
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const reports = contract.tables.find((table) => table.name === "reports");
  assert.ok(reports);
  assert.equal(reports.status, "pending");
  assert.match(reports.reason, /reported_exchange_id/i);
  assert.match(reports.reason, /targetType\/targetId/i);
  assert.match(reports.reason, /Define a lossless mapping/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});
