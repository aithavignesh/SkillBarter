import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modelsDirectory = fileURLToPath(new URL("../models/", import.meta.url));

/** Verify that every named target model in the mapping contract exists; no DB access. */
export async function validateTargetModelCoverage(mappingContract, modelDirectory = modelsDirectory) {
  if (!mappingContract || typeof mappingContract !== "object" || Array.isArray(mappingContract)) {
    throw new Error("Mapping contract must be a JSON object.");
  }
  if (!Array.isArray(mappingContract.tables)) throw new Error("Mapping contract must contain a tables array.");
  const modelFiles = new Set((await readdir(modelDirectory))
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.slice(0, -3)));
  const issues = [];
  const tables = [];

  for (const table of mappingContract.tables) {
    if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error("Mapping table entries must be objects.");
    if (table.proposedTarget == null) {
      tables.push({ name: table.name, targets: [], valid: true, skipped: true });
      continue;
    }
    if (typeof table.proposedTarget !== "string" || !table.proposedTarget.trim()) {
      issues.push({ table: table.name ?? null, issue: "proposedTarget must be a non-empty string or null" });
      tables.push({ name: table.name, targets: [], valid: false });
      continue;
    }
    const targets = [...new Set(table.proposedTarget.match(/[A-Z][A-Za-z0-9]*/g) ?? [])];
    const missing = targets.filter((name) => !modelFiles.has(name));
    for (const modelName of missing) issues.push({ table: table.name ?? null, model: modelName, issue: "target model file is missing" });
    tables.push({ name: table.name, targets, valid: missing.length === 0, missing });
  }
  return { valid: issues.length === 0, checkedTableCount: tables.filter((table) => !table.skipped).length, tables, issues };
}
