import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Connection from "../src/models/Connection.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("target Connection schema preserves user references, ordered-pair uniqueness, and provisional status", () => {
  assert.equal(Connection.modelName, "Connection");
  assert.equal(Connection.schema.path("user").options.ref, "User");
  assert.equal(Connection.schema.path("connectedUser").options.ref, "User");
  assert.equal(Connection.schema.path("status").options.default, "ACCEPTED");
  assert.ok(Connection.schema.indexes().some(([keys, options]) =>
    keys.user === 1 && keys.connectedUser === 1 && options.unique === true
  ));
  assert.equal(Connection.schema.options.timestamps, false);
});

test("connections migration remains blocked pending schema and row-semantics verification", async () => {
  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const connections = contract.tables.find((table) => table.name === "connections");
  assert.ok(connections);
  assert.equal(connections.status, "blocked");
  assert.equal(connections.proposedTarget, "Connection");
  assert.match(connections.reason, /uq_user_connection/i);
  assert.match(connections.reason, /PENDING and ACCEPTED/i);
  assert.match(connections.reason, /self-connection/i);
  assert.match(connections.reason, /reciprocal pairs/i);
  assert.match(connections.reason, /captured PostgreSQL schema snapshot/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("reciprocal Connection rows remain distinct because uniqueness is directional", async () => {
  const firstUser = new mongoose.Types.ObjectId();
  const secondUser = new mongoose.Types.ObjectId();
  const forward = new Connection({ user: firstUser, connectedUser: secondUser });
  const reverse = new Connection({ user: secondUser, connectedUser: firstUser });

  await forward.validate();
  await reverse.validate();
  assert.notDeepEqual(
    forward.toObject().user.toString() + ":" + forward.toObject().connectedUser.toString(),
    reverse.toObject().user.toString() + ":" + reverse.toObject().connectedUser.toString()
  );

  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const mapping = contract.tables.find((table) => table.name === "connections");
  assert.equal(mapping.status, "blocked");
  assert.match(mapping.reason, /reciprocal pairs may exist/i);
  assert.equal(contract.schemaSnapshotReviewed, false);
});

test("Connection preserves source creation time explicitly rather than generating timestamps", async () => {
  assert.equal(Connection.schema.options.timestamps, false);
  assert.equal(Connection.schema.path("createdAt").options.default, null);
  assert.equal(Connection.schema.path("updatedAt"), undefined);

  const contract = JSON.parse(await readFile(path.join(repositoryRoot, "migrations/source-to-target-contract.json"), "utf8"));
  const mapping = contract.tables.find((table) => table.name === "connections");
  assert.ok(mapping);
  assert.match(mapping.reason, /created_at timestamp/i);
  assert.match(mapping.reason, /preserve source created_at/i);
  assert.equal(mapping.status, "blocked");
  assert.equal(contract.schemaSnapshotReviewed, false);
});
