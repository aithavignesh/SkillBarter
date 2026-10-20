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
  const sourceNameKeys = new Set();
  for (const table of sourceManifest.tables) {
    requireObject(table, "Source table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Source table names must be valid identifiers.");
    const sourceKey = table.name.toLowerCase();
    if (sourceNameKeys.has(sourceKey)) throw new Error(`Duplicate source table (including case-insensitive aliases): ${table.name}`);
    sourceNameKeys.add(sourceKey);
    sourceNames.add(table.name);
  }
  const contractByName = new Map();
  const contractNameKeys = new Set();
  for (const table of mappingContract.tables) {
    requireObject(table, "Mapping table entry");
    if (typeof table.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(table.name)) throw new Error("Mapping table names must be valid identifiers.");
    const contractKey = table.name.toLowerCase();
    if (contractNameKeys.has(contractKey)) throw new Error(`Duplicate mapping table (including case-insensitive aliases): ${table.name}`);
    contractNameKeys.add(contractKey);
    contractByName.set(table.name, table);
  }
  const issues = [];
  const tables = [];
  if (mappingContract.schemaSnapshotReviewed === true) {
    const review = mappingContract.schemaReview;
    const requiredReviewFields = ["sourceEnvironment", "capturedAt", "schemasReviewed", "inventoryRevision", "reviewer", "reviewedAt", "evidenceReference"];
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      issues.push({ table: null, issue: "schemaSnapshotReviewed cannot be true without schemaReview provenance metadata" });
    } else {
      for (const field of requiredReviewFields) {
        if (typeof review[field] !== "string" || !review[field].trim()) {
          issues.push({ table: null, issue: `schemaReview.${field} is required when schemaSnapshotReviewed is true` });
        }
      }
      if (typeof review.capturedAt === "string" && review.capturedAt.trim()) {
        const capturedAt = new Date(review.capturedAt);
        const datePart = review.capturedAt.slice(0, 10);
        const calendarDate = new Date(datePart + "T00:00:00Z");
        const hasValidCalendarDate = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
          && !Number.isNaN(calendarDate.getTime())
          && calendarDate.toISOString().slice(0, 10) === datePart;
        const hasExplicitTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(review.capturedAt);
        if (Number.isNaN(capturedAt.getTime()) || !hasExplicitTimezone || !hasValidCalendarDate) {
          issues.push({ table: null, issue: "schemaReview.capturedAt must be a valid ISO 8601 timestamp" });
        }
      }
      if (typeof review.reviewedAt === "string" && review.reviewedAt.trim()) {
        const reviewedDate = new Date(review.reviewedAt + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) || Number.isNaN(reviewedDate.getTime()) || reviewedDate.toISOString().slice(0, 10) !== review.reviewedAt) {
          issues.push({ table: null, issue: "schemaReview.reviewedAt must be a valid YYYY-MM-DD date" });
        }
      }
    }
  }
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
    if (!["pending", "mapped", "transformed", "excluded", "blocked"].includes(mapping.status)) {
      tableIssues.push(`mapping status is invalid or missing: ${mapping.status ?? "missing"}`);
    }
    if (!approved) tableIssues.push(`mapping status is ${mapping.status ?? "missing"}`);
    if (["blocked", "excluded"].includes(mapping.status) && (typeof mapping.reason !== "string" || !mapping.reason.trim())) tableIssues.push("blocked/excluded table requires a reason");
    if (["mapped", "transformed"].includes(mapping.status) && (typeof mapping.proposedTarget !== "string" || !mapping.proposedTarget.trim())) tableIssues.push("mapped/transformed table requires proposedTarget");
    if (["mapped", "transformed"].includes(mapping.status)) {
      if (!Array.isArray(mapping.fields) || mapping.fields.length === 0) {
        tableIssues.push("mapped/transformed table requires explicit field mapping decisions");
      } else {
        const sourceFields = new Set();
        const targetPaths = [];
        let usableFieldCount = 0;
        for (const field of mapping.fields) {
          if (!field || typeof field !== "object" || Array.isArray(field)) {
            tableIssues.push("field mapping entries must be objects");
            continue;
          }
          if (typeof field.sourceField !== "string" || !field.sourceField.trim()) {
            tableIssues.push("field mapping entries require sourceField");
          } else if (sourceFields.has(field.sourceField)) {
            tableIssues.push(`duplicate source field mapping: ${field.sourceField}`);
          } else {
            sourceFields.add(field.sourceField);
          }
          if (!["pending", "mapped", "transformed", "excluded", "blocked"].includes(field.status)) {
            tableIssues.push(`field ${field.sourceField ?? "(unknown)"} has an invalid mapping status`);
            continue;
          }
          if (["mapped", "transformed"].includes(field.status)) {
            usableFieldCount += 1;
            if (typeof field.targetField !== "string" || !field.targetField.trim()) {
              tableIssues.push(`field ${field.sourceField ?? "(unknown)"} requires targetField`);
            } else {
              const segments = field.targetField.split(".");
              targetPaths.push({ sourceField: field.sourceField, path: field.targetField, segments });
              if (!/^[a-z][A-Za-z0-9_]*(?:\.[a-z][A-Za-z0-9_]*)*$/.test(field.targetField) || segments.some((segment) => ["__proto__", "prototype", "constructor"].includes(segment))) {
                tableIssues.push(`field ${field.sourceField ?? "(unknown)"} has an invalid or unsafe targetField path`);
              }
            }
          } else if (["excluded", "blocked"].includes(field.status) && (typeof field.reason !== "string" || !field.reason.trim())) {
            tableIssues.push(`field ${field.sourceField ?? "(unknown)"} requires a reason when ${field.status}`);
          } else if (field.status === "pending") {
            tableIssues.push(`field ${field.sourceField ?? "(unknown)"} still has a pending mapping decision`);
          }
          if (field.status === "blocked") tableIssues.push(`field ${field.sourceField ?? "(unknown)"} is blocked`);
        }
        for (let i = 0; i < targetPaths.length; i += 1) {
          for (let j = i + 1; j < targetPaths.length; j += 1) {
            const left = targetPaths[i];
            const right = targetPaths[j];
            const shorter = left.segments.length <= right.segments.length ? left : right;
            const longer = shorter === left ? right : left;
            if (shorter.segments.every((segment, index) => segment === longer.segments[index])) {
              tableIssues.push(`fields ${left.sourceField} and ${right.sourceField} have overlapping targetField paths (${left.path}, ${right.path})`);
            }
          }
        }
        if (usableFieldCount === 0) tableIssues.push("mapped/transformed table requires at least one mapped/transformed field");
      }
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
