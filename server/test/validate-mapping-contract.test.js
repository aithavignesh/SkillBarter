import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMappingContract } from "../src/migrations/validateMappingContract.js";

const contract = {
  contractVersion: 1,
  sourceSystem: "InsForge/PostgreSQL",
  targetSystem: "SkillBarter MERN/MongoDB",
  schemaSnapshotReviewed: false,
  tables: [
    { name: "users", status: "pending", proposedTarget: "User", reason: "Await verified source schema." },
    { name: "connections", status: "blocked", proposedTarget: null, reason: "Target semantics are not approved." }
  ]
};

test("accepts explicit pending and blocked decisions without claiming readiness", () => {
  const result = validateMappingContract(contract);
  assert.equal(result.valid, true);
  assert.equal(result.readyTableCount, 0);
  assert.equal(result.blockedTableCount, 2);
});
test("rejects an unsupported contract version and missing table list", () => {
  assert.throws(() => validateMappingContract({ ...contract, contractVersion: 2 }), /contractVersion must be 1/);
  assert.throws(() => validateMappingContract({ ...contract, tables: [] }), /must contain tables/);
});
test("rejects duplicate table names and invalid statuses", () => {
  assert.throws(() => validateMappingContract({ ...contract, tables: [contract.tables[0], contract.tables[0]] }), /Duplicate mapping table/);
  assert.throws(() => validateMappingContract({ ...contract, tables: [{ name: "users", status: "guess" }] }), /Invalid status/);
});
test("does not allow approved mapping before source schema review", () => {
  const candidate = structuredClone(contract);
  candidate.tables[0].status = "mapped";
  const result = validateMappingContract(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.issue.includes("before schemaSnapshotReviewed")));
});
test("requires explicit reasons for blocked and excluded tables", () => {
  assert.equal(validateMappingContract({ ...contract, tables: [{ name: "connections", status: "blocked" }] }).valid, false);
  assert.equal(validateMappingContract({ ...contract, tables: [{ name: "legacy_events", status: "excluded" }] }).valid, false);
});
test("validates field-level mapping decisions and duplicate source fields", () => {
  const candidate = structuredClone(contract);
  candidate.schemaSnapshotReviewed = true;
  candidate.tables = [{ name: "users", status: "mapped", proposedTarget: "User", fields: [
    { sourceField: "email", status: "mapped", targetField: "email" },
    { sourceField: "old_secret", status: "excluded", reason: "Approved security policy" }
  ] }];
  assert.equal(validateMappingContract(candidate).valid, true);
  candidate.tables[0].fields[0].targetField = "profile.skills_to_teach";
  assert.equal(validateMappingContract(candidate).valid, true, "nested target paths may contain underscores");
  candidate.tables[0].fields[0].targetField = "profile..skills";
  const malformed = validateMappingContract(candidate);
  assert.equal(malformed.valid, false);
  assert.ok(malformed.issues.some((issue) => issue.issue.includes("invalid or unsafe targetField path")));
  for (const unsafePath of ["profile.__proto__", "constructor.prototype", "profile.constructor"]) {
    candidate.tables[0].fields[0].targetField = unsafePath;
    const unsafe = validateMappingContract(candidate);
    assert.equal(unsafe.valid, false, `${unsafePath} must be rejected`);
    assert.ok(unsafe.issues.some((issue) => issue.issue.includes("invalid or unsafe targetField path")));
  }
  candidate.tables[0].fields[0].targetField = "email";
  candidate.tables[0].fields.push({ sourceField: "email", status: "mapped", targetField: "otherEmail" });
  assert.throws(() => validateMappingContract(candidate), /Duplicate source field mapping/);
});

test("CLI prints parseable JSON and returns blocked status as exit code 2", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-mapping-"));
  try {
    const contractPath = path.join(directory, "contract.json");
    await writeFile(contractPath, JSON.stringify(contract));
    const scriptPath = fileURLToPath(new URL("../src/migrations/validateMappingContract.js", import.meta.url));
    const result = spawnSync(process.execPath, [scriptPath, contractPath], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.endsWith("\n"), true);
    const output = JSON.parse(result.stdout);
    assert.equal(output.valid, true);
    assert.equal(output.blockedTableCount, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI returns exit code 1 for malformed JSON", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-mapping-"));
  try {
    const contractPath = path.join(directory, "contract.json");
    await writeFile(contractPath, "{not-json");
    const scriptPath = fileURLToPath(new URL("../src/migrations/validateMappingContract.js", import.meta.url));
    const result = spawnSync(process.execPath, [scriptPath, contractPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Mapping contract validation failed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
