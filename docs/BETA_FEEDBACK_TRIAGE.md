# Beta Feedback Triage Guide

## Purpose

Turn early SkillBarter feedback into actionable fixes without treating every request as an immediate feature requirement.

## Triage order

1. **Critical** — security, authorization, account isolation, data exposure, or a production-blocking failure.
2. **High** — prevents a user from completing the core exchange loop: onboarding, matching, requesting, accepting, messaging, scheduling, completing, or reviewing.
3. **Medium** — causes repeated confusion or friction but has a practical workaround.
4. **Low** — polish, copy improvements, or feature ideas that do not block the current exchange loop.

## Record each report

Capture:

- feedback type: general, bug, or idea
- user journey step
- exact user-visible problem
- expected behavior
- actual behavior
- browser/device when relevant
- reproducibility
- severity
- whether another user is affected

Never record passwords, OTPs, access tokens, or other sensitive credentials.

## Decision rules

- Fix security and authorization issues before expanding beta acquisition.
- Fix blockers in the core exchange journey before adding optional features.
- Group duplicate reports before prioritizing.
- Keep feature ideas separate from confirmed product defects.
- Re-test the affected two-user journey after a critical or high-severity fix.

## Beta success signals

Review these together rather than relying on signup count alone:

- onboarding completion
- first exchange request rate
- request acceptance
- scheduled exchanges
- completed exchanges
- reviews submitted
- repeat-use signals
- recurring feedback themes

## Weekly beta review

For each review cycle:

- summarize new reports
- group duplicates
- identify critical/high blockers
- assign owners
- verify completed fixes
- re-test affected flows
- record unresolved risks
- decide whether the current cohort should remain the same size or expand
