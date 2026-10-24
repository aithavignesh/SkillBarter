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
  for (const script of ["dev", "build", "check", "test"]) {
    if (!root.scripts?.[script]) failures.push(`Root npm script missing: ${script}`);
  }
}

if (web) {
  if (!web.dependencies?.next) failures.push("Next.js dependency is missing.");
  if (!web.dependencies?.react) failures.push("React dependency is missing from next-app.");
  if (!web.scripts?.build) failures.push("Next.js production build script is missing.");
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
  "next-app/next.config.ts",
  "next-app/.env.example",
  "server/src/app.js",
  "server/src/index.js",
  "server/src/config/db.js",
  "server/src/config/env.js",
  "server/.env.example",
  "migrations/source-to-target-contract.json",
  "migrations/MIGRATION_READINESS_GATE.md",
  "MIGRATION_MERN.md",
  "frontend",
  "backend"
]) {
  await requirePath(path);
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
