# SkillBarter GTM Launch Checklist

## Launch gate

SkillBarter should be treated as a **controlled student beta** until the production checks below are verified.

### 1. Two-user journey

Use two independent real accounts and verify:

- [ ] Account A signs up and completes onboarding
- [ ] Account B signs up and completes onboarding
- [ ] A and B can discover a relevant learning match
- [ ] A sends an exchange request
- [ ] B receives the exchange notification
- [ ] B accepts the request
- [ ] Both participants can message
- [ ] Both participants can schedule the session
- [ ] Both participants can confirm completion
- [ ] Both participants can submit a review
- [ ] Review appears on the partner profile
- [ ] Trust/reliability metrics update after review

### 2. Activation funnel

Track these milestones when the first-party analytics endpoint is configured:

`signup_started` → `signup_completed` → `onboarding_completed` → `matches_viewed` → `exchange_request_sent` → accepted → completed → reviewed

Primary beta metric:

**First exchange request rate = users who send a first request / users who complete onboarding**

Secondary metrics:

- Match-view rate
- Request acceptance rate
- Exchange completion rate
- Review submission rate
- Peer referral share rate
- Notification open rate
- Beta feedback submission rate

### 3. Security gate

Before public launch:

- [ ] Verify InsForge RLS for every production table
- [ ] Confirm users cannot read or modify another user's private data
- [ ] Confirm exchange mutations are participant-authorized
- [ ] Confirm message access is participant-authorized
- [ ] Confirm reviews require completed exchanges
- [ ] Confirm reports cannot be created for self and duplicate pending reports are blocked
- [ ] Confirm admin operations require admin authorization
- [ ] Confirm location privacy policies match the UI promise

**Important:** frontend authorization checks do not replace database-level RLS.

### 4. Production configuration

- [ ] Verify Vercel production build succeeds
- [ ] Verify InsForge production environment variables/configuration
- [ ] Configure `VITE_ANALYTICS_ENDPOINT` only after the first-party collector is ready
- [ ] Verify password reset redirect on the production domain
- [ ] Verify authentication/session behavior in a fresh browser
- [ ] Verify mobile layout for signup, onboarding, matches, exchanges and notifications

### 5. Beta operations

Start with a small cohort rather than broad acquisition.

Suggested first cohort:

**10–20 students with complementary skills**

For each beta user, record:

- Did they complete onboarding?
- Did they find a relevant partner?
- Did they send a request?
- Was it accepted?
- Did the session happen?
- Would they exchange again?
- What blocked them?

Use the in-product Beta Feedback page after the first real interaction.

### 6. Launch decision

Do not expand acquisition simply because users can sign up.

Expand only after the beta produces enough real interactions to answer:

1. Can users reliably find a relevant peer?
2. Do users understand the exchange model without help?
3. Do requests get accepted?
4. Do exchanges reach completion?
5. Do users want another exchange?

The goal of the first beta is **evidence of repeatable peer exchange**, not maximum signup volume.
