import test from "node:test";
import assert from "node:assert/strict";
import { validateNotificationTypeInventory } from "../src/migrations/validateNotificationTypeInventory.js";

test("validates an inventory when every source type has an explicit target mapping", () => {
  const report = validateNotificationTypeInventory(
    [{ value: "new_message", count: 3 }, { value: "exchange_started", count: 0 }],
    { new_message: "message", exchange_started: "exchange_update" }
  );
  assert.equal(report.valid, true);
  assert.equal(report.inventoryValueCount, 2);
  assert.equal(report.mappedValueCount, 2);
  assert.equal(report.unmappedCount, 0);
});

test("blocks unknown source values and reports unused mapping entries", () => {
  const report = validateNotificationTypeInventory(
    [{ value: "new_message", count: 3 }, { value: "legacy_type", count: 1 }],
    { new_message: "message", stale_source_type: "system" }
  );
  assert.equal(report.valid, false);
  assert.deepEqual(report.issues.map((issue) => issue.issue), ["unmapped-source-type"]);
  assert.deepEqual(report.unusedMapEntries, ["stale_source_type"]);
});

test("rejects whitespace-only source notification values", () => {
  assert.throws(
    () => validateNotificationTypeInventory([{ value: "   ", count: 1 }], {}),
    /non-empty source type string/
  );
});

test("rejects source notification values padded with whitespace", () => {
  assert.throws(
    () => validateNotificationTypeInventory([{ value: " message ", count: 1 }], { " message ": "message" }),
    /leading or trailing whitespace/
  );
});

test("rejects duplicate source values and invalid counts", () => {
  assert.throws(
    () => validateNotificationTypeInventory([{ value: "message", count: 1 }, { value: "message", count: 2 }], { message: "message" }),
    /Duplicate inventory value/
  );
  assert.throws(
    () => validateNotificationTypeInventory([{ value: "message", count: -1 }], { message: "message" }),
    /non-negative safe integer/
  );
});

test("rejects target values outside the supported notification enum", () => {
  const report = validateNotificationTypeInventory([{ value: "new_message", count: 1 }], { new_message: "not_supported" });
  assert.equal(report.valid, false);
  assert.equal(report.issues[0].issue, "invalid-target-type");
});
