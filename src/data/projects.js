import { quotaRelease } from './quotaHub.js'

export const projects = [
  {
    id: '001',
    title: {
      zh: '星账 Astracct',
      en: 'Astracct',
      ja: 'Astracct',
    },
    summary: {
      zh: '所有余额，一眼看清。集中查看 API 与云账户余额，Android、Windows、macOS 测试版开放下载，iOS 提供网页应用。',
      en: 'Every balance. One clear view. A dashboard for API and cloud balances, available as Android, Windows and macOS test releases, with an iOS web app.',
      ja: 'すべての残高をひと目で。APIとクラウドの残高をまとめるAndroid・Windows・macOSのテスト版とiOS Webアプリを公開中。',
    },
    description: {
      zh: 'Astracct 将分散在不同服务中的余额与用量集中展示，支持按 AI 订阅、云服务器和节点订阅分类管理账户。项目采用 MIT 许可；当前 Android 版本为公开测试版，服务商支持范围与配置说明请参阅 GitHub 仓库。',
      en: 'Astracct brings balances and usage from different services into one dashboard, with accounts grouped into AI subscriptions, cloud servers and node subscriptions. The project is MIT licensed. The current Android release is a public test version; see GitHub for supported providers and setup instructions.',
      ja: 'Astracctは各サービスの残高と使用量をまとめ、AIサブスクリプション・クラウドサーバー・ノードサブスクリプションに分類してアカウントを管理できます。MITライセンスで公開しています。Android版は公開テスト版です。対応プロバイダーと設定方法はGitHubをご覧ください。',
    },
    status: { zh: '公开测试', en: 'Public testing', ja: '公開テスト中' },
    type: { zh: '开源 / 余额与用量管理', en: 'Open source / Usage management', ja: 'オープンソース / 残高・使用量管理' },
    get version() { return quotaRelease.latestVersion },
    repository: 'https://github.com/southkite2023/quota-hub',
    year: '2026',
    image: new URL('../assets/projects/project-001-optimized.webp', import.meta.url).href,
    imageWidth: 1280, imageHeight: 960,
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
    image: new URL('../assets/projects/project-002-optimized.webp', import.meta.url).href,
    imageWidth: 1280, imageHeight: 800,
  },
  {
    id: '003',
    title: {
      zh: '电离层情书',
      en: 'Yuashie Radio',
      ja: 'Yuashie Radio',
    },
    summary: {
      zh: '业余无线电通联日志与电子 QSL 平台。后期该界面将完全重设，UI大概，敬请期待。',
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
    image: new URL('../assets/projects/project-003-optimized.webp', import.meta.url).href,
    imageWidth: 1280, imageHeight: 853,
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
    image: new URL('../assets/projects/project-004-optimized.webp', import.meta.url).href,
    imageWidth: 1280, imageHeight: 960,
  },
  {
    "id": "005",
    "title": {
        "zh": "雀镜 QueLens",
        "en": "QueLens",
        "ja": "雀鏡 QueLens"
    },
    "summary": {
        "zh": "面向微信小程序的成都血战到底牌型学习工具。",
        "en": "A Chengdu Blood Battle mahjong hand-learning tool for WeChat Mini Programs.",
        "ja": "WeChatミニプログラム向けの成都麻雀「血戦到底」の牌形学習ツール。"
    },
    "description": {
        "zh": "项目正在搭建，尚未发布。本站先介绍项目方向，后续功能与发布进度以仓库为准。",
        "en": "The project foundation is being built and has not been released. This page introduces its direction; follow the repository for features and release progress.",
        "ja": "基盤を構築中で、まだ公開されていません。ここでは企画の方向性を紹介します。機能と公開状況はリポジトリをご覧ください。"
    },
    "status": {
        "zh": "开发中 · 尚未发布",
        "en": "In development · Unreleased",
        "ja": "開発中・未公開"
    },
    "type": {
        "zh": "微信小程序 / 麻将学习",
        "en": "WeChat Mini Program / Mahjong learning",
        "ja": "WeChat / 麻雀学習"
    },
    "repository": "https://github.com/southkite2023/QueLens",
    "repositoryLabel": {
        "zh": "在 GitHub 查看项目",
        "en": "View project on GitHub",
        "ja": "GitHubでプロジェクトを見る"
    },
    "note": {
        "zh": "目前先展示项目介绍，尚未接入本站功能。开发进度以 GitHub 仓库为准。",
        "en": "Introduction only; functionality is not integrated into this site. Follow GitHub for progress.",
        "ja": "現在は紹介のみで、機能は本サイトに未接続です。進捗はGitHubをご覧ください。"
    },
    "year": "2026",
    "imageWidth": 1280,
    "imageHeight": 800,
    image: new URL('../assets/projects/project-005.svg', import.meta.url).href,
  },
  {
    "id": "006",
    "title": {
        "zh": "Minecraft Mods · Yuashie Core",
        "en": "Minecraft Mods · Yuashie Core",
        "ja": "Minecraft Mods · Yuashie Core"
    },
    "summary": {
        "zh": "Minecraft Java 版 Fabric 模组集合，从 Yuashie Core 基础工程起步。",
        "en": "A collection of Minecraft Java Fabric mods, starting with the Yuashie Core foundation.",
        "ja": "Yuashie Coreを起点とするMinecraft Java版Fabric MOD集。"
    },
    "description": {
        "zh": "首个模组 Yuashie Core 面向 Minecraft 26.2，目前仅搭建模组加载入口、日志、客户端隔离及构建流程，尚未加入物品、方块或玩法。原创代码采用 MIT 许可。自动构建不代表已完成游戏内测试，本站暂不提供安装包下载。",
        "en": "Yuashie Core targets Minecraft 26.2. The foundation covers loading, logging, client isolation and builds; items, blocks and gameplay have not been added. Original code is MIT licensed. Automated builds do not imply in-game testing; no downloads are offered here yet.",
        "ja": "Yuashie CoreはMinecraft 26.2向けです。読み込み・ログ・クライアント分離・ビルドの基盤のみで、アイテム・ブロック・ゲーム要素は未実装。独自コードはMITライセンスです。自動ビルドはゲーム内検証を意味せず、ここではまだ配布しません。"
    },
    "status": {
        "zh": "开发中 · 尚未发布",
        "en": "In development · Unreleased",
        "ja": "開発中・未公開"
    },
    "type": {
        "zh": "Minecraft / Fabric 模组",
        "en": "Minecraft / Fabric mods",
        "ja": "Minecraft / Fabric MOD"
    },
    "repository": "https://github.com/southkite2023/Minecraft-Mods",
    "repositoryLabel": {
        "zh": "在 GitHub 查看项目",
        "en": "View project on GitHub",
        "ja": "GitHubでプロジェクトを見る"
    },
    "note": {
        "zh": "目前先展示项目介绍，尚未接入本站功能。开发进度以 GitHub 仓库为准。",
        "en": "Introduction only; functionality is not integrated into this site. Follow GitHub for progress.",
        "ja": "現在は紹介のみで、機能は本サイトに未接続です。進捗はGitHubをご覧ください。"
    },
    "year": "2026",
    "imageWidth": 1280,
    "imageHeight": 800,
    image: new URL('../assets/projects/project-006.svg', import.meta.url).href,
  },
  {
    "id": "007",
    "title": {
        "zh": "GamePulse",
        "en": "GamePulse",
        "ja": "GamePulse"
    },
    "summary": {
        "zh": "开源的跨设备游戏匹配检测与通知项目，基础工程开发中。",
        "en": "Open-source cross-device game matchmaking detection and notifications, with the foundation in development.",
        "ja": "ゲームのマッチング検出と端末間通知を目指すオープンソース企画。基盤を開発中。"
    },
    "description": {
        "zh": "GamePulse 以跨设备的游戏匹配检测和通知为项目方向，采用 MIT 许可。目前基础工程正在开发，本站仅提供介绍与源码入口；具体支持的游戏、设备和可用功能以仓库后续说明为准。",
        "en": "GamePulse focuses on cross-device game matchmaking detection and notifications under the MIT license. Its foundation is under development. This page provides an introduction and source link; follow the repository for supported games, devices and available features.",
        "ja": "GamePulseはゲームのマッチング検出と端末間通知を目指すMITライセンスのプロジェクトです。現在は基盤開発中。ここでは紹介とソースへのリンクを提供し、対応ゲーム・端末・機能は今後のリポジトリの案内をご確認ください。"
    },
    "status": {
        "zh": "开发中 · 尚未发布",
        "en": "In development · Unreleased",
        "ja": "開発中・未公開"
    },
    "type": {
        "zh": "游戏 / 跨设备通知",
        "en": "Games / Cross-device notifications",
        "ja": "ゲーム / 端末間通知"
    },
    "repository": "https://github.com/southkite2023/gamepulse",
    "repositoryLabel": {
        "zh": "在 GitHub 查看项目",
        "en": "View project on GitHub",
        "ja": "GitHubでプロジェクトを見る"
    },
    "note": {
        "zh": "目前先展示项目介绍，尚未接入本站功能。开发进度以 GitHub 仓库为准。",
        "en": "Introduction only; functionality is not integrated into this site. Follow GitHub for progress.",
        "ja": "現在は紹介のみで、機能は本サイトに未接続です。進捗はGitHubをご覧ください。"
    },
    "year": "2026",
    "imageWidth": 1280,
    "imageHeight": 800,
    image: new URL('../assets/projects/project-007.svg', import.meta.url).href,
  },
]

export function localizedField(project, field, locale) {
  return project[field]?.[locale] ?? project[field]?.en ?? project[field]
}
