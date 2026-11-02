# 微信开放平台网站登录

本次增加微信扫码登录、绑定及解绑，沿用现有一次性 state、浏览器 Cookie 校验及账号管理验证。未配置凭据时入口显示待开通。

## 上线顺序
1. 在微信开放平台创建并审核通过网站应用，开通微信登录。授权回调域填 `yuashie.cn`；完整回调地址为 `https://yuashie.cn/api/auth/oauth/wechat/callback`。
2. 先在生产数据库执行 `server/sql/012_wechat_login.sql`，再部署后端代码。
3. 在服务器环境中设置 `OAUTH_WECHAT_CLIENT_ID`（AppID）、`OAUTH_WECHAT_CLIENT_SECRET`（AppSecret），确认既有公开站点 origin 配置为 `https://yuashie.cn`，重启后端。不要将密钥放入前端、提交记录或聊天。
4. 部署前端，验证扫码登录、新账号创建、已有账号绑定、重复绑定冲突、解绑最后一种登录方式被阻止及取消/重复回调失败。

账号使用网站应用下的 OpenID 识别，不根据昵称或 UnionID 自动合并账号。此实现用于网站扫码登录，不是公众号网页授权。

官方参考：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html

本地模拟测试不能代替已审核网站应用的真实扫码验收。
