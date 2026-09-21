# SkillBarter Production Two-User Smoke Test

Use this checklist against the deployed production app before inviting the beta cohort.

## Test setup

Create two fresh accounts in separate browser sessions:

- User A: teaches Skill A, wants Skill B
- User B: teaches Skill B, wants Skill A

Use realistic student profiles and a small learning radius.

## 1. Authentication

- [ ] A can sign up with email/password.
- [ ] B can sign up with email/password.
- [ ] A and B remain isolated in separate sessions.
- [ ] Refreshing the browser preserves the authenticated session.
- [ ] Logging out one account does not affect the other.

## 2. Onboarding

For both users:

- [ ] Location/profile setup completes.
- [ ] At least one offered skill is saved.
- [ ] At least one wanted skill is saved.
- [ ] Preferences save successfully.
- [ ] Completing onboarding lands on Matches.

## 3. Matching and request

- [ ] A can discover B as a relevant learner.
- [ ] B can discover A.
- [ ] A opens B's profile.
- [ ] A sends an exchange request.
- [ ] A sees a successful request state.
- [ ] B receives the exchange notification.
- [ ] B opens the notification and exchange.

## 4. Exchange lifecycle

- [ ] B accepts the request.
- [ ] Both users can open the exchange workspace.
- [ ] Both users can message within the exchange.
- [ ] Both users can set/update the schedule.
- [ ] Both users see the same exchange state.
- [ ] The session can be marked complete.
- [ ] Completion is reflected for both participants.

## 5. Reviews and trust

- [ ] Each participant can review the other after completion.
- [ ] Duplicate reviews are prevented.
- [ ] Review appears on the partner profile.
- [ ] Trust/reliability values update as designed.
- [ ] A user cannot review an unrelated user.

## 6. Privacy and authorization probes

Perform these with two separate sessions:

- [ ] A cannot access B's private profile data by changing a URL/user ID.
- [ ] A cannot modify B's profile.
- [ ] A cannot read B's unrelated messages.
- [ ] A cannot modify an exchange they are not part of.
- [ ] A cannot submit a review for an exchange they did not participate in.
- [ ] A cannot access admin operations without authorization.
- [ ] Approximate location is shown according to the product's privacy promise.

## 7. Mobile smoke test

On a phone-sized viewport:

- [ ] Signup is usable without horizontal scrolling.
- [ ] Onboarding controls are usable.
- [ ] Matches cards are readable.
- [ ] Exchange request modal is usable.
- [ ] Notifications open correctly.
- [ ] Exchange workspace is usable.
- [ ] Feedback form submits successfully.

## 8. Record the result

Record:

- Production URL:
- Test date:
- Browser/device:
- User A:
- User B:
- Match found: Yes / No
- Request sent: Yes / No
- Request accepted: Yes / No
- Messages exchanged: Yes / No
- Session completed: Yes / No
- Reviews submitted: Yes / No
- Trust updated: Yes / No
- RLS/security probes passed: Yes / No
- Blockers:
- Screenshots/links:

## Launch rule

A successful frontend build is **not** a production launch sign-off.

Treat the beta as controlled until the two-user journey and database-level authorization checks pass in the actual production environment.
