# SkillBarter MERN deployment runbook

This runbook deploys the migration branch as two application services and one managed database. It does not switch the existing production application or migrate live user data.

## Architecture

- Web: Vercel, project root `next-app`, Next.js build command `npm run build`, output handled by Next.js.
- API: Render Web Service, repository root, working directory `server`, build command `npm install`, start command `npm start`.
- Database: MongoDB Atlas with a dedicated database user and network access restricted to the API service's egress addresses where the hosting plan supports it.
- Source branch: `migration/next-express-mongodb`. Do not deploy `main` as part of this migration workflow.

## API service environment

Set these in the API host's private environment settings; never commit real values:

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Set by the host when supported; otherwise `4000` |
| `MONGODB_URI` | MongoDB Atlas connection string for the migration database |
| `JWT_SECRET` | Unique random secret, at least 32 characters |
| `OTP_SECRET` | Separate unique random secret, at least 32 characters |
| `CLIENT_ORIGIN` | Exact HTTPS Vercel origin, no path; comma-separate additional approved origins |
| `PASSWORD_RESET_URL` | HTTPS URL of the deployed password-reset page, only when SMTP is configured |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Required together for password recovery/email OTP delivery |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Optional; set all three together to enable phone OTP |

Generate secrets with a cryptographically secure password generator. Use different secrets and a different MongoDB database for development, staging, and production. Do not use a personal database owner account for the API.

## Web service environment

Set `API_BASE_URL` to the deployed API's HTTPS origin, for example `https://<your-api-service-domain>`. This variable is server-side only; do not rename it to `NEXT_PUBLIC_API_BASE_URL`. The Next.js same-origin proxy is responsible for forwarding browser requests and keeping session tokens in HttpOnly cookies.

## Deployment sequence

1. Create a separate MongoDB Atlas database for migration staging and restrict network access.
2. Deploy the API from `migration/next-express-mongodb` using the `server` working directory. Configure the API environment variables in the host dashboard.
3. Verify `https://<your-api-service-domain>/api/health` reports healthy database connectivity. A process starting successfully alone is not sufficient.
4. Deploy the web app from the same branch with Vercel root directory `next-app`. Set `API_BASE_URL` in the Vercel environment for the intended environment.
5. Set the API's `CLIENT_ORIGIN` to the exact deployed web origin, redeploy the API, then verify browser requests use the same-origin Next.js proxy and cookies have secure production attributes.
6. Run the staging acceptance suite: registration, login/logout, email OTP, password reset, phone OTP when configured, onboarding, matching, two-user exchange lifecycle, messaging/read receipts, review eligibility, report/block, notifications, and admin/non-admin authorization.
7. Inspect hosting logs for provider and database failures without recording secrets, request bodies, OTPs, or tokens.
8. Keep the existing production service and PostgreSQL/InsForge data intact until the data migration readiness gate is closed and a separate cutover is approved.

## Release blockers

- A green CI run verifies code and build checks only. It does not validate credentials, SMS/email delivery, MongoDB permissions, source-schema compatibility, or imported data.
- The PostgreSQL-to-MongoDB source contract remains blocked until a reviewed, real source schema snapshot and data-quality evidence exist.
- Do not point the new service at production data, run an import, change production domains, or remove the legacy services as part of this runbook.
- If a health check, acceptance test, mapping, or reconciliation fails, stop the rollout and keep the legacy service available.

## Rollback

Before any future cutover, document the exact current production deployment, domain/DNS settings, source database backup owner, and rollback operator. If the new staging app fails, redeploy the previous migration-branch deployment or disable the staging services; do not alter the existing production app or source database. A production rollback plan must be tested separately before any production traffic switch.
