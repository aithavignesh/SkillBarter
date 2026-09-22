# SkillBarter Production Configuration Matrix

Use this checklist when configuring the live deployment. Values and secrets must be stored in the deployment provider, not committed to Git.

| Variable | Where | Required for | Notes |
|---|---|---|---|
| `VITE_INSFORGE_URL` | Vercel Production | Auth + database | Public client configuration |
| `VITE_INSFORGE_ANON_KEY` | Vercel Production | Auth + database | Public client key; protect database access with RLS |
| `PHONE_AUTH_SECRET` | Vercel Production | Phone OTP | Server-side secret |
| `SMS_PROVIDER` | Vercel Production | Phone OTP | Use the configured provider |
| `TWOFACTOR_API_KEY` | Vercel Production | 2Factor OTP | Server-side secret when enabled |
| `TWOFACTOR_TEMPLATE_NAME` | Vercel Production | 2Factor OTP | Must match provider configuration |
| `VITE_ANALYTICS_ENDPOINT` | Vercel Production | Funnel analytics | Leave empty until first-party collector is privacy-reviewed |
| `TWILIO_*` | Vercel Production | Twilio fallback | Only required when Twilio is configured |
| `RAZORPAY_KEY_ID` | Vercel Production | Premium payments | Do not expose the secret in `VITE_*` |
| `RAZORPAY_KEY_SECRET` | Vercel Production | Premium payments | Server-side only |
| `INSFORGE_URL` | Vercel Production | Server-side payment routes | Keep separate from `VITE_INSFORGE_URL` if required by backend routes |
| `INSFORGE_ANON_KEY` | Vercel Production | Server-side payment routes | Server-side configuration |

## Verification order

1. Configure only the services enabled for the beta.
2. Redeploy the production deployment.
3. Open the live app in a fresh browser.
4. Test signup and login.
5. Test onboarding and matching.
6. Run the two-user exchange smoke test.
7. Test password reset.
8. If phone OTP is enabled, test OTP delivery and verification.
9. Keep analytics disabled until its collector is privacy-reviewed.
10. Record the deployment commit SHA and test date in the launch log.

## Secret handling

Never commit production secrets to GitHub or place server-only secrets in `VITE_*` variables. Client-side `VITE_*` values are bundled into the browser application.

## Beta minimum

For a controlled beta, configure only the services required for authentication, the core learning exchange, and required safety operations. Do not block the beta on unfinished monetization if premium/payment functionality is not part of the beta scope.