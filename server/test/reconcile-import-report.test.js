import test from "node:test";
import assert from "node:assert/strict";
import { reconcileImportReport } from "../src/migrations/reconcileImportReport.js";
const manifest = { tables: [{ name: "users", rowCount: 3 }, { name: "skills", rowCount: 2 }] };
const goodReport = { tables: [
  { name: "users", sourceRows: 3, migratedRows: 3, excludedRows: 0, rejectedRows: 0, unresolvedReferences: 0 },
  { name: "skills", sourceRows: 2, migratedRows: 2, excludedRows: 0, rejectedRows: 0, unresolvedReferences: 0 }
] };
test("accepts complete row accounting with no unresolved references", () => { const result = reconcileImportReport(manifest, goodReport); assert.equal(result.valid, true); assert.equal(result.totalSourceRows, 5); assert.equal(result.issues.length, 0); });
test("flags source count mismatches", () => { const report = structuredClone(goodReport); report.tables[0].sourceRows = 4; report.tables[0].migratedRows = 4; const result = reconcileImportReport(manifest, report); assert.equal(result.valid, false); assert.ok(result.issues.some(item => item.issue.includes("does not match manifest count"))); });
test("flags unaccounted rows", () => { const report = structuredClone(goodReport); report.tables[0].migratedRows = 2; const result = reconcileImportReport(manifest, report); assert.ok(result.issues.some(item => item.issue.includes("do not equal sourceRows"))); });
test("requires a reason for intentionally excluded rows", () => { const report = structuredClone(goodReport); report.tables[0].migratedRows = 2; report.tables[0].excludedRows = 1; const result = reconcileImportReport(manifest, report); assert.ok(result.issues.some(item => item.issue.includes("exclusionReason"))); report.tables[0].exclusionReason = "Approved retention policy"; assert.equal(reconcileImportReport(manifest, report).valid, true); });
test("flags rejected rows and unresolved references", () => { const report = structuredClone(goodReport); report.tables[0].rejectedRows = 1; report.tables[0].migratedRows = 2; report.tables[0].unresolvedReferences = 1; const result = reconcileImportReport(manifest, report); assert.ok(result.issues.some(item => item.issue.includes("rejected rows"))); assert.ok(result.issues.some(item => item.issue.includes("unresolved references"))); });
test("flags source tables omitted from the import report", () => { const result = reconcileImportReport(manifest, { tables: [goodReport.tables[0]] }); assert.ok(result.issues.some(item => item.table === "skills" && item.issue === "missing from import report")); });
test("rejects unknown or duplicate table entries", () => { assert.throws(() => reconcileImportReport(manifest, { tables: [{ ...goodReport.tables[0], name: "unknown" }] }), /unknown source table/); assert.throws(() => reconcileImportReport(manifest, { tables: [goodReport.tables[0], goodReport.tables[0]] }), /Duplicate import table/); });
test("rejects invalid row counts", () => { const report = structuredClone(goodReport); report.tables[0].rejectedRows = -1; assert.throws(() => reconcileImportReport(manifest, report), /non-negative safe integer/); });

test("rejects aggregate source row counts beyond safe integer precision", () => {
  const hugeManifest = { tables: [
    { name: "users", rowCount: Number.MAX_SAFE_INTEGER },
    { name: "skills", rowCount: 1 }
  ] };
  assert.throws(
    () => reconcileImportReport(hugeManifest, { tables: [] }),
    /total source row count must be a non-negative safe integer/
  );
});

test("flags row accounting totals that exceed safe integer precision", () => {
  const hugeManifest = { tables: [{ name: "users", rowCount: Number.MAX_SAFE_INTEGER }] };
  const report = { tables: [{
    name: "users",
    sourceRows: Number.MAX_SAFE_INTEGER,
    migratedRows: Number.MAX_SAFE_INTEGER,
    excludedRows: 1,
    rejectedRows: 0,
    unresolvedReferences: 0
  }] };
  const result = reconcileImportReport(hugeManifest, report);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(item => item.table === "users" && item.issue.includes("do not equal sourceRows")));
});
