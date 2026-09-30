export const projects = [
  {
    id: '001',
    title: {
      zh: 'Quota Hub · 余量看板',
      en: 'Quota Hub',
      ja: 'Quota Hub · 残量ダッシュボード',
    },
    summary: {
      zh: '开源、自托管的余额与用量看板，Android 测试版现已提供下载。',
      en: 'An open-source, self-hosted balance and usage dashboard. The Android test release is available now.',
      ja: 'オープンソースのセルフホスト型残高・使用量ダッシュボード。Androidテスト版を公開中。',
    },
    description: {
      zh: 'Quota Hub 将分散在不同服务中的余额与用量集中展示，支持按 AI 订阅、云服务器和节点订阅分类管理账户。项目采用 MIT 许可；当前 Android 版本为公开测试版，服务商支持范围与配置说明请参阅 GitHub 仓库。',
      en: 'Quota Hub brings balances and usage from different services into one dashboard, with accounts grouped into AI subscriptions, cloud servers and node subscriptions. The project is MIT licensed. The current Android release is a public test version; see GitHub for supported providers and setup instructions.',
      ja: 'Quota Hubは各サービスの残高と使用量をまとめ、AIサブスクリプション・クラウドサーバー・ノードサブスクリプションに分類してアカウントを管理できます。MITライセンスで公開しています。Android版は公開テスト版です。対応プロバイダーと設定方法はGitHubをご覧ください。',
    },
    status: { zh: '公开测试', en: 'Public testing', ja: '公開テスト中' },
    type: { zh: '开源 / 余额与用量管理', en: 'Open source / Usage management', ja: 'オープンソース / 残高・使用量管理' },
    version: '0.7.1',
    repository: 'https://github.com/southkite2023/quota-hub',
    repositoryLabel: { zh: '在 GitHub 查看项目', en: 'View project on GitHub', ja: 'GitHubでプロジェクトを見る' },
    downloadUrl: 'https://github.com/southkite2023/quota-hub/releases/download/v0.7.1/quota-hub-0.7.1-arm64-v8a.apk',
    downloadLabel: { zh: '直接下载 APK', en: 'Download APK', ja: 'APKをダウンロード' },
    downloadNote: {
      zh: '0.7.1 测试版 · Android ARM64 · 17.02 MB · 文件托管于 GitHub Releases',
      en: '0.7.1 test release · Android ARM64 · 17.02 MB · Hosted on GitHub Releases',
      ja: '0.7.1 テスト版 · Android ARM64 · 17.02 MB · GitHub Releasesで配布',
    },
    note: {
      zh: '适用于 ARM64 安卓设备。其他架构安装包、更新记录与测试范围请查看 GitHub Releases。',
      en: 'For ARM64 Android devices. Other architectures, release notes and testing details are available on GitHub Releases.',
      ja: 'ARM64のAndroid端末向けです。他のアーキテクチャ用APK、更新履歴、テスト範囲はGitHub Releasesをご確認ください。',
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
