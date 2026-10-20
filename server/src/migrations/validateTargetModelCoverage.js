import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const modelsDirectory = fileURLToPath(new URL("../models/", import.meta.url));

/** Verify target model files and field paths against Mongoose schemas; no DB access. */
export async function validateTargetModelCoverage(mappingContract, modelDirectory = modelsDirectory) {
  if (!mappingContract || typeof mappingContract !== "object" || Array.isArray(mappingContract)) {
    throw new Error("Mapping contract must be a JSON object.");
  }
  if (!Array.isArray(mappingContract.tables)) throw new Error("Mapping contract must contain a tables array.");
  const modelFiles = new Set((await readdir(modelDirectory))
    .filter((file) => file.endsWith(".js"))
    .map((file) => file.slice(0, -3)));
  const schemaCache = new Map();
  const issues = [];
  const tables = [];

  async function getSchema(modelName) {
    if (!schemaCache.has(modelName)) {
      const modelUrl = pathToFileURL(path.join(modelDirectory, `${modelName}.js`)).href;
      const loaded = await import(modelUrl);
      schemaCache.set(modelName, loaded.default?.schema ?? null);
    }
    return schemaCache.get(modelName);
  }

  for (const table of mappingContract.tables) {
    if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error("Mapping table entries must be objects.");
    if (table.proposedTarget == null) {
      if (["mapped", "transformed"].includes(table.status)) {
        issues.push({ table: table.name ?? null, issue: "mapped/transformed table requires a proposedTarget" });
        tables.push({ name: table.name, targets: [], valid: false, skipped: false });
      } else {
        tables.push({ name: table.name, targets: [], valid: true, skipped: true });
      }
      continue;
    }
    if (typeof table.proposedTarget !== "string" || !table.proposedTarget.trim()) {
      issues.push({ table: table.name ?? null, issue: "proposedTarget must be a non-empty string or null" });
      tables.push({ name: table.name, targets: [], valid: false });
      continue;
    }
    const targetPaths = table.proposedTarget.split("/").map((part) => part.trim());
    const parsedPaths = targetPaths.map((targetPath) => ({
      targetPath,
      match: targetPath.match(/^([A-Z][A-Za-z0-9]*)(?:[.][a-z][A-Za-z0-9_]*)*$/),
      unsafe: targetPath.split(".").some((segment) => ["__proto__", "prototype", "constructor"].includes(segment))
    }));
    const malformed = parsedPaths.filter(({ match, unsafe }) => !match || unsafe);
    const overlapIssues = [];
    const validPaths = parsedPaths
      .filter(({ match, unsafe }) => match && !unsafe)
      .map(({ targetPath, match }) => ({
        targetPath,
        model: match[1],
        fields: targetPath.split(".").slice(1)
      }));
    for (let i = 0; i < validPaths.length; i += 1) {
      for (let j = i + 1; j < validPaths.length; j += 1) {
        const left = validPaths[i];
        const right = validPaths[j];
        if (left.model !== right.model) continue;
        const shorter = left.fields.length <= right.fields.length ? left : right;
        const longer = shorter === left ? right : left;
        if (shorter.fields.every((segment, index) => segment === longer.fields[index])) {
          const overlapIssue = {
            table: table.name ?? null,
            target: `${left.targetPath} / ${right.targetPath}`,
            issue: "target paths overlap and may overwrite one another"
          };
          issues.push(overlapIssue);
          overlapIssues.push(overlapIssue);
        }
      }
    }
    for (const { targetPath, unsafe } of malformed) {
      issues.push({
        table: table.name ?? null,
        target: targetPath,
        issue: unsafe ? "target path contains an unsafe prototype-related segment" : "target path must use ModelName or ModelName.fieldPath syntax"
      });
    }
    const targets = [...new Set(parsedPaths.map(({ match }) => match?.[1]).filter(Boolean))];
    const missing = targets.filter((name) => !modelFiles.has(name));
    for (const modelName of missing) issues.push({ table: table.name ?? null, model: modelName, issue: "target model file is missing" });

    const invalidFields = [];
    for (const target of validPaths) {
      if (missing.includes(target.model) || target.fields.length === 0) continue;
      try {
        const schema = await getSchema(target.model);
        const fieldPath = target.fields.join(".");
        const exists = schema && (schema.path(fieldPath) || schema.pathType(fieldPath) === "nested");
        if (!exists) {
          const issue = {
            table: table.name ?? null,
            target: target.targetPath,
            model: target.model,
            issue: schema ? "target field path does not exist in the Mongoose schema" : "target model does not export a Mongoose schema"
          };
          issues.push(issue);
          invalidFields.push(target.targetPath);
        }
      } catch {
        const issue = {
          table: table.name ?? null,
          target: target.targetPath,
          model: target.model,
          issue: "target model schema could not be loaded"
        };
        issues.push(issue);
        invalidFields.push(target.targetPath);
      }
    }
    const invalidFieldMappings = [];
    const mappedFields = Array.isArray(table.fields)
      ? table.fields.filter((field) => field && ["mapped", "transformed"].includes(field.status))
      : [];
    if (mappedFields.length > 0) {
      if (targets.length !== 1) {
        const issue = {
          table: table.name ?? null,
          issue: "field-level targetField validation requires exactly one target model in proposedTarget"
        };
        issues.push(issue);
        invalidFieldMappings.push(...mappedFields.map((field) => field.sourceField ?? null));
      } else if (!missing.includes(targets[0])) {
        const modelName = targets[0];
        let schema;
        try {
          schema = await getSchema(modelName);
        } catch {
          schema = null;
        }
        for (const field of mappedFields) {
          const targetField = field.targetField;
          const safeSyntax = typeof targetField === "string"
            && /^[a-z][A-Za-z0-9_]*(?:[.][a-z][A-Za-z0-9_]*)*$/.test(targetField)
            && !targetField.split(".").some((segment) => ["__proto__", "prototype", "constructor"].includes(segment));
          if (!safeSyntax) {
            issues.push({
              table: table.name ?? null,
              sourceField: field.sourceField ?? null,
              target: targetField ?? null,
              issue: "field-level targetField must be a safe schema field path"
            });
            invalidFieldMappings.push(field.sourceField ?? null);
            continue;
          }
          const exists = schema && (schema.path(targetField) || schema.pathType(targetField) === "nested");
          if (!exists) {
            issues.push({
              table: table.name ?? null,
              sourceField: field.sourceField ?? null,
              target: targetField,
              model: modelName,
              issue: schema ? "field-level targetField does not exist in the Mongoose schema" : "target model does not export a Mongoose schema"
            });
            invalidFieldMappings.push(field.sourceField ?? null);
          }
        }
      }
    }
    tables.push({
      name: table.name,
      targets,
      valid: missing.length === 0 && malformed.length === 0 && overlapIssues.length === 0
        && invalidFields.length === 0 && invalidFieldMappings.length === 0,
      missing,
      malformed: malformed.map(({ targetPath }) => targetPath),
      invalidFields,
      invalidFieldMappings
    });
  }
  return { valid: issues.length === 0, checkedTableCount: tables.filter((table) => !table.skipped).length, tables, issues };
}
