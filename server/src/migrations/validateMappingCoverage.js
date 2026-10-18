import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
}

/** Compare a source export manifest's table inventory to the mapping contract; no database access. */
export function validateMappingCoverage(sourceManifest, mappingContract) {
  requireObject(sourceManifest, "Source manifest");
  requireObject(mappingContract, "Mapping contract");
  if (!Array.isArray(sourceManifest.tables) || sourceManifest.tables.length === 0) throw new Error("Source manifest must contain tables.");
  if (!Array.isArray(mappingContract.tables) || mappingContract.tables.length === 0) throw new Error("Mapping contract must contain tables.");
  const sourceNames = new Set();
  for (const table of sourceManifest.tables) {
    requireObject(table, "Source table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Source table names must be valid identifiers.");
    if (sourceNames.has(table.name)) throw new Error(`Duplicate source table: ${table.name}`);
    sourceNames.add(table.name);
  }
  const contractByName = new Map();
  for (const table of mappingContract.tables) {
    requireObject(table, "Mapping table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Mapping table names must be valid identifiers.");
    if (contractByName.has(table.name)) throw new Error(`Duplicate mapping table: ${table.name}`);
    contractByName.set(table.name, table);
  }
  const issues = [];
  const tables = [];
  for (const name of sourceNames) {
    const mapping = contractByName.get(name);
    if (!mapping) {
      const issue = "source table is missing from mapping contract";
      issues.push({ table: name, issue });
      tables.push({ name, covered: false, status: "missing", issue });
      continue;
    }
    const approved = ["mapped", "transformed", "excluded"].includes(mapping.status);
    const tableIssues = [];
    if (!approved) tableIssues.push(`mapping status is ${mapping.status ?? "missing"}`);
    if (["blocked", "excluded"].includes(mapping.status) && (typeof mapping.reason !== "string" || !mapping.reason.trim())) tableIssues.push("blocked/excluded table requires a reason");
    if (["mapped", "transformed"].includes(mapping.status) && (typeof mapping.proposedTarget !== "string" || !mapping.proposedTarget.trim())) tableIssues.push("mapped/transformed table requires proposedTarget");
    if (mapping.status === "mapped" || mapping.status === "transformed") {
      if (mappingContract.schemaSnapshotReviewed !== true) tableIssues.push("schema snapshot has not been reviewed");
    }
    for (const issue of tableIssues) issues.push({ table: name, issue });
    tables.push({ name, covered: true, status: mapping.status, approved: approved && tableIssues.length === 0, issues: tableIssues });
  }
  for (const name of contractByName.keys()) {
    if (!sourceNames.has(name)) issues.push({ table: name, issue: "mapping contract contains table absent from source manifest; verify source snapshot and contract" });
  }
  const sourceTableCount = sourceNames.size;
  const mappedSourceTableCount = tables.filter((table) => table.covered && ["mapped", "transformed"].includes(table.status) && table.approved).length;
  const ready = issues.length === 0 && mappingContract.schemaSnapshotReviewed === true;
  if (mappingContract.schemaSnapshotReviewed !== true) issues.push({ table: null, issue: "schemaSnapshotReviewed must be true before mapping coverage can be approved" });
  return {
    valid: ready && issues.length === 0,
    sourceTableCount,
    contractTableCount: contractByName.size,
    mappedSourceTableCount,
    missingSourceTables: tables.filter((table) => !table.covered).map((table) => table.name),
    extraContractTables: [...contractByName.keys()].filter((name) => !sourceNames.has(name)),
    tables,
    issues
  };
}
async function readJson(filename) { return JSON.parse(await readFile(filename, "utf8")); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [manifestPath, contractPath] = process.argv.slice(2);
    if (!manifestPath || !contractPath) throw new Error("Usage: node server/src/migrations/validateMappingCoverage.js <manifest.json> <contract.json>");
    const result = validateMappingCoverage(await readJson(manifestPath), await readJson(contractPath));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Mapping coverage validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
