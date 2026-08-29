import { createI18n } from 'vue-i18n'

const messages = {
  zh: {
    nav: {
      projects: '项目',
      about: '关于',
      vip: '会员',
      feedback: '反馈',
      login: '登录'
    },
    hero: {
      eyebrow: '// PERSONAL NODE · 001',
      line1: '构建。',
      line2: '思考。',
      line3: '探索。',
      intro: '欢迎来到 YUASHIE。这是我在互联网中的个人节点——用于记录想法、实验、项目，以及一切值得创造的东西。',
      projects: '探索项目',
      about: '关于本站'
    },
    terminal: {
      status: '状态',
      online: '在线',
      protocol: '协议',
      region: '区域',
      version: '版本',
      about: {
        greeting: '你好，我是 Yuashie。',
        curious: '一个对世界保持好奇的人。',
        description: '我喜欢思考，也喜欢把想法变成真正能够运行的东西。这里记录着我的生活、项目、兴趣与不断变化的思想，是我在互联网世界里为自己保留的一小块空间。',
        welcome: '欢迎你的来访。',
        developing: '更多板块正在开发。'
      }
    },
    projects: {
      title: '项目',
      aiTitle: 'AI / 智能体',
      aiText: '关于人工智能、自主智能体与实际自动化的实验。',
      softwareTitle: '软件',
      softwareText: '用于解决现实问题的小型工具、Web 应用与系统。',
      archiveTitle: '档案',
      archiveText: '长期积累的笔记、观察、实验与碎片。'
    },
    projectArchive: {
      title: '项目档案',
      intro: '这里收录我正在构建、持续迭代或已经完成的项目。每一次实践，都是把想法变成现实的一次尝试。',
      back: '返回项目',
      type: '类型',
      status: '状态',
      version: '版本',
      year: '年份',
      overview: '项目概览',
      moreSoon: '更多设计过程、技术细节与阶段记录将在后续版本中补充。',
      allProjects: '全部项目',
      next: '下一个项目',
      notFound: '没有找到这个项目'
    },
    membership: {
      title: '会员机制',
      status: '0.2.4 / 基础贡献体系已启用',
      intro: '这里不是付费墙，而是一个记录支持、参与与共同成长的长期协议。',
      principleLabel: '设计原则',
      principleTitle: '支持不应被立即兑换成特权。',
      principleText: '我希望会员机制能保留一种简单的关系：你认可这里正在发生的事，并愿意帮助它继续运行。每一次支持都会被认真看见，但不会被匆忙包装成消费套餐。',
      noRewards: '目前暂无会员奖励或专属权益。在机制成熟之前，不会做出无法稳定实现的承诺。',
      contributionLabel: '贡献值',
      contributionTitle: 'Contribution 基础体系已上线',
      contributionIntro: '贡献不只是金额。当前规则优先记录可验证的真实参与：有效 Bug +20 Contribution，被采用的建议 +50 Contribution。普通评论不直接加分，以降低刷分动机。',
      supportTitle: '支持',
      supportText: '为网站、项目与持续创作提供直接支持。',
      buildTitle: '共建',
      buildText: '提交有用的反馈、测试结果、修正建议或参与项目。',
      shareTitle: '传递',
      shareText: '分享知识、扩散好的想法，让更多真实连接发生。',
      ledger: '贡献记录模型',
      ledgerText: '每一笔 Contribution 都以独立流水记录来源、分值与时间。反馈审核状态被撤回时，对应奖励也会同步撤回；徽章资格随有效记录自动更新。',
      supportLabel: '支持通道',
      afdianTitle: '会员与支持现在有了独立入口。',
      afdianText: '如果你想了解会员、爱发电支持方式，以及它与 Contribution 的关系，可以前往 /vip。',
      vipHint: '不再使用二维码；/vip 会直接接入爱发电官方支持模块。',
      vipEntry: '会员与支持',
      vipLink: '打开 /VIP',
      channelOnline: '支持通道在线',
      nextLabel: '下一阶段',
      nextTitle: '慢一点设计，把它做对。',
      nextText: '会员机制与贡献值会随着网站一起迭代。新的规则、进度和权益只会在经过验证后公布。'
    },
    vip: {
      title: '会员与支持',
      status: 'AFDIAN / DIRECT CONNECTION',
      intro: '如果你愿意长期关注并支持这个站点，可以在这里与 Yuashie 建立一份更稳定的支持关系。它不是访问本站的门槛，也不会影响你原本能够使用的功能。',
      principleLabel: '一些说明',
      principleTitle: '支持是自愿的，也应当保持轻松。',
      principleText: '网站会继续公开运行。会员更接近一种对长期维护、项目实验和持续创作的支持方式，而不是必须购买的服务。即使不加入，也依然欢迎你浏览、评论、反馈 Bug 或提出建议。',
      noPressure: '如果暂时没有合适的理由加入会员，也完全没有关系。一次访问、一条有价值的建议，同样是对这个小站的帮助。',
      openTitle: '基础功能保持开放',
      openText: '普通浏览、项目评论和反馈等基础功能不会因为是否成为会员而区别开放。',
      memberTitle: '会员关系由爱发电承载',
      memberText: '当前赞助与会员关系通过爱发电处理。本站直接嵌入官方支持模块，付款与订单流程仍由爱发电完成。',
      contributionTitle: '会员与 Contribution 分开',
      contributionText: 'Contribution 继续记录可验证的站内贡献。是否赞助不会自动代表更高的贡献值，也不会改变反馈审核标准。',
      afdianTitle: '如果你愿意，可以在这里为它续一点电。',
      afdianText: '下面直接接入爱发电的官方嵌入模块。你可以查看当前可用的支持方式；如需完成操作，会由爱发电继续处理。',
      afdianNote: '未来如果逐步增加会员标识或回馈，我会尽量以能够长期、稳定兑现为前提，不急于堆叠权益。',
      embedTitle: 'Yuashie 爱发电支持模块',
      openAfdian: '前往爱发电',
      externalNote: '支付与订单由爱发电处理',
      closingLabel: '最后',
      closingTitle: '谢谢你愿意看到这里。',
      closingText: '无论是否成为会员，都感谢你愿意花时间来到这个站点。对我而言，真正重要的是它能够持续被使用、被提出问题，也被一点点做得更好。'
    },
    manifesto: {
      title: '宣言',
      quote: '好奇心是比确定性更可靠的指南针。',
      p1: '这个网站不是一个已经完成的产品，而是一个不断演化的系统。',
      p2: '新的项目会在这里出现，旧的想法也可能消失。真正留下的是探索本身。'
    },
    footer: {
      status: '节点状态：运行正常'
    }
  },

  en: {
    nav: {
      projects: 'PROJECTS',
      about: 'ABOUT',
      vip: 'VIP',
      feedback: 'FEEDBACK',
      login: 'LOGIN'
    },
    hero: {
      eyebrow: '// PERSONAL NODE · 001',
      line1: 'BUILD.',
      line2: 'THINK.',
      line3: 'EXPLORE.',
      intro: 'Welcome to YUASHIE. This is my personal node on the Internet — a place for ideas, experiments, projects and everything worth building.',
      projects: 'EXPLORE PROJECTS',
      about: 'ABOUT THIS SITE'
    },
    terminal: {
      status: 'STATUS',
      online: 'ONLINE',
      protocol: 'PROTOCOL',
      region: 'REGION',
      version: 'VERSION',
      about: {
        greeting: "Hello, I'm Yuashie.",
        curious: 'Someone who stays curious about the world.',
        description: 'I enjoy thinking, and I also enjoy turning ideas into things that truly work. This space records my life, projects, interests and ever-changing thoughts—a small corner of the Internet I have kept for myself.',
        welcome: 'Welcome, and thank you for visiting.',
        developing: 'More sections are currently under development.'
      }
    },
    projects: {
      title: 'PROJECTS',
      aiTitle: 'AI / Agents',
      aiText: 'Experiments with artificial intelligence, autonomous agents and practical automation.',
      softwareTitle: 'Software',
      softwareText: 'Small tools, web applications and systems designed to solve real-world problems.',
      archiveTitle: 'Archive',
      archiveText: 'Notes, observations, experiments and fragments accumulated over time.'
    },
    projectArchive: {
      title: 'PROJECT ARCHIVE',
      intro: 'A collection of things I am building, refining or have completed. Each project is an attempt to turn an idea into something real.',
      back: 'Back to projects',
      type: 'Type',
      status: 'Status',
      version: 'Version',
      year: 'Year',
      overview: 'Overview',
      moreSoon: 'Design notes, technical details and progress records will be added in future versions.',
      allProjects: 'All projects',
      next: 'Next project',
      notFound: 'Project not found'
    },
    membership: {
      title: 'MEMBERSHIP',
      status: '0.2.4 / BASE CONTRIBUTION SYSTEM LIVE',
      intro: 'This is not a paywall. It is a long-term protocol for recognizing support, participation and shared growth.',
      principleLabel: 'DESIGN PRINCIPLE',
      principleTitle: 'Support should not be instantly converted into privilege.',
      principleText: 'I want membership to preserve a simple relationship: you believe in what is happening here and want to help it continue. Every contribution will be seen and valued, without being rushed into a subscription bundle.',
      noRewards: 'There are currently no member rewards or exclusive benefits. Until the system is ready, I will not promise anything that cannot be delivered consistently.',
      contributionLabel: 'CONTRIBUTION VALUE',
      contributionTitle: 'The base Contribution system is live',
      contributionIntro: 'Contribution is more than money. The current rules reward verifiable participation: +20 for a valid bug and +50 for an adopted suggestion. Ordinary comments do not directly earn points, reducing incentives to spam.',
      supportTitle: 'SUPPORT',
      supportText: 'Directly sustain the website, ongoing projects and continued creation.',
      buildTitle: 'BUILD',
      buildText: 'Offer useful feedback, tests, fixes or take part in a project.',
      shareTitle: 'SHARE',
      shareText: 'Share knowledge and good ideas so more genuine connections can happen.',
      ledger: 'CONTRIBUTION LEDGER MODEL',
      ledgerText: 'Every Contribution entry is stored as an auditable ledger event with its source, value and time. If an approval is withdrawn, its reward is reconciled automatically and badge eligibility is recalculated.',
      supportLabel: 'SUPPORT CHANNEL',
      afdianTitle: 'Membership and support now have their own space.',
      afdianText: 'Visit /vip to learn about membership, Afdian support, and how it relates to Contribution.',
      vipHint: 'No QR code is required; /vip embeds Afdian’s official support module directly.',
      vipEntry: 'MEMBERSHIP',
      vipLink: 'OPEN /VIP',
      channelOnline: 'SUPPORT CHANNEL ONLINE',
      nextLabel: 'WHAT COMES NEXT',
      nextTitle: 'Design slowly. Get it right.',
      nextText: 'Membership and contribution value will evolve with the site. New rules, progress and benefits will only be announced after they have been tested.'
    },
    vip: {
      title: 'MEMBERSHIP & SUPPORT',
      status: 'AFDIAN / DIRECT CONNECTION',
      intro: 'If you would like to follow and support this site over time, this page offers a more lasting way to do so. Membership is not a requirement for using the site, and it does not remove access to ordinary features.',
      principleLabel: 'A FEW NOTES',
      principleTitle: 'Support is voluntary, and it should stay comfortable.',
      principleText: 'The site will remain openly accessible. Membership is closer to a way of supporting long-term maintenance, experiments and continued creation than a service you are expected to purchase. You are always welcome to browse, comment, report bugs or share suggestions without joining.',
      noPressure: 'If membership does not feel useful to you right now, that is completely fine. A visit or a thoughtful suggestion can be just as meaningful to this small site.',
      openTitle: 'CORE FEATURES STAY OPEN',
      openText: 'Browsing, project comments and feedback are not gated by whether someone becomes a member.',
      memberTitle: 'MEMBERSHIP IS HANDLED BY AFDIAN',
      memberText: 'Afdian currently handles sponsorship and membership relationships. This page embeds its official support module, while payment and order processing remain on Afdian.',
      contributionTitle: 'MEMBERSHIP ≠ CONTRIBUTION',
      contributionText: 'Contribution continues to record verifiable participation on the site. Sponsorship does not automatically grant a higher Contribution score or change how feedback is reviewed.',
      afdianTitle: 'If you wish, you can keep this node powered a little longer.',
      afdianText: 'The official Afdian module is embedded below. You can view the currently available support options here; any transaction is then handled by Afdian.',
      afdianNote: 'If member identifiers or other forms of acknowledgement are added later, I will try to introduce only what can be delivered reliably over time.',
      embedTitle: 'Yuashie Afdian support module',
      openAfdian: 'OPEN AFDIAN',
      externalNote: 'Payments and orders are handled by Afdian',
      closingLabel: 'ONE LAST NOTE',
      closingTitle: 'Thank you for reading this far.',
      closingText: 'Whether or not you become a member, thank you for spending some time here. What matters most to me is that this site keeps being used, questioned and gradually improved.'
    },
    manifesto: {
      title: 'MANIFESTO',
      quote: 'Curiosity is a better compass than certainty.',
      p1: 'This website is not a finished product. It is an evolving system.',
      p2: 'New projects will appear here. Old ideas may disappear. What remains is the process of exploration itself.'
    },
    footer: {
      status: 'NODE STATUS: OPERATIONAL'
    }
  },

  ja: {
    nav: {
      projects: 'プロジェクト',
      about: 'このサイトについて',
      vip: 'メンバー',
      feedback: 'フィードバック',
      login: 'ログイン'
    },
    hero: {
      eyebrow: '// PERSONAL NODE · 001',
      line1: '創る。',
      line2: '考える。',
      line3: '探求する。',
      intro: 'YUASHIEへようこそ。ここはインターネット上にある私の個人的なノードです。アイデア、実験、プロジェクト、そして創る価値のあるものを記録しています。',
      projects: 'プロジェクトを見る',
      about: 'このサイトについて'
    },
    terminal: {
      status: '状態',
      online: 'オンライン',
      protocol: 'プロトコル',
      region: '地域',
      version: 'バージョン',
      about: {
        greeting: 'こんにちは、Yuashieです。',
        curious: '世界への好奇心を持ち続けている人です。',
        description: '考えることが好きで、アイデアを実際に動くものへ変えることも好きです。ここには、私の生活、プロジェクト、興味、そして移り変わっていく思考を記録しています。インターネットの世界に、自分のために残した小さな居場所です。',
        welcome: '訪れてくれて、ありがとうございます。',
        developing: 'ほかのセクションも現在開発中です。'
      }
    },
    projects: {
      title: 'プロジェクト',
      aiTitle: 'AI / エージェント',
      aiText: '人工知能、自律型エージェント、実用的な自動化に関する実験。',
      softwareTitle: 'ソフトウェア',
      softwareText: '現実の問題を解決するための小さなツール、Webアプリ、システム。',
      archiveTitle: 'アーカイブ',
      archiveText: 'これまで蓄積してきたメモ、観察、実験、断片。'
    },
    projectArchive: {
      title: 'プロジェクト一覧',
      intro: '現在制作中、継続的に改善中、または完成したプロジェクトを記録しています。すべては、アイデアを現実に変えるための試みです。',
      back: 'プロジェクトへ戻る',
      type: '種類',
      status: '状態',
      version: 'バージョン',
      year: '年',
      overview: '概要',
      moreSoon: 'デザイン過程、技術的な詳細、開発記録は今後追加します。',
      allProjects: 'すべてのプロジェクト',
      next: '次のプロジェクト',
      notFound: 'プロジェクトが見つかりません'
    },
    membership: {
      title: 'メンバーシップ',
      status: '0.2.4 / 基本Contributionシステム稼働中',
      intro: 'これはペイウォールではありません。応援、参加、そして共に成長する過程を記録するための長期的な仕組みです。',
      principleLabel: '設計原則',
      principleTitle: '応援を、すぐに特権へ変えるべきではない。',
      principleText: 'ここで起きていることを信じ、続いてほしいと願う。そんなシンプルな関係を保ちたいと考えています。すべての貢献を大切にしますが、急いでサブスク商品に変えることはしません。',
      noRewards: '現在、メンバー向けの特典や限定権益はありません。安定して実現できないことは、仕組みが整うまで約束しません。',
      contributionLabel: '貢献値',
      contributionTitle: '基本Contributionシステムを公開しました',
      contributionIntro: '貢献は金額だけではありません。現在は検証可能な参加を優先し、有効Bugは+20、採用された提案は+50 Contributionです。通常コメントはスパム防止のため直接加点しません。',
      supportTitle: '応援',
      supportText: 'サイト、プロジェクト、継続的な制作を直接支える。',
      buildTitle: '共創',
      buildText: '役立つフィードバック、テスト、修正案を送る、またはプロジェクトに参加する。',
      shareTitle: '共有',
      shareText: '知識や良いアイデアを伝え、新しいつながりを生み出す。',
      ledger: '貢献記録モデル',
      ledgerText: 'Contributionは出所・点数・日時を独立した履歴として保存します。承認が撤回された場合は報酬も自動調整され、バッジ資格も再計算されます。',
      supportLabel: '応援チャネル',
      afdianTitle: 'メンバーシップと応援のための専用ページを用意しました。',
      afdianText: 'メンバーシップ、愛発電での応援、Contributionとの関係については /vip で案内しています。',
      vipHint: 'QRコードは使わず、/vip に愛発電の公式応援モジュールを直接埋め込みます。',
      vipEntry: 'メンバーシップ',
      vipLink: '/VIP を開く',
      channelOnline: '応援チャネル・オンライン',
      nextLabel: '次の段階',
      nextTitle: 'ゆっくり設計し、正しく作る。',
      nextText: 'メンバーシップと貢献値は、サイトとともに進化します。新しいルール、進捗、特典は、検証後にのみ発表します。'
    },
    vip: {
      title: 'メンバーシップと応援',
      status: 'AFDIAN / DIRECT CONNECTION',
      intro: 'このサイトを長く見守り、応援したいと思っていただけた場合のために、少し継続的な支援の入口を用意しました。メンバーになることはサイト利用の条件ではなく、通常の機能が制限されることもありません。',
      principleLabel: 'いくつかの説明',
      principleTitle: '応援は自由で、気軽なものであってほしい。',
      principleText: 'サイトはこれからも基本的に公開されたまま運営します。メンバーシップは購入必須のサービスというより、長期的な維持、プロジェクトの実験、継続的な制作を支える方法のひとつです。加入しなくても、閲覧、コメント、Bug報告、提案はこれまで通り歓迎します。',
      noPressure: '今はメンバーになる理由が見つからなくても、まったく問題ありません。訪問してくれることや、役に立つ提案をひとつ送ってくれることも、この小さなサイトへの十分な応援です。',
      openTitle: '基本機能は公開したまま',
      openText: '通常の閲覧、プロジェクトへのコメント、フィードバックなどは、メンバーかどうかによって利用可否を分けません。',
      memberTitle: 'メンバー関係は愛発電で管理',
      memberText: '現在の支援・メンバー関係は愛発電（Afdian）を通じて扱います。このページには公式の応援モジュールを直接埋め込み、決済や注文処理は愛発電側で行われます。',
      contributionTitle: 'メンバーと Contribution は別',
      contributionText: 'Contribution は引き続き、サイト内で確認できる貢献を記録します。支援したことだけで自動的にContributionが高くなったり、フィードバック審査の基準が変わったりすることはありません。',
      afdianTitle: 'よければ、ここからこのノードにもう少し電力を。',
      afdianText: '下に愛発電の公式モジュールを直接表示しています。現在利用できる応援方法を確認でき、実際の手続きは愛発電が引き続き処理します。',
      afdianNote: '今後メンバー表示や何らかのお返しを追加する場合も、長く安定して実現できるものから少しずつ考えていきます。',
      embedTitle: 'Yuashie 愛発電応援モジュール',
      openAfdian: '愛発電を開く',
      externalNote: '決済・注文処理は愛発電が担当します',
      closingLabel: '最後に',
      closingTitle: 'ここまで読んでくれて、ありがとうございます。',
      closingText: 'メンバーになるかどうかにかかわらず、このサイトに時間を使ってくれたことに感謝しています。使われ、疑問を投げかけられ、少しずつ良くなっていくことが、私にとって一番大切です。'
    },
    manifesto: {
      title: 'マニフェスト',
      quote: '確信よりも、好奇心のほうが優れた羅針盤だ。',
      p1: 'このウェブサイトは完成品ではありません。進化し続けるシステムです。',
      p2: '新しいプロジェクトが現れ、古いアイデアは消えていくかもしれません。残るのは探求そのものです。'
    },
    footer: {
      status: 'ノード状態：正常稼働'
    }
  }
}

const savedLanguage = localStorage.getItem('language')

const i18n = createI18n({
  legacy: false,
  locale: savedLanguage || 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n
