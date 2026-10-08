// Verified release assets. Keep the version, sizes and filenames together.
export const quotaRelease = {
  version: '0.10.0', date: '2026-10-08',
  repository: 'https://github.com/southkite2023/quota-hub',
  url: 'https://github.com/southkite2023/quota-hub/releases/tag/v0.10.0',
  desktop: {
    Windows: { file: 'astracct-0.10.0-windows-x64.zip', label: 'Windows x64', size: '12.34 MB' },
    macOS: { file: 'astracct-0.10.0-macos-universal.zip', label: 'macOS Universal · Intel + Apple Silicon · macOS 12+', size: '19.92 MB' },
  },
  packages: [
    { id: 'universal', label: 'Universal', size: '49.26 MB' },
    { id: 'arm64-v8a', label: 'ARM64', size: '17.19 MB' },
    { id: 'armeabi-v7a', label: 'ARM32', size: '14.37 MB' },
    { id: 'x86_64', label: 'x86_64', size: '18.67 MB' },
  ],
}
export const quotaPlatforms = ['Android', 'iOS', 'Windows', 'macOS', 'Linux']
export function detectQuotaPlatform(device = {}) {
  const ua = device.userAgent || ''
  const platform = device.userAgentData?.platform || device.platform || ''
  if (/android/i.test(`${platform} ${ua}`)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && device.maxTouchPoints > 1)) return 'iOS'
  if (/win/i.test(platform || ua)) return 'Windows'
  if (/mac/i.test(platform || ua)) return 'macOS'
  if (/linux/i.test(platform || ua)) return 'Linux'
  return null
}
export function quotaDownloadUrl(platform, architecture) {
  if (Object.hasOwn(quotaRelease.desktop, platform)) return `${quotaRelease.repository}/releases/download/v${quotaRelease.version}/${quotaRelease.desktop[platform].file}`
  if (platform !== 'Android' || !quotaRelease.packages.some(item => item.id === architecture)) return null
  return `${quotaRelease.repository}/releases/download/v${quotaRelease.version}/astracct-${quotaRelease.version}-${architecture}.apk`
}

