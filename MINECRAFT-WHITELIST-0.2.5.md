# Project 002 Minecraft Whitelist · 0.2.5

## Behavior

Project `/projects/002` now owns the website-side Minecraft binding flow.

- Visitors can read the project without signing in.
- Whitelist registration requires a Yuashie Account session.
- Login and registration preserve `?redirect=/projects/002` and return the user to the project automatically.
- One Yuashie Account can bind exactly one Minecraft Java Edition ID.
- One Minecraft ID can belong to only one Yuashie Account, case-insensitively.
- Minecraft IDs use the Java username rule `^[A-Za-z0-9_]{3,16}$`.
- No user-facing unbind/change endpoint is exposed. A correction is an administrator action.
- A successful Minecraft-side synchronization automatically awards the `minecraft_pioneer` badge if it is not already owned.

The constraints are enforced in PostgreSQL as well as in the Vue UI, so hiding or modifying the browser controls cannot bypass the one-to-one rule.

## Database migration

`server/sql/004_minecraft_whitelist.sql` creates `minecraft_accounts` with a unique `user_id` and a case-insensitive unique index on `minecraft_name`.

The existing publish script applies every `server/sql/*.sql` migration in filename order, so publishing 0.2.5 applies this migration automatically.

## Minecraft synchronization

The website API uses Minecraft RCON to execute:

```text
whitelist add <MinecraftID>
```

Configure these values in the production `server/.env`:

```dotenv
MC_RCON_HOST=<minecraft-server-host>
MC_RCON_PORT=<rcon-port>
MC_RCON_PASSWORD=<strong-rcon-password>
MC_RCON_TIMEOUT_MS=5000
```

If RCON is not configured, the website still records the immutable one-to-one binding as `pending`. The Project 002 panel shows that synchronization is waiting and provides a retry action. Network/authentication failures are stored as `error` and can also be retried.

## Minecraft server settings

For the website to control the native whitelist, use the Bukkit/Paper whitelist path. Recommended `server.properties` values:

```properties
white-list=true
enforce-whitelist=true
enable-rcon=true
rcon.port=<your-rcon-port>
rcon.password=<strong-random-password>
```

For VerifyMC, use Bukkit whitelist mode rather than its separate plugin-owned list:

```yaml
whitelist_mode: bukkit
web_register_url: https://yuashie.cn/projects/002
```

The Yuashie Account is the website identity gate; VerifyMC's standalone registration page should not be the primary player registration path for this design.

## RCON security

RCON is plaintext TCP. Do not expose the RCON port broadly to the Internet if your hosting/network supports source-IP restrictions, a private network, or a tunnel. The RCON password belongs only in the server-side `.env`; it is never sent to the browser.
