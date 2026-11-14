# REST API Documentation

Base URL: `/api`

All protected routes require an `Authorization: Bearer <token>` header.

## Health

- `GET /api/health` — Returns server health and active database mode (`mongodb` or `local-fallback`).

## Authentication

- `POST /api/auth/register` — Register a new user (`name`, `email`, `password`, optional `skills`, `headline`, `location`). Always assigns `role: "user"`.
- `POST /api/auth/login` — Authenticate with `email` and `password`. Returns `{ token, user }`.
- `GET /api/auth/me` — *(Protected)* Returns current authenticated user profile.
- `PATCH /api/auth/profile` — *(Protected)* Update `name`, `skills`, `headline`, `location`, or `bio`.

## Opportunities

- `GET /api/opportunities` — List approved opportunities (`status: "approved"`). Query params: `search`, `type`, `workMode`, `location`, `paid` (`paid` | `unpaid`), `sort` (`newest` | `deadline`), `page`, `limit`.
- `GET /api/opportunities/stats` — Public platform statistics.
- `GET /api/opportunities/my-submissions` — *(Protected)* List opportunities submitted by the current user.
- `GET /api/opportunities/:id` — Get opportunity details (approved publicly; pending/rejected only for submitter or admin).
- `POST /api/opportunities/submit` — *(Protected)* Submit a new opportunity (`status: "pending"`). Rejects duplicates matching title+company or URL.

## Applications

- `POST /api/applications` — *(Protected)* Track a platform `opportunityId` or custom external role (`customTitle`, `customCompany`, `customUrl`, `status`, `appliedAt`, `notes`).
- `GET /api/applications/my` — *(Protected)* List user's tracked applications and stage summary counts.
- `PATCH /api/applications/:id` — *(Protected, owner only)* Update `status`, `notes`, or `appliedAt`; appends stage transitions to `history`.
- `DELETE /api/applications/:id` — *(Protected, owner only)* Delete an application record.

## Bookmarks

- `POST /api/bookmarks` — *(Protected)* Save an approved `opportunityId`. Prevents duplicates.
- `GET /api/bookmarks` — *(Protected)* List saved opportunities.
- `DELETE /api/bookmarks/:id` — *(Protected, owner only)* Remove bookmark by bookmark ID or opportunity ID.

## Notifications

- `GET /api/notifications` — *(Protected)* List user notifications and unread count.
- `PATCH /api/notifications/:id/read` — *(Protected)* Mark notification as read.
- `PATCH /api/notifications/read-all` — *(Protected)* Mark all notifications as read.

## Admin *(Protected + Admin Role Required)*

- `GET /api/admin/dashboard` — Platform metrics and chart breakdowns (`byType`, `byWorkMode`).
- `GET /api/admin/submissions` — Filter all opportunities by `status` (`pending`, `approved`, `rejected`, `all`) and `search`.
- `PATCH /api/admin/submissions/:id` — Approve or reject a submission with optional `reviewNote`.
- `POST /api/admin/opportunities` — Create a directly approved opportunity.
- `PUT /api/admin/opportunities/:id` — Update any opportunity.
- `DELETE /api/admin/opportunities/:id` — Delete an opportunity and clean up bookmarks.
- `GET /api/admin/users` — List all registered users (password hashes omitted).
- `PATCH /api/admin/users/:id/role` — Update a user's role (`"user"` or `"admin"`).
