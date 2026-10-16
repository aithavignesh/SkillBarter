# SkillBarter MERN migration

## Target architecture

- `next-app/`: Next.js App Router frontend.
- `server/`: Node.js + Express REST API.
- MongoDB: Mongoose models; only the API server connects to MongoDB.
- `frontend/` (Vite/InsForge) and `backend/` (FastAPI) remain as rollback/reference copies. Production stays on the existing stack until a separately approved cutover.

## Implemented on the migration branch

- Next.js pages for landing, signup/login, onboarding, dashboard, matching, exchanges, community posts, notifications, reviews, password recovery, and admin user/report/exchange views.
- Same-origin Next.js API proxy stores JWTs in an HttpOnly cookie; the browser does not receive the raw JWT in local storage.
- Express API with Helmet, explicit CORS allow-list, JSON body-size limit, rate limits, and health endpoint.
- MongoDB/Mongoose models and API routes for users, skills, exchanges, matches, messages, reviews, reports, blocks, posts, notifications, and admin functions.
- Email/password registration and login with bcrypt hashing and signed JWTs using issuer/audience checks.
- Email OTP sign-in: six-digit random codes, HMAC-hashed code storage, five-minute expiry, five-attempt limit, one-time consumption, rate-limited request/verification endpoints, and SMTP delivery. Configure SMTP before enabling this flow.
- Phone OTP login and signup phone ownership verification through Twilio Verify, with E.164 validation, rate limits, provider configuration checks, phone-login session issuance, and a 10-minute signed registration proof. Configure Twilio Verify credentials before enabling this flow.
- Password reset uses random one-time tokens stored as SHA-256 hashes, 15-minute expiry, rate limiting, and token-version increment to revoke existing JWTs after a password reset.
- Logout revokes the current token version server-side and clears the HttpOnly cookie. Admin account status changes also revoke prior tokens.
- Server-side role and participant checks are used for admin actions, exchange workflows, messaging, reviews, reports, and blocks.
- GitHub Actions runs server syntax checks, API/security tests, and the Next.js production build.

## Local setup

1. Install a supported Node.js LTS release and MongoDB locally, or provision MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 characters, and a separate `OTP_SECRET` of at least 32 characters. Configure SMTP values to enable email OTP and password recovery.
3. Copy `next-app/.env.example` to `next-app/.env.local` and set `API_BASE_URL=http://localhost:4000`.
4. From the repository root, run `npm install`.
5. Start both services with `npm run dev`. Next.js uses port 3000 and Express uses port 4000.
6. Verify `http://localhost:4000/api/health` and `http://localhost:3000`.

## API foundation

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `POST /api/auth/logout`, `GET /api/auth/me`
- Recovery: `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`
- Profiles: `GET/PATCH /api/users/me`, `GET /api/users`, `GET /api/users/:id`
- Skills: `GET/POST /api/skills`, `DELETE /api/skills/:id`
- Exchanges: `GET/POST /api/exchanges`, `PATCH /api/exchanges/:id/status`
- Matching: `GET /api/matches`
- Community: `GET/POST /api/posts`, `POST /api/posts/:id/like`, `DELETE /api/posts/:id`
- Notifications: `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/:id/read`, `DELETE /api/notifications/:id`
- Messaging: `GET /api/messages/exchange/:exchangeId`, `POST /api/messages`, `PATCH /api/messages/:id/read`
- Reviews: `GET /api/reviews/user/:userId`, `POST /api/reviews`
- Safety: `POST /api/reports`, `GET /api/blocks`, `POST /api/blocks/:userId`, `DELETE /api/blocks/:userId`
- Admin-only: stats, users/status, exchanges, and report moderation endpoints under `/api/admin`

All browser API requests go through the same-origin proxy. Configure `API_BASE_URL` only in the Next.js server environment; never expose MongoDB credentials, JWT secrets, or OTP secrets through `NEXT_PUBLIC_*`.

## Remaining work before production cutover

- Configure Twilio Verify and SMTP credentials in staging and execute actual SMS/email delivery, expiry, rate-limit, and provider-failure tests. Provider delivery has not been exercised without credentials.
- Complete feature parity for real-time messaging/WebSockets, community comments and interactions, trust-score updates, analytics events, and any legacy profile/location/privacy flows not yet represented in the Next.js pages.
- Add and execute end-to-end tests for signup/login, OTP delivery, refresh/session expiry, onboarding, matching, two-user exchange lifecycle, messaging, review eligibility, report/block behavior, and admin vs. non-admin access.
- Implement and review the InsForge/PostgreSQL-to-MongoDB data migration. It must have a dry run, deterministic ID/reference mapping, source/target record-count reconciliation, relationship validation, backup, and tested rollback. Do not run a production import without source access and explicit approval.
- Configure staging and production secrets, MongoDB network restrictions/backups, service deployment, domains, monitoring, and a tested rollback plan.
- Run staging smoke tests and verify all source/target records and references before production approval.

## Safety rule

This branch remains a **migration foundation, not a production-ready replacement**. The existing production app and InsForge data must remain untouched until feature migration, data validation, security review, and acceptance tests pass. No production merge, cutover, or deployment is part of this work.
