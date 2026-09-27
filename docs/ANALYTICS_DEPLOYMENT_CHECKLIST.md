# SkillBarter Analytics Deployment Checklist

Date: 27 September 2026

## Current implementation

The frontend analytics client supports the 17 allowlisted funnel events and sends a JSON payload only when `VITE_ANALYTICS_ENDPOINT` is configured.

The backend exposes the first-party collector at:

`POST /api/analytics/events`

The backend also exposes the admin KPI endpoint at:

`GET /api/analytics/kpi?days=7`

## Important deployment rule

Do **not** point `VITE_ANALYTICS_ENDPOINT` at an unverified URL.

The frontend and FastAPI backend are deployed separately, so the production endpoint must be the publicly reachable FastAPI analytics URL (or a verified proxy that forwards to it).

Example shape:

`VITE_ANALYTICS_ENDPOINT=https://<verified-backend-host>/api/analytics/events`

Replace the placeholder only after the deployed backend `/health` endpoint and `/api/analytics/events` endpoint have been verified.

## Verification procedure

1. Confirm the deployed FastAPI service is reachable.
2. Confirm `GET /health` reports database connectivity as healthy.
3. Configure `VITE_ANALYTICS_ENDPOINT` in the Vercel production environment.
4. Redeploy the frontend so Vite embeds the new environment variable.
5. Open the production app and exercise a non-exchange journey such as signup/login, onboarding, and matches.
6. Confirm the collector accepts the generated events with HTTP 202.
7. Sign in with an admin account and call the KPI endpoint.
8. Confirm the expected events appear in the KPI response.
9. Verify that no analytics failure interrupts signup, login, onboarding, matching, or other product flows.

## Privacy / data boundary

The client payload contains the event name, anonymous session identifier, current path, timestamp, attribution values, and event properties. Do not add phone numbers, passwords, access tokens, or other sensitive authentication data to analytics properties.

## Current status

The repository-side analytics implementation is ready for deployment configuration. The production collector URL and live KPI data are intentionally **not claimed as verified** until the deployed backend and Vercel environment configuration are checked.
