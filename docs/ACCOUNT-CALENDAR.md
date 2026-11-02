# 账号日历

登录后首次保存创建账号默认日历；后续修改自动 PUT 同一记录，公开只读随机令牌 URL 不变。GET mine 跨设备恢复选择。清空选择输出有效空日历，不生成新的链接。另建日历需要独立确认，POST new 还要求 confirmNew=true、当前默认 ID 和修订号；旧日历仍有效，新日历成为默认。

所有写入复用网站登录、Origin、CSRF 防护，并核对 X-Calendar-User。账号行锁与唯一默认索引避免并发创建多个默认日历；乐观修订号拒绝旧页面覆盖。前端串行保存，账号变化或冲突后暂停写入并要求重新载入。订阅客户端通过随机 256-bit 只读 URL 获取数据，不要求登录；响应 private/no-cache。不要公开分享订阅链接。账号修改提升 VEVENT SEQUENCE，保留事件 UID；源故障返回 503，不清空订阅。

部署先事务执行新增幂等迁移 server/sql/013_calendar_subscriptions.sql，再协调更新 index.js、calendar-feed.js、selection-feed.js 和 account-calendar.js。不修改旧订阅接口；历史匿名 s= 链接没有账号归属，不能安全地认领或改写。旧用户需一次性添加账号链接，之后无需更换。日历应用按自身刷新周期同步，不能由网页强制立即刷新。

验证：npm test；node --test server/tests/account-calendar.test.mjs server/tests/cloud-sync.test.mjs server/tests/calendar-feed.test.mjs server/tests/selection-feed.test.mjs。浏览器通过本地临时数据库验证创建、自动保存、重载恢复与取消另建，不修改真实用户日历。
