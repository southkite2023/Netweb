# Yuashie Community System 0.2.4

## Scope

0.2.4 extends Yuashie Account with project comments, custom avatars, Bug/Suggestion feedback review, Contribution ledger rules, and administrator identity in comments.

## Project comments

`ProjectDetailView.vue` mounts one reusable `CommentSection` with `project.id`. Any future project that continues to use `/projects/:id` and the shared project-detail view receives the same comment system automatically.

- Public reading; signed-in posting.
- One reply level.
- 2,000-character maximum per comment.
- Authors may delete their own comments; administrators may moderate any comment.
- Administrator comments show a dedicated `◆ ADMIN` mark and accent rail.
- The author's equipped badge and avatar are returned with each comment.
- Comment text is rendered as plain Vue text, not raw HTML.

## Avatars

Users may upload PNG, JPEG, or WebP avatars from their profile editor.

- Maximum source file size: 512 KB.
- Both browser and API enforce the limit.
- The API verifies basic file signatures.
- User content is stored under `/var/www/yuashie-app/user-content/avatars`, outside `dist` and `server`, so application publishing does not overwrite avatars.

## Feedback Center

Route: `/feedback`

Signed-in users can submit either a Bug or Suggestion with a title, description, optional project reference, and optional page URL. They can track status and administrator notes.

Bug states: `new`, `reviewing`, `valid`, `fixed`, `rejected`.
Suggestion states: `new`, `reviewing`, `adopted`, `rejected`.

Administrator route: `/admin/feedback`.
The administrator's own profile exposes a direct review-console entry.

## Contribution rules

Contribution is event-ledger based. Ordinary comments do not earn points.

- Account created: +5.
- Valid Bug: +20 once per feedback item.
- Adopted Suggestion: +50 once per feedback item.

If a Bug/Suggestion approval is later withdrawn, its corresponding Contribution event and points are reconciled automatically.

Automatic badge rules now use reviewed feedback:

- 🐛 Bug Hunter: 5 feedback items of type Bug in `valid` or `fixed` state.
- 💡 Thinker: 5 Suggestions in `adopted` state.
- ⛏ Minecraft Pioneer: administrator-awarded membership badge.
- 🌱 Founding Member: registered before 2027-01-01 00:00:00 +08:00.
- 🔥 1000 Contribution: current Contribution total at least 1000.

## Database migration

`server/sql/003_community_feedback.sql` adds:

- `users.avatar_filename`
- `comments`
- `feedback`
- idempotency constraint for referenced Contribution events
- automatic Bug Hunter / Thinker badge migration

The 0.2.4 publish script applies all SQL migrations in filename order before restarting the API.

## Deployment behavior

The desktop `Yuashie Publish` flow:

1. Builds the Vue frontend.
2. Packages frontend and API source.
3. Uploads both to the server.
4. Applies `001`, `002`, `003` SQL migrations idempotently.
5. Ensures the avatar directory exists and is writable by the `www-data` API service.
6. Restarts `yuashie-api` and checks `/api/health`.
7. Only then swaps the frontend `dist` directory.

If build, migration, API restart, or API health check fails, the frontend is not replaced.
