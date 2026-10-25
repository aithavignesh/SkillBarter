import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const failures = [];
const checks = [];

async function requirePath(path) {
  try {
    await access(path, constants.F_OK);
    checks.push(`exists: ${path}`);
    return true;
  } catch {
    failures.push(`Missing required migration path: ${path}`);
    return false;
  }
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    failures.push(`Cannot parse ${path}: ${error.message}`);
    return null;
  }
}

const root = await readJson("package.json");
const web = await readJson("next-app/package.json");
const api = await readJson("server/package.json");

if (root) {
  for (const workspace of ["next-app", "server"]) {
    if (!root.workspaces?.includes(workspace)) failures.push(`Root workspace missing: ${workspace}`);
  }
  for (const script of ["dev", "build", "check", "test", "verify:stack"]) {
    if (!root.scripts?.[script]) failures.push(`Root npm script missing: ${script}`);
  }
}

if (web) {
  if (!web.dependencies?.next) failures.push("Next.js dependency is missing.");
  if (!web.dependencies?.react) failures.push("React dependency is missing from next-app.");
  if (!web.dependencies?.["react-dom"]) failures.push("React DOM dependency is missing from next-app.");
  if (!web.scripts?.build) failures.push("Next.js production build script is missing.");
  if (!web.scripts?.start) failures.push("Next.js production start script is missing.");
}

if (api) {
  for (const dependency of ["express", "mongoose", "helmet", "jsonwebtoken"]) {
    if (!api.dependencies?.[dependency]) failures.push(`Express API dependency missing: ${dependency}`);
  }
  for (const script of ["start", "check", "test"]) {
    if (!api.scripts?.[script]) failures.push(`API npm script missing: ${script}`);
  }
}

for (const path of [
  "next-app/app",
  "next-app/app/api",
  "next-app/next.config.ts",
  "next-app/.env.example",
  "server/src/app.js",
  "server/src/index.js",
  "server/src/config/db.js",
  "server/src/config/env.js",
  "server/.env.example",
  "migrations/source-to-target-contract.json",
  "migrations/MIGRATION_READINESS_GATE.md",
  "migrations/MIGRATION_RUNBOOK.md",
  "docs/DEPLOYMENT_MERN.md",
  "MIGRATION_MERN.md",
  "frontend",
  "backend"
]) {
  await requirePath(path);
}

// Keep critical target-stack routes, models, tests, and migration gates visible to CI.
for (const path of [
  "server/src/routes/auth.js",
  "server/src/routes/users.js",
  "server/src/routes/skills.js",
  "server/src/routes/exchanges.js",
  "server/src/routes/matches.js",
  "server/src/routes/messages.js",
  "server/src/routes/reviews.js",
  "server/src/routes/reports.js",
  "server/src/routes/blocks.js",
  "server/src/routes/posts.js",
  "server/src/routes/notifications.js",
  "server/src/routes/analytics.js",
  "server/src/routes/admin.js",
  "server/test/app-security.test.js",
  "server/test/deployment-readiness.test.js",
  "server/test/health.test.js",
  "server/src/migrations/validateMigrationPreflight.js"
]) {
  await requirePath(path);
}

try {
  const contract = await readJson("migrations/source-to-target-contract.json");
  if (contract) {
    if (contract.schemaSnapshotReviewed !== true && contract.status !== "blocked-pending-source-schema") {
      failures.push("Unreviewed source schema must keep the migration contract blocked.");
    }
    if (contract.schemaSnapshotReviewed === true && contract.status === "blocked-pending-source-schema") {
      failures.push("Reviewed schema flag and migration contract status are inconsistent.");
    }
    if (!Array.isArray(contract.tables) || contract.tables.length === 0) {
      failures.push("Migration contract must list source tables and dispositions.");
    }
  }
} catch {
  // Contract parse failures are reported by readJson.
}

try {
  const envExample = await readFile("next-app/.env.example", "utf8");
  if (/NEXT_PUBLIC_.*(?:MONGODB|JWT_SECRET|OTP_SECRET|API_BASE_URL)/i.test(envExample)) {
    failures.push("A server-only setting appears to be exposed with a NEXT_PUBLIC_ prefix.");
  }
  if (!/API_BASE_URL=http:\/\/localhost:4000/.test(envExample)) {
    failures.push("Next.js server-side API_BASE_URL example is missing or unexpected.");
  }
} catch {
  // Missing path is already reported above.
}

try {
  const serverEnv = await readFile("server/.env.example", "utf8");
  for (const key of ["MONGODB_URI=", "JWT_SECRET=", "CLIENT_ORIGIN="]) {
    if (!serverEnv.includes(key)) failures.push(`Server environment example is missing ${key}`);
  }
} catch {
  // Missing path is already reported above.
}

if (failures.length) {
  console.error("SkillBarter MERN migration verification FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`SkillBarter MERN migration structure verified (${checks.length} required paths).`);
}
