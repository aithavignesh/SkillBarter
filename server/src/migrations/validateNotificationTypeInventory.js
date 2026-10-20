import { targetNotificationTypes } from "./mapNotificationType.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TARGET_TYPES = new Set(targetNotificationTypes);

/**
 * Validate aggregate rows exported by the read-only source inventory.
 * Expected rows: [{ value: "<source type>", count: 12 }]. No database access.
 */
export function validateNotificationTypeInventory(rows, explicitMap) {
  if (!Array.isArray(rows)) throw new TypeError("Notification type inventory must be an array");
  if (!explicitMap || typeof explicitMap !== "object" || Array.isArray(explicitMap)) {
    throw new TypeError("Explicit notification type map must be a JSON object");
  }

  const seen = new Set();
  const issues = [];
  const results = rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError("Each inventory row must be an object");
    }
    if (typeof row.value !== "string" || row.value.length === 0) {
      throw new Error("Inventory row value must be a non-empty source type string");
    }
    if (!Number.isSafeInteger(row.count) || row.count < 0) {
      throw new Error(`Inventory count for ${row.value} must be a non-negative safe integer`);
    }
    if (seen.has(row.value)) throw new Error(`Duplicate inventory value: ${row.value}`);
    seen.add(row.value);

    if (!Object.hasOwn(explicitMap, row.value)) {
      issues.push({ sourceType: row.value, count: row.count, issue: "unmapped-source-type" });
      return { sourceType: row.value, count: row.count, mapped: false, targetType: null };
    }
    const targetType = explicitMap[row.value];
    if (!TARGET_TYPES.has(targetType)) {
      issues.push({ sourceType: row.value, count: row.count, issue: "invalid-target-type" });
      return { sourceType: row.value, count: row.count, mapped: false, targetType };
    }
    return { sourceType: row.value, count: row.count, mapped: true, targetType };
  });

  const unusedMapEntries = Object.keys(explicitMap).filter((sourceType) => !seen.has(sourceType));
  return {
    valid: issues.length === 0 && unusedMapEntries.length === 0,
    inventoryValueCount: rows.length,
    mappedValueCount: results.filter((row) => row.mapped).length,
    unmappedCount: issues.reduce((sum, issue) => sum + (issue.issue === "unmapped-source-type" ? 1 : 0), 0),
    issues,
    unusedMapEntries,
    results
  };
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [inventoryPath, mapPath] = process.argv.slice(2);
    if (!inventoryPath || !mapPath) {
      throw new Error("Usage: node server/src/migrations/validateNotificationTypeInventory.js <inventory.json> <explicit-map.json>");
    }
    const inventory = await readJson(inventoryPath);
    const explicitMap = await readJson(mapPath);
    const rows = Array.isArray(inventory) ? inventory : inventory.rows;
    const result = validateNotificationTypeInventory(rows, explicitMap);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\\n`);
    if (!result.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`Notification type inventory validation failed: ${error.message}\\n`);
    process.exitCode = 1;
  }
}
