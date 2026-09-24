export const projects = [
  {
    id: '001',
    title: {
      zh: 'Quota Hub · 余量看板',
      en: 'Quota Hub',
      ja: 'Quota Hub · 残量ダッシュボード',
    },
    summary: {
      zh: '开源、自托管的余额与用量看板，计划统一查看 API 余额、订阅流量与云账户余额。',
      en: 'An open-source, self-hosted dashboard planned to bring API balances, subscription traffic and cloud balances together.',
      ja: 'API残高・サブスクリプション通信量・クラウド残高をまとめる、オープンソースのセルフホスト型ダッシュボードを計画中。',
    },
    description: {
      zh: 'Quota Hub 希望让分散在不同服务中的余额与用量一目了然。首批计划适配 DeepSeek、通用订阅流量信息与阿里云，并逐步探索 Web、Android、iOS、macOS、Windows 客户端及系统原生小组件。项目采用 MIT 许可，目前处于规划阶段，尚无可运行 App、安装包或可部署服务。',
      en: 'Quota Hub aims to make balances and usage across services easy to see in one place. Initial integrations are planned for DeepSeek, generic subscription traffic and Alibaba Cloud, followed by exploration of Web, Android, iOS, macOS and Windows clients and native system widgets. MIT licensed and currently in planning, with no runnable app, installer or deployable service yet.',
      ja: 'Quota Hubは、各サービスの残高と使用量を一か所で確認できることを目指しています。まずDeepSeek、汎用的なサブスクリプション通信量、Alibaba Cloudとの連携を計画し、Web・Android・iOS・macOS・Windowsのクライアントとネイティブウィジェットを検討します。MITライセンスで、現在は企画段階です。実行可能なアプリ、インストーラー、デプロイ可能なサービスはまだありません。',
    },
    status: { zh: '项目规划', en: 'Planning', ja: '企画段階' },
    type: { zh: '开源 / 余额与用量管理', en: 'Open source / Usage management', ja: 'オープンソース / 残高・使用量管理' },
    repository: 'https://github.com/southkite2023/quota-hub',
    repositoryLabel: { zh: '在 GitHub 查看项目', en: 'View project on GitHub', ja: 'GitHubでプロジェクトを見る' },
    note: {
      zh: '关注 GitHub 仓库，查看开发步骤、路线图与系统设计。',
      en: 'Follow the GitHub repository for development steps, the roadmap and system design.',
      ja: '開発手順・ロードマップ・システム設計はGitHubリポジトリをご覧ください。',
    },
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
    image: new URL('../assets/projects/project-003.png', import.meta.url).href,
  },
]

export function localizedField(project, field, locale) {
  return project[field]?.[locale] ?? project[field]?.en ?? project[field]
}
