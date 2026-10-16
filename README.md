# SkillBarter

> **Learn what you need. Teach what you know.**

SkillBarter is a peer-learning and skill-exchange platform for students and early-career learners. Users choose skills they can teach and want to learn, discover compatible peers, request exchanges, schedule sessions, message participants, complete exchanges, and leave reviews.

## Required technology stack

This migration branch implements the target stack required for ongoing projects:

- **Frontend:** Next.js App Router, React, TypeScript
- **Backend:** Node.js + Express.js REST API
- **Database:** MongoDB with Mongoose
- **Authentication:** bcrypt password hashing, signed JWTs, server-side authorization, and an HttpOnly session cookie set by the Next.js same-origin API proxy
- **Hosting target:** Next.js frontend and Express API deployed as separate services

The existing `frontend/` (Vite/InsForge) and `backend/` (FastAPI) directories are retained as migration reference and rollback material. They are not evidence that the migration is complete, and they must not be deleted until the replacement is validated and the production cutover is explicitly approved.

## Repository structure

```
next-app/             Next.js App Router frontend
server/               Express API, Mongoose models, and security tests
frontend/             Existing Vite app retained during migration
backend/              Existing FastAPI app retained during migration
migrations/            Historical SQL migrations from the existing system
MIGRATION_MERN.md      Target architecture, setup, and remaining cutover work
MIGRATION_AUDIT_NEXT.md Security and migration audit checklist
```

## Local development

Requirements: a supported Node.js LTS release and a local MongoDB instance or MongoDB Atlas database.

1. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI` and a unique `JWT_SECRET` of at least 32 characters.
2. Copy `next-app/.env.example` to `next-app/.env.local` and set `API_BASE_URL=http://localhost:4000`.
3. From the repository root, install dependencies:

   ```bash
   npm install
   ```

4. Start the frontend and API together:

   ```bash
   npm run dev
   ```

5. Verify the API at `http://localhost:4000/api/health` and the web app at `http://localhost:3000`.

## Validation

```bash
npm run check -w server
npm run test -w server
npm run build
```

GitHub Actions runs the MERN migration checks on pushes to `migration/next-express-mongodb`. Vercel status checks on the legacy project can fail due to account build-rate limits; those are separate from the MERN migration CI workflow.

## Security requirements

- MongoDB and JWT secrets stay in server-side environment variables; never expose them through `NEXT_PUBLIC_*`.
- The Next.js proxy stores the JWT in an HttpOnly cookie and forwards it to Express as a Bearer token.
- Express verifies JWT signature, issuer, audience, expiry, account status, and token version.
- Admin privileges are checked by middleware on the API, not trusted from client-side UI.
- Authentication and sensitive write operations use rate limits; user input is validated before persistence.
- Password-reset tokens are random, hashed at rest, single-use, and expire after 15 minutes. SMTP configuration is required for delivery.
- Back up the existing source database before any migration. Do not run a production import or change production traffic until source/target counts, IDs, references, auth recovery, security tests, and rollback are verified.

## Migration status

The MERN implementation is a **staging foundation, not a production-ready replacement yet**. Feature parity still needs to be completed and validated, including configured/live OTP delivery, full messaging and community interactions, trust/analytics behavior, and a repeatable source-to-MongoDB data migration. Production currently remains on the existing stack until the cutover is approved.

See [MIGRATION_MERN.md](MIGRATION_MERN.md) for architecture, API inventory, and remaining work.
