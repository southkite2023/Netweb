export const projects = [
  {
    id: '001',
    title: {
      zh: 'AI 新闻简报',
      en: 'AI News Briefing',
      ja: 'AIニュースブリーフィング',
    },
    summary: {
      zh: '自动聚合科技、数码、游戏与 ACG 动态，并生成每日摘要。',
      en: 'A daily briefing that gathers and summarizes technology, gaming and ACG news.',
      ja: 'テクノロジー、ゲーム、ACGの話題を集約し、毎日要約するシステム。',
    },
    description: {
      zh: '一个持续迭代的个人信息助手：从多个来源抓取更新，清洗与去重后交给 AI 生成重点摘要，最后推送到常用协作工具。',
      en: 'An evolving personal information assistant that collects updates, removes duplicates, generates focused summaries with AI, and delivers them to the tools I use every day.',
      ja: '複数の情報源から更新を収集し、重複を除去したうえでAIが要点をまとめ、日常的に使うツールへ届ける個人情報アシスタントです。',
    },
    status: { zh: '持续迭代', en: 'In progress', ja: '継続開発中' },
    type: { zh: 'AI / 自动化', en: 'AI / Automation', ja: 'AI / 自動化' },
    year: '2026',
    image: new URL('../assets/projects/project-001.svg', import.meta.url).href,
  },
  {
    id: '002',
    title: {
      zh: '我的世界服务器',
      en: 'Minecraft Server',
      ja: 'Minecraft サーバー',
    },
    summary: {
      zh: 's205.singsi.cn:19854 · 纯净生存 · 版本 26.2',
      en: 's205.singsi.cn:19854 · Vanilla Survival · Version 26.2',
      ja: 's205.singsi.cn:19854 · バニラサバイバル · バージョン 26.2',
    },
    description: {
      zh: '一个专注原版玩法的纯净生存服务器。服务器地址：s205.singsi.cn:19854，版本：26.2。',
      en: 'A vanilla survival server focused on the original Minecraft experience. Server: s205.singsi.cn:19854. Version: 26.2.',
      ja: 'Minecraft本来の体験を楽しむバニラサバイバルサーバーです。サーバー：s205.singsi.cn:19854、バージョン：26.2。',
    },
    status: { zh: '纯净生存', en: 'Vanilla Survival', ja: 'バニラサバイバル' },
    type: { zh: '游戏服务器', en: 'Game server', ja: 'ゲームサーバー' },
    version: '26.2',
    year: '2026',
    image: new URL('../assets/projects/project-002.jpg', import.meta.url).href,
  },
  {
    id: '003',
    title: {
      zh: 'Yuashie Radio',
      en: 'Yuashie Radio',
      ja: 'Yuashie Radio',
    },
    summary: {
      zh: '业余无线电通联日志与电子 QSL 平台。',
      en: 'Amateur radio logbook and electronic QSL platform.',
      ja: 'アマチュア無線のQSOログ・電子QSLプラットフォーム。',
    },
    description: {
      zh: '绑定自己的呼号与 A / B / C 操作技术能力类别，建立 📻 无线电身份，保存完整 QSO 通联记录，上传自己的 QSL 设计，并与本站其他无线电爱好者交换电子 QSL 卡片。',
      en: 'Bind your callsign and A/B/C operator class, establish a 📻 radio identity, keep complete QSO records, upload your own QSL artwork, and exchange electronic QSL cards with other operators on Yuashie.',
      ja: 'コールサインとA/B/C操作クラスを登録して📻無線IDを作成し、QSO記録を保存、自作QSLをアップロードし、Yuashie内の他の無線家と電子QSLを交換できます。',
    },
    status: { zh: 'Beta 上线', en: 'Beta live', ja: 'Beta公開中' },
    type: { zh: '业余无线电 / Web 应用', en: 'Amateur Radio / Web App', ja: 'アマチュア無線 / Webアプリ' },
    version: '0.3.0',
    year: '2026',
    image: new URL('../assets/projects/project-003.jpg', import.meta.url).href,
  },
]

export function localizedField(project, field, locale) {
  return project[field]?.[locale] ?? project[field]?.en ?? project[field]
}
