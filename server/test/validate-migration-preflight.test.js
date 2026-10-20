import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMigrationPreflight } from "../src/migrations/validateMigrationPreflight.js";

async function fixture({ reviewed = true, mappingStatus = "mapped" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "skillbarter-preflight-"));
  const exportDirectory = path.join(root, "export");
  await mkdir(exportDirectory);
  const data = '{"id":"source-user-1"}\n';
  await writeFile(path.join(exportDirectory, "users.jsonl"), data);
  const manifest = {
    sourceSchema: "test-schema-snapshot",
    exportedAt: "2026-10-17T00:00:00.000Z",
    tables: [{ name: "users", file: "users.jsonl", rowCount: 1, sha256: createHash("sha256").update(data).digest("hex") }]
  };
  await writeFile(path.join(exportDirectory, "manifest.json"), JSON.stringify(manifest));
  const contractPath = path.join(root, "mapping.json");
  await writeFile(contractPath, JSON.stringify({
    contractVersion: 1,
    sourceSystem: "test",
    targetSystem: "test",
    schemaSnapshotReviewed: reviewed,
    ...(reviewed ? { schemaReview: {
      sourceEnvironment: "test-fixture",
      capturedAt: "2026-10-20T00:00:00Z",
      schemasReviewed: "public",
      inventoryRevision: "fixture-v1",
      reviewer: "test reviewer",
      reviewedAt: "2026-10-20",
      evidenceReference: "private://fixture/schema-snapshot"
    } } : {}),
    tables: [{ name: "users", status: mappingStatus, proposedTarget: "User", reason: "Test decision", ...(mappingStatus === "mapped" || mappingStatus === "transformed" ? { fields: [{ sourceField: "email", status: "mapped", targetField: "email" }] } : {}) }]
  }));
  return { root, exportDirectory, contractPath };
}

