import test from "node:test";
import assert from "node:assert/strict";
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
  candidate.tables[0].fields.push({ sourceField: "email", status: "mapped", targetField: "otherEmail" });
  assert.throws(() => validateMappingContract(candidate), /Duplicate source field mapping/);
});
