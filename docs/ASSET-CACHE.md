# 图片与 Live2D 缓存（2026-10-14）

## 本次行为

按照网站所有者的最新要求：看板娘默认隐藏，组件挂载时提前下载、初始化；点击「召唤看板娘」才显示。隐藏后停止动画，再召唤复用当前模型。页面刷新后优先使用本地缓存，重新创建 WebGL 实例。

- 五张主要图片使用 WebP，首页主图最大宽度 1600，项目封面最大宽度 1280；原始素材保留在源码中供后续编辑，构建不引用它们。
- 首页主图保持高优先级加载；项目列表、首页下方卡片、备案图标、评论头像与 QSL 图片使用浏览器原生懒加载。用户图片只懒加载，不进入 Service Worker 缓存。
- Vite 构建为源代码中的图片生成内容哈希文件名。公开网站图标、Live2D 模型及运行库生成 `/assets/cached/…/<内容哈希>/…` 地址。模型设置的相对路径保持有效；修改模型、动作、纹理、物理配置等任一文件均会产生新的模型版本目录。
- 根目录只注册一个 `/sw.js`，生产环境 HTTPS 才注册，`updateViaCache: none`。首次渲染最多等待 500ms 让缓存接管；不可用时继续正常 HTTP 加载，不阻塞页面。开发环境不注册 SW。
- 新 SW 不预下载任何图片或模型，只缓存页面正常请求。公开资源采用 cache-first，30 天硬过期，缓存写入串行执行；图片最多 128 项 / 32 MiB，Live2D 最多 64 项 / 64 MiB，总计最多 96 MiB。激活和每次写入都会清理过期资源，激活时还清理已删除的旧版本。
- 严格使用构建生成的公开资源 URL 白名单：不处理 HTML、登录、动态 API、用户上传、带查询参数或 Authorization/Range 的请求、跨域请求。静态资源下载不附带登录凭据；不保存 private/no-store、错误或 HTML 回退响应。
- `/assets/astracct/` 的现有独立 PWA 和窄范围 SW 保留，根 SW 不缓存其文件，也不清理 `astracct-shell-*` 缓存。
- 兼容现代 Windows/macOS/Android/iOS 浏览器的原生 SW、Cache API 和 WebP。缺少 SW 或缓存存储被禁用时回退在线加载；缺少 DecompressionStream 时沿用原始 `.moc3`。浏览器可能因配额、隐私模式或长时间未使用而自动清理本地缓存，之后会重新下载。

## 服务器 HTTP 缓存配置

现有 Nginx 返回 ETag / Last-Modified，浏览器可条件请求；当前未明确设置长缓存。SW 缓存上线即可工作。要获得完整的浏览器磁盘缓存优化，应在 **现有 HTTPS server 块中** 添加以下规则，然后运行 `nginx -t`，成功后 reload。不要覆盖 API 代理、认证、user-content 路由或整个站点配置。前端 GitHub 自动部署不能修改 Nginx，这一步需要服务器管理员执行。

```nginx
# 更新入口必须及时检查。真实文件缺失时不能回退成 HTML。
location = /sw.js {
    try_files $uri =404;
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
location = /index.html {
    try_files $uri =404;
    add_header Cache-Control "no-cache" always;
}
location = /deploy-version.json {
    try_files $uri =404;
    add_header Cache-Control "no-cache" always;
}
# 这些路径由内容哈希决定，资源更新必定换 URL。
location ^~ /assets/cached/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location ~* ^/assets/[^/]+-[A-Za-z0-9_-]{8}\.(webp|avif|png|jpg|jpeg|gif|svg|ico|js|css)$ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

这些 location 沿用站点现有 `root`，要求它指向发布后的 `dist`。若原有 `location ^~ /assets/`，应在其中整合上述版本化资源规则；否则它会阻止正则匹配。保留或继承现有安全响应头，Nginx 子 location 中添加 add_header 会改变响应头继承规则。确认 MIME 配置含 JavaScript、JSON、WebP；`.moc3` 可使用 application/octet-stream，压缩导出使用 application/gzip 或 application/octet-stream。

没有增加后端或数据库变更；无需更换部署密钥或放宽前端接收器。所有新资源仍位于既有允许的 assets/ 目录，sw.js 为根静态文件。

## 验证与排障

1. 执行 `npm ci --no-audit --no-fund`、`npm run build`、`npm test` 和现有 Python 部署边界测试。
2. 用全新浏览器存储访问首页：页面有召唤按钮，看板娘隐藏；网络会提前加载压缩模型、纹理、动作、物理配置、表情和本地运行库。这符合所有者最新要求。
3. 等预加载完成后召唤、点击互动、隐藏再召唤：不应重新下载模型。刷新后模型和已显示的图片应从 SW 读取；Network 面板显示 ServiceWorker 的响应可能来自缓存或网络，必须结合服务器请求或 worker 上游请求确认实际命中。
4. 图片未滚动到可视区附近时不下载；模型更新发布后 URL 中的哈希改变，下一次刷新加载新版本。SW 不强制刷新打开的页面，避免丢失表单输入；已打开页面中的模型会在刷新后更新。
5. 检查 Application / Cache Storage：仅含上述公开资源；没有 /api/、user-content、账号信息。嵌套 Astracct PWA 仍有自己的作用域。
6. 验证 `/sw.js` 的 Content-Type 为 JavaScript，`/assets/cached/...` 不返回 SPA HTML。Nginx 配置后用响应头检查 immutable 和 no-cache 是否实际生效。

如果需停用根资源缓存，可通过发布一个清理 `yuashie-assets-*` 并 unregister 的 SW 完成；不要清空全站存储，否则会影响用户本地偏好、收藏和 Astracct 数据。
