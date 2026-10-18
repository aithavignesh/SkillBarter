import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STATUSES = new Set(["pending", "mapped", "transformed", "excluded", "blocked"]);
function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
}
function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
}

/** Validate mapping decisions before an importer is implemented. This never accesses a database. */
export function validateMappingContract(contract) {
  requireObject(contract, "Mapping contract");
  if (contract.contractVersion !== 1) throw new Error("contractVersion must be 1.");
  requireText(contract.sourceSystem, "sourceSystem");
  requireText(contract.targetSystem, "targetSystem");
  if (typeof contract.schemaSnapshotReviewed !== "boolean") throw new Error("schemaSnapshotReviewed must be a boolean.");
  if (!Array.isArray(contract.tables) || contract.tables.length === 0) throw new Error("Mapping contract must contain tables.");
  const seen = new Set();
  const seenNameKeys = new Set();
  const issues = [];
  const tables = contract.tables.map((table) => {
    requireObject(table, "Mapping table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Table names must be valid identifiers.");
    const nameKey = table.name.toLowerCase();
    if (seenNameKeys.has(nameKey)) throw new Error(`Duplicate mapping table (including case-insensitive aliases): ${table.name}`);
    seenNameKeys.add(nameKey);
    seen.add(table.name);
    if (!STATUSES.has(table.status)) throw new Error(`Invalid status for ${table.name}: expected pending, mapped, transformed, excluded, or blocked.`);
    const tableIssues = [];
    if (["mapped", "transformed"].includes(table.status)) {
      if (typeof table.proposedTarget !== "string" || !table.proposedTarget.trim()) tableIssues.push("mapped/transformed tables require proposedTarget");
      if (!contract.schemaSnapshotReviewed) tableIssues.push("cannot approve a mapped/transformed table before schemaSnapshotReviewed is true");
    }
    if (["excluded", "blocked"].includes(table.status) && (typeof table.reason !== "string" || !table.reason.trim())) {
      tableIssues.push("excluded/blocked tables require a non-empty reason");
    }
    if (table.fields !== undefined) {
      if (!Array.isArray(table.fields)) throw new Error(`fields for ${table.name} must be an array.`);
      const fieldNames = new Set();
      for (const field of table.fields) {
        requireObject(field, `Field mapping for ${table.name}`);
        requireText(field.sourceField, `sourceField for ${table.name}`);
        if (fieldNames.has(field.sourceField)) throw new Error(`Duplicate source field mapping for ${table.name}.`);
        fieldNames.add(field.sourceField);
        if (!STATUSES.has(field.status)) throw new Error(`Invalid field mapping status for ${table.name}.`);
        if (["mapped", "transformed"].includes(field.status)) {
          requireText(field.targetField, `targetField for ${table.name}.`);
          const targetSegments = field.targetField.split(".");
          if (!/^[a-z][A-Za-z0-9_]*(?:\.[a-z][A-Za-z0-9_]*)*$/.test(field.targetField)
            || targetSegments.some((segment) => ["__proto__", "prototype", "constructor"].includes(segment))) {
            tableIssues.push(`field ${field.sourceField} has an invalid or unsafe targetField path`);
          }
          if (!contract.schemaSnapshotReviewed) tableIssues.push(`field ${field.sourceField} cannot be approved before schemaSnapshotReviewed is true`);
        }
        if (["excluded", "blocked"].includes(field.status)) requireText(field.reason, `reason for ${table.name}.`);
      }
    }
    for (const issue of tableIssues) issues.push({ table: table.name, issue });
    return { name: table.name, status: table.status, valid: tableIssues.length === 0, issues: tableIssues };
  });
  return { valid: issues.length === 0, schemaSnapshotReviewed: contract.schemaSnapshotReviewed, tableCount: tables.length, readyTableCount: tables.filter((table) => ["mapped", "transformed", "excluded"].includes(table.status) && table.valid).length, blockedTableCount: tables.filter((table) => ["pending", "blocked"].includes(table.status) || !table.valid).length, tables, issues };
}
async function readJson(filename) { return JSON.parse(await readFile(filename, "utf8")); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [contractPath] = process.argv.slice(2);
    if (!contractPath) throw new Error("Usage: node server/src/migrations/validateMappingContract.js <contract.json>");
    const result = validateMappingContract(await readJson(contractPath));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.valid || result.blockedTableCount > 0) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Mapping contract validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
