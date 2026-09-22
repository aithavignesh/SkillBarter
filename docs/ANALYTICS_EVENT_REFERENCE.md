# SkillBarter Analytics Event Reference

Analytics is designed for beta funnel measurement. Events are intentionally privacy-conscious: the client sends a session identifier, route, timestamp, event name, and explicitly supplied event properties. It does not send profile fields.

## Activation funnel

| Event | Meaning | Key properties |
|---|---|---|
| `signup_started` | Signup page was opened | `referral_source` when available |
| `signup_completed` | Account creation completed | `referral_source` when available |
| `login_completed` | Authentication completed | `method` |
| `onboarding_completed` | Learning profile completed | `offered_skill_count`, `needed_skill_count`, `exchange_radius_km`, `referral_source` |
| `matches_viewed` | Learning matches page loaded | page-level context |
| `exchange_request_sent` | A learning request was successfully created | `priority`, `source` when available |
| `exchange_status_changed` | Exchange status action completed | status/action context |
| `exchange_workspace_viewed` | Exchange workspace loaded | `exchange_status` |
| `exchange_message_sent` | Message successfully sent | exchange context |
| `exchange_schedule_saved` | Session schedule successfully saved | `estimated_hours` |
| `exchange_completed` | Exchange completion was recorded | exchange context |
| `notification_opened` | User opened a notification | `notification_type`, `has_link` |
| `beta_feedback_submitted` | Beta feedback submitted | `feedback_type`, `rating`, `message_length` |
| `referral_shared` | User shared an invite | `method` |
| `activation_cta_clicked` | User clicked an activation CTA | `source`, `action` |
| `onboarding_step_viewed` | User advanced through onboarding | step context |

## Core beta calculations

### First exchange request rate

`users with exchange_request_sent / users with onboarding_completed`

Use unique sessions/users consistently when calculating the numerator and denominator. Do not mix raw event counts with unique-user counts.

### Request acceptance rate

`accepted exchanges / exchange requests`

### Exchange completion rate

`completed exchanges / accepted exchanges`

### Review rate

`review submissions / completed exchanges`

## Referral attribution

Peer invites use `/signup?ref=peer-invite`. Marketing links can additionally use standard UTM parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`. Attribution is captured from the landing URL and persisted in session storage so the original acquisition source survives signup and onboarding. Later events include the stored attribution alongside explicitly supplied event properties. When reporting acquisition performance, compare unique users/sessions consistently across sources.

## Privacy rules

- Keep the analytics collector first-party and privacy-reviewed before enabling `VITE_ANALYTICS_ENDPOINT`.
- Do not add passwords, OTPs, message bodies, exact addresses, or other sensitive profile data to event properties.
- Prefer counts, booleans, coarse categories, and route/action identifiers.
- Analytics failures must never block signup, onboarding, matching, or exchanges.

## Beta review cadence

Review funnel metrics after each beta cohort rather than optimizing for raw event volume. Pair quantitative funnel data with participant feedback and observed exchange outcomes.