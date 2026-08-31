# YuashieWhitelistBridge 1.0.0

A minimal Paper 26.2 plugin for Yuashie's Project 002 whitelist flow.

The plugin polls `https://yuashie.cn/api/minecraft/bridge/pending` over outbound HTTPS, adds approved names to Bukkit's native whitelist on the server thread, then confirms the result back to the website.

No inbound RCON/public secondary port is required.

## Install
1. Deploy the matching Yuashie website backend update first.
2. Put `YuashieWhitelistBridge-1.0.0.jar` in `plugins/`.
3. Keep a strong `rcon.password` in `server.properties`. By default the bridge reuses it only as an HTTPS bearer token; RCON itself does not need to be publicly exposed.
4. Restart Paper.
5. Ensure VerifyMC uses `whitelist_mode: bukkit` and points `web_register_url` to `https://yuashie.cn/projects/002`.

On first boot, `plugins/YuashieWhitelistBridge/config.yml` is generated automatically.
