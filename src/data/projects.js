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
      zh: 's205.singsi.cn:19791 · 纯净生存 · 版本 26.2',
      en: 's205.singsi.cn:19791 · Vanilla Survival · Version 26.2',
      ja: 's205.singsi.cn:19791 · バニラサバイバル · バージョン 26.2',
    },
    description: {
      zh: '一个专注原版玩法的纯净生存服务器。服务器地址：s205.singsi.cn:19791，版本：26.2。',
      en: 'A vanilla survival server focused on the original Minecraft experience. Server: s205.singsi.cn:19791. Version: 26.2.',
      ja: 'Minecraft本来の体験を楽しむバニラサバイバルサーバーです。サーバー：s205.singsi.cn:19791、バージョン：26.2。',
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
      zh: 'YUASHIE 个人网站',
      en: 'YUASHIE Personal Site',
      ja: 'YUASHIE 個人サイト',
    },
    summary: {
      zh: '记录生活、项目、兴趣与不断变化的思想。',
      en: 'A personal node for life, projects, interests and changing thoughts.',
      ja: '生活、プロジェクト、興味、変化していく思考を記録する個人ノード。',
    },
    description: {
      zh: '这不是一个一次性完成的主页，而是一处会长期生长的个人空间。它以清晰、克制的视觉语言承载项目档案与个人表达。',
      en: 'Not a one-off homepage, but a personal space designed to grow over time—holding project archives and personal expression in a clear, restrained visual language.',
      ja: '一度きりで完成するホームページではなく、長く育てていく個人空間です。落ち着いた視覚言語でプロジェクトと個人の表現を記録します。',
    },
    status: { zh: '在线', en: 'Online', ja: 'オンライン' },
    type: { zh: '个人网站', en: 'Personal website', ja: '個人サイト' },
    year: '2026',
    image: new URL('../assets/projects/project-003.svg', import.meta.url).href,
  },
]

export function localizedField(project, field, locale) {
  return project[field]?.[locale] ?? project[field]?.en ?? project[field]
}
