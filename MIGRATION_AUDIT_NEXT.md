# MERN migration audit — next actions

This is a code-review checklist only; it does not indicate that automated tests have passed.

## Findings to address before cutover

- Exchange scheduling should reject past dates and dates outside a reasonable scheduling window. Re-check that a block between participants prevents scheduling.
- Password-reset tokens are single-use and expire after 15 minutes. Verify this with automated integration tests against a disposable test database.
- A successful password reset currently deletes reset tokens but does not revoke already-issued JWTs. Implement session revocation (for example, a per-user token version or a session store) before production.
- SMTP credentials and `PASSWORD_RESET_URL` must be configured in the API environment before password recovery can work. No credentials should be committed.
- The migration still needs automated tests for unauthenticated requests, non-participant access, non-admin access to admin routes, block enforcement, exchange status transitions, and reviews after mutual completion.
- No production data migration or cutover should run until a separate migration plan has a dry-run, record-count reconciliation, reference validation, backup, and rollback procedure.

## Verification status

- GitHub/Vercel status checks alone are not an end-to-end test report.
- Do not mark password recovery, OTP parity, or the complete two-user journey as verified until tests have actually run.
- Keep the existing production app and InsForge database untouched during migration work.
