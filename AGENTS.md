# Repository architecture note for the MERN migration branch

For work on `migration/next-express-mongodb`, follow [`docs/TECH_STACK_STANDARD.md`](docs/TECH_STACK_STANDARD.md): **Next.js frontend, Node.js + Express backend, MongoDB via Mongoose**. Use `next-app/` for new frontend work and `server/` for new API/business-logic work. Do not add new features to the legacy Vite/InsForge or FastAPI directories unless required for maintenance/rollback or an approved exception.

The InsForge instructions below apply only when maintaining the legacy InsForge-backed implementation. They do not override the MERN migration target architecture. Keep `main`, the live InsForge project, and production data untouched while working on the migration branch.

---

# AGENTS.md

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **SkillBarter** (API base `https://ju9c3u2p.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
