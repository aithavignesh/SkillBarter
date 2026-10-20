# SkillBarter web technology standard

Status: required for all new projects and ongoing projects in scope, unless a documented exception is approved.

## Required stack

- **Frontend:** Next.js App Router with React and TypeScript.
- **Backend:** Node.js with Express.js REST APIs.
- **Database:** MongoDB, accessed by the backend through Mongoose.
- **Version control:** Git and GitHub with small, reviewable commits and CI checks.

Do not introduce a second frontend framework, backend framework, or primary database into new feature work without an approved architecture exception. Legacy directories may remain temporarily for migration reference and rollback; their presence does not make them the target stack.

## Repository boundaries

- `next-app/`: user-facing Next.js application, reusable UI components, page layouts, and same-origin server-side API proxy.
- `server/`: Express application, route handlers, middleware, Mongoose models, services, validation, and API/security tests.
- `migrations/`: source evidence templates, schema snapshots, mapping contracts, and migration validation artifacts. Never commit credentials or raw personal-data exports.
- `frontend/` and `backend/`: legacy Vite/InsForge and FastAPI reference implementations during migration only. Avoid adding new features there unless needed for safe maintenance of the currently deployed app or a separately approved exception.

## Engineering requirements

1. Keep UI components reusable, responsive, accessible, and consistent. Keep page-specific composition in the App Router and shared primitives in clearly named component modules.
2. Keep business rules and persistence in Express services/models; do not connect to MongoDB from browser code or Next.js client components.
3. Validate and normalize untrusted input at API boundaries. Use allowlists for enums and queryable fields; reject malformed IDs and invalid state transitions.
4. Enforce authentication and authorization on the server for every protected resource. Never trust client-provided role, ownership, participant, or admin claims without checking the persisted identity and permissions.
5. Store secrets only in server-side environment variables or the approved secret manager. Never commit real credentials or expose secrets through `NEXT_PUBLIC_*`.
6. Use secure password hashing, short-lived/appropriately scoped tokens, HttpOnly cookies where applicable, rate limits on authentication and sensitive writes, safe CORS, security headers, bounded request bodies, and non-sensitive error responses.
7. Use consistent error handling and structured, privacy-conscious logs. Never log passwords, OTPs, session tokens, full personal records, or secret configuration.
8. Keep database indexes, uniqueness, nullability, retention, and deletion semantics explicit. Do not silently discard data or invent identifiers during migration.
9. Add automated tests for normal cases, validation failures, authorization boundaries, and security-sensitive edge cases. Test migrations with fixtures and reconciliation reports before any real import.
10. Keep changes scoped to the task branch. Review diffs, run the relevant tests/lint/build, and check GitHub Actions before describing a change as passing.

## Local checks

From the repository root:

```bash
npm install
npm run check -w server
npm run test -w server
npm run lint -w next-app
npm run build
```

The `MERN Migration CI` workflow runs server syntax checks, server tests, Next.js lint, and a production build. A green CI run verifies repository checks only; it does not prove provider delivery, source-data compatibility, or production readiness.

## Migration and release controls

- Keep the source-to-target contract blocked until the actual approved PostgreSQL schema snapshot and sanitized inventory have been reviewed.
- Do not run inventory SQL until its table and column references have been checked against the captured source schema.
- Do not run a production import, delete legacy rollback code, merge the migration branch into `main`, or switch production traffic without explicit cutover approval.
- For architectural uncertainty or a proposed exception, document the rationale, risks, owner, and approval in a pull request before implementation.

## Current SkillBarter disposition

The migration branch contains the Next.js + Express + MongoDB foundation. It is not yet a production replacement. Provider-backed OTP delivery, staging end-to-end acceptance, source schema evidence, the verified data importer/dry run, reconciliation, backups, and rollback validation remain cutover blockers.
