import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { validateExportDirectory } from "../src/migrations/validateExport.js";

async function fixture(t, rows = [{ id: "1" }, { id: "2" }]) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-export-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const data = rows.map(row => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
  await writeFile(path.join(directory, "users.jsonl"), data);
  const manifest = {
    sourceSchema: "public",
    exportedAt: "2026-10-17T10:00:00.000Z",
    tables: [{ name: "users", file: "users.jsonl", rowCount: rows.length, sha256: createHash("sha256").update(data).digest("hex") }]
  };
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  return { directory, manifest, data };
}

test("validates checksum, JSONL records, and row counts without a database", async t => {
  const { directory } = await fixture(t);
  const report = await validateExportDirectory(directory);
  assert.equal(report.valid, true);
  assert.equal(report.tableCount, 1);
  assert.equal(report.totalRows, 2);
  assert.equal(report.tables[0].valid, true);
});

test("preserves and validates optional source column inventories", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables[0].columns = ["id", "email", "full_name"];
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  const report = await validateExportDirectory(directory);
  assert.deepEqual(report.tables[0].columns, ["id", "email", "full_name"]);

  manifest.tables[0].columns = ["id", "Email", "email"];
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /Duplicate source column/);
});

test("accepts an empty table export with a zero row count", async t => {
  const { directory } = await fixture(t, []);
  const report = await validateExportDirectory(directory);
  assert.equal(report.totalRows, 0);
});

test("rejects checksum mismatch", async t => {
  const { directory } = await fixture(t);
  await writeFile(path.join(directory, "users.jsonl"), '{"id":"tampered"}\n');
  await assert.rejects(validateExportDirectory(directory), /SHA-256 mismatch/);
});

test("rejects row-count mismatch even when checksum is correct", async t => {
  const { directory, manifest, data } = await fixture(t);
  manifest.tables[0].rowCount = 99;
  manifest.tables[0].sha256 = createHash("sha256").update(data).digest("hex");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /Row count mismatch/);
});

test("rejects malformed JSONL rows", async t => {
  const { directory, manifest } = await fixture(t);
  const invalid = '{"id":\n';
  await writeFile(path.join(directory, "users.jsonl"), invalid);
  manifest.tables[0].rowCount = 1;
  manifest.tables[0].sha256 = createHash("sha256").update(invalid).digest("hex");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /Invalid JSON in users at line 1/);
});


test("rejects ambiguous dot-segment paths in export manifests", async t => {
  const { directory, manifest } = await fixture(t);
  for (const file of ["./users.jsonl", "nested/../users.jsonl", "nested//users.jsonl", "users.jsonl/"]) {
    manifest.tables[0].file = file;
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
    await assert.rejects(
      validateExportDirectory(directory),
      /must not contain empty, current-directory, or parent-directory segments/
    );
  }
});

test("rejects path traversal in a manifest", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables[0].file = "../outside.jsonl";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /must not contain empty, current-directory, or parent-directory segments|escapes the export directory/);
});

test("rejects Windows absolute and backslash-separated manifest paths on every platform", async t => {
  const { directory, manifest } = await fixture(t);
  for (const file of ["C:\\\\outside.jsonl", "\\\\\\\\server\\\\share\\\\users.jsonl", "nested\\\\..\\\\outside.jsonl"]) {
    manifest.tables[0].file = file;
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
    await assert.rejects(validateExportDirectory(directory), /non-empty relative path using forward slashes/);
  }
});

test("rejects case-colliding table names in export manifests", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables.push({ ...manifest.tables[0], name: "Users" });
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /Duplicate table name in manifest.*case-insensitive aliases/
  );
});

test("rejects Unicode-normalization aliases of export paths", async t => {
  const { directory, manifest, data } = await fixture(t);
  const composed = "caf\u00e9.jsonl";
  const decomposed = "cafe\u0301.jsonl";
  await writeFile(path.join(directory, composed), data);
  await writeFile(path.join(directory, decomposed), data);
  manifest.tables[0].file = composed;
  manifest.tables.push({
    name: "skills",
    file: decomposed,
    rowCount: 2,
    sha256: createHash("sha256").update(data).digest("hex")
  });
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /Multiple tables reference the same export file.*case-insensitive aliases/
  );
});

test("rejects case-insensitive aliases of manifest.json as table data", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables[0].file = "MANIFEST.JSON";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /cannot use manifest\.json as its data file, including case-insensitive aliases/
  );
});

test("rejects case-colliding export paths for cross-platform portability", async t => {
  const { directory, manifest, data } = await fixture(t);
  await writeFile(path.join(directory, "USERS.JSONL"), data);
  manifest.tables.push({
    name: "skills",
    file: "USERS.JSONL",
    rowCount: 2,
    sha256: createHash("sha256").update(data).digest("hex")
  });
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /Multiple tables reference the same export file.*case-insensitive aliases/
  );
});

test("rejects duplicate table names and invalid metadata", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables.push({ ...manifest.tables[0] });
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /Duplicate table name/);
});

test("rejects non-object JSON records", async t => {
  const { directory, manifest } = await fixture(t);
  const invalid = '["not","a","row"]\n';
  await writeFile(path.join(directory, "users.jsonl"), invalid);
  manifest.tables[0].rowCount = 1;
  manifest.tables[0].sha256 = createHash("sha256").update(invalid).digest("hex");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /must be an object/);
});

