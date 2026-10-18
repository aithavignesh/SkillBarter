import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateTargetModelCoverage } from "../src/migrations/validateTargetModelCoverage.js";

async function modelFixture(t, names = ["User.js", "Skill.js", "Exchange.js"]) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-target-models-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(names.map((name) => writeFile(path.join(directory, name), "export default {};\n")));
  return directory;
}

test("accepts existing models and nested field paths", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [
      { name: "users", proposedTarget: "User" },
      { name: "user_skills", proposedTarget: "User.skillsToTeach / User.skillsToLearn" },
      { name: "exchanges", proposedTarget: "Exchange" }
    ]
  }, directory);
  assert.equal(result.valid, true);
  assert.equal(result.checkedTableCount, 3);
  assert.deepEqual(result.issues, []);
});

test("rejects target model names that do not exist", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "messages", proposedTarget: "Message" }]
  }, directory);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.model === "Message" && issue.issue === "target model file is missing"));
});

test("rejects malformed model and field-path syntax", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "users", proposedTarget: "../User / User.UppercaseField / Missing.validField" }]
  }, directory);
  assert.equal(result.valid, false);
  assert.deepEqual(result.tables[0].malformed, ["../User", "User.UppercaseField"]);
  assert.ok(result.issues.some((issue) => issue.issue === "target model file is missing" && issue.model === "Missing"));
});

test("skips explicitly null targets without claiming a model was checked", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "connections", proposedTarget: null }]
  }, directory);
  assert.equal(result.valid, true);
  assert.equal(result.checkedTableCount, 0);
  assert.equal(result.tables[0].skipped, true);
});

test("rejects malformed contract shapes", async (t) => {
  const directory = await modelFixture(t);
  await assert.rejects(validateTargetModelCoverage({ tables: {} }, directory), /tables array/);
  await assert.rejects(validateTargetModelCoverage({ tables: [null] }, directory), /entries must be objects/);
});

test("rejects empty target strings instead of silently skipping them", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "users", proposedTarget: "   " }]
  }, directory);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.issue === "proposedTarget must be a non-empty string or null"));
});

test("rejects null targets for mappings marked mapped or transformed", async (t) => {
  const directory = await modelFixture(t);
  for (const status of ["mapped", "transformed"]) {
    const result = await validateTargetModelCoverage({
      tables: [{ name: "users", status, proposedTarget: null }]
    }, directory);
    assert.equal(result.valid, false);
    assert.equal(result.tables[0].skipped, false);
    assert.ok(result.issues.some((issue) =>
      issue.table === "users" && issue.issue.includes("requires a proposedTarget")
    ));
  }
});