test("passes when export integrity and reviewed mapping coverage both pass", async () => {
  const f = await fixture();
  try {
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.valid, true);
    assert.equal(report.export.totalRows, 1);
    assert.equal(report.mappingCoverage.valid, true);
    assert.deepEqual(report.blockers, []);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("reports mapping blockers after validating the export", async () => {
  const f = await fixture({ reviewed: false });
  try {
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.valid, false);
    assert.ok(report.blockers.some((item) => item.issue.includes("schema snapshot has not been reviewed")));
    assert.ok(report.blockers.some((item) => item.stage === "mappingContract" && item.issue.includes("cannot approve a mapped/transformed table")));
    assert.ok(report.blockers.every((item) => ["mappingContract", "mappingCoverage", "targetModelCoverage"].includes(item.stage)),
      "every preflight blocker must have an authoritative validation stage");
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("preflight blocks impossible schema review dates", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.schemaReview.capturedAt = "2026-02-31T10:00:00Z";
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.valid, false);
    assert.ok(report.blockers.some((item) => item.stage === "mappingCoverage" && item.issue.includes("capturedAt must be a valid ISO 8601 timestamp")));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
test("preflight blocks impossible schema review dates", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.schemaReview.reviewedAt = "2026-02-31";
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.valid, false);
    assert.ok(report.blockers.some((item) => item.stage === "mappingCoverage" && item.issue.includes("reviewedAt must be a valid YYYY-MM-DD date")));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
test("rejects corrupted export before claiming preflight readiness", async () => {
  const f = await fixture();
  try {
    await writeFile(path.join(f.exportDirectory, "users.jsonl"), '{"id":"tampered"}\n');
    await assert.rejects(() => validateMigrationPreflight(f.exportDirectory, f.contractPath), /SHA-256 mismatch/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("detects source table inventory that is not covered by the mapping contract", async () => {
  const f = await fixture();
  try {
    const manifestPath = path.join(f.exportDirectory, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const data = '{"id":"connection-1"}\n';
    await writeFile(path.join(f.exportDirectory, "connections.jsonl"), data);
    manifest.tables.push({ name: "connections", file: "connections.jsonl", rowCount: 1, sha256: createHash("sha256").update(data).digest("hex") });
    await writeFile(manifestPath, JSON.stringify(manifest));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.valid, false);
    assert.ok(report.blockers.some((item) => item.table === "connections" && item.issue.includes("missing from mapping contract")));
    assert.ok(report.blockers.some((item) => item.stage === "mappingCoverage" && item.table === "connections" && item.issue.includes("missing from mapping contract")));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("CLI prints JSON and uses exit code 2 when mapping is unreviewed", async () => {
  const f = await fixture({ reviewed: false });
  try {
    const scriptPath = fileURLToPath(new URL("../src/migrations/validateMigrationPreflight.js", import.meta.url));
    const result = spawnSync(process.execPath, [scriptPath, f.exportDirectory, f.contractPath], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).valid, false);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("preflight rejects proposed targets without a matching Mongoose model", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.tables[0].proposedTarget = "MissingModel";
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.mappingCoverage.valid, true);
    assert.equal(report.targetModelCoverage.valid, false);
    assert.ok(report.blockers.some((item) => item.model === "MissingModel" && item.issue === "target model file is missing"));
    assert.ok(report.blockers.some((item) => item.stage === "targetModelCoverage" && item.table === "users" && item.model === "MissingModel"));
    assert.equal(report.valid, false);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("preflight validates model targets even while source mappings remain pending", async () => {
  const f = await fixture({ reviewed: false, mappingStatus: "pending" });
  try {
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.targetModelCoverage.valid, true);
    assert.equal(report.valid, false, "pending source schema must still block preflight");
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("current migration contract references existing proposed target model files", async () => {
  const contractPath = fileURLToPath(new URL("../../migrations/source-to-target-contract.json", import.meta.url));
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const { validateTargetModelCoverage } = await import("../src/migrations/validateTargetModelCoverage.js");
  const report = await validateTargetModelCoverage(contract);
  assert.equal(report.valid, true, JSON.stringify(report.issues));
  assert.equal(report.checkedTableCount, 12);
  assert.ok(contract.tables.some((table) => table.name === "connections" && table.status === "blocked"),
    "connections mapping must remain blocked until source semantics are reviewed");
  assert.ok(report.tables.some((table) => table.name === "connections" && table.skipped !== true),
    "proposed Connection model should be checked without approving the mapping");
});

test("preflight blocks mapped fields that do not exist in the target schema", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.schemaSnapshotReviewed = true;
    contract.tables[0].status = "mapped";
    contract.tables[0].fields = [
      { sourceField: "legacy_skills", status: "mapped", targetField: "skills_to_teach" }
    ];
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.targetModelCoverage.valid, false);
    assert.ok(report.blockers.some((item) =>
      item.stage === "targetModelCoverage"
      && item.target === "skills_to_teach"
      && item.issue === "field-level targetField does not exist in the Mongoose schema"
    ));
    assert.equal(report.valid, false);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("preflight blocks overlapping model target paths", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.tables[0].proposedTarget = "User.profile / User.profile.name";
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.targetModelCoverage.valid, false);
    assert.equal(report.targetModelCoverage.tables[0].valid, false);
    assert.ok(report.blockers.some((item) => item.issue === "target paths overlap and may overwrite one another"));
    assert.equal(report.valid, false, "overlapping target paths must block migration readiness");
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test("rejects malformed target expressions instead of silently skipping them", async () => {
  const { validateTargetModelCoverage } = await import("../src/migrations/validateTargetModelCoverage.js");
  const report = await validateTargetModelCoverage({
    tables: [{ name: "users", proposedTarget: "User / MissingModel()" }]
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((item) => item.target === "MissingModel()" && item.issue.includes("target path")));
});

test("preflight rejects malformed mapping decisions before declaring readiness", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    contract.tables[0].status = "approved-ish";
    await writeFile(f.contractPath, JSON.stringify(contract));
    await assert.rejects(
      () => validateMigrationPreflight(f.exportDirectory, f.contractPath),
      /Invalid status for users/
    );
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
test("preflight blocks a reviewed flag without schema-review provenance", async () => {
  const f = await fixture();
  try {
    const contract = JSON.parse(await readFile(f.contractPath, "utf8"));
    delete contract.schemaReview;
    await writeFile(f.contractPath, JSON.stringify(contract));
    const report = await validateMigrationPreflight(f.exportDirectory, f.contractPath);
    assert.equal(report.export.valid, true);
    assert.equal(report.valid, false);
    assert.ok(report.blockers.some((item) => item.stage === "mappingCoverage" && item.issue.includes("schemaReview provenance metadata")));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
