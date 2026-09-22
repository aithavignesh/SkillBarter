# SkillBarter Production Verification Record

Use this record for each production validation cycle. Do not enter passwords, OTPs, API keys, exact private addresses, or other secrets.

## Deployment

- Production URL:
- Deployment provider:
- Commit SHA:
- Verification date:
- Verified by:

## Environment

- [ ] `VITE_INSFORGE_URL` configured
- [ ] `VITE_INSFORGE_ANON_KEY` configured
- [ ] Required authentication/OTP configuration verified
- [ ] Server-only secrets are not exposed through `VITE_*`
- [ ] Analytics collector is privacy-reviewed before enabling `VITE_ANALYTICS_ENDPOINT`

## Two-user smoke test

- [ ] User A signup/login
- [ ] User B signup/login
- [ ] Both complete onboarding
- [ ] Both have at least one teach and one learn skill
- [ ] Relevant match appears
- [ ] A sends request to B
- [ ] B receives and accepts request
- [ ] Both can message within the exchange
- [ ] Schedule can be saved
- [ ] Both can complete the exchange
- [ ] Review can be submitted
- [ ] Trust/reputation updates correctly

## Authorization and privacy

- [ ] User A cannot access User B's private account data
- [ ] User A cannot modify User B's profile through unauthorized requests
- [ ] User A cannot read another exchange's messages
- [ ] User A cannot modify an exchange they do not participate in
- [ ] Review/report actions enforce participant/ownership rules
- [ ] Database-level RLS policies have been verified in InsForge

## Recovery

- [ ] Failed exchange action shows a recoverable UI error
- [ ] Application render failure shows the recovery screen
- [ ] Retry/refresh recovers normally
- [ ] Password reset works from production
- [ ] Mobile smoke test completed

## Result

- Overall result: PASS / BLOCKED
- Critical blockers:
- Non-critical issues:
- Follow-up owner:
- Follow-up date:

A passing CI build is not a substitute for production verification. Complete this record before expanding beyond the controlled beta.
