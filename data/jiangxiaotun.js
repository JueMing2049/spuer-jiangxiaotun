/*!
 * 江小豚 · 图显前置包种子（数据层）
 *
 * 这里只固化「已确认的判据与字段」，不是成品图。figures/*.svg 仍是骨架，交付前替换。
 * 写成 JS 而不是 JSON，是为了让页面在 file:// 下双击打开也能读到——fetch 会被浏览器拦。
 */
window.SPUER_SEED = {
  note: '江小豚 · 图显前置包种子。图源 figures/*.svg 仍是骨架，交付前需替换为成品图；本文件只固化已确认的判据与字段。',

  groups: {
    'complexity.level': 'full',
    'benchmark.entry': 'reference',
    'benchmark.scale': 'medium',
    'agent.topology': 'single',
    'agent.needsServer': 'true',
    'agent.needsAI': 'true'
  },

  fields: {
    'complexity.reason': '多页面 + 轻服务端 + 检索底座，且赛后 3 个月市场检验要求持续运行与人工接管，按 Full 走满五张图',

    'benchmark.refs.0.name': 'SAIG 官网 dlife.love',
    'benchmark.refs.0.borrow': 'style',
    'benchmark.refs.1.name': 'globe-map-demos 数字地球',
    'benchmark.refs.1.borrow': 'interaction',
    'benchmark.layers.layout': '官网：单列长页分节 + 弹层；本作：首屏一问三入口，不做长页',
    'benchmark.layers.component': '沿用官网克制风格与自有 token，不引入 UI 组件库',
    'benchmark.layers.interaction': '借鉴 hash 弹层与 CSS 动效语言；3D 地球只做增强层，不做实时渲染承诺',
    'benchmark.layers.data': '只用五份官方材料 + 四语术语表，不采官网动态数据',
    'benchmark.layers.style': '深色底 + 单色高光 + 呼吸感动效，与官网同一语言',
    'benchmark.layers.content': '数字与口径一律引官网原文；中文优先，四语术语对齐',
    'benchmark.executability.mechanism': '60',
    'benchmark.executability.style': '70',
    'benchmark.executability.agentReady': '65',
    'benchmark.scaleNote': '单页 + 轻服务端，控制在中等体量；3D 与视频均为可选增强，不进主干',

    'effectImage.mode': 'placeholder',
    'effectImage.prompt': '意图：让评委在一屏内看懂这是武汉的城市AI接待员。结构：顶部身份条，中部江小豚与一问三入口，右侧行程卡预览，底部四问各一按钮。风格：深色底、单色高光、毛绒质感形象、克制留白。禁忌：不要渐变彩虹、不要赛博蓝紫、不要多栏信息墙。',

    'app.name': 'SPUer-江小豚',
    'app.oneLine': '武汉数命SPU城市AI接待员：答四问、给行程、能落单、有人负责',
    'app.audience': '来武汉的游客、参赛者与社区访客；线下大屏与扫码进入',
    'app.reference': 'https://www.dlife.love/saig/',

    'figures.effect.reader': '评委、运营者、以及第一次站到屏前的游客',
    'figures.effect.question': '这一屏是什么、能立刻做哪三件事、江小豚是什么形象',
    'figures.effect.outOfScope': '不回答品牌延展、不做多页信息架构',
    'figures.effect.confirmed': true,

    'figures.flow.reader': '开发者与运营者',
    'figures.flow.question': '一次提问如何走到回答、落单、接管、回推；答不上来时怎么办',
    'figures.flow.outOfScope': '不画模型内部推理与提示词细节',
    'figures.flow.confirmed': true,

    'figures.orchestration.reader': '交付负责人与评委',
    'figures.orchestration.question': '四问哪些可并行、哪一步阻塞、每道门卡什么',
    'figures.orchestration.outOfScope': '不排人力、不排预算、不做甘特图',
    'figures.orchestration.confirmed': true,

    'figures.architecture.reader': '工程同学与评委',
    'figures.architecture.question': '页面、应用服务、检索底座、模型、运营台如何分层，哪些在宿主之外',
    'figures.architecture.outOfScope': '不画机房部署拓扑与容灾',
    'figures.architecture.confirmed': true,

    'figures.sequence.reader': '工程同学',
    'figures.sequence.question': '一轮会话谁先说话、到哪算收口、会话如何不随轮次增长',
    'figures.sequence.outOfScope': '不画多角色 NPC 互相对话',
    'figures.sequence.confirmed': true,

    'agent.roles.0.name': '江小豚',
    'agent.roles.0.duty': '四问应答、行程生成、判定是否需要转人工、生成落单记录',
    'agent.roles.0.outputSchema': 'answer, sources[], need_human, order, lang',

    'orchestration.0.gate': '四问各有入口，不做的清单已列，16 小时与 40/60 权重已确认',
    'orchestration.1.gate': '五张图判据一致，字段无空，status 可到 final',
    'orchestration.2.gate': '四问各能在 60 秒内演示完，弱网与无 WebGL 有降级',
    'orchestration.3.gate': '连续 5 局会话数不增长，刷新 3 次不增长，停止后可清理',
    'orchestration.4.gate': '复盘 + 替换后的成品图源 + 埋点事件表',

    'acceptance.0.answer': '游客与评委是决策者，运营者是执行者；线下大屏面向路过者，扫码进入面向带走行程的人',
    'acceptance.1.answer': '消除“这是不是又一个套壳客服”的歧义：四问可验、行程可带走、责任可见',
    'acceptance.2.answer': '范围内：四问、行程卡、落单与接管、四语切换；范围外：账号体系、支付、多租户、实时 3D 承诺',
    'acceptance.3.answer': '完成定义：四问各自 60 秒演示通过 + 一条落单被签署；签字人运营者；回滚为回到上一版图源与字段快照',
    'acceptance.4.answer': '赛制与数字引官网原文（奖池 100 万美元、108 席、三赛区、现场 40% + 市场 60%）；武汉事实引《武汉概况》与旅游产品手册，逐条标来源',
    'acceptance.5.answer': '最坏情况：模型不可用或断网，降级为静态四问卡 + 行程模板；爆炸半径限于单次会话；停止条件为连续 3 次超时即自动切换人工',
    'acceptance.6.answer': '图源在 figures/，字段在 data/jiangxiaotun.js，随赛程变更更新；过期判据是官网公告日期与材料版本号',
    'acceptance.7.answer': '能：打印时强制展开五图，黑白可读，A4 不破版，链接下沉为脚注',
    'acceptance.8.answer': '同一角色连续 5 局，会话数保持 1 条活跃、历史归档，不增长',
    'acceptance.9.answer': '刷新 3 次复用同一会话键，不新建会话',
    'acceptance.10.answer': '停止应用后，会话标记为待清理并可一键删除，运营台可查清理记录'
  }
};
