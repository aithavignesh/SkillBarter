# SkillBarter Beta Launch Runbook

## Purpose
Run the first controlled beta with real students and measure whether the core learning exchange loop works before expanding acquisition.

## 1. Before inviting users
Confirm:
- Latest `main` commit has a passing frontend CI run.
- Production frontend loads in a fresh browser.
- Signup and login work.
- InsForge production environment variables are configured.
- Password reset redirect points to the production app.
- Analytics collector is configured and privacy-reviewed before enabling it.
- Database RLS and authorization policies have been verified in the connected InsForge project.
- No test/demo accounts are being presented as real users.

## 2. Recruit the first cohort
Start with 10–20 students who have overlapping or complementary skills.

Ask each participant to complete:
1. Create an account.
2. Complete the four-step learning profile.
3. Add at least one skill they can teach.
4. Add at least one skill they want to learn.
5. Open My Learning Matches.
6. Send at least one learning request when a relevant peer is available.

Keep the cohort small enough to manually observe the first exchanges.

## 3. Observe the activation funnel
Track:
`signup_started → signup_completed → onboarding_completed → matches_viewed → exchange_request_sent → accepted → scheduled → completed → reviewed`

Primary activation metric:
**First exchange request rate = users who send a first request / users who complete onboarding**

Also record:
- Match-view rate
- Request acceptance rate
- Exchange completion rate
- Review submission rate
- Peer referral share rate
- Notification open rate
- Beta feedback submission rate

## 4. Manual daily beta check
For each new participant, check:
- Did signup complete?
- Did onboarding finish without help?
- Did they understand what to teach and learn?
- Did they see a relevant partner?
- If no partner appeared, did they understand why?
- Could they send a request?
- Did the recipient notice the request?
- Could both users message each other?
- Could they agree on a session?
- Could both users complete the exchange?
- Could the completed exchange produce a review/trust update?

Record blockers, not just feature requests.

## 5. Feedback prompts
After a participant has attempted an exchange, ask:
- What were you trying to learn?
- Did you find a relevant person?
- What was confusing?
- What stopped you from sending or accepting a request?
- Did the exchange feel safe and clear?
- Would you use SkillBarter for another learning session?
- What is the one change you would make?

Use the in-app Beta Feedback page for structured feedback and keep sensitive information out of feedback submissions.

## 6. Common beta states
### No matching peers
Do not fabricate matches.

Ask the participant to:
- add another teach/learn skill,
- widen the learning radius,
- invite classmates or peers,
- try Discover again later.

### Request sent but not accepted
Do not treat this as a product failure automatically. Check whether the recipient saw the notification and whether the proposed learning goal was clear.

### Exchange accepted but not completed
Check messaging, scheduling, session expectations, and whether both participants understood how completion works.

### Technical failure
Capture:
- page/route
- user action
- visible error
- approximate time
- browser/device
- whether retry worked

Do not ask users to send passwords, OTPs, or private credentials.

## 7. Expansion gate
Do not expand acquisition based only on signup volume.

Before expanding beyond the initial cohort, review:
- activation funnel completion
- quality of actual matches
- request acceptance
- completed exchanges
- participant feedback
- repeat-use signals
- security/authorization findings

If a critical security or authorization issue is found, pause expansion until it is resolved.

## 8. Beta owner checklist
- [ ] Invite a small cohort
- [ ] Confirm production health
- [ ] Watch activation events
- [ ] Manually observe first exchanges
- [ ] Collect feedback
- [ ] Group blockers by severity
- [ ] Fix critical blockers first
- [ ] Re-test the two-user journey
- [ ] Review metrics
- [ ] Decide whether to keep the cohort size or expand it

The goal of beta is evidence about the real learning exchange loop, not maximum signup volume.