test("rejects two manifest entries that resolve through an internal symlink to the same file", async t => {
  const { directory, manifest, data } = await fixture(t);
  await symlink(path.join(directory, "users.jsonl"), path.join(directory, "users-alias.jsonl"));
  manifest.tables.push({
    name: "skills",
    file: "users-alias.jsonl",
    rowCount: 2,
    sha256: createHash("sha256").update(data).digest("hex")
  });
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /Multiple tables resolve to the same export file through aliases/
  );
});

test("rejects symbolic links that resolve outside the export directory", async t => {
  const { directory, manifest } = await fixture(t);
  const outsidePath = path.join(os.tmpdir(), `skillbarter-outside-${process.pid}-${Date.now()}.jsonl`);
  await writeFile(outsidePath, '{"id":"outside"}\n');
  t.after(() => rm(outsidePath, { force: true }));
  await rm(path.join(directory, "users.jsonl"));
  await symlink(outsidePath, path.join(directory, "users.jsonl"));
  manifest.tables[0].rowCount = 1;
  manifest.tables[0].sha256 = createHash("sha256").update('{"id":"outside"}\n').digest("hex");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /resolves outside the export directory/);
});


test("rejects invalid UTF-8 even when the manifest checksum matches", async t => {
  const { directory, manifest } = await fixture(t);
  const invalidUtf8 = Buffer.from([0x7b, 0x22, 0x69, 0x64, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d, 0x0a]);
  await writeFile(path.join(directory, "users.jsonl"), invalidUtf8);
  manifest.tables[0].rowCount = 1;
  manifest.tables[0].sha256 = createHash("sha256").update(invalidUtf8).digest("hex");
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /not valid UTF-8/);
});

test("rejects a manifest containing invalid UTF-8", async t => {
  const { directory } = await fixture(t);
  const manifestPath = path.join(directory, "manifest.json");
  const bytes = await import("node:fs/promises").then(fs => fs.readFile(manifestPath));
  const invalid = Buffer.concat([bytes.subarray(0, 25), Buffer.from([0xff]), bytes.subarray(26)]);
  await writeFile(manifestPath, invalid);
  await assert.rejects(validateExportDirectory(directory), /manifest\.json is not valid UTF-8/);
});

test("rejects impossible calendar dates and out-of-range timestamp components", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.exportedAt = "2026-02-31T10:00:00.000Z";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /valid ISO 8601 timestamp/);

  manifest.exportedAt = "2026-10-17T25:00:00Z";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /valid ISO 8601 timestamp/);
});

test("accepts a valid leap-day timestamp", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.exportedAt = "2024-02-29T23:59:59+05:30";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  const report = await validateExportDirectory(directory);
  assert.equal(report.valid, true);
});

test("rejects ambiguous or non-ISO export timestamps", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.exportedAt = "October 17, 2026";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /ISO 8601 timestamp with an explicit timezone/);
});

test("rejects ISO timestamps with timezone offsets beyond the supported range", async t => {
  const { directory, manifest } = await fixture(t);
  for (const exportedAt of [
    "2026-10-17T10:00:00+14:01",
    "2026-10-17T10:00:00+15:00",
    "2026-10-17T10:00:00-23:00"
  ]) {
    manifest.exportedAt = exportedAt;
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
    await assert.rejects(
      validateExportDirectory(directory),
      /valid ISO 8601 timestamp/
    );
  }
});

test("accepts the maximum supported ISO timezone offset", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.exportedAt = "2026-10-17T10:00:00+14:00";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  const report = await validateExportDirectory(directory);
  assert.equal(report.valid, true);
});

test("rejects timestamps whose -00:00 offset means the instant is unknown", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.exportedAt = "2026-10-17T10:00:00-00:00";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /valid ISO 8601 timestamp with an explicit timezone/
  );
});

test("rejects an internal symlink that resolves to manifest.json as table data", async t => {
  const { directory, manifest } = await fixture(t);
  await symlink(path.join(directory, "manifest.json"), path.join(directory, "manifest-alias.json"));
  manifest.tables[0].file = "manifest-alias.json";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(
    validateExportDirectory(directory),
    /cannot resolve to manifest\.json through an alias/
  );
});

test("rejects a manifest symlink that resolves outside the export directory", async t => {
  const { directory } = await fixture(t);
  const outsidePath = path.join(os.tmpdir(), `skillbarter-outside-manifest-${process.pid}-${Date.now()}.json`);
  await writeFile(outsidePath, JSON.stringify({
    sourceSchema: "public",
    exportedAt: "2026-10-17T10:00:00.000Z",
    tables: [{ name: "users", file: "users.jsonl", rowCount: 0, sha256: createHash("sha256").update("").digest("hex") }]
  }));
  t.after(() => rm(outsidePath, { force: true }));
  await rm(path.join(directory, "manifest.json"));
  await symlink(outsidePath, path.join(directory, "manifest.json"));
  await assert.rejects(
    validateExportDirectory(directory),
    /manifest\.json must remain inside the export directory/
  );
});
