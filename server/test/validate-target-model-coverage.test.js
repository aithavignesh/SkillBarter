import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateTargetModelCoverage } from "../src/migrations/validateTargetModelCoverage.js";

async function modelFixture(t, names = ["User.js", "Skill.js", "Exchange.js"]) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "skillbarter-target-models-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modelPaths = {
    User: ["fullName", "username", "email", "skillsToTeach", "skillsToLearn", "profile", "profile.name"],
    Skill: ["name", "normalizedName"],
    Exchange: ["status", "requesterId"]
  };
  await Promise.all(names.map(async (name) => {
    const modelName = name.slice(0, -3);
    const paths = modelPaths[modelName] ?? [];
    const source = `const paths = new Set(${JSON.stringify(paths)});
const schema = {
  path: (field) => paths.has(field) ? {} : undefined,
  pathType: (field) => paths.has(field) ? "real" : "adhocOrUndefined"
};
export default { schema };
`;
    await writeFile(path.join(directory, name), source);
  }));
  return directory;
}

test("accepts existing models and valid top-level and nested field paths", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [
      { name: "users", proposedTarget: "User" },
      { name: "user_skills", proposedTarget: "User.skillsToTeach / User.skillsToLearn" },
      { name: "profile", proposedTarget: "User.profile.name" },
      { name: "skills", proposedTarget: "Skill.name / Skill.normalizedName" },
      { name: "exchanges", proposedTarget: "Exchange.status" }
    ]
  }, directory);
  assert.equal(result.valid, true);
  assert.equal(result.checkedTableCount, 5);
  assert.deepEqual(result.issues, []);
});

test("validates mapped field target paths against the selected model schema", async (t) => {
  const directory = await modelFixture(t);
  const valid = await validateTargetModelCoverage({
    tables: [{
      name: "users",
      status: "mapped",
      proposedTarget: "User",
      fields: [
        { sourceField: "email_address", status: "mapped", targetField: "email" },
        { sourceField: "profile_name", status: "transformed", targetField: "profile.name" }
      ]
    }]
  }, directory);
  assert.equal(valid.valid, true, JSON.stringify(valid.issues));

  const invalid = await validateTargetModelCoverage({
    tables: [{
      name: "users",
      status: "mapped",
      proposedTarget: "User",
      fields: [{ sourceField: "legacy_skills", status: "mapped", targetField: "skills_to_teach" }]
    }]
  }, directory);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.some((issue) =>
    issue.target === "skills_to_teach" && issue.issue === "field-level targetField does not exist in the Mongoose schema"
  ));
});

test("requires an unambiguous target model for field-level schema validation", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{
      name: "user_skills",
      status: "mapped",
      proposedTarget: "User.skillsToTeach / User.skillsToLearn",
      fields: [{ sourceField: "skill_id", status: "mapped", targetField: "skillsToTeach" }]
    }]
  }, directory);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) =>
    issue.issue === "field-level targetField validation requires exactly one target model in proposedTarget"
  ));
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
  assert.deepEqual(result.tables[0].malformed, ["..", "User.UppercaseField"]);
  assert.ok(result.issues.some((issue) => issue.issue === "target model file is missing" && issue.model === "Missing"));
});

test("rejects unknown fields instead of accepting a misspelled field", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "legacy_user_skills", proposedTarget: "User.skills_to_teach" }]
  }, directory);
  assert.equal(result.valid, false);
  assert.deepEqual(result.tables[0].invalidFields, ["User.skills_to_teach"]);
  assert.ok(result.issues.some((issue) =>
    issue.target === "User.skills_to_teach" && issue.issue === "target field path does not exist in the Mongoose schema"
  ));
});

test("rejects prototype-related segments in model target paths", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "users", proposedTarget: "User.__proto__.polluted / User.constructor.name / User.profile" }]
  }, directory);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.target === "User.__proto__.polluted" && issue.issue.includes("unsafe prototype-related")));
  assert.ok(result.issues.some((issue) => issue.target === "User.constructor.name" && issue.issue.includes("unsafe prototype-related")));
  assert.ok(!result.issues.some((issue) => issue.target === "User.profile"));
});

test("rejects overlapping target paths for the same model", async (t) => {
  const directory = await modelFixture(t);
  const result = await validateTargetModelCoverage({
    tables: [{ name: "users", proposedTarget: "User.profile / User.profile.name" }]
  }, directory);
  assert.equal(result.valid, false);
  assert.equal(result.tables[0].valid, false);
  assert.ok(result.issues.some((issue) => issue.issue === "target paths overlap and may overwrite one another"));
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
