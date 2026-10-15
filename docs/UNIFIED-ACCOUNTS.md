# Yuashie / AstrAcct 统一账号 · 0.9.1

## 已实现与尚未启用

网站与 AstrAcct 共用 PostgreSQL `users`、Argon2id 密码和同一会话库。软件注册打开同源注册页，产生的网站账号可以在任一端登录。网站保留 HttpOnly/Secure/SameSite Cookie 和 CSRF 校验；原生端使用 32 字节随机会话令牌并存入系统安全存储，数据库只保存令牌 SHA-256 摘要。原生端与网页 Cookie 同时存在时，以显式 Bearer 身份为准，退出原生端不会退出其他网页账号。

- 支持邮箱与密码登录；旧密码仍可登录，新注册密码要求 8～128 位。
- QQ、GitHub、Google 的登录与已登录用户主动绑定已实现。未设置 Client ID/Secret 的平台显示“待开通”。不依据邮箱相同自动合并账号；已有账号应先用密码登录，再从“账号安全”绑定。
- 手机号注册、手机号密码登录与短信验证码登录已实现；验证码 2.0 仅用于人机验证。号码认证短信签名、模板、RAM 权限未配置时，短信入口保持“待开通”，不放行未验证手机号。邮件验证码支持注册、绑定、身份复核与密码重置。
- 账号登录不等于余额配置云同步。现有 API Key、订阅链接、手动余额仍保留本机，本次不会自动上传。

## 配置阿里云验证码 2.0

