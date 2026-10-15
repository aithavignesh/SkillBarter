# SkillBarter MERN migration

## Target architecture

- `next-app/`: Next.js App Router frontend.
- `server/`: Node.js + Express REST API.
- MongoDB: Mongoose models; only the API server connects to MongoDB.
- The existing `frontend/` (Vite + InsForge) and current production deployment are intentionally untouched while the replacement is built and validated.

## Implemented foundation in this branch

- Responsive Next.js landing page, signup/login screens, skill-selection onboarding, account dashboard, reciprocal match discovery, exchange lifecycle/scheduling, review submission, community feed, notifications page, and admin dashboard for reports, users, and exchanges.
- Same-origin Next.js API proxy that stores the JWT in an HttpOnly cookie and forwards it to Express as a Bearer token; the JWT is not placed in browser local storage.
- Express API with Helmet, explicit CORS allow-list, JSON body-size limit, authentication rate limiting, and health endpoint.
- MongoDB connection module and initial User, Skill, Exchange, Message, Review, Report, and Block models.
- Email/password registration and login with bcrypt password hashing, JWT authentication with issuer/audience checks, a current-user endpoint, and protected API middleware.
- Initial password recovery endpoints: `POST /api/auth/password-reset/request` and `POST /api/auth/password-reset/confirm`. Reset tokens are random, stored as SHA-256 hashes, expire after 15 minutes, and are rate-limited. SMTP delivery must be configured before use.
- APIs for profiles, skill catalog, onboarding validation, reciprocal matching, exchange requests and status transitions, participant-only messages, reviews after mutual exchange completion, user/exchange reports, block/unblock, community posts and likes, notifications, and admin statistics/users/exchanges/reports.
- Role checks run on the Express server; registration does not allow a user to self-assign admin privileges.
- Environment-variable templates; no credentials are committed.

## Local setup

1. Install a supported Node.js LTS version and MongoDB locally, or provision a MongoDB Atlas database.
2. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI` and generate a unique `JWT_SECRET` of at least 32 characters.
3. Copy `next-app/.env.example` to `next-app/.env.local` and set `API_BASE_URL=http://localhost:4000`.
4. From the repository root, run `npm install`.
5. Start both services with `npm run dev`. Next.js uses port 3000 and Express uses port 4000.
6. Verify `http://localhost:4000/api/health` and `http://localhost:3000`.

## API foundation

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/PATCH /api/users/me`, `GET /api/users`, `GET /api/users/:id`
- `GET/POST /api/skills`, `DELETE /api/skills/:id`
- `GET/POST /api/exchanges`, `PATCH /api/exchanges/:id/status`
- `GET /api/matches` for reciprocal skill suggestions
- `GET/POST /api/posts`, `POST /api/posts/:id/like`, `DELETE /api/posts/:id`
- `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`, `DELETE /api/notifications/:id`
- `GET /api/messages/exchange/:exchangeId`, `POST /api/messages`, `PATCH /api/messages/:id/read`
- `GET /api/reviews/user/:userId`, `POST /api/reviews`
- `POST /api/reports`
- `GET /api/blocks`, `POST /api/blocks/:userId`, `DELETE /api/blocks/:userId`
- Admin-only: `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `GET /api/admin/exchanges`, `GET /api/admin/reports`, `PATCH /api/admin/reports/:id`

All API requests from the Next.js app go through the same-origin proxy. Configure `API_BASE_URL` only in the Next.js server environment; do not expose MongoDB credentials or JWT secrets in `NEXT_PUBLIC_*` variables.

## Remaining work before production cutover

- Migrate phone OTP and email OTP authentication and delivery configuration; finish password-recovery UI and test SMTP delivery, session expiry/revocation, and account recovery. The initial branch currently supports email/password only.
- Complete real-time messaging/WebSockets, community comments/interactions, trust-score updates, full review/moderation flows, analytics, and remaining admin capabilities. Scheduling, reciprocal match suggestions, basic community posts, notifications, and review submission now have initial implementations.
- Add integration and end-to-end tests, request-schema validation, rate limits for sensitive non-auth endpoints, audit logging, and security review. Confirm the block policy is applied consistently to every feature.
- Build a reviewed data migration from the current InsForge/PostgreSQL system into MongoDB. Map user IDs and references, preserve required history, compare record counts, and validate relationships before any cutover.
- Configure production secrets, MongoDB network restrictions/backups, deployment services, domains, monitoring, and a tested rollback plan.
- Run two-user journeys and admin/non-admin authorization tests on a staging environment before production approval.

## Safety rule

This branch is a migration foundation, **not a production-ready replacement**. Do not merge, deploy, remove, or overwrite the existing production app or InsForge data until feature migration, data validation, security review, and acceptance tests pass.
