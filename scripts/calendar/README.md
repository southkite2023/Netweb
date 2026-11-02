# 游戏 Wiki 日程维护

游戏事件只从 `public/assets/calendar/data/wiki-sources.json` 中列出的游戏 Wiki 核验，不使用媒体回填。候选 Wiki 首页不代表已找到排期，也没有流量证据证明它是客观“最大”。国服和国际服独立；403、不完整模板和旧表不代表游戏无活动。

目前五个经过表格校验的卡池适配器：原神、星穹铁道、绝区零、Mooncell FGO（只选国服表）、无期迷途。更新后才开启但没有具体钟点时，不猜开服时间，只输出结束提醒；已知开启日期则输出全天开启加精确结束提醒。前瞻、版本及其他游戏暂为人工核验，监测器只标记 Wiki 内容变化，不把页面任意日期直接写进日历。

运行 `python3 scripts/calendar/wiki_sync.py --data-dir dist/assets/calendar/data --state-dir calendar-state`。原子写入 `calendar-state/wiki-state.json`；API 每次读取，链接不变。固定源白名单、12秒超时、4MB上限、成功请求间隔2秒。抓取/解析失败保留历史有效条目；失踪行也保留，需人工核对真实取消，不能把临时空表当成全部取消。重试成功会清除错误。自动发现以所配置Wiki页面为界，新版本跨页面须更新注册表。

服务 `deploy/calendar/yuashie-calendar-wiki.service` 与 timer 以 www-data 运行，每5分钟检查；状态目录和前端 dist 分离。监测变化不等于自动解析，网页分别展示。Wiki 本身更新延迟与日历客户端刷新周期无法由本站保证。

测试：`python3 -m unittest discover -s scripts/calendar -p 'test_*.py'`；后端 `node --test server/tests/selection-feed.test.mjs server/tests/wiki-data.test.mjs`。
