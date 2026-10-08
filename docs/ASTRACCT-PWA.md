# 星账 Astracct · iOS PWA

独立访问入口：`https://yuashie.cn/astracct/`（生产部署成功后生效）。

## 安装与分发

从个人网站 `/projects/001/download` 检测 iPhone/iPad（含桌面 UA 的 iPad），自动选择 iOS。用户点击「安装 iOS 网页版」跳转 `/astracct/?install=1`，显示安装指引。iOS 不支持网页主动触发原生安装弹窗，用户必须在浏览器分享菜单选择「添加到主屏幕」，确认「作为网页 App 打开」和「添加」。已作为 standalone 运行时不再显示安装按钮。其他平台下载安装流程不变。

独立的 `public/astracct/` 目录由 Vite 原样复制到站点 `dist/astracct/`，与网站 Vue 根应用分离。PWA manifest 的 id/start_url/scope 均固定在 `/astracct/`；service worker 仅控制此路径，离线缓存 HTML/CSS/JS/图标，不缓存网站其他页面、用户凭据或 API 响应。

## 首版功能 / 限制

- 浅色响应式页面；按 AI 订阅、云服务器、节点订阅分类维护本机余额数值；支持增改删、金额遮挡和 JSON 备份导入导出。
- 数据仅以本机浏览器 localStorage 保存，不自动跨设备同步。清除站点存储或卸载 PWA 可能导致数据丢失。
- **这是手动记录版，不是 Flutter Android / 桌面客户端的功能等价替代品。** 不查询第三方 API、不会自动刷新余额、没有原生系统小组件，也没有统一登录与同步功能。
- 请勿在账户名称或备注中保存 API Key、云服务密钥、订阅口令等秘密。PWA 没有为秘密设计安全凭据存储；以后若接入自动查询，应由经过鉴权的服务端代理执行，不能将长期 API 密钥保存在前端代码或 localStorage 中。
- 使用 HTTPS、iPhone/iPad Safari 实机检查安装，首次联网后断网启动、删除/导入恢复、隐私遮挡、各种屏幕尺寸；CI 和源码检查不能代替设备实测。

## 测试

`npm test` 覆盖 iOS 检测/下载入口、manifest、离线资源范围和 192/512 PNG 资源签名。静态资源由 `npm run build` 复制到 dist。首次上线后在 iOS 真机验证安装及离线运行。

## 发布

本项目 `Netweb` 的 `main` 前端变更自动触发 `.github/workflows/deploy-web.yml`，已有安全部署流程验证当前提交并写入 `deploy-version.json`。若 GitHub Actions 失败或生产版本号未更新，不能将页面视为已上线。
