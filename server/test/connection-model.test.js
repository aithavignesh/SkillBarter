import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Connection from "../src/models/Connection.js";

test("connection model keeps community connections separate from exchanges", () => {
  assert.equal(Connection.modelName, "Connection");
  assert.equal(Connection.schema.path("user").options.ref, "User");
  assert.equal(Connection.schema.path("connectedUser").options.ref, "User");
  assert.equal(Connection.schema.path("user").isRequired, true);
  assert.equal(Connection.schema.path("connectedUser").isRequired, true);
  assert.equal(Connection.schema.path("status").instance, "String");
  assert.equal(Connection.schema.path("status").options.default, "ACCEPTED");
  assert.equal(Connection.schema.path("status").options.enum, undefined);
  assert.equal(Connection.schema.path("createdAt").instance, "Date");
  assert.equal(Connection.schema.options.timestamps, false);
});

test("connection model has a unique directed-pair index and indexes both users", () => {
  const indexes = Connection.schema.indexes();
  assert.ok(indexes.some(([keys, options]) =>
    keys.user === 1 && keys.connectedUser === 1 && options.unique === true
  ));
  assert.ok(indexes.some(([keys]) => keys.user === 1 && Object.keys(keys).length === 1));
  assert.ok(indexes.some(([keys]) => keys.connectedUser === 1 && Object.keys(keys).length === 1));
});

test("connection model rejects self-connections during validation", async () => {
  const id = new mongoose.Types.ObjectId();
  const connection = new Connection({ user: id, connectedUser: id });
  await assert.rejects(connection.validate(), /You cannot create a connection with your own account/);
});

test("connection model allows connections between different users", async () => {
  const connection = new Connection({
    user: new mongoose.Types.ObjectId(),
    connectedUser: new mongoose.Types.ObjectId()
  });
  await assert.doesNotReject(connection.validate());
});
