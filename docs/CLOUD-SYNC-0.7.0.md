# v0.7.0 Cloud Sync — audit and coordinated release

Audited `southkite2023/Netweb` main at `654e67f` on 2026-10-08 (Asia/Shanghai). The implementation audit used repository sources. Production rollout was performed after explicit owner approval on 2026-10-08.

## Actual architecture and storage

Vue 3 / Vite / Vue Router / vue-i18n frontend; same-origin Fastify API behind Nginx; PostgreSQL (`pg`), Argon2id passwords, opaque random 32-byte session tokens. DB stores SHA-256 session hashes; existing HttpOnly, SameSite=Lax cookies last 30 days and are Secure with NODE_ENV=production. Login already creates independent session rows. The former origin hook allowed missing Origin and had no CSRF token.

| Data | Before | v0.7.0 |
|---|---|---|
| Accounts, profile, avatar metadata, contributions, badges | PostgreSQL | Preserved |
| Avatar and QSL images | Server filesystem | Preserved; back up user-content separately |
| Comments, feedback, Minecraft bindings, radio profiles/logs/QSL delivery | PostgreSQL | Preserved |
| Project favorites (`yuashie-saved-pages`) | localStorage, browser-wide | Account-owned rows; guests remain local |
| Mailbox notification content | Client derives from real comments/feedback/badges/admin broadcasts | Server materializes actual source events per user; no demo messages |
| Read state (`yuashie_mailbox_read:<username>`) | localStorage | Account-owned, additive read markers |
| `preferred-language`, `theme` | localStorage | Server account preference plus local display cache |
| Privacy choice | Absent | `yuashie-privacy-v1`, local device preference |
| Archive 000 simulated price | localStorage | Remains local; not personal account data |

No analytics/advertising SDK is added. Cookie choices all enable only necessary storage; optionalTrackingAllowed is deliberately false until a real optional integration and consent gate exist. Preferences can be reopened from /about and the footer. CSP is a separate deployment concern: preserve existing Nginx headers, never add unsafe HTML rendering for notification content. Vue escapes the displayed text; favorite paths are restricted to internal routes and all SQL values are parameterized. Device descriptions are user-agent strings, not verified device identities.

## API and behavior

- `GET /api/sync`, `PUT /api/sync/favorites` (`path`, `saved`), `PATCH /api/sync/preferences` (`language`, `theme`). Favorite changes modify one record, avoiding whole-list overwrites. Theme/language use last committed change. Refresh on window focus, page visibility, and every 60 seconds when visible; not WebSocket realtime.
- `GET /api/notifications`, `PUT /api/notifications/read` (`keys`). Source snapshots are stored transactionally, and deleted source content disappears on refresh. Snapshot keys preserve the old mailbox key formats. Real replies are found server-side across projects; private feedback stays scoped to its owner. Read markers are additive and importable even if the corresponding event is no longer visible. Notifications currently show the latest 120.
- `POST /api/sync/import`: transactionally merges favorites and read markers, inserts preferences only if no cloud preference row exists. Idempotent additive import. Local originals are never deleted. Account-specific browser completion markers prevent repeated prompts. The prompt names the current-account destination, gives an explicit keep-local alternative, and remains retryable on error. A new device with existing local preferences gets the same prompt; existing cloud preferences win.
- `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`: only current user's rows; revoking this device clears its cookie, other devices remain logged in. Existing sessions remain valid and get a default device label.
- `GET /api/auth/csrf` returns a session-bound HMAC token with no-store caching. Browser writes require exact SITE_ORIGIN and an X-CSRF-Token when a session cookie exists. Origin-less browser writes are rejected; scripts using browser sessions must be updated. Frontend retrieves a fresh token before each mutation. No mutation is automatically retried after ambiguous network failure.
- The Minecraft bridge's two bearer-authenticated callback paths remain compatible without browser Origin; their existing independent token checks are preserved. Cookie-bearing bridge callbacks do not bypass CSRF.
- Sync account headers and frontend generation checks reject stale account operations and prevent delayed responses from exposing a previous account's data. Failed logout retains the signed-in UI until server revocation succeeds. Offline writes show errors and require retry; no background offline queue.

CSRF design reference: [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). XSS can bypass CSRF protections; HttpOnly is not a substitute for escaping and dependency maintenance.

## Validation