1. 在 [验证码 2.0 控制台](https://yundun.console.aliyun.com/?p=captcha) 开通服务，在概览获取身份标 `prefix`。
2. 创建 **Web/H5、V3 架构**场景，记录 SceneId 和地域 cn（上海）或 sgp（新加坡）。本方案的软件验证码运行在系统浏览器里的 yuashie.cn 登录页，不嵌入 App WebView。
3. 将以下配置写入服务器 `server/.env`，不要提交真实值：`ALIYUN_CAPTCHA_ENABLED=true`、`ALIYUN_CAPTCHA_SCENE_ID`、`ALIYUN_CAPTCHA_PREFIX`、`ALIYUN_CAPTCHA_REGION`、凭据配置。ECS 推荐绑定 RAM 角色，并设置 `ALIBABA_CLOUD_CREDENTIALS_TYPE=ecs_ram_role`、`ALIBABA_CLOUD_ECS_METADATA=YuashieAuthRole`。Credentials SDK 使用 IMDSv2 获取并刷新临时凭据，无需长期 AccessKey。非 ECS 环境可使用专用 RAM 用户的环境变量凭据，勿使用主账号密钥。
4. 前端动态加载官方 SDK，服务端调用 `VerifyIntelligentCaptcha` 并检查 `Code=Success` 与 `Result.VerifyResult=true`。已要求验证但配置不全、SDK失败、服务端验证异常时均不放行注册和密码登录。未开始启用时保留原有邮箱密码流程。
5. 重启 API；检查 `/api/auth/config` 中 `captchaRequired`、`captchaConfigured` 及公开场景信息。此接口不返回密钥。

官方文档：[产品说明](https://help.aliyun.com/zh/captcha/captcha2-0/product-overview/what-is-alibaba-cloud-captcha-2)、[Web/H5 V3](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/new-architecture-for-web-and-h5-client-access)、[服务端验签](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/server-access)。

## 邮箱验证码与密码重置

配置 `ALIYUN_MAIL_ENABLED=true`、`ALIYUN_MAIL_FROM=verify@auth.yuashie.com`。发信地址须在杭州地域的阿里云邮件推送中验证为正常状态，使用 `SingleSendMail` 触发邮件，直接指定收件邮箱，无需建立收件人列表。正文位于 `server/templates/verification.html`，模板变量仅由服务端替换。

ECS 角色最小策略包含 `dm:SingleSendMail` 和 `yundun-afs:VerifyCaptcha`，资源为 `*`；不需要 AdministratorAccess。验证码 2.0 的权限动作名与 API 名不同，不应写成 `yundun-afs:VerifyIntelligentCaptcha`。

发送邮件前须完成人机验证。邮箱验证码为随机 6 位，5 分钟有效，绑定邮箱、用途和 challenge ID，数据库只存 HMAC 摘要。单码最多尝试 5 次；新码使旧码失效；服务端限制邮箱 60 秒一次、每天 10 次，IP 每天 30 次，另外限制短时请求。发送失败仍计入额度，避免反复请求发送服务。

注册必须验证邮箱；旧用户可在“账号安全”验证当前邮箱。找回页验证邮箱后设置新密码，统一账号的网页与 App 会话、待领取的 App 登录授权全部失效，需要重新登录。找回操作对未注册邮箱返回相同结果，不创建账号。密码继续使用 Argon2id。

发布验证包括 ECS 临时凭据获取、无效 CAPTCHA 令牌的拒绝、邮件服务接受一次指定地址的测试邮件，以及隔离数据库中的注册/过期/错误次数/用途绑定/单次使用/会话撤销测试。邮件 API 接受不代表已投递到收件箱；真实人机验证和收件需另行实际验收。

参考：[RAM 凭据最佳实践](https://help.aliyun.com/zh/ram/use-cases/best-practices-for-using-access-credentials-to-access-alibaba-cloud-openapi)、[验证码 RAM 授权](https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/authorize-a-ram-user-to-access-alibaba-cloud-captcha)。

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
2. 使用具备完整发布权限的路径备份服务器 `src`、`sql`、`package.json`、`package-lock.json`、`templates` 与当前前端，保留 `.env`、数据库及 user-content。新增依赖必须在服务端 `npm ci --omit=dev`。
3. 按顺序执行 SQL 迁移，包含 `007_unified_accounts.sql`、`008_email_verification.sql` 与 `009_account_methods.sql`（可重复执行），再发布 API、重启 yuashie-api 并检查 `/api/health`、`/api/auth/config`。未完成 API/数据库发布前不能单独发布本次前端。
4. API健康后再切换前端，核对 `deploy-version.json` 与确切 Git 提交。正常工作流前端范围检查不应被绕过。
5. 定期删除 `auth_email_challenges`、`auth_phone_challenges`、`auth_oauth_states`、`auth_app_requests` 中 `expires_at<NOW()` 的记录；日志不记录授权回调 query、密码、验证码参数或令牌。
6. 真实注册/重置/第三方授权涉及用户身份与外部服务，本次自动测试使用隔离数据库、模拟身份与验证码，不替代真实配置及设备验收。旧 API 不认识无邮箱/无密码的 OAuth-only 账号，回滚时需保留本次统一身份支持。


## 0.9.1 登录方式管理与短信

本人主页及 `/auth/security` 显示同一账号 ID、邮箱/手机号验证状态、密码和 QQ/GitHub/Google 绑定状态。只有本人可读取联系方式。管理前须用当前密码、已验证联系方式的验证码，或已绑定第三方重新授权；授权保留 10 分钟，以 HttpOnly/Secure/SameSite Cookie 绑定当前会话。授权不能跨账号或会话复用。

绑定邮箱/手机号还需验证新地址；更换需先解绑旧地址。第三方绑定不按同名、同邮箱合并账户，已属于其他账号的身份返回冲突。每个账号、每个平台最多绑定一个身份。绑定/解绑在账号行锁下串行执行；解绑后必须仍有一种已配置、可用的登录路径。修改绑定或密码会撤销其他会话、待确认的应用授权和第三方绑定请求，保留当前会话及账号数据。移除密码后，可通过已绑定手机号的短信或已配置第三方登录；邮箱本身不是免密登录入口。

短信使用「号码认证服务 → 短信认证」PNVS，与普通国内短信 SendSms 产品分开。配置 `ALIYUN_PNVS_ENABLED=true`、`ALIYUN_PNVS_SIGN_NAME`、`ALIYUN_PNVS_TEMPLATE_CODE`，选择控制台系统赠送签名及对应赠送验证码模板（编号可为数字，无需 SMS_ 前缀）。模板使用 `${code}` 与 `${min}`。默认注册/登录模板为 `100001`，绑定新手机号为 `100004`，验证已绑定手机号为 `100005`；后两者可用 `ALIYUN_PNVS_BIND_TEMPLATE_CODE` 与 `ALIYUN_PNVS_VERIFY_TEMPLATE_CODE` 覆盖。可选 `ALIYUN_PNVS_SCHEME_NAME`，不填使用默认方案；发码时记录方案并在核验时使用同一方案。现有 ECS 角色须有 `dypns:SendSmsVerifyCode` 与 `dypns:CheckSmsVerifyCode`，不新增长期密钥。验证码 2.0 保留为人机验证。

服务端调用 [SendSmsVerifyCode](https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode/) 由阿里云生成 6 位数字验证码，5 分钟有效，60 秒发送间隔，覆盖旧码。验证码只返回后端供 HMAC 保存，不返回浏览器或记录到日志。收到用户输入后，先核对本地挑战的账号、用途、号码、有效期、最多 5 次尝试和 HMAC，再调用 [CheckSmsVerifyCode](https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-checksmsverifycode)；要求 `Code=OK`、`Success=true` 且 `Model.VerifyResult=PASS`，接口成功本身不能视作验证码通过。数据库成功消耗后不可重放，其他用途的码不能复用。

每手机号每天最多 10 次，每 IP 每天最多 30 次，失败发送也计入限额。开启验证码 2.0 时，发码须先验签。短信登录只登录已注册/绑定账号，不自动创建新账号。短信密码找回暂不提供，可用短信登录后在账号安全内修改密码。

上线时必须同时发布 API、迁移与前端。自动测试通过隔离 PostgreSQL 与模拟短信/OAuth 覆盖同账号登录、错误/过期/重放验证码、跨账号冲突、身份复核、会话撤销与最后方式保护；短信及第三方真实验收待对应服务完成配置。
