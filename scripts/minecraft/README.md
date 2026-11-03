# Project 002 native whitelist

Updated 2026-11-03 per the owner's explicit correction: keep the original name-only registration flow. No Microsoft OAuth, callbacks, app registration, entitlement-token handling or manual review. Website https://yuashie.cn/projects/002; Vanilla Java 26.3 at 139.155.146.68:25565.

A signed-in website user enters their Java player name. Backend queries the official Minecraft profile lookup for canonical name/UUID, maintains the existing one-to-one account/name/UUID constraint, then immediately invokes native `whitelist add`. Official profile existence is NOT proof that the person submitting the form owns that account. The server enforces online-mode=true, white-list=true, enforce-whitelist=true; actual game connection requires the official authenticated player. The minecraft_pioneer badge is preserved. Existing website records are retained and resolved on retry.

The old Paper 26.2 plugin and HTTPS pull endpoints are retired on this Vanilla server. Do not install Paper or overwrite the world just to restore the old bridge. The historical MINECRAFT-WHITELIST and MINECRAFT-BRIDGE documents describe previous releases.

## Transport and administration

Website www-data uses a dedicated SSH key in /var/lib/yuashie-minecraft with strict host key pinning. Tencent's authorized key is restricted to Alibaba's IP, a forced helper, and no forwarding/shell. Root-owned /opt/yuashie-whitelist/bridge.py runs as mcsm and only accepts health, status, add. Native RCON port 25575 is denied publicly through persistent UFW IPv4/IPv6 rules. Its random password stays in protected server.properties; the browser receives no keys.

MCSManager console retains `whitelist add NAME`, `whitelist remove NAME`, `whitelist list`. Website never rewrites whitelist.json or issues remove. Durable UUID receipts in /var/lib/minecraft-whitelist prevent retries from re-adding an administrator-removed player. A receipt is recorded before a command to prevent uncertain deliveries from later undoing manual changes. If delivery becomes uncertain after that point, inspect the native list and receipt before manual recovery; administrators can always add through MCSManager. Failed connections before receipt creation remain safely retryable. Existing manual players are never removed by this service.

## Audit, verification and recovery

Database tables: minecraft_accounts (UUID added), minecraft_audit. Native add logs: /var/lib/minecraft-whitelist/operations.jsonl and Minecraft latest.log. API failures: journalctl -u yuashie-api. No token or password is logged. The former OAuth implementation is not part of the final deployed code.

Both hosts have private backups in /var/backups/minecraft-binding-20261103/. Alibaba: website-before.tgz, PostgreSQL dump, Nginx/systemd snapshots. Tencent: config-before.tgz with original whitelist, properties, bans, ops, instance configuration and UFW rules. The integration does not delete world/player data. A graceful empty-server restart enables private RCON. Do not restore the entire website/database over later work: selectively restore affected configuration after checking newer changes.

Tests: `node --test server/tests/minecraft.test.mjs`; `python3 scripts/minecraft/test_bridge.py`; production website-to-native bridge and official profile lookup. Actual player login must be tested with a real game client; server status/whitelist inspection alone is not proof of a successful client join.