```sh
npm ci
npm ci --prefix server
npm test
npm run test:server
npm run build
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Backend tests use an isolated embedded PostgreSQL engine (PGlite), all migrations 001–006, the real Fastify app, real password hashing, cookie issuance and database queries; never DATABASE_URL for production. Coverage includes rerunnable additive migration, two sessions for one account, another account's isolation, CSRF/origin and stale-account rejection, import merging and cloud-preference priority, actual notifications/read sync/source deletion, and session revocation/logout. CI installs both frontend and server lockfiles. Local browser verification also covers sign-in, optional import, favorite persistence after reload, real badge notifications, mark-all-read, independent device listing and saved Cookie choices. A staging deployment against the production PostgreSQL version remains required before rollout.

## Server-side rollout (requires owner's confirmation)

This release changes backend and schema. The existing frontend-only deployment workflow correctly refuses backend changes. **Do not bypass its scope guard, trigger a frontend-only dispatch, or merge expecting it to deploy the API.** Prepare an authorized full release, then coordinate frontend + API during maintenance. Old clients cannot perform mutations after strict CSRF is enabled until reloaded.

1. Record currently deployed commit. Back up PostgreSQL with pg_dump and independently back up user-content and private environment config using the existing approved server procedures. Verify the backup can be restored in staging; keep backups outside GitHub and web roots.
2. In staging first, check migrations 001–005 already exist. Run only the new additive migration against the intended database:
   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/sql/006_cloud_sync.sql
   ```
   It creates four user-owned tables and adds sessions.device; no users, favorites or existing sessions are deleted. It wraps all DDL in a transaction and can be rerun.
3. Set a private `CSRF_SECRET` of at least 32 random characters (e.g. generate with `openssl rand -hex 32` directly on the server; do not paste it into chat or commit it). Keep it stable across API instances. Confirm `NODE_ENV=production`, `SITE_ORIGIN=https://yuashie.cn`, existing DATABASE_URL and USER_CONTENT_DIR. API refuses to start in production without a valid secret. Local development needs SITE_ORIGIN set to the actual Vite origin and an /api proxy to the loopback API.
4. Install server dependencies from its new lockfile (`npm ci --prefix server`), build frontend, and stage both artifacts. Use the existing authorized full deployment path, restart the existing API service, then swap frontend. Nginx must forward /api to loopback API, preserve Origin/Set-Cookie and the CSRF header, avoid caching private /api responses, and serve HTTPS. Do not widen SSH receiver/key scope. No new network port or service is required.
5. Verify `/api/health` reports 0.7.0, /about and /privacy load, and deploy-version.json identifies the released commit. Test with disposable staging accounts: favorite/unfavorite on device A → B, read → B, language/theme, rejection on account B, per-device logout, necessary-only sign-in, local import and network error behavior. Ask users with old open tabs to reload.
6. Rollback: restore prior API and frontend commit together. Leave new additive tables/column intact; do not drop them or erase newly synced data. Restore DB backup only under a separately approved recovery procedure because it can discard real user changes.

A successful PR/build alone is not evidence of backend publication.

## Completed production rollout — 2026-10-08 (Asia/Shanghai)

- [PR #4](https://github.com/southkite2023/Netweb/pull/4) was merged. Released source commit: `d0d9ee2fca5f1e3742f616e343cdba3e61131edc`.
- Concurrent Astracct download updates from `04d393f` were preserved. The combined release passed 15 frontend tests, 2 backend integration tests and the production build; every tracked release file was verified against the merged source.
- On ECS PostgreSQL 14.24, a separate temporary database passed real API probes for independent sessions, CSRF, preferences, favorites, imports and notification read states. The full production backup was restored into a second isolated database and migration 006 preserved its accounts and sessions. Both temporary databases were removed.
- Private database, uploaded-content, environment and previous-source backups were retained on the server. The final pre-publication database/upload backup was refreshed immediately before switching.
- Migration `006_cloud_sync.sql` completed; a private CSRF secret was configured without exposing it. The API was restarted with the new locked dependencies, and frontend/API were published together under the existing deployment lock.
- Public `/api/health` reports `0.7.0`; `/deploy-version.json` reports the released commit and version. Home, About, Privacy, Projects, Login and Astracct download routes return HTTP 200. Anonymous sync, notification and session-list requests correctly return HTTP 401.
- Existing open browser tabs should be refreshed for the new CSRF client. Local-data import remains an explicit user choice; original local storage is retained.
- The initial frontend-only Actions attempt correctly stopped at its backend scope guard. After the full coordinated release satisfied that guard, only its failed job was rerun; the guard and restricted receiver were preserved.

Rollback must restore the previous API and frontend together and retain the additive tables and newly synced data. Database restoration requires a separately approved recovery procedure.
