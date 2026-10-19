import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Block from "../src/models/Block.js";

test("block model references users and defines a unique directed pair", () => {
  assert.equal(Block.modelName, "Block");
  assert.equal(Block.schema.path("blocker").options.ref, "User");
  assert.equal(Block.schema.path("blocked").options.ref, "User");
  assert.ok(Block.schema.indexes().some(([keys, options]) =>
    keys.blocker === 1 && keys.blocked === 1 && options.unique === true
  ));
});

test("block model rejects self-blocking", async () => {
  const id = new mongoose.Types.ObjectId();
  await assert.rejects(
    new Block({ blocker: id, blocked: id }).validate(),
    /cannot block your own account/i
  );
});

test("block model accepts distinct users", async () => {
  const block = new Block({
    blocker: new mongoose.Types.ObjectId(),
    blocked: new mongoose.Types.ObjectId()
  });
  await assert.doesNotReject(block.validate());
});
