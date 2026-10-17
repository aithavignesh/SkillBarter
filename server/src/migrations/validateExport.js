import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  const error = new Error(message);
  error.name = "ExportValidationError";
  throw error;
}

function safeExportPath(root, filename) {
  if (typeof filename !== "string" || !filename.trim() || path.isAbsolute(filename)) {
    fail("Each table file must be a non-empty relative path.");
  }
  const resolvedRoot = path.resolve(root);
  const resolvedFile = path.resolve(resolvedRoot, filename);
  if (!resolvedFile.startsWith(resolvedRoot + path.sep)) {
    fail(`Export file path escapes the export directory: ${filename}`);
  }
  return resolvedFile;
}

/** Validate checksums, row counts, and JSONL syntax without connecting to a database. */
export async function validateExportDirectory(exportDirectory) {
  const root = path.resolve(exportDirectory);
  let realRoot;
  try { realRoot = await realpath(root); }
  catch (error) { fail(`Unable to resolve export directory: ${error.message}`); }
  let manifest;
  try {
    const manifestPath = path.join(root, "manifest.json");
    const realManifestPath = await realpath(manifestPath);
    if (!realManifestPath.startsWith(realRoot + path.sep)) fail("manifest.json must remain inside the export directory.");
    manifest = JSON.parse(await readFile(realManifestPath, "utf8"));
  } catch (error) {
    fail(`Unable to read valid manifest.json: ${error.message}`);
  }

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("Manifest must be a JSON object.");
  if (typeof manifest.sourceSchema !== "string" || !manifest.sourceSchema.trim()) fail("Manifest sourceSchema is required.");
  if (typeof manifest.exportedAt !== "string" || !Number.isFinite(Date.parse(manifest.exportedAt))) fail("Manifest exportedAt must be a valid timestamp.");
  if (!Array.isArray(manifest.tables) || manifest.tables.length === 0) fail("Manifest tables must be a non-empty array.");

  const seenNames = new Set();
  const seenFiles = new Set();
  const tables = [];
  for (const entry of manifest.tables) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("Every table manifest entry must be an object.");
    if (typeof entry.name !== "string" || !/^[a-z][a-z0-9_]*$/i.test(entry.name)) fail("Every table must have a valid name.");
    if (seenNames.has(entry.name)) fail(`Duplicate table name in manifest: ${entry.name}`);
    seenNames.add(entry.name);
    if (!Number.isSafeInteger(entry.rowCount) || entry.rowCount < 0) fail(`Invalid rowCount for table ${entry.name}.`);
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(entry.sha256)) fail(`Invalid SHA-256 checksum for table ${entry.name}.`);

    const filePath = safeExportPath(root, entry.file);
    const relativeFile = path.relative(root, filePath);
    if (relativeFile === "manifest.json") fail("A table export cannot use manifest.json as its data file.");
    if (seenFiles.has(relativeFile)) fail(`Multiple tables reference the same export file: ${relativeFile}`);
    seenFiles.add(relativeFile);

    let bytes;
    try {
      const realFilePath = await realpath(filePath);
      if (!realFilePath.startsWith(realRoot + path.sep)) fail(`Export file resolves outside the export directory: ${entry.file}`);
      bytes = await readFile(realFilePath);
    }
    catch (error) { fail(`Unable to read export for ${entry.name}: ${error.message}`); }
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    if (actualSha256 !== entry.sha256.toLowerCase()) fail(`SHA-256 mismatch for table ${entry.name}.`);

    const content = bytes.toString("utf8");
    const lines = content.split("\n");
    if (lines.at(-1) === "") lines.pop();
    let actualRows = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].trim()) fail(`Blank JSONL record in ${entry.name} at line ${i + 1}.`);
      let row;
      try { row = JSON.parse(lines[i]); }
      catch { fail(`Invalid JSON in ${entry.name} at line ${i + 1}.`); }
      if (!row || typeof row !== "object" || Array.isArray(row)) fail(`JSONL record in ${entry.name} at line ${i + 1} must be an object.`);
      actualRows += 1;
    }
    if (actualRows !== entry.rowCount) fail(`Row count mismatch for ${entry.name}: manifest says ${entry.rowCount}, file contains ${actualRows}.`);
    tables.push({ name: entry.name, file: relativeFile, rowCount: actualRows, sha256: actualSha256, valid: true });
  }

  return { valid: true, sourceSchema: manifest.sourceSchema, exportedAt: manifest.exportedAt, tableCount: tables.length, totalRows: tables.reduce((sum, table) => sum + table.rowCount, 0), tables };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const directory = process.argv[2];
    if (!directory) fail("Usage: node server/src/migrations/validateExport.js <export-directory>");
    const report = await validateExportDirectory(directory);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Export validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
