export const latestRelease = {
  version: '0.4.0', date: '2026-09-06',
  zh: { title: '探索与信号', items: [
    '升级首页，加入个人节点面板、快捷搜索、信号实验室与最新版本入口。',
    '新增探索页 /explore，支持中英日关键词搜索、分类筛选和当前浏览器收藏。',
    '新增信号实验室 /lab，可将文字转成摩尔斯电码，调整速度与音调、试听和复制，并查看 UTC / 中国 / 日本时钟。',
    '加入 Ctrl / ⌘ K 快捷导航、键盘选择、404 页面、离线提示和页面加载失败后的重试入口。',
    '页面按需加载，页脚不再引入完整协议正文；统一主题与版本来源，兼容浏览器禁用存储。',
    '修复项目切换时的评论状态复用；接口请求增加超时与异常响应检查，信箱在后台标签页暂停轮询。',
  ] },
  en: { title: 'Explore & signal', items: [
    'Refreshed the homepage with a personal-node panel, quick search, Signal Lab and the latest release.',
    'Added /explore with multilingual keyword search, categories and browser-local saved links.',
    'Added /lab with Morse encoding, adjustable speed and tone, audio playback, copying and UTC / China / Japan clocks.',
    'Added Ctrl / ⌘ K navigation, keyboard selection, a 404 page, offline feedback and route-loading recovery.',
    'Split pages into on-demand bundles and removed full policy text from the footer bundle. Centralized theme and version settings with storage fallbacks.',
    'Reset comments when switching projects, added request timeouts and response validation, and paused mailbox polling in background tabs.',
  ] },
  ja: { title: '探索と信号', items: [
    'ホームに個人ノードパネル、クイック検索、信号ラボ、最新バージョンへの入口を追加しました。',
    '/explore に多言語検索、カテゴリ、ブラウザ内のお気に入り保存を追加しました。',
    '/lab でモールス符号の生成、速度・音程の調整、試聴、コピー、UTC・中国・日本の時計を利用できます。',
    'Ctrl / ⌘ K ナビ、キーボード操作、404ページ、オフライン通知、読込失敗時の再試行を追加しました。',
    'ページを必要時に読み込み、フッターから規約本文の読込を分離。テーマとバージョンを共通化し、ストレージが無効でも動作します。',
    'プロジェクト切替時のコメント状態を修正し、通信のタイムアウトと応答検証を追加。非表示タブのメール更新を停止しました。',
  ] },
}
