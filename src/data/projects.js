export const projects = [
  {
    id: '001',
    title: {
      zh: '星账 Astracct',
      en: 'Astracct',
      ja: 'Astracct',
    },
    summary: {
      zh: '所有余额，一眼看清。集中查看 API 与云账户余额，Android 测试版现已开放下载。',
      en: 'Every balance. One clear view. A dashboard for API and cloud balances, available as an Android test release.',
      ja: 'すべての残高をひと目で。APIとクラウドの残高をまとめるAndroidテスト版を公開中。',
    },
    description: {
      zh: 'Astracct 将分散在不同服务中的余额与用量集中展示，支持按 AI 订阅、云服务器和节点订阅分类管理账户。项目采用 MIT 许可；当前 Android 版本为公开测试版，服务商支持范围与配置说明请参阅 GitHub 仓库。',
      en: 'Astracct brings balances and usage from different services into one dashboard, with accounts grouped into AI subscriptions, cloud servers and node subscriptions. The project is MIT licensed. The current Android release is a public test version; see GitHub for supported providers and setup instructions.',
      ja: 'Astracctは各サービスの残高と使用量をまとめ、AIサブスクリプション・クラウドサーバー・ノードサブスクリプションに分類してアカウントを管理できます。MITライセンスで公開しています。Android版は公開テスト版です。対応プロバイダーと設定方法はGitHubをご覧ください。',
    },
    status: { zh: '公开测试', en: 'Public testing', ja: '公開テスト中' },
    type: { zh: '开源 / 余额与用量管理', en: 'Open source / Usage management', ja: 'オープンソース / 残高・使用量管理' },
    version: '0.8.0',
    repository: 'https://github.com/southkite2023/quota-hub',
    year: '2026',
    image: new URL('../assets/projects/project-001.png', import.meta.url).href,
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
    image: new URL('../assets/projects/project-003.png', import.meta.url).href,
  },
  {
    id: '004',
    title: { zh: 'Yuashie Calendar · 订阅日历', en: 'Yuashie Calendar', ja: 'Yuashie Calendar · 購読カレンダー' },
    summary: {
      zh: '游戏版本与卡池、动漫周更、新游戏发售的订阅日历企划。正在开发，尚无线上订阅地址。',
      en: 'A subscription calendar for game updates, banners, weekly anime and new releases. In development; no live subscription yet.',
      ja: 'ゲーム更新・ガチャ、アニメ放送、新作発売の購読カレンダー。開発中で、オンライン購読はまだありません。',
    },
    description: {
      zh: '计划汇集原神、崩坏：星穹铁道、绝区零、明日方舟的版本与卡池事件，以及动漫周更和新游戏发售，支持自选内容并生成可订阅的 ICS 日历。目前已完成事件规范、虚构样例、离线校验与 ICS 生成；尚未接入真实来源、网站或自动发布。',
      en: 'Planned coverage includes Genshin Impact, Honkai: Star Rail, Zenless Zone Zero and Arknights updates and banners, weekly anime and new game releases, with selectable content and ICS subscriptions. Event specifications, fictional samples, offline validation and ICS generation are implemented. Real sources, website integration and automated publication are not yet connected.',
      ja: '原神、崩壊：スターレイル、ゼンレスゾーンゼロ、アークナイツの更新・ガチャ、アニメ放送、新作発売をまとめ、選択した内容のICS購読を計画中。イベント仕様、架空サンプル、オフライン検証とICS生成を実装済み。実データ、サイト連携、自動公開は未対応です。',
    },
    status: { zh: '开发中', en: 'In development', ja: '開発中' },
    type: { zh: '游戏 / 动漫 / 订阅日历', en: 'Games / Anime / Subscription calendar', ja: 'ゲーム / アニメ / 購読カレンダー' },
    repository: 'https://github.com/southkite2023/yuashie-calendar',
    repositoryLabel: { zh: '在 GitHub 查看日历企划', en: 'View the calendar on GitHub', ja: 'GitHubでカレンダー企画を見る' },
    note: { zh: '开发进度与实施路线以 GitHub 仓库为准。', en: 'Follow the GitHub repository for progress and the roadmap.', ja: '開発状況とロードマップはGitHubをご覧ください。' },
    year: '2026',
    image: new URL('../assets/projects/project-004.png', import.meta.url).href,
  },
]

export function localizedField(project, field, locale) {
  return project[field]?.[locale] ?? project[field]?.en ?? project[field]
}
