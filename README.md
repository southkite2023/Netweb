# Yuashie Personal Site · 0.3.2

Version 0.3.2 rebuilds About as a changelog and adds Terms of Service, Privacy Policy and Content Usage Terms. See `UPDATE-0.3.2.md`.

Vue 3 + Vite frontend with a Fastify + PostgreSQL account/community API.

Current features include accounts, public profiles, selectable badges, project comments, avatars, Bug/Suggestion review, Contribution ledger, administrator tools, the Project 002 Minecraft whitelist bridge, and **Project 003 · Yuashie Radio**.

Version 0.3.1 adds a successful-comment dialog, top-of-page route navigation, a global TOP button, and Chinese as the initial language. See `UPDATE-0.3.1.md` for upgrade notes.

## Project 003 · Yuashie Radio

Version 0.3.0 adds an amateur-radio identity, QSO logbook, custom QSL template library, and in-site electronic QSL delivery.

Users can:

- bind one unique amateur-radio callsign to a Yuashie account;
- choose operator class A / B / C;
- display a persistent `📻 CALLSIGN` identity beside the website identity;
- save and search QSO records including BJT time, frequency, mode, RST, power, QTH, rig, antenna, notes, and QSL state;
- upload PNG/JPEG/WebP QSL designs up to 5 MB;
- send an electronic QSL to another Yuashie user whose callsign matches the remote callsign in the QSO log;
- receive and acknowledge electronic QSL cards in the QSL inbox;
- expose a public station page at `/radio/:callsign`.

QSL images and QSO metadata remain separate: QSO details are overlaid dynamically rather than burned into the original artwork.

See `RADIO-SYSTEM-0.3.0.md` for the implementation and schema notes.

## Deployment

Default workflow: validate changes, sync `southkite2023/Netweb` `main`, publish to `yuashie.cn`, and verify the exact deployed commit. Frontend changes automatically trigger GitHub Actions; backend/schema changes require a coordinated full deployment. See `docs/GITHUB-DEPLOY.md` and `AGENTS.md`.

The desktop `Yuashie Publish` flow builds the frontend, uploads the API, applies every SQL migration in `server/sql` in filename order, creates persistent avatar/QSL content directories, restarts the API, performs a health check, and then swaps the frontend build.

The new radio migration is `server/sql/005_radio.sql`.

## Minecraft whitelist bridge

Project 002 continues to use `YuashieWhitelistBridge` inside Paper. It polls the Yuashie API over outbound HTTPS and updates Bukkit's local whitelist, so no public RCON port is required.

See `MINECRAFT-BRIDGE-0.2.6.md` for the Minecraft bridge details.

## Project 004 · Yuashie Calendar

Calendar now opens a Quota Hub-style introduction at `/projects/004`, with a primary CTA to the visual subscription builder at `/projects/004/subscribe`. The builder supports game/event filters, weekly anime, new-game releases and start-day/full-duration modes in Chinese, English and Japanese. GitHub is a secondary resource on the builder.

**Frontend test only:** the copied `.ics` URL uses `calendar.example.invalid`. Real sources and online subscription are not yet connected. See [Calendar routes, URL contract and launch requirements](docs/CALENDAR.md).

## v0.7.0 Cloud Sync

收藏、真实通知及已读状态、语言和主题可随账号跨设备同步；新增独立设备会话管理、CSRF 校验、可选的本地数据导入和 Cookie 隐私偏好。原始 localStorage 数据保留，当前未使用非必要追踪。

请先阅读 [Cloud Sync 审计与完整部署说明](docs/CLOUD-SYNC-0.7.0.md)。服务器需执行 `006_cloud_sync.sql` 并设置私有 `CSRF_SECRET`，前后端必须协调发布；现有前端专用发布任务不能发布这次后端升级。验证新增使用 `npm ci --prefix server` 与 `npm run test:server`，测试不连接生产数据库。

## v0.9.0 统一账号与邮件验证

AstrAcct 与网站共用用户和会话体系；加入 QQ/GitHub/Google 配置入口及阿里云验证码 2.0 接入。加入邮件验证码注册、邮箱验证与密码重置，支持 ECS RAM 角色临时凭据和自动刷新。第三方应用尚待申请；手机号验证待接入短信服务。登录不会自动同步余额账户凭据。完整配置和发布请见 [统一账号说明](docs/UNIFIED-ACCOUNTS.md)。


## v0.9.1 登录方式管理

本人主页与账号安全页可管理邮箱、手机号、密码及 QQ/GitHub/Google 绑定；修改前重新验证身份，拒绝跨账号抢绑及移除最后一种可用方式，修改后退出其他设备。手机号注册与短信登录使用阿里云「号码认证服务 → 短信认证」，复用 ECS 角色凭据，配置系统赠送签名、模板及发码/核验权限后开放；验证码 2.0 本身不发送短信。完整发布须应用 `009_account_methods.sql`，详情见 [统一账号说明](docs/UNIFIED-ACCOUNTS.md)。
