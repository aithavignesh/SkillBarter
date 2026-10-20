import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMappingCoverage } from "../src/migrations/validateMappingCoverage.js";

const manifest = { tables: [{ name: "users", rowCount: 3 }, { name: "skills", rowCount: 2 }] };
const contract = {
  contractVersion: 1,
  sourceSystem: "InsForge/PostgreSQL",
  targetSystem: "SkillBarter MERN/MongoDB",
  schemaSnapshotReviewed: true,
  schemaReview: {
    sourceEnvironment: "test-fixture",
    capturedAt: "2026-10-20T00:00:00Z",
    schemasReviewed: "public",
    inventoryRevision: "fixture-v1",
    reviewer: "test reviewer",
    reviewedAt: "2026-10-20",
    evidenceReference: "private://fixture/schema-snapshot"
  },
  tables: [
    { name: "users", status: "mapped", proposedTarget: "User", fields: [{ sourceField: "email", status: "mapped", targetField: "email" }] },
    { name: "skills", status: "mapped", proposedTarget: "Skill", fields: [{ sourceField: "name", status: "mapped", targetField: "name" }] }
  ]
};

test("rejects malformed schema review capture and review dates", () => {
  const candidate = structuredClone(contract);
  candidate.schemaReview.capturedAt = "2026-02-31T10:00:00Z";
  candidate.schemaReview.reviewedAt = "2026-02-31";
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.issue.includes("capturedAt must be a valid ISO 8601 timestamp")));
  assert.ok(result.issues.some((issue) => issue.issue.includes("reviewedAt must be a valid YYYY-MM-DD date")));
});
test("requires an explicit timezone in the schema capture timestamp", () => {
  const candidate = structuredClone(contract);
  candidate.schemaReview.capturedAt = "2026-10-20T00:00:00";
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.issue.includes("capturedAt must be a valid ISO 8601 timestamp")));
});
test("rejects unknown and out-of-range schema capture timezone offsets", () => {
  for (const capturedAt of ["2026-10-20T15:30:00-00:00", "2026-10-20T15:30:00+15:00", "2026-10-20T15:30:00+14:30"]) {
    const candidate = structuredClone(contract);
    candidate.schemaReview.capturedAt = capturedAt;
    const result = validateMappingCoverage(manifest, candidate);
    assert.equal(result.valid, false, capturedAt);
    assert.ok(result.issues.some((issue) => issue.issue.includes("capturedAt must be a valid ISO 8601 timestamp")), capturedAt);
  }
});
test("accepts a valid schema capture timestamp with an explicit offset", () => {
  const candidate = structuredClone(contract);
  candidate.schemaReview.capturedAt = "2026-10-20T15:30:00+05:30";
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});
test("accepts exact table coverage only after schema review", () => {
  const result = validateMappingCoverage(manifest, contract);
  assert.equal(result.valid, true);
  assert.equal(result.sourceTableCount, 2);
  assert.equal(result.mappedSourceTableCount, 2);
  assert.deepEqual(result.issues, []);
});
test("detects source tables missing from the mapping contract", () => {
  const result = validateMappingCoverage(manifest, { ...contract, tables: [contract.tables[0]] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.missingSourceTables, ["skills"]);
  assert.ok(result.issues.some((issue) => issue.table === "skills" && issue.issue.includes("missing from mapping contract")));
});
test("detects contract tables absent from the source manifest", () => {
  const result = validateMappingCoverage(manifest, { ...contract, tables: [...contract.tables, { name: "connections", status: "blocked", reason: "Unresolved semantics" }] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.extraContractTables, ["connections"]);
  assert.ok(result.issues.some((issue) => issue.table === "connections" && issue.issue.includes("absent from source manifest")));
});
test("does not approve mapped tables without any usable field mappings", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0].fields = [{ sourceField: "legacy", status: "excluded", reason: "Not in target model." }];
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.equal(result.mappedSourceTableCount, 1);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("at least one mapped/transformed field")));
  candidate.tables[0].fields = [];
  const empty = validateMappingCoverage(manifest, candidate);
  assert.ok(empty.issues.some((issue) => issue.table === "users" && issue.issue.includes("explicit field mapping decisions")));
});

test("does not approve tables with pending, blocked, or duplicate field decisions", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0].fields.push({ sourceField: "legacy_id", status: "pending" });
  let result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("pending mapping decision")));

  candidate.tables[0].fields[1] = { sourceField: "legacy_id", status: "blocked", reason: "Await schema review." };
  result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("is blocked")));

  candidate.tables[0].fields[1] = { sourceField: "email", status: "mapped", targetField: "alternateEmail" };
  result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("duplicate source field mapping")));
});

