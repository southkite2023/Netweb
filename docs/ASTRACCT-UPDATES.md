# Astracct 服务器分发与应用更新

yuashie.cn 的 `/downloads/astracct/latest.json` 是网站和原生应用共同读取的公开测试渠道清单。Android、Windows、macOS 分别选择真实存在的最新包，包含文件大小和 SHA-256。每个版本的安装包独立存储于 `/var/www/astracct-downloads/vX.Y.Z/`，不放在网页 `dist` 中，前端部署不会删除下载文件。

`ops/astracct-downloads/sync.py` 只读取 southkite2023/quota-hub 公开 Releases（包含公开测试版），匹配固定文件名、标签版本、GitHub 提供的 SHA-256 和大小。下载使用官方 release asset API；用户下载不再经过 GitHub。全部平台下载及校验成功后原子替换清单；失败保留原清单，不覆盖既有版本文件。旧版本保留以支持复核和回退。不要把同版本旧包改名冒充新版。

服务器使用独立 `astracct-mirror` 系统用户；systemd timer 每 15 分钟同步。同步服务仅可写下载目录，无 GitHub token、SSH 密钥或数据库权限。脚本和服务单元由 root 管理。服务超过 15 分钟终止，失败可在 `journalctl -u astracct-mirror` 查看；未进入清单的临时文件不可供下载。

`nginx.conf` 片段应加入现有 yuashie.cn 的 HTTPS server，保留原 API 及用户上传路由。版本清单禁止缓存，安装包按不可变版本长缓存，支持 Nginx 原生 Range 请求。安装包只允许固定版本目录的 APK/ZIP。网页首页和 PWA worker 要重新验证。每次变更先备份原配置并执行 `nginx -t`，通过后 reload；失败恢复原配置。

网页启动、返回前台和联网时检查清单；前台每分钟复查。不可用时准确提示显示上次已核验安装包，并保留 GitHub 备用下载。iOS PWA 对页面脚本和样式联网重新验证，离线仍使用缓存；设置提供重新载入入口，更新不清除本机账户记录。

原生应用的更新入口从 1.3.0+17 开始提供（Android / Windows / macOS 1.3.0+17 测试版已公开，发布状态以公开清单为准）。Android 需系统确认安装，Windows/macOS 需应用目录可写并退出后替换。Linux 暂无公开包，iOS 提供 PWA；不能据此宣称已有 Linux 或原生 iOS 自动安装。

## 3.0.0 发布（2026-10-28）

Android 四种固定签名 APK、Windows x64 ZIP、Mac Universal ZIP 与拖拽 DMG 已公开。镜像同时验证七个安装包，latest.json 仍只包含四种 APK 和两个 ZIP，保持旧版应用更新清单兼容；DMG 不进入应用内更新清单。Nginx 额外允许固定版本目录的 DMG 下载，权限与缓存规则保持一致。网站 DMG 入口使用已核验附件元数据，只有与当前 Mac ZIP 相同版本时展示，避免推测不存在的文件名。

iOS PWA 同步圆角卡片、宽屏侧栏/窄屏底部导航、跟随系统或手动浅深色；保留原有记录、金额隐藏与导入导出键，不增加 API 密钥采集功能。源码与原生验证：https://github.com/southkite2023/quota-hub/actions/runs/40619471193；发布校验：https://github.com/southkite2023/quota-hub/actions/runs/40620155689。

2026-10-28 下载入口调整：官网选择 macOS 后，主下载按钮及 GitHub 备用入口直接下载已核验的 Universal DMG，包名、23.32 MB 大小及拖拽安装说明同步展示。ZIP 保留为独立备用入口，应用内更新清单继续使用 ZIP。

镜像清单现额外提供顶层 `installers` 字段用于网页发现对应版本的 DMG；`packages` 仍只包含 APK/ZIP，旧版应用内更新不受影响。网页先验证 DMG 的版本、同源路径、大小与 SHA-256，再更新主按钮，避免自动发现新版时退回 ZIP。

## 3.1.0 发布（2026-10-28）

固定导航、完整余额明细和行内菜单栏勾选已通过原生构建与发布校验，公开标签 v3.1.0。官网下载信息按实际附件大小及 SHA-256 更新，Mac 主按钮继续直下 DMG，ZIP 用于备用及应用内更新；iOS PWA 同步“仪表盘”名称并更新离线壳缓存版本。

## 3.2.0 发布（2026-10-29）

后台收起、统一下拉圆角与账号参数云存储测试版。源码 823812e0ee46cf3afb8edbbc4d3e268be9ec6dcc；原生运行 40794771306、客户端 40794771245、服务端 40794771302 和发布验证 40795411592 全部通过。云端模块已在账号 API 部署，参数按账号加密保存在 PostgreSQL 的 astracct_parameters 表；预留后续自动填充接口。iOS PWA 保留手动记录模式并刷新离线壳缓存；不收集 API 凭据。
