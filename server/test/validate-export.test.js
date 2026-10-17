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