export const quotaCopy = {
  zh: {
    name: '星账 Astracct', back: '返回项目介绍', eyebrow: '一个视图，连接你的账户',
    headline: ['所有余额', '一眼看清。'], intro: '把分散的 API 与云账户余额，收进一个清晰的看板。少一些来回切换，多一点心中有数。',
    open: '了解并下载', badge: '多平台公开测试版', overview: '你的账户，各归其位。',
    features: [['集中查看', '在同一视图查看多个账户的余额与用量。'], ['分类管理', '按 AI、云服务器与节点订阅整理账户。'], ['随时掌握', '自动刷新与 Android 桌面小组件，让余量更近一步。']],
    limits: '节点订阅目前仅支持自定义余额接口；AI 分类不代表会员或 Coding 套餐查询。OpenAI 展示费用，而非可用余额。',
    detected: '当前设备', unknown: '未能识别设备，请手动选择', choose: '选择下载平台', architecture: '安装包版本',
    packageHints: { universal: '通用版 · 不确定架构时选这个', 'arm64-v8a': 'ARM64 · 64 位 ARM 安卓手机', 'armeabi-v7a': 'ARM32 · 32 位 ARM 旧设备', x86_64: 'x86_64 · 对应设备或模拟器' },
    architectureHint: '浏览器不能可靠判断芯片架构，默认选择兼容性更好的通用版。',
    iosPwaInstall: '安装 iOS 网页版', iosPwaIntro: 'iPhone / iPad 使用独立 PWA，无需 App Store。', iosPwaMeta: '星账 iOS PWA · 首版手动记录', iosPwaNote: '点击后打开星账网页应用，按浏览器「分享 → 添加到主屏幕」完成安装。当前仅支持手动登记余额，不提供厂商 API 自动查询、后台刷新或原生小组件。',
    download: '下载 Android 版', unavailable: '暂无此平台下载', unsupported: '当前提供 Android、Windows 和 macOS 测试包，请选择对应平台。',
    guide: '第一次使用？查看使用方法', hosted: '测试版 · 安装包托管于 GitHub Releases', source: 'GitHub 项目', notes: '版本说明',
    guideTitle: '从这里开始。', guideIntro: '安装、添加账户，再把余量放到眼前。', returnDownload: '返回下载页',
    steps: [
      ['下载并安装', '在下载页选择 Android 安装包。不确定芯片架构时选择通用版；下载完成后打开 APK，按系统提示允许本次安装。当前为 0.10.0 测试版。Windows 请完整解压并运行 astracct.exe；macOS 请解压后打开 Astracct.app。'],
      ['添加余额账户', '打开应用，进入“管理 / 添加余额账户”，选择对应服务商并填写该服务需要的账户信息或 API 凭据。凭据只在应用内填写，请勿发送到网站评论区。'],
      ['查看与刷新', '返回主界面查看账户余额。在“自动刷新”中调整刷新间隔；查询失败或数据过期时，先检查网络和账户配置，再尝试刷新。'],
      ['放到桌面', '在 Android 桌面的小组件列表中找到星账 Astracct，将组件添加到桌面，并选择要显示的账户。后台刷新受系统省电和网络状态影响。'],
    ],
    updateTitle: '已经安装过？', update: '0.8.0 已迁移为 com.yuashie.astracct。0.7.1 及更早版本无法直接覆盖升级；先自行保留账户配置和凭据，再卸载旧版并安装，卸载会删除本机数据。从 0.8.0 起，后续版本沿用固定包名和签名作为覆盖升级基线；真机迁移仍待验收。',
    testNote: '当前仍为测试版，真实账户迁移、ARM 真机、小组件与长期后台刷新仍待完整验收。',
    preview: '功能示意 / 非真实账户数据', accounts: ['API 余额', '云账户', '自定义接口'], together: '分散的账户，汇于一处。',
  },
  en: {
    name: 'Astracct', back: 'Back to project', eyebrow: 'ONE VIEW. ALL YOUR ACCOUNTS.',
    headline: ['Every balance.', 'One clear view.'], intro: 'Bring scattered API and cloud balances into one dashboard. Less switching. More clarity.',
    open: 'Explore & download', badge: 'Multi-platform public test', overview: 'A place for every account.',
    features: [['One overview', 'See balances and usage across multiple accounts.'], ['Stay organized', 'Group accounts into AI, cloud servers and node subscriptions.'], ['Stay informed', 'Automatic refresh and Android home-screen widgets keep balances close.']],
    limits: 'Node subscriptions currently require a custom balance endpoint. The AI category does not mean membership or Coding plan queries. OpenAI shows costs, not available balance.',
    detected: 'Your device', unknown: 'Device not recognized. Please choose a platform.', choose: 'Download platform', architecture: 'Package version',
    packageHints: { universal: 'Universal · Choose if unsure', 'arm64-v8a': 'ARM64 · 64-bit ARM Android phones', 'armeabi-v7a': 'ARM32 · Older 32-bit ARM devices', x86_64: 'x86_64 · Compatible devices / emulators' },
    architectureHint: 'Browsers cannot reliably identify chip architecture. Universal is selected for compatibility.',
    iosPwaInstall: 'Install iOS web app', iosPwaIntro: 'A separate PWA for iPhone and iPad. No App Store required.', iosPwaMeta: 'Astracct iOS PWA · Manual balances preview', iosPwaNote: 'Open the PWA, then use Share → Add to Home Screen. Initial version supports manual entries only, not provider API polling, background refresh, or native widgets.',
    download: 'Download for Android', unavailable: 'Not available for this platform', unsupported: 'Test packages are available for Android, Windows and macOS. Please choose a supported platform.',
    guide: 'New here? Read the getting-started guide', hosted: 'Test release · Hosted on GitHub Releases', source: 'GitHub project', notes: 'Release notes',
    guideTitle: 'Start here.', guideIntro: 'Install, add your accounts, and keep your balances in view.', returnDownload: 'Back to downloads',
    steps: [
      ['Download and install', 'Choose an Android package. If you do not know your device architecture, choose Universal. Open the downloaded APK and follow the system installation prompts. This is the 0.10.0 test release. On Windows, extract the full ZIP and run astracct.exe. On macOS, extract and open Astracct.app.'],
      ['Add an account', 'Open Manage / Add balance account in the app, select a provider and enter the account details or API credentials it requires. Enter credentials only in the app, never in website comments.'],
      ['View and refresh', 'Return to the dashboard to see balances. Adjust the interval in Auto refresh. If a query fails or data is stale, check your connection and account settings before refreshing.'],
      ['Add a widget', 'Find Astracct in the Android home-screen widget picker. Add a widget and select which accounts to display. Background refresh depends on system power saving and network conditions.'],
    ],
    updateTitle: 'Already installed?', update: 'Version 0.8.0 uses com.yuashie.astracct. Version 0.7.1 and earlier cannot be upgraded in place. Preserve your account settings and credentials before uninstalling the old app; uninstalling deletes local data. Future versions retain the 0.8.0 package and fixed signing identity as the upgrade baseline. Physical-device migration remains unverified.',
    testNote: 'This is still a test release. Real-account migration, physical ARM devices, widgets and long-running background refresh await full acceptance testing.',
    preview: 'FEATURE ILLUSTRATION / NOT LIVE ACCOUNT DATA', accounts: ['API balance', 'Cloud account', 'Custom endpoint'], together: 'Separate accounts. Together at last.',
  },
  ja: {
    name: 'Astracct', back: 'プロジェクトに戻る', eyebrow: 'ひとつの画面で、すべてのアカウントを',
    headline: ['すべての残高を', 'ひと目で。'], intro: '分散したAPIとクラウドの残高を、ひとつの画面に。切り替える手間を減らして、もっと見やすく。',
    open: '詳細・ダウンロード', badge: 'マルチプラットフォーム公開テスト版', overview: 'アカウントを、すっきり整理。',
    features: [['まとめて確認', '複数のアカウントの残高と使用量を一覧で確認。'], ['分類して管理', 'AI・クラウドサーバー・ノードサブスクリプションごとに整理。'], ['いつでも身近に', '自動更新とAndroidホーム画面ウィジェットで残高を確認。']],
    limits: 'ノードサブスクリプションは現在カスタム残高APIのみ対応。AI分類は会員・Codingプラン照会を意味しません。OpenAIは利用可能残高ではなく費用を表示します。',
    detected: 'お使いの端末', unknown: '端末を判別できません。手動で選択してください。', choose: 'プラットフォーム', architecture: 'パッケージ',
    packageHints: { universal: '汎用版 · 不明な場合はこちら', 'arm64-v8a': 'ARM64 · 64ビットARM Android', 'armeabi-v7a': 'ARM32 · 旧32ビットARM端末', x86_64: 'x86_64 · 対応端末・エミュレーター' },
    architectureHint: 'ブラウザーではCPUを確実に判別できないため、初期設定は汎用版です。',
    iosPwaInstall: 'iOS Webアプリを追加', iosPwaIntro: 'iPhone・iPad向けの独立PWAです。App Storeは不要です。', iosPwaMeta: 'Astracct iOS PWA · 手動残高記録版', iosPwaNote: 'PWAを開いて、共有 → ホーム画面に追加を選択します。現時点では手動記録のみで、API自動照会・バックグラウンド更新・ネイティブウィジェットには未対応です。',
    download: 'Android版をダウンロード', unavailable: 'このOS向けの配布はありません', unsupported: 'Android・Windows・macOSのテスト版を配布しています。対応プラットフォームを選択してください。',
    guide: 'はじめての方へ：使い方を見る', hosted: 'テスト版 · GitHub Releasesで配布', source: 'GitHubプロジェクト', notes: 'リリースノート',
    guideTitle: 'ここから始めよう。', guideIntro: 'インストールしてアカウントを追加。残高をもっと身近に。', returnDownload: 'ダウンロードに戻る',
    steps: [
      ['ダウンロード・インストール', 'Android用パッケージを選びます。CPUが不明な場合は汎用版を選択してください。APKを開き、システムの案内に従ってインストールします。現在は0.10.0テスト版です。WindowsではZIP全体を展開してastracct.exeを実行し、macOSではAstracct.appを開いてください。'],
      ['アカウントを追加', 'アプリの「管理 / 添加余额账户」を開き、サービスを選んで必要なアカウント情報やAPI認証情報を入力します。認証情報はアプリ内でのみ入力し、サイトのコメント欄には書かないでください。'],
      ['残高と更新を確認', 'ホーム画面に戻り残高を確認します。「自动刷新」で更新間隔を変更できます。取得失敗や古いデータの表示時は、接続とアカウント設定を確認してください。'],
      ['ホーム画面に追加', 'Androidのウィジェット一覧からAstracctを選び、表示するアカウントを指定します。バックグラウンド更新は省電力設定や通信状態に影響されます。'],
    ],
    updateTitle: 'すでにお使いの方へ', update: '0.8.0ではcom.yuashie.astracctに移行しました。0.7.1以前からの上書き更新はできません。設定と認証情報を控えてから旧版を削除し、新版をインストールしてください。削除すると端末内のデータが消えます。今後は0.8.0のパッケージ名と固定署名を更新の基準とします。実機での移行は未検証です。',
    testNote: '現在もテスト版です。実アカウントの移行、ARM実機、ウィジェット、長時間のバックグラウンド更新は完全な検証が未完了です。',
    preview: '機能イメージ / 実際のアカウントデータではありません', accounts: ['API残高', 'クラウド', 'カスタムAPI'], together: '分散したアカウントを、ひとつに。',
  },
}


