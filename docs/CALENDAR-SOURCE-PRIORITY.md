# 项目004日期来源

2026-11-03 用户指定 https://www.gameg.site/ 为首选，替代之前的 Wiki-only 和刚提出的 BannerHistory-first 方向。它是社区维护时间表，不标为官方站点。当前34款游戏中11款与它的国服条目严格对应；二重螺旋现订阅国际服，不套用它的国服数据。未覆盖的游戏/类型沿用各自Wiki；BannerHistory保留为卡池候选备选，尚未启用自动解析。

来源映射、逐类核查结果和链接保存在 `public/assets/calendar/data/wiki-sources.json`。`gameg_source.py` 支持网站 timeline-data JSON 与站点公开链接的 GitHub YAML 数据。服务器访问站点返回403，自动同步读取该公开仓库，按提交缓存，仅变化时下载；使用服务器已安装的 python3-yaml safe_load，不绕过网站限制；原公告链接随事件保留。仅 timeCertainty 中 confirmed 的端点进入订阅。卡池只确认结束时，仅生成结束提醒；版本结束绝不自动转换为下一版本开始。维护记录明确标为维护，不推算开服。未知/推算/预计时间在页面说明，不能写成“官方没公布”。历史已确认记录不代表下一期。

现有五分钟 timer 调用 wiki_sync.py，先读取一次 GameG，然后处理未覆盖的 Wiki；GameG已覆盖类别整体替换，避免旧Wiki数据再次合并。读取/解析失败保留最后有效记录，不降级覆盖。稳定来源ID保持订阅事件ID；改期增加revision。未适配的Wiki仅监测变化。

后端部署需将 gameg_source.py 与 wiki_sync.py 一起发布；静态数据发布后运行现有同步服务，并核对状态接口里的 source=GameG、source_reviews、source_types。前端只读取已存快照/状态，不在用户浏览器抓取来源站。

2026-11-03 展示纠正：来源已列日期与订阅可确认日期分开。网页显示GameG全部165条来源记录（含历史），逐端点标注确认、推算、预计、来源未标确认，保留备注及公告；确认程度只决定订阅导出，不再隐藏页面日期。卡片按有日期记录的类型数排序，并明确标注含来源未确认。自动同步同样返回source_records。
