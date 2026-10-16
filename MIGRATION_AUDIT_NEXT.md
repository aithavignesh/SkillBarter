# MERN migration security and cutover audit

This checklist distinguishes implemented code from configuration and migration work that still needs to be exercised. Passing GitHub Actions is not an end-to-end production readiness sign-off.

## Implemented in the migration branch

- Express authentication uses bcrypt password hashes and JWT signature, issuer, audience, expiry, active-account, and token-version checks.
- Email/password registration/login and email OTP sign-in are implemented; email OTP codes are hashed, expire after five minutes, are limited to five attempts, and are consumed once. Phone OTP login and signup phone-ownership verification are implemented through Twilio Verify, with E.164 validation, rate limits, and a short-lived signed registration proof.
- Password reset tokens are single-use, stored as SHA-256 hashes, expire after 15 minutes, and increment the user's token version to revoke existing JWTs.
- Logout increments token version server-side and clears the HttpOnly session cookie through the Next.js proxy.
- Admin status changes revoke existing JWTs. Admin routes enforce authorization in Express.
- Exchange scheduling validates the date and rechecks block relationships; exchange, messaging, review, report, and block routes include server-side participant/authorization checks.
- Admin dashboard sections load independently so a failed endpoint does not hide every successful section.

## Remaining work before cutover

- Configure Twilio Verify and SMTP credentials in staging; test actual SMS/email delivery, OTP expiry, rate limits, and provider failures. The integration code is present, but delivery cannot be verified without provider credentials.
- Complete feature parity for real-time messaging/WebSockets, community comments/interactions, trust-score updates, analytics, and any remaining profile/location/privacy workflows.
- Run full end-to-end tests for signup/login, page refresh/session expiry, onboarding, reciprocal matching, the two-user exchange lifecycle, messaging, mutual completion/reviews, reports/blocks, and admin/non-admin access.
- Implement and review the InsForge/PostgreSQL-to-MongoDB data migration with a dry run, deterministic ID/reference mapping, source/target count reconciliation, dangling-reference checks, backup, and tested rollback.
- Configure and verify staging/production environment variables, MongoDB network restrictions/backups, monitoring, domains, and service health checks.
- Do not run a production data import, remove the old Vite/FastAPI implementation, merge the migration branch, or switch production traffic until the source/target data reconciliation and acceptance tests pass and the cutover is explicitly approved.

## Verification

The migration workflow runs server syntax checks, API/security tests, and a Next.js production build. The existing Vercel project checks can be blocked by account build-rate limits; those checks are separate from the MERN migration workflow.

## Current disposition

**Not ready for production cutover.** The migration branch is isolated from `main` and the existing production app. The source InsForge database, production secrets, and provider credentials have not been changed by this work.
