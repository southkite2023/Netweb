import { projects, localizedField } from './projects'
import { experienceCopy } from './experience'
import { playroomCopy } from './playroom'

// Only public destinations belong here. Keep the hidden archive out of discovery.
export function directoryEntries(locale = 'zh') {
  const c = experienceCopy[locale] || experienceCopy.zh
  return [
    { path: '/play', title: (playroomCopy[locale] || playroomCopy.zh).title, description: (playroomCopy[locale] || playroomCopy.zh).playHint, keywords: '2048 Bongo Cat 猫猫 游戏 游乐室 小伙伴 礼花 companion playroom game 猫 ゲーム プレイルーム', category: 'pages', code: 'FUN' },
    ...projects.map(project => ({ path: `/projects/${project.id}`, title: localizedField(project, 'title', locale), description: localizedField(project, 'summary', locale), category: 'projects', code: project.id, image: project.image, keywords: Object.values(project.title).join(' ') + ' ' + Object.values(project.type).join(' ') })),
    ...[
      ['/lab', 'lab', 'CW morse 摩尔斯 モールス signal 实验'],
      ['/radio', 'radio', '业余无线电 amateur callsign 呼号 無線'],
      ['/radio/log', 'log', 'QSO 通联 交信 logbook'],
      ['/radio/qsl', 'qsl', '收卡 发卡 eQSL cards カード'],
      ['/about', 'about', '更新 日志 changelog release バージョン'],
      ['/feedback', 'feedback', 'Bug 建议 suggestion フィードバック'],
      ['/vip', 'vip', '会员 支持 爱发电 support membership'],
      ['/login', 'login', '登录 注册 账户 sign in account ログイン'],
      ['/terms', 'terms', '用户 服务 条款 terms 規約'],
      ['/privacy', 'privacyPage', '隐私 privacy プライバシー'],
      ['/works', 'works', '作品 copyright 著作権'],
    ].map(([path, key, keywords]) => ({ path, title: c[key], description: path, keywords, category: 'pages', code: path === '/lab' ? 'CW' : '↗' })),
  ]
}
