# Yuashie Calendar：动态合并 ICS API 上线手册

## 功能与 URL

这是一项 **后端代码** 变更，使用现有 Fastify 服务（`server/src/index.js`）暴露：

- `GET /api/calendar/v1/health`：无凭据、只读、返回版本信息，可用于前端能力检测。
- `GET /api/calendar/v1/anime.ics?shows=206401,123456&mode=span`：按 AniList media ID 汇总所选作品，支持 `mode=start`（全天开始日）和 `mode=span`（精确播出时间）。
- 一个排序后的 `shows` 列表与显示模式对应一条稳定 URL；用户在日历客户端订阅后，无需再逐部添加。用户若在网页重新勾选不同作品，必须生成新的 URL，旧的订阅内容不会自动变化。

后端只读取固定的可信 GitHub Pages 源：`https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/{mode}.ics`。**不接受上游 URL 参数**，不创建用户账户、不收集观看清单、不写数据库。限制最多 80 部作品、输入长度、上游响应尺寸和超时，缓存五分钟，上游短期故障保留六小时内已验证的缓存；没有可用源时返回 **503**，而不是清空订阅。保留 VEVENT 的 UID/SEQUENCE/STATUS/DTSTART/DTEND 等原始属性，支持改期和取消。

前端 `/projects/004/subscribe#anime-season-picker` 只在 `/api/calendar/v1/health` 确认部署完成后显示“复制合并订阅 URL”，否则继续显示单番 ICS 备选方案，避免错误宣称已经上线。

## 为什么不能使用现有 GitHub 前端发布密钥

Netweb 的 `.github/workflows/deploy-web.yml`、`scripts/github-upload-frontend.sh` 与服务器上的 `receive-github-frontend.py` 明确禁止后端文件、数据库、Nginx 与 shell 操作，`check-frontend-scope.py` 会在前端发生与后端一起改动时阻止自动发布。

**不得**修改专用受限 SSH 授权、关闭检查、伪造 `deploy-version.json`，或使用这把密钥重启后端。后端必须走用户原有的、可备份与回滚的完整发布流程。

## 上线前必须在 ECS 控制台核验

在用户本人通过阿里云 ECS 可信控制台连接服务器后，先运行以下 **只读检查**，将输出用于确认真实运行目录和 service 名称：

```bash
sudo systemctl list-units --type=service --all | grep -Ei 'yuashie|node|api'
sudo nginx -T 2>/dev/null | grep -n -A 12 -B 5 'location /api'
sudo ls -ld /var/www/yuashie-app /var/www/yuashie-app/server
sudo test -f /var/www/yuashie-app/server/src/index.js && echo "Backend source exists"
```

*不要将 .env、部署 SSH 私钥、数据库连接字符串或其他 Secrets 发给助手。*

拿到实际 service 名称与部署位置后，备份现有 `server/src/index.js` 和 `server/src`，仅在 **被核对的路径** 更新本分支新增的 `server/src/calendar-feed.js` 及变更后的 `server/src/index.js`；因为没有新增 npm 依赖或数据库迁移，部署只涉及这些代码。先用 `node --check` 检查两个文件，再通过原有安全发布方式重启已确认的 API service。避免全量覆盖服务器的 `.env`、数据库、头像、日志或私有文件。

部署后核验：

```bash
curl -fsS https://yuashie.cn/api/calendar/v1/health
curl -fsS -D /tmp/yuashie-calendar-headers.txt -o /tmp/yuashie-calendar-test.ics \
  'https://yuashie.cn/api/calendar/v1/anime.ics?shows=206401&mode=span'
head -c 100 /tmp/yuashie-calendar-test.ics
grep -i '^content-type:' /tmp/yuashie-calendar-headers.txt
```

要求：健康接口 JSON 的 `service` 为 `anime-ics-selection`，ICS 应返回 HTTP 200、`Content-Type: text/calendar; charset=utf-8`，并包含 `BEGIN:VCALENDAR` / `VERSION:2.0` 和所选作品的事件；无效参数必须返回 400；数据源不可用时返回 503（不能伪造内容）。

最后核对主站在完整后端发布后能够显示“合并订阅 URL”。如果现有前端发布范围检查阻止上线，应该根据完整服务部署实际完成的提交与站点版本协调前端发版；不得删除检查来强行触发。Apple Calendar 实机通过 URL 订阅验证后，才能将此阶段标记为已验收。

## 回滚

如健康检查不通过、API 进程无法启动或 ICS 数据不正确，请通过原有完整回滚流程还原**已备份的**后端源码版本并重启原服务，保留原有前端静态发布和 GitHub Pages 单番 ICS；订阅生成器的单番备选功能不依赖该动态 API。后端发布属于服务器配置写操作，须在可信控制台确认现有环境后执行。

## 测试

- 在仓库根目录运行 `npm ci --prefix server --no-audit --no-fund`。
- 运行 `npm run test:server` 与 `npm test`，执行真实 HTTP 解析和负面测试。
- GitHub PR 校验工作流还会构建 Vue 前端并运行 server 及现有边界测试。

**状态：仅当用户 ECS 后端实际升级并通过线上 GET + Apple/Google 日历测试后，才标记“已部署”。PR 测试绿色不等于服务器运行了新代码。**
