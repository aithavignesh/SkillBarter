# SkillBarter MERN migration

## Target architecture

- `next-app/`: Next.js App Router frontend.
- `server/`: Node.js + Express REST API.
- MongoDB: Mongoose models; the server is the only application component that talks to MongoDB.
- Existing `frontend/` (Vite + InsForge) and existing deployment remain untouched while migration work is validated.

## Implemented foundation in this branch

- Responsive Next.js landing page and shared global styles.
- Express API entrypoint, Helmet, explicit CORS allow-list, JSON body size limit, health endpoint.
- MongoDB connection module.
- Initial User, Skill, and Exchange schemas.
- Email/password registration and login with bcrypt password hashing, JWT authentication, and a current-user endpoint.
- Authentication and administrator authorization middleware.
- Environment-variable template; no secrets are committed.

## Local setup

1. Install Node.js LTS and MongoDB locally, or provision a MongoDB Atlas database.
2. Copy `server/.env.example` to `server/.env`; set `MONGODB_URI`, and set `JWT_SECRET` to a unique random value of at least 32 characters.
3. From the repository root, run `npm install`.
4. Start the app and API with `npm run dev`. The Next.js app uses port 3000; the API uses port 4000.
5. Verify `http://localhost:4000/api/health` and `http://localhost:3000`.

## Remaining migration work (must be completed before cutover)

- Migrate signup/login UI, OTP verification and delivery, password reset, session restoration, and onboarding.
- Migrate profiles, skill management, discovery/matching, exchange lifecycle, scheduling, messaging/WebSockets, notifications, community feed, reviews/trust, block/report/moderation, analytics, and the complete admin dashboard.
- Add request schemas, rate limits, audit logs, security tests, API integration tests, and frontend end-to-end tests.
- Plan and execute an approved data migration from InsForge/PostgreSQL to MongoDB; preserve user IDs/relationships where needed and verify row counts and data integrity.
- Configure production secrets, MongoDB network access/backups, deployment services, domains, monitoring, and rollback procedure.
- Complete two-user end-to-end and admin/non-admin authorization tests before production cutover.

## Important

This branch is a migration foundation, not a production-ready replacement. Do not remove or overwrite the current deployment or InsForge data until the feature migration, data validation, and acceptance tests pass. Never expose MongoDB credentials or JWT secrets in the Next.js client bundle.
