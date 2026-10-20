import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Block from "../src/models/Block.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Block model uses User references and a unique directed pair", () => {
  assert.equal(Block.modelName, "Block");
  assert.equal(Block.schema.path("blocker").options.ref, "User");
  assert.equal(Block.schema.path("blocked").options.ref, "User");
  assert.ok(Block.schema.indexes().some(([keys, options]) =>
    keys.blocker === 1 && keys.blocked === 1 && options.unique === true
  ));
});

test("blocks mapping stays pending until source timestamps and self-block semantics are checked", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const blocks = contract.tables.find((table) => table.name === "blocks");
  assert.ok(blocks);
  assert.equal(blocks.status, "pending");
  assert.equal(blocks.proposedTarget, "Block");
  assert.match(blocks.reason, /uq_blocker_blocked/i);
  assert.match(blocks.reason, /created_at defaulting to UTC now/i);
  assert.match(blocks.reason, /rejects self-blocks/i);
  assert.match(blocks.reason, /numeric-ID-to-ObjectId conversion/i);
  assert.match(blocks.reason, /RLS policies/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("target Block rejects self-blocks while migration keeps source policy unresolved", async () => {
  const id = new (await import("mongoose")).default.Types.ObjectId();
  const block = new Block({ blocker: id, blocked: id });
  await assert.rejects(block.validate(), /cannot block your own account/i);
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const blocks = contract.tables.find((table) => table.name === "blocks");
  assert.ok(blocks);
  assert.match(blocks.reason, /source ORM does not declare a self-block check/i);
  assert.match(blocks.reason, /verify whether self-block rows exist/i);
  assert.equal(blocks.status, "pending");
  assert.equal(contract.schemaSnapshotReviewed, false);
});
