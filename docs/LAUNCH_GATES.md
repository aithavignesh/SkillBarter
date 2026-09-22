# SkillBarter Launch Gates

Use this document as the final pre-beta gate. A feature being implemented in the repository does not mean the connected production services have been verified.

## Verified in the repository

- [x] Signup and onboarding activation flow is implemented.
- [x] Learning matches and empty-community recovery flow are implemented.
- [x] Exchange request, acceptance, messaging, scheduling and completion flows are implemented.
- [x] Peer invite/referral attribution is implemented.
- [x] Beta feedback UI is implemented.
- [x] Activation funnel events are implemented.
- [x] Frontend lint, OTP tests and production build run in GitHub Actions.
- [x] Two-user production smoke-test procedure is documented.
- [x] Beta launch operations runbook is documented.

## Must be verified in the connected production environment

### 1. Database security / RLS
Verify row-level security and policies for every production table, especially users, skills, user_skills, exchanges, messages, notifications, reviews, reports and any tables containing private profile/location data.

Application-level authorization checks in the frontend are not a substitute for database-level authorization.

### 2. Production deployment
Verify the live Vercel deployment uses the intended `main` commit and production environment variables. Perform the documented two-user smoke test against the live URL.

### 3. Analytics collector
Keep `VITE_ANALYTICS_ENDPOINT` unset until the collector is first-party, privacy-reviewed and ready for production beta data. Once enabled, verify events arrive without exposing sensitive data.

### 4. Authentication
Test fresh-browser signup, email/password login, phone OTP if enabled, logout, session restoration and password reset using production configuration.

### 5. End-to-end exchange
Use two fresh test accounts and verify:
1. Signup
2. Onboarding
3. Matching/discovery
4. Request
5. Notification
6. Acceptance
7. Messaging
8. Scheduling
9. Mutual completion
10. Review/trust update
11. Logout
12. Re-login

## Beta launch rule

Do not treat the repository's passing CI as proof that production is ready. The beta can proceed only after the connected production environment passes the security and two-user checks above.

After the first cohort, review activation and completed-exchange evidence before expanding acquisition.