# Yuashie / Netweb working agreement

## Default delivery workflow

The owner explicitly requested on 2026-08-31: after website updates, sync GitHub and then publish. Treat that as standing authorization for ordinary updates to this same repository and production site; do not ask again for routine sync/publication unless the owner later limits it or the audience/target changes.

1. Inspect the latest `southkite2023/Netweb` `main` and applicable instructions. Preserve concurrent changes, especially deployment/security fixes. Never force-push or replace the whole repository with an older source archive.
2. Implement the requested change, update release records when appropriate, and finish relevant validation and the production build before publication.
3. Commit/sync the coherent change to GitHub `main`. Never publish `.env`, deployment keys, databases, backups, avatars or QSL uploads; keep existing secret exclusions and strict SSH host verification.
4. For frontend-only updates, `.github/workflows/deploy-web.yml` automatically deploys matching `main` pushes. Preserve the limited frontend receiver, backup/restore behavior and production concurrency lock. Manual dispatch is a fallback, not a reason to trigger duplicate runs.
5. If backend/schema/game-plugin/server-receiver changes are needed, the frontend-only key cannot deploy them. Prepare and validate the full coordinated release first. Use an already authorized full-deployment path if available. If that path or secrets are unavailable, finish all safe work and explain the specific blocker; never silently bypass the scope check, broaden the key, or claim the backend is deployed.
6. Follow the exact commit's Actions run to completion and verify `https://yuashie.cn/deploy-version.json` identifies that commit. Check relevant page routes. Distinguish GitHub synchronization, frontend publication and backend publication in the result. Fix ordinary build/deployment faults where authorized; never weaken authentication or ask for private keys in chat.

Do not use a separate ChatGPT Sites publication as evidence that `yuashie.cn` was updated. Publishing to unrelated domains or changing access policy requires its own authorization.
