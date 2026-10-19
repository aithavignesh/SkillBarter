import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
}
function requireCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative safe integer.`);
}

/** Compare source manifest counts with a reviewed dry-run import report. No database writes. */
export function reconcileImportReport(sourceManifest, importReport) {
  requireObject(sourceManifest, "Source manifest");
  requireObject(importReport, "Import report");
  if (!Array.isArray(sourceManifest.tables) || sourceManifest.tables.length === 0) throw new Error("Source manifest must contain tables.");
  if (!Array.isArray(importReport.tables)) throw new Error("Import report must contain tables.");
  const sourceByName = new Map();
  const sourceNameKeys = new Set();
  for (const table of sourceManifest.tables) {
    requireObject(table, "Source table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Source table names must be valid identifiers.");
    requireCount(table.rowCount, `Source rowCount for ${table.name}`);
    const sourceKey = table.name.toLowerCase();
    if (sourceNameKeys.has(sourceKey)) throw new Error(`Duplicate source table (including case-insensitive aliases): ${table.name}`);
    sourceNameKeys.add(sourceKey);
    sourceByName.set(table.name, table.rowCount);
  }
  const seen = new Set();
  const seenNameKeys = new Set();
  const issues = [];
  const tables = [];
  for (const table of importReport.tables) {
    requireObject(table, "Import table entry");
    if (typeof table.name !== "string" || !sourceByName.has(table.name)) throw new Error(`Import report contains unknown source table: ${table.name}`);
    const nameKey = table.name.toLowerCase();
    if (seenNameKeys.has(nameKey)) throw new Error(`Duplicate import table (including case-insensitive aliases): ${table.name}`);
    seenNameKeys.add(nameKey);
    seen.add(table.name);
    for (const field of ["sourceRows", "migratedRows", "excludedRows", "rejectedRows", "unresolvedReferences"]) requireCount(table[field], `${field} for ${table.name}`);
    const expectedRows = sourceByName.get(table.name);
    const accountedRows = table.migratedRows + table.excludedRows + table.rejectedRows;
    const tableIssues = [];
    if (table.sourceRows !== expectedRows) tableIssues.push(`sourceRows ${table.sourceRows} does not match manifest count ${expectedRows}`);
    if (!Number.isSafeInteger(accountedRows) || accountedRows !== table.sourceRows) tableIssues.push("migrated + excluded + rejected rows do not equal sourceRows");
    if (table.unresolvedReferences !== 0) tableIssues.push(`${table.unresolvedReferences} unresolved references`);
    if (table.rejectedRows !== 0) tableIssues.push(`${table.rejectedRows} rejected rows need review`);
    if (table.excludedRows !== 0 && (typeof table.exclusionReason !== "string" || !table.exclusionReason.trim())) tableIssues.push("excluded rows require a documented exclusionReason");
    if (table.excludedRows === 0 && table.exclusionReason !== undefined) tableIssues.push("exclusionReason must only be supplied when excludedRows is greater than zero");
    for (const issue of tableIssues) issues.push({ table: table.name, issue });
    tables.push({
      name: table.name,
      sourceRows: table.sourceRows,
      migratedRows: table.migratedRows,
      excludedRows: table.excludedRows,
      ...(table.excludedRows > 0 && typeof table.exclusionReason === "string" && table.exclusionReason.trim() ? { exclusionReason: table.exclusionReason } : {}),
      rejectedRows: table.rejectedRows,
      unresolvedReferences: table.unresolvedReferences,
      valid: tableIssues.length === 0,
      issues: tableIssues
    });
  }
  for (const name of sourceByName.keys()) if (!seen.has(name)) issues.push({ table: name, issue: "missing from import report" });
  const totalSourceRows = [...sourceByName.values()].reduce((sum, count) => {
    const total = sum + count;
    requireCount(total, "total source row count");
    return total;
  }, 0);
  return { valid: issues.length === 0, sourceTableCount: sourceByName.size, reportTableCount: seen.size, totalSourceRows, tables, issues };
}
async function readJson(filename) { return JSON.parse(await readFile(filename, "utf8")); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [manifestPath, reportPath] = process.argv.slice(2);
    if (!manifestPath || !reportPath) throw new Error("Usage: node server/src/migrations/reconcileImportReport.js <manifest.json> <import-report.json>");
    const result = reconcileImportReport(await readJson(manifestPath), await readJson(reportPath));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Reconciliation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
