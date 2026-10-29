# SkillBarter admin authorization review worksheet

Status: **PENDING OWNER REVIEW — NOT AN IMPLEMENTED PERMISSION MODEL**

Branch: `migration/next-express-mongodb`

Purpose: record the approved authorization requirements before changing admin roles or route guards. This worksheet does not grant access and is not evidence that role-based access control exists.

## Current implementation observed

The backend's `User` model contains `isAdmin: Boolean`. The `/api/admin` router applies `requireAuth` and `requireAdmin` to every route. The current `requireAdmin` middleware checks `req.user.isAdmin`. This is a single administrator/non-administrator gate, not granular role-based access control.

## Roles requiring owner decision

Fill only after the project owner confirms which roles are needed. Do not assume titles automatically grant permissions.

| Proposed role | Required? (owner decision) | Approved by | Date |
|---|---|---|---|
| Super administrator | Pending | Pending | Pending |
| Administrator | Pending | Pending | Pending |
| Operations head | Pending | Pending | Pending |
| Support/moderation reviewer | Pending | Pending | Pending |
| Standard user | Existing | N/A | N/A |

## Route permission matrix

For each route, mark each proposed role as **Allow**, **Deny**, or **Not applicable** only after review.

| Capability / route | Super administrator | Administrator | Operations head | Support/moderation reviewer |
|---|---|---|---|---|
| View platform stats: `GET /api/admin/stats` | Pending | Pending | Pending | Pending |
| View analytics aggregates: `GET /api/admin/analytics` | Pending | Pending | Pending | Pending |
| View user list: `GET /api/admin/users` | Pending | Pending | Pending | Pending |
| Activate/deactivate user: `PATCH /api/admin/users/:id/status` | Pending | Pending | Pending | Pending |
| View exchanges: `GET /api/admin/exchanges` | Pending | Pending | Pending | Pending |
| View reports: `GET /api/admin/reports` | Pending | Pending | Pending | Pending |
| Resolve/dismiss/reopen report: `PATCH /api/admin/reports/:id` | Pending | Pending | Pending | Pending |
| Grant/revoke privileged roles (not currently implemented) | Pending | Pending | Pending | Pending |
| View or export sensitive personal data (not currently implemented) | Pending | Pending | Pending | Pending |

## Required security decisions

- Who may grant, revoke, or change privileged access?
- Must privileged users use stronger authentication or re-authentication for sensitive actions?
- Which actions require an immutable audit record, and what fields must it contain?
- Should administrators be prevented from deactivating the last active administrator?
- Should administrators be prevented from changing their own privileges?
- What is the emergency recovery procedure if all administrators are locked out?
- What user data is necessary for each role to see? Prefer minimum necessary fields.
- What happens to active sessions when a role is revoked?
- Who reviews access periodically, and how often?
- What tests are required for every allow/deny decision?

## Implementation acceptance criteria

Do not implement or claim role-based access control complete until the owner-approved matrix is recorded and:

1. Role values and their default assignment are validated server-side.
2. Privileged role assignment cannot be performed by an ordinary administrator unless explicitly authorized.
3. Each route checks the minimum required permission, not merely a broad admin flag.
4. Unauthorized access is denied by default.
5. Tests cover each role/route allow-deny combination, inactive users, revoked sessions, malformed input, and privilege escalation attempts.
6. Security-sensitive actions are auditable according to the approved retention policy.
7. The full CI suite passes and a reviewer approves the implementation.

## Sign-off

| Reviewer | Decision | Date | Evidence reference |
|---|---|---|---|
| Project owner | Pending | Pending | Pending |
| Security reviewer | Pending | Pending | Pending |
| Migration reviewer | Pending | Pending | Pending |

Do not commit secrets, user records, or production audit data to this worksheet.
