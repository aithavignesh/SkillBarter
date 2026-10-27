# SkillBarter MERN staging authentication acceptance checklist

Status: **Not executed against a live staging deployment.** This checklist defines the evidence required before authentication can be marked accepted.

## Scope and safety

- Run only against the isolated migration staging deployment and staging MongoDB database.
- Use test accounts and phone numbers controlled by the team. Never use production users or real customer data.
- Never paste OTPs, passwords, JWTs, reset links, SMTP credentials, or SMS provider credentials into GitHub issues, commits, logs, or this checklist.
- Keep the legacy application and production database unchanged.
- Record pass/fail, timestamp, deployment commit, and sanitized request IDs in a private test record.

## Preflight configuration

Confirm privately in the deployment environment that:

- `API_BASE_URL` points to the intended HTTPS Express API origin in production-like staging and contains no path, query, fragment, username, or password.
- `JWT_SECRET` is a random secret of at least 32 characters and is shared only between the API and its required verification paths.
- MongoDB points to the isolated staging database and readiness reports `checks.database: "connected"`.
- Email OTP/password recovery SMTP settings are configured and delivery is monitored.
- Phone OTP provider settings are configured if phone OTP is in scope.
- CORS allows only the expected staging web origin.
- No production database, production API, or production messaging provider is accidentally targeted.

Do not paste the values of any secret into the test record.

## Test cases

| ID | Flow | Procedure | Expected result |
|---|---|---|---|
| AUTH-01 | API readiness | Request `GET /api/health` and `GET /api/health/ready` on the staging API. | Liveness succeeds; readiness succeeds only when MongoDB is connected. |
| AUTH-02 | Invalid API origin | In a disposable preview configuration only, omit or invalidate `API_BASE_URL`. | Proxy returns a controlled 503 JSON error; no request is sent to an unintended host. Restore the correct value after the test. |
| AUTH-03 | Email/password login | Sign in with a valid staging account; then try a wrong password and an inactive test account. | Valid login redirects to the dashboard and sets an HttpOnly `skillbarter_token` cookie. Invalid credentials do not set a session. |
| AUTH-04 | Email OTP | Request an email code, verify the correct code, then try an incorrect, expired, and reused code. | Correct code creates a session cookie; invalid, expired, reused, or over-attempt codes do not create a session. |
| AUTH-05 | Phone OTP login | With the staging SMS provider enabled, request and verify a code for a controlled test account. | Successful verification creates the HttpOnly session cookie; invalid/expired codes do not. If provider configuration is absent, the API fails closed with a controlled 503. |
| AUTH-06 | Signup phone proof | Start signup, request and verify a registration SMS code, then create the account. | Signup requires a valid, unexpired phone verification proof for the same phone number; the successful registration sets a session cookie. |
| AUTH-07 | Signup validation | Try a malformed email, invalid username, short password, unverified phone, and an already-used email/username/phone. | Validation rejects each invalid case; duplicates return a conflict; no unintended user is created. |
| AUTH-08 | Cookie flags | Inspect the browser's cookie metadata after successful login in HTTPS staging. | Cookie is HttpOnly, Secure in production mode, SameSite=Lax, path `/`; token is not returned to client JavaScript. |
| AUTH-09 | Session persistence | Refresh the page and open an authenticated dashboard route. Then request `GET /api/auth/me` through the Next.js proxy. | Session is restored from the cookie and the API returns the expected public user fields without password hashes. |
| AUTH-10 | Unauthorized access | Remove the cookie and request an authenticated API endpoint; then use an expired or revoked test token. | API returns 401 and does not disclose protected data. |
| AUTH-11 | Logout | Log out, inspect the response and browser cookies, then call a protected endpoint using the former session. | Cookie is cleared and token version revocation causes the old JWT to be rejected. |
| AUTH-12 | Password reset | Request recovery for a known test account and an unknown email, use the delivered link once, then retry it. | Request responses do not reveal whether an account exists; reset token is single-use and expires; password changes revoke previous sessions. |
| AUTH-13 | Rate limits | Repeatedly request/verify OTPs and submit login attempts using test identities. | Rate limits activate with controlled responses; no secrets or OTP values are written to logs. |
| AUTH-14 | Failure handling | Stop the staging API or use a disposable unreachable upstream; test a slow upstream response. | Next.js proxy returns controlled 502/504 JSON responses and logout still clears the browser cookie. |
| AUTH-15 | End-to-end journey | Create two test users, complete onboarding, find each other, create/accept an exchange, message, schedule, complete, review, and log out. | Both users see consistent state; only authorized participants can access private exchange data. |

## Acceptance evidence

For each test, record:

- Test ID and PASS/FAIL/BLOCKED.
- Staging deployment commit SHA and test timestamp.
- Sanitized result/status code and request/correlation ID, if available.
- Failure summary without credentials, tokens, phone numbers, emails, OTPs, or personal data.
- Follow-up issue/owner for every failure.

## Release gate

Authentication is accepted only when all applicable tests pass against the actual isolated staging deployment, SMS/email delivery is confirmed, and the results are reviewed. Unit tests or a successful Next.js build alone do not satisfy this gate. A passing staging checklist does not authorize production cutover; the PostgreSQL source-schema, mapping, dry-run, reconciliation, privacy/security, and approval gates remain separate requirements.
