# SkillBarter

> **Learn what you need. Teach what you know.**

SkillBarter is a peer-learning and skill-exchange platform focused on **students and early-career learners**. Users create a profile, choose skills they can teach and skills they want to learn, discover compatible learners, propose exchanges, schedule sessions, complete learning exchanges, and leave verified reviews.

## Current Product Journey

```
LANDING
  ↓
SIGN UP / LOGIN
  ↓
ONBOARDING
  ↓
DISCOVER / MATCHES
  ↓
PROFILE
  ↓
EXCHANGE REQUEST
  ↓
ACCEPT
  ↓
SCHEDULE
  ↓
LEARNING SESSION
  ↓
MUTUAL COMPLETION
  ↓
REVIEW + TRUST UPDATE
```

## Core Features

- Student and early-career learner GTM positioning
- Skill onboarding: skills offered and skills needed
- Nearby learner discovery and compatibility matching
- Learning-exchange proposals with participant authorization
- Exchange lifecycle: pending → active → completed/cancelled
- Scheduling and learning-session workspace
- Real-time messaging and notifications
- Community feed and post interactions
- Reviews and trust-score calculation
- Block/report and community-safety workflows
- Admin user/report management
- Privacy controls for location visibility
- Password reset and authenticated sessions
- Responsive desktop and mobile experience

## Technology

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- InsForge SDK

### Data & Authentication

The current production frontend uses the InsForge SDK for authentication and database access. Application-level authorization checks are implemented in the frontend service layer, including participant checks for exchanges/messages/reviews and admin checks for administrative screens.

**Production requirement:** database-level authorization/RLS must be verified in the connected InsForge project before treating the application as fully production-secure. The repository does not contain the InsForge database policy configuration.

## Repository Structure

```
frontend/
  src/
    components/       Shared UI and layout
    context/          Auth, theme, notifications, socket state
    lib/              InsForge client
    pages/            Product screens
    services/         API/data-access and business logic

.github/
  workflows/
    frontend-ci.yml   TypeScript build + OTP test workflow
```

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

OTP authentication tests:

```bash
node test-otp-auth.js
```

## CI

GitHub Actions validates the frontend on pushes and pull requests targeting `main`.

The workflow currently runs:

1. Dependency installation
2. OTP authentication unit tests
3. TypeScript production build

## Deployment

Vercel is configured to build the frontend from the `frontend` directory:

- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`

Production deployment should be followed by a live smoke test covering authentication, onboarding, discovery, exchange requests, messaging, scheduling, completion, reviews, and logout.

## Security Notes

- Authenticated identity is resolved from the InsForge auth session rather than trusting a client-controlled user ID.
- Auth/session identifiers are kept in session storage.
- User-created skill, profile, post, report, and review inputs have application-level validation.
- Administrative actions require an authenticated admin profile.
- Exchange and messaging operations verify the current user's role/participation.
- Exact location data is not intended to be exposed as a public profile field.

Application-level checks are **not a substitute for database-level RLS**. Configure and verify InsForge policies for every production table before launch.

## GTM Direction

The current GTM focus is:

**Primary audience:** students and early-career learners.

**Core value proposition:** users can learn practical skills from peers while teaching skills they already know.

The main activation goal is to move a new user from onboarding to their **first relevant learning partner and first exchange request** with minimal friction.
