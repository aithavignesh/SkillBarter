import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateExportDirectory } from "./validateExport.js";
import { validateMappingCoverage } from "./validateMappingCoverage.js";
import { validateTargetModelCoverage } from "./validateTargetModelCoverage.js";

/** Run export-integrity and source-to-target coverage checks together; never writes to either database. */
export async function validateMigrationPreflight(exportDirectory, mappingContractPath) {
  if (typeof exportDirectory !== "string" || !exportDirectory.trim()) throw new Error("exportDirectory is required.");
  if (typeof mappingContractPath !== "string" || !mappingContractPath.trim()) throw new Error("mappingContractPath is required.");
  const exportReport = await validateExportDirectory(exportDirectory);
  // Reuse the table inventory that was already validated. Re-reading manifest.json here
  // could make the coverage decision use different bytes than the integrity check.
  const validatedInventory = {
    sourceSchema: exportReport.sourceSchema,
    exportedAt: exportReport.exportedAt,
    tables: exportReport.tables.map(({ name }) => ({ name }))
  };
  const mappingContract = JSON.parse(await readFile(mappingContractPath, "utf8"));
  const coverageReport = validateMappingCoverage(validatedInventory, mappingContract);
  const targetModelReport = await validateTargetModelCoverage(mappingContract);
  return {
    valid: exportReport.valid && coverageReport.valid && targetModelReport.valid,
    export: exportReport,
    mappingCoverage: coverageReport,
    targetModelCoverage: targetModelReport,
    blockers: [...coverageReport.issues, ...targetModelReport.issues]
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [exportDirectory, mappingContractPath] = process.argv.slice(2);
    if (!exportDirectory || !mappingContractPath) {
      throw new Error("Usage: node server/src/migrations/validateMigrationPreflight.js <export-directory> <mapping-contract.json>");
    }
    const report = await validateMigrationPreflight(exportDirectory, mappingContractPath);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Migration preflight failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
