# Project 002 Minecraft Whitelist Bridge · 0.2.6

Version 0.2.6 replaces the website-to-Minecraft inbound RCON connection with an outbound HTTPS pull bridge.

## Flow

1. A signed-in Yuashie Account binds one Minecraft Java ID on `/projects/002`.
2. The API stores the immutable 1:1 binding as `pending`.
3. `YuashieWhitelistBridge` polls `https://yuashie.cn/api/minecraft/bridge/pending` every 15 seconds over HTTPS.
4. The Paper plugin adds the name to Bukkit's native whitelist locally.
5. The plugin confirms the operation to the website API.
6. The binding becomes `active` and the `minecraft_pioneer` badge is awarded.

No extra public TCP/RCON port is required.

## Website authentication

The bridge accepts a Bearer token. It uses `MC_BRIDGE_TOKEN` when set, otherwise it falls back to the already configured `MC_RCON_PASSWORD` for compatibility with the previous setup.

## Minecraft plugin

Copy `YuashieWhitelistBridge-1.0.0.jar` into the Paper server's `plugins/` directory and restart the server. On first boot it creates `plugins/YuashieWhitelistBridge/config.yml`.

The default plugin configuration points to `https://yuashie.cn/api/minecraft/bridge` and reads `rcon.password` from `server.properties` as the shared token, so the existing password can be reused without exposing the RCON port.

## VerifyMC

Use Bukkit whitelist mode and direct players to Project 002:

```yaml
whitelist_mode: bukkit
web_register_url: https://yuashie.cn/projects/002
```

Remove any duplicate `web_register_url` entry from VerifyMC's configuration.