export const quotaDesktopCopy = {
  zh: { download: '下载', Windows: '完整解压 ZIP 后运行 astracct.exe，保留同目录 DLL 和 data。', macOS: '解压后打开 Astracct.app。顶部菜单栏常驻图标，左键打开主窗口，右键选择显示的余额；关闭窗口后继续运行，选择“退出星账”才停止。支持 Intel 与 Apple Silicon，需 macOS 12 或更新版本；尚未进行 Apple 分发签名与公证，首次打开可能被系统拦截。', usage: '在账户设置中勾选“显示在悬浮窗”，再打开悬浮窗。可拖动、置顶和隐藏金额；退出后停止刷新。账户凭据保存在各设备本机，不自动同步。' },
  en: { download: 'Download for', Windows: 'Extract the entire ZIP, then run astracct.exe. Keep DLL files and the data folder together.', macOS: 'Extract and open Astracct.app. Its menu bar icon stays active when the window closes. Left-click to open; right-click to select a balance or quit. Supports Intel and Apple Silicon on macOS 12+. Apple distribution signing and notarization are not configured; first launch may be blocked.', usage: 'Select accounts for the floating window in account settings, then open it. Drag, pin and hide amounts; refresh stops on exit. Credentials stay on each device and do not sync automatically.' },
  ja: { download: 'ダウンロード：', Windows: 'ZIP全体を展開してastracct.exeを実行してください。DLLとdataフォルダーを同じ場所に保持します。', macOS: '展開してAstracct.appを開きます。メニューバーのアイコンを左クリックで開き、右クリックで残高を選択します。ウィンドウを閉じても動作し、終了メニューで停止します。macOS 12以降のIntel・Apple Siliconに対応。Apple配布署名と公証は未設定のため、初回起動がブロックされる場合があります。', usage: 'アカウント設定で悬浮窗の表示対象を選び、ウィンドウを開きます。移動・最前面・金額非表示に対応。終了後は更新が止まります。認証情報は端末内に保存され、自動同期されません。' },
}
