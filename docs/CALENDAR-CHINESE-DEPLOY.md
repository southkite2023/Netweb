# 中文动态合并日历 API v2：生产升级步骤

## 当前生产与兼容性

已上线的 v1 API（`server/src/calendar-feed.js`）仍应保留：默认或缺省 `lang` 继续返回日文，与现有 Mac Apple Calendar 订阅兼容。v2 增加严格可选的 `lang=zh-CN`，仅从固定 GitHub Pages 域名读取 `span.zh-CN.ics` 或 `start.zh-CN.ics`。缓存按 `mode:lang` 隔离，不接受任意上游 URL，现有 UID/SEQUENCE/STATUS 均不重建。

本次后端**只需替换一个文件** `/var/www/yuashie-app/server/src/calendar-feed.js`，不需要重写 `index.js`、安装依赖或迁移数据库。原先受限的 GitHub 前端发布密钥不能完成重启。

在升级前确认 [中文静态 ICS](https://southkite2023.github.io/yuashie-calendar/calendar/real/v1/anime/span.zh-CN.ics) 已成功由真实数据工作流部署。以固定 GitHub 提交 SHA 下载 v2 源码，不要以可变分支链接作为生产发布依据。

## ECS 可信控制台更新（管理员操作）

只在已核对的 ECS 实例上执行。按现有服务名 `yuashie-api.service` 和目录 `/var/www/yuashie-app/server` 操作；无须发送 .env、SSH 私钥或数据库口令。

```bash
sudo bash <<'SH'
set -Eeuo pipefail
SERVICE=yuashie-api.service
ROOT=/var/www/yuashie-app/server
SRC="$ROOT/src/calendar-feed.js"
OLD_REV=78b92b341fc921c7236d158767acb65ce348f509
NEW_REV=e6872b82d49f975585ae6535fdfa9d51b6c103dc
BASE=https://raw.githubusercontent.com/southkite2023/Netweb
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

systemctl is-active --quiet "$SERVICE"
test -f "$SRC"
curl -fsSL --retry 2 --max-time 30 "$BASE/$OLD_REV/server/src/calendar-feed.js" -o "$TMP/old"
curl -fsSL --retry 2 --max-time 30 "$BASE/$NEW_REV/server/src/calendar-feed.js" -o "$TMP/new.mjs"
# Refuse to overwrite a locally modified backend.
cmp -s "$SRC" "$TMP/old" || { echo "现有 API 与预期 v1 不一致，已停止。"; exit 1; }
node --check "$TMP/new.mjs"

BACKUP=/var/www/yuashie-app/backups/calendar-api-zh-v2-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 0700 "$BACKUP"
cp -p "$SRC" "$BACKUP/calendar-feed.js"
rollback() {
  trap - ERR INT TERM
  cp -p "$BACKUP/calendar-feed.js" "$SRC"
  systemctl restart "$SERVICE" || true
  echo "已尝试恢复此前 API 版本；请检查服务状态。"
  exit 1
}
trap rollback ERR INT TERM

install -o www-data -g www-data -m 0644 "$TMP/new.mjs" "$SRC"
systemctl restart "$SERVICE"
systemctl is-active --quiet "$SERVICE"

curl -fsS --retry 3 --retry-delay 2 --max-time 20 \
  'https://yuashie.cn/api/calendar/v1/health' -o "$TMP/health.json"
python3 - "$TMP/health.json" <<'PY'
import json, sys
data=json.load(open(sys.argv[1]))
assert data.get('ok') is True
assert data.get('version') == 2
assert data.get('languages') == ['ja','zh-CN']
print('双语 API v2 健康检查通过')
PY

curl -fsS --retry 3 --retry-delay 2 --max-time 35 \
  -D "$TMP/headers" -o "$TMP/zh.ics" \
  'https://yuashie.cn/api/calendar/v1/anime.ics?shows=165159&mode=span&lang=zh-CN'
grep -qi '^content-type: text/calendar' "$TMP/headers"
grep -q '^BEGIN:VCALENDAR' "$TMP/zh.ics"
grep -q '^BEGIN:VEVENT' "$TMP/zh.ics"
grep -q '^END:VCALENDAR' "$TMP/zh.ics"
grep -q '^URL:https://anilist.co/anime/165159' "$TMP/zh.ics"

# Existing no-lang URL must still be valid.
curl -fsS --retry 3 --retry-delay 2 --max-time 35 \
  'https://yuashie.cn/api/calendar/v1/anime.ics?shows=165159&mode=span' \
  -o "$TMP/ja.ics"
grep -q '^BEGIN:VCALENDAR' "$TMP/ja.ics"

trap - ERR INT TERM
echo "中文动态 ICS 接口 v2 发布并验证成功。备份：$BACKUP"
SH
```

重要：`curl --retry` 在服务刚重启时可能显示一次 502，但只要最终退出状态为 0 且所有检查均通过，说明接口恢复。不要把一次中间 502 当成整个流程一定失败；若最终验证失败，脚本会尝试恢复原文件。正式系统完全恢复还应检查 `systemctl status yuashie-api.service`。

## API 用法

- 日文（既有 URL）：`/api/calendar/v1/anime.ics?shows=165159,206401&mode=span`
- 中文（新增）：`/api/calendar/v1/anime.ics?shows=165159,206401&mode=span&lang=zh-CN`
- 仅当天显示：`mode=start`。
- 健康检查：`/api/calendar/v1/health`，v2 返回 `languages: ["ja","zh-CN"]`。

前端会读取健康接口并仅在 v2 可用时开放中文合并链接。中文 ICS 的 **播出时间仍是 AniList 的日本首播预告，不代表中国视频平台上架时间**；对无法核实的中文译名，保持日文原名。中文名称来自社区 Bangumi 时必须标示社区来源。中文标题变化可能导致客户端下次刷新时改变 SUMMARY，不改变 UID。

部署成功后保留 GitHub PR #13 的源代码对齐更新；合并不应通过前端自动发布密钥更新后端进程。
