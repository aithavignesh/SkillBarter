# SkillBarter Beta Readiness

Updated: 2026-09-28

## Verified in GitHub

- Main branch CI is passing.
- Frontend OTP unit tests pass.
- Frontend lint passes.
- Frontend TypeScript production build passes.
- Backend test suite passes (64 tests).
- Production FastAPI docs/OpenAPI exposure is disabled.
- Production demo/test authentication endpoint is disabled.
- Production configuration rejects the default local SQLite database.
- Production WebSocket no longer falls back to localhost.
- Messages refresh through polling when the legacy WebSocket is not configured.
- Exchange counter-proposal ownership is enforced.
- Concurrent exchange completion is handled without duplicate completion notifications.
- Private location visibility is respected in nearby discovery and match results.
- Report, block, exchange, messaging, notification, review, and admin authorization boundaries are enforced in application code.
- Stale report resolution is rejected after the report is no longer pending.

## Identity and signup

The current main branch signup flow collects:

- Full name
- Username
- Email
- Mobile number
- Password
- Confirm password
- Mobile OTP verification before account creation

Login is now OTP-first: users can sign in with mobile OTP or email OTP. Email/password remains available as a fallback. New users must complete the registration form and verify their mobile number by OTP before the SkillBarter account is created. Phone OTP login is intended for users with an existing SkillBarter profile; the production username/phone migration must be applied before this can be fully certified in production.

The production database migration for `username` and `phone` must be applied and verified separately.

## Remaining production verification

These items cannot be certified from the Git repository alone:

1. Apply and verify `migrations/20260928124009_add-username-phone.sql` in the production InsForge database. The migration is currently blocked because the production `public.users` table is owned by `postgres`, while the InsForge migration runner uses `project_admin`, which does not own the table.
2. Verify InsForge RLS with two normal users and an admin for profiles, reports, blocks, messages, exchanges, notifications, reviews, and admin moderation.
3. Confirm `VITE_ANALYTICS_ENDPOINT` is configured in production and that KPI events are actually being received.
4. Confirm the current Vercel deployment is built from the latest main commit and that production smoke tests use the deployed build.
5. Complete a real two-user beta smoke test:
   Signup -> Onboarding -> Matching -> Exchange Request -> Acceptance -> Scheduling -> Messaging -> Completion -> Review.
6. Validate Report/Block/Unblock and moderation using separate user/admin accounts.
7. Record any production-only issues in the beta launch runbook.

## Open repository item

PR #14 (`feat: add AI-ready skill gap and learning paths`) is still a draft PR and is not part of the current beta-readiness main branch. It should remain separate from the beta release unless it is explicitly reviewed and accepted.

## Release gate

Beta readiness should be reported as conditional until the production InsForge migration, RLS checks, analytics collection, deployment verification, and real two-user smoke test are completed.