test("accepts safe nested target field paths", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0].fields = [{ sourceField: "display_name", status: "mapped", targetField: "profile.displayName" }];
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("rejects unsafe and overlapping target field paths in coverage checks", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0].fields = [
    { sourceField: "email", status: "mapped", targetField: "__proto__.polluted" },
    { sourceField: "display_name", status: "mapped", targetField: "profile" },
    { sourceField: "profile_name", status: "transformed", targetField: "profile.name" }
  ];
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("invalid or unsafe targetField path")));
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("overlapping targetField paths")));
});

test("counts only approved mapped or transformed tables in the summary", () => {
  const candidate = structuredClone(contract);
  candidate.tables[1] = { name: "skills", status: "pending", proposedTarget: "Skill" };
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.mappedSourceTableCount, 1);
  assert.equal(result.sourceTableCount, 2);
  assert.equal(result.valid, false);
});

test("keeps pending or blocked mappings from being approved", () => {
  const candidate = structuredClone(contract);
  candidate.tables[1] = { name: "skills", status: "pending", proposedTarget: "Skill" };
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "skills" && issue.issue.includes("pending")));
});
test("requires schema review and reasons for exclusions", () => {
  assert.equal(validateMappingCoverage(manifest, { ...contract, schemaSnapshotReviewed: false }).valid, false);
  const candidate = structuredClone(contract);
  candidate.tables[1] = { name: "skills", status: "excluded" };
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "skills" && issue.issue.includes("requires a reason")));
});
test("rejects duplicate source or contract table names", () => {
  assert.throws(() => validateMappingCoverage({ tables: [{ name: "users" }, { name: "users" }] }, contract), /Duplicate source table/);
  assert.throws(() => validateMappingCoverage(manifest, { ...contract, tables: [contract.tables[0], contract.tables[0]] }), /Duplicate mapping table/);
});
test("rejects case-colliding source and mapping table names", () => {
  assert.throws(
    () => validateMappingCoverage({ tables: [{ name: "users" }, { name: "Users" }] }, contract),
    /Duplicate source table.*case-insensitive aliases/
  );
  assert.throws(
    () => validateMappingCoverage(manifest, {
      ...contract,
      tables: [...contract.tables, { name: "Users", status: "blocked", reason: "duplicate alias" }]
    }),
    /Duplicate mapping table.*case-insensitive aliases/
  );
});

test("CLI emits parseable JSON and exits 2 while the checked-in contract is blocked", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-mapping-coverage-"));
  try {
    const manifestPath = path.join(directory, "manifest.json");
    const contractPath = path.join(directory, "contract.json");
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(contractPath, JSON.stringify({ ...contract, schemaSnapshotReviewed: false }));
    const scriptPath = fileURLToPath(new URL("../src/migrations/validateMappingCoverage.js", import.meta.url));
    const result = spawnSync(process.execPath, [scriptPath, manifestPath, contractPath], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.endsWith("\n"), true);
    assert.equal(JSON.parse(result.stdout).valid, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects missing or unsupported mapping statuses", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0] = { name: "users", proposedTarget: "User", fields: [{ sourceField: "email", status: "mapped", targetField: "email" }] };
  let result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("mapping status is missing")));

  candidate.tables[0].status = "approved";
  result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.table === "users" && issue.issue.includes("mapping status is approved")));
});

test("requires provenance before a schema snapshot can be marked reviewed", () => {
  const candidate = { ...contract, schemaReview: undefined };
  const result = validateMappingCoverage(manifest, candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.issue.includes("schemaReview provenance metadata")));

  candidate.schemaReview = { ...contract.schemaReview, reviewer: " " };
  const incomplete = validateMappingCoverage(manifest, candidate);
  assert.equal(incomplete.valid, false);
  assert.ok(incomplete.issues.some((issue) => issue.issue.includes("schemaReview.reviewer is required")));
});


test("real migration contract stays blocked until source evidence is reviewed", async () => {
  const root = new URL("../../", import.meta.url);
  const sourceContract = JSON.parse(await readFile(new URL("migrations/source-to-target-contract.json", root), "utf8"));
  const notificationPlan = JSON.parse(await readFile(new URL("migrations/notification-conversion-plan.json", root), "utf8"));

  assert.equal(sourceContract.schemaSnapshotReviewed, false);
  assert.equal(sourceContract.status, "blocked-pending-source-schema");
  assert.ok(sourceContract.tables.some((table) => table.status === "blocked" || table.status === "pending"));
  assert.equal(notificationPlan.status, "blocked-pending-source-schema-and-data-inventory");
  assert.equal(notificationPlan.safety.schemaSnapshotReviewed, false);
  assert.equal(notificationPlan.safety.sourceInventoryExecuted, false);
  assert.equal(notificationPlan.safety.dataImportImplemented, false);
  assert.equal(notificationPlan.safety.productionImportAllowed, false);
  assert.equal(notificationPlan.safety.productionCutoverApproved, false);
});
