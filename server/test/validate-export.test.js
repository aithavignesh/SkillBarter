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

test("rejects path traversal in a manifest", async t => {
  const { directory, manifest } = await fixture(t);
  manifest.tables[0].file = "../outside.jsonl";
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await assert.rejects(validateExportDirectory(directory), /escapes the export directory/);
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
