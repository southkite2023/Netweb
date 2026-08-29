# Yuashie Account 0.2.1

## Included
- Register / sign in / sign out
- Password minimum: 6 characters (Argon2id hashing remains unchanged)
- Public profile `/u/:username`
- Profile editing
- PostgreSQL users, sessions and contribution ledger foundation
- Badge catalog, badge ownership and one equipped badge per user
- Equipped badge is included in the public user payload so comments can display it later without redesigning the account API
- HttpOnly / Secure / SameSite=Lax cookie
- Origin validation and rate limiting

## Badge set
- 🐛 **Bug Hunter** — 提交 5 个有效 Bug
- 💡 **Thinker** — 5 个建议被采用
- ⛏ **Minecraft Pioneer** — Minecraft Server 成员
- 🌱 **Founding Member** — 网站 Beta 阶段注册（2026.12.31 前）
- 🔥 **1000 Contribution** — 贡献值达到 1000

### Awarding behavior
- `Founding Member` is automatically granted to accounts created before `2027-01-01 00:00:00+08:00`.
- `1000 Contribution` is automatically granted once the stored contribution total reaches 1000.
- `Minecraft Pioneer` is currently administrator-awarded because server membership data is not yet connected.
- `Bug Hunter` and `Thinker` are registered as future automatic badges. Until the feedback system exists, an administrator can award them manually; the later feedback module can switch these two to automatic counting without changing user/profile data.
- Users may equip one earned badge or choose to equip none.

## Updating an existing 0.2.1 server
Run the new migration after copying the updated `server/` directory:

```bash
cd /var/www/yuashie-app/server
set -a
source .env
set +a
psql "$DATABASE_URL" -f sql/002_badges.sql
sudo systemctl restart yuashie-api
```

Then publish the updated frontend normally.

## Fresh server setup
1. Install PostgreSQL and create a database/user.
2. Run `server/sql/001_account_system.sql`.
3. Run `server/sql/002_badges.sql`.
4. `cd server && npm install`
5. Set environment variables based on `server/.env.example`.
6. Run `npm start` (recommended under systemd in production).
7. Nginx must proxy `/api/` to `http://127.0.0.1:3000`.

## Manual badge administration
For badges that are not yet connected to automatic source data, the API includes admin-only award/revoke routes:

```text
POST   /api/admin/users/:username/badges/:badgeKey
DELETE /api/admin/users/:username/badges/:badgeKey
```

Badge keys:

```text
bug_hunter
thinker
minecraft_pioneer
founding_member
contribution_1000
```

## Before public registration
Email verification, password reset, moderation/ban tools and backups should be implemented before opening registration broadly.
