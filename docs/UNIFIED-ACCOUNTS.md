# Yuashie / AstrAcct 统一账号 · 0.8.0

## 已实现与尚未启用

网站与 AstrAcct 共用 PostgreSQL `users`、Argon2id 密码和同一会话库。软件注册打开同源注册页，产生的网站账号可以在任一端登录。网站保留 HttpOnly/Secure/SameSite Cookie 和 CSRF 校验；原生端使用 32 字节随机会话令牌并存入系统安全存储，数据库只保存令牌 SHA-256 摘要。原生端与网页 Cookie 同时存在时，以显式 Bearer 身份为准，退出原生端不会退出其他网页账号。

- 支持邮箱与密码登录；旧密码仍可登录，新注册密码要求 8～128 位。
- QQ、GitHub、Google 的登录与已登录用户主动绑定已实现。未设置 Client ID/Secret 的平台显示“待开通”。不依据邮箱相同自动合并账号；已有账号应先用密码登录，再从“账号安全”绑定。
- 用户最新要求只接入阿里云验证码 2.0，不接短信发送。验证码用于人机验证；不验证号码归属。手机号注册、短信找回、邮件验证和邮件找回均未启用。忘记密码页说明此限制，后端不允许绕过验证改密码。
- 账号登录不等于余额配置云同步。现有 API Key、订阅链接、手动余额仍保留本机，本次不会自动上传。

## 配置阿里云验证码 2.0

1. 在 [验证码 2.0 控制台](https://yundun.console.aliyun.com/?p=captcha) 开通服务，在概览获取身份标 `prefix`。
2. 创建 **Web/H5、V3 架构**场景，记录 SceneId 和地域 cn（上海）或 sgp（新加坡）。本方案的软件验证码运行在系统浏览器里的 yuashie.cn 登录页，不嵌入 App WebView。
3. 将以下配置写入服务器 `server/.env`，不要提交真实值：`ALIYUN_CAPTCHA_ENABLED=true`、`ALIYUN_CAPTCHA_SCENE_ID`、`ALIYUN_CAPTCHA_PREFIX`、`ALIYUN_CAPTCHA_REGION`、RAM 用户的 `ALIBABA_CLOUD_ACCESS_KEY_ID` 和 `ALIBABA_CLOUD_ACCESS_KEY_SECRET`。可选 STS SecurityToken。RAM 仅授予验证码所需权限，勿使用主账号密钥。
4. 前端动态加载官方 SDK，服务端调用 `VerifyIntelligentCaptcha` 并检查 `Code=Success` 与 `Result.VerifyResult=true`。已要求验证但配置不全、SDK失败、服务端验证异常时均不放行注册和密码登录。未开始启用时保留原有邮箱密码流程。
5. 重启 API；检查 `/api/auth/config` 中 `captchaRequired`、`captchaConfigured` 及公开场景信息。此接口不返回密钥。

官方文档：[产品说明](https://help.aliyun.com/zh/captcha/captcha2-0/product-overview/what-is-alibaba-cloud-captcha-2)、[Web/H5 V3](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/new-architecture-for-web-and-h5-client-access)、[服务端验签](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/server-access)。

## 第三方应用申请与回调地址

| 平台 | 申请入口 | 注册的完整回调地址 |
| --- | --- | --- |
| QQ | [QQ 互联](https://connect.qq.com/)：创建网站应用，按平台要求完成审核 | `https://yuashie.cn/api/auth/oauth/qq/callback` |
| GitHub | [Developer settings / OAuth Apps](https://github.com/settings/developers)：New OAuth App | `https://yuashie.cn/api/auth/oauth/github/callback` |
| Google | [Google Auth Platform](https://console.cloud.google.com/auth/overview)：配置品牌/受众与 Web application 客户端；测试阶段添加测试用户 | `https://yuashie.cn/api/auth/oauth/google/callback` |

网站首页填 `https://yuashie.cn`，按平台要求提供服务条款和隐私协议。把各平台 ID/Secret 填入 `OAUTH_QQ_*`、`OAUTH_GITHUB_*`、`OAUTH_GOOGLE_*` 环境变量。此实现使用服务端 Web 应用授权，客户端不会持有 Client Secret。QQ H5 在系统浏览器中打开，不使用不受支持的内嵌 H5 登录。

GitHub 和 Google 使用授权码 + PKCE，Google 还核验签名、issuer、audience、nonce。OAuth state 在服务端存摘要、10 分钟过期、绑定 HttpOnly Cookie、单次消耗。已登录绑定还校验回调时账号未变化。第三方访问令牌不持久化。

参考：[QQ 授权码](https://wiki.connect.qq.com/使用authorization_code获取access_token)、[GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)、[Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect)。真实第三方授权需完成申请后逐平台验收。

## 软件与 iOS 网页版

AstrAcct 原生设置顶部增加统一账号入口。无需验证码时可直接输入邮箱和密码；启用验证码后在系统浏览器的安全登录页输入，防止把第三方授权或验证码塞进不兼容的内嵌浏览器。

软件先生成随机 verifier，服务端只保存 SHA-256 challenge。登录/注册/第三方授权后，用户在网页点击“确认登录 AstrAcct”。软件以 verifier 领取结果，10 分钟过期且单次使用，不在跳转 URL 中传令牌或密码。iOS PWA 使用同一流程领取 HttpOnly Cookie，不把会话令牌写入 localStorage。关闭或刷新发起端可能使流程失效，重新发起即可。

## 完整发布与维护

1. 验证 `npm ci`、`npm ci --prefix server`、`npm test`、`npm run test:server`、部署脚本测试与 `npm run build`。客户端另行运行 Flutter analyze/test/build。
2. 使用具备完整发布权限的路径备份服务器 `src`、`sql`、`package.json`、`package-lock.json` 与当前前端，保留 `.env`、数据库及 user-content。新增依赖必须在服务端 `npm ci --omit=dev`。
3. 执行 `server/sql/007_unified_accounts.sql`（可重复执行），再发布 API、重启 yuashie-api 并检查 `/api/health`、`/api/auth/config`。未完成 API/数据库发布前不能单独发布本次前端。
4. API健康后再切换前端，核对 `deploy-version.json` 与确切 Git 提交。正常工作流前端范围检查不应被绕过。
5. 定期删除 `auth_oauth_states`、`auth_app_requests` 中 `expires_at<NOW()` 的记录；日志不记录授权回调 query、密码、验证码参数或令牌。
6. 真实注册/重置/第三方授权涉及用户身份与外部服务，本次自动测试使用隔离数据库、模拟身份与验证码，不替代真实配置及设备验收。旧 API 不认识无邮箱/无密码的 OAuth-only 账号，回滚时需保留本次统一身份支持。
