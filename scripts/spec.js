/*!
 * 图显前置工作台 · spec.js
 * 负责三件事：按级别算门禁、把字段收成范式包、导出 JSON / Markdown。
 * 依赖 HNP（src/hnp.js）提供的 HNP.copy 与事件总线，其余全部原生。
 */
(function () {
  'use strict';

  var LEVELS = {
    quick: { label: 'Quick', figs: ['effect', 'flow'], gates: ['G0'] },
    light: { label: 'Light', figs: ['effect', 'flow', 'sequence'], gates: ['G0', 'G1'] },
    full: {
      label: 'Full',
      figs: ['effect', 'flow', 'orchestration', 'architecture', 'sequence'],
      gates: ['G0', 'G1', 'G2', 'G3']
    }
  };

  var FIG_NAMES = {
    effect: '效果图', flow: '流程图', orchestration: '编排图',
    architecture: '架构图', sequence: '时序图'
  };

  var ACCEPT = [
    '给谁看？读者是谁，决策者是谁，执行者是谁？',
    '回答什么问题？这张图要消除哪个歧义？',
    '边界在哪？哪些在范围内，哪些明确不做？',
    '验收是什么？什么算完成，谁签字，怎么回滚？',
    '证据在哪？关键假设、数据、参考来源是否可追溯？',
    '失败会怎样？最坏情况、爆炸半径、停止条件是什么？',
    '谁维护？图源在哪，多久更新，过期怎么办？',
    '能不能打印？离线、黑白、A4 是否还能读？',
    '同角色连续新局 5 次，会话数是否稳定？',
    '刷新 3 次，会话是否不增长？',
    '停止应用后，会话是否已删除或有待清理记录？'
  ];

  var LABELS = {
    'complexity.level': '复杂度级别',
    'complexity.reason': '定级理由',
    'benchmark.scale': '体量',
    'benchmark.refs.0.name': '参考 1 名称',
    'app.name': '应用名称',
    'app.oneLine': '一句话说明',
    'app.audience': '目标用户',
    'agent.topology': '角色拓扑',
    'agent.needsServer': '是否需要服务端',
    'agent.needsAI': '是否需要 ai 能力',
    'agent.roles.0.name': '角色 1 名称',
    'agent.roles.1.name': '角色 2 名称'
  };

  /* ---------------- 路径读写 ---------------- */

  function setPath(obj, path, value) {
    var segs = path.split('.');
    var cur = obj;
    for (var i = 0; i < segs.length - 1; i++) {
      var k = segs[i];
      if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== 'object') {
        cur[k] = /^\d+$/.test(segs[i + 1]) ? [] : {};
      }
      cur = cur[k];
    }
    cur[segs[segs.length - 1]] = value;
  }

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return (o === null || o === undefined) ? undefined : o[k];
    }, obj);
  }

  /* ---------------- 收集 ---------------- */

  function collect() {
    var data = {};

    document.querySelectorAll('[data-group]').forEach(function (group) {
      setPath(data, group.getAttribute('data-group'), group.getAttribute('data-value') || '');
    });

    document.querySelectorAll('[data-spec]').forEach(function (el) {
      var path = el.getAttribute('data-spec');
      var v;
      if (el.type === 'checkbox') v = el.checked;
      else if (el.type === 'number') v = el.value === '' ? null : Number(el.value);
      else v = el.value.replace(/^\s+|\s+$/g, '');
      setPath(data, path, v);
    });

    return data;
  }

  /* ---------------- 门禁计算 ---------------- */

  function evaluate(data) {
    var level = data.complexity && data.complexity.level;
    var cfg = LEVELS[level] || { figs: [], gates: [], label: '' };

    var open = [];
    function need(path, value) {
      var empty = value === undefined || value === null || value === '' || value === false;
      if (empty) open.push(path);
    }

    if (!level) open.push('complexity.level');
    need('app.name', getPath(data, 'app.name'));
    need('app.oneLine', getPath(data, 'app.oneLine'));
    need('app.audience', getPath(data, 'app.audience'));
    need('benchmark.scale', getPath(data, 'benchmark.scale'));
    if (level && level !== 'quick') {
      need('benchmark.refs.0.name', getPath(data, 'benchmark.refs.0.name'));
    }

    cfg.figs.forEach(function (f) {
      ['reader', 'question', 'outOfScope'].forEach(function (k) {
        need('figures.' + f + '.' + k, getPath(data, 'figures.' + f + '.' + k));
      });
      need('figures.' + f + '.confirmed', getPath(data, 'figures.' + f + '.confirmed'));
    });

    var topology = data.agent && data.agent.topology;
    need('agent.topology', topology);
    if (topology === 'single' || topology === 'team') {
      need('agent.roles.0.name', getPath(data, 'agent.roles.0.name'));
    }
    if (topology === 'team') {
      need('agent.roles.1.name', getPath(data, 'agent.roles.1.name'));
    }
    need('agent.needsServer', getPath(data, 'agent.needsServer'));
    need('agent.needsAI', getPath(data, 'agent.needsAI'));

    ACCEPT.forEach(function (_, i) {
      need('acceptance.' + i + '.answer', getPath(data, 'acceptance.' + i + '.answer'));
    });

    var confirmed = cfg.figs.filter(function (f) {
      return getPath(data, 'figures.' + f + '.confirmed') === true;
    }).length;

    return {
      level: level,
      cfg: cfg,
      open: open,
      confirmed: confirmed,
      required: cfg.figs.length,
      status: (level && open.length === 0) ? 'final' : 'draft'
    };
  }

  /* ---------------- 渲染 ---------------- */

  function text(el, v) { if (el) el.textContent = v; }

  function render(state, data) {
    text(document.getElementById('level-pill'),
      state.level ? (LEVELS[state.level].label + ' 级别') : '未定级');
    text(document.getElementById('gate-pill'),
      state.confirmed + ' / ' + state.required + ' 图已确认');

    var statusPill = document.getElementById('status-pill');
    if (statusPill) {
      statusPill.textContent = state.status === 'final' ? '定稿' : '草稿';
      statusPill.className = 'pill ' + (state.status === 'final' ? 'final' : 'draft');
    }

    text(document.getElementById('fig-count-tag'),
      state.required ? ('本级需要：' + state.cfg.figs.map(function (f) { return FIG_NAMES[f]; }).join(' + ')) : '按级别决定画几张');

    // 每张图的确认状态
    document.querySelectorAll('[data-confirm-label]').forEach(function (el) {
      var fig = el.getAttribute('data-confirm-label');
      var required = state.cfg.figs.indexOf(fig) > -1;
      var done = getPath(data, 'figures.' + fig + '.confirmed') === true;
      if (!required) {
        el.textContent = '本级别不需要';
        el.classList.remove('is-on');
      } else {
        el.textContent = done ? '已确认' : '待确认';
        el.classList.toggle('is-on', done);
      }
    });

    // 阶段锁
    var refOk = state.level && (state.level === 'quick' || getPath(data, 'benchmark.refs.0.name'));
    var figOk = state.required > 0 && state.confirmed >= state.required;
    lock('stage1', !state.level);
    lock('stage2', !refOk);
    lock('stage3', !figOk);

    // 缺失高亮
    document.querySelectorAll('.field.is-missing').forEach(function (f) { f.classList.remove('is-missing'); });
    state.open.forEach(function (path) {
      var el = document.querySelector('[data-spec="' + path + '"]');
      if (!el) return;
      var wrap = el.closest('.field');
      if (wrap) wrap.classList.add('is-missing');
    });
  }

  function lock(id, locked) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('is-locked', !!locked);
  }

  /* ---------------- 导出 ---------------- */

  function build(data, state) {
    var figs = {};
    Object.keys(FIG_NAMES).forEach(function (f) {
      var src = data.figures && data.figures[f] ? data.figures[f] : {};
      figs[f] = {
        source: 'figures/' + f + '.svg',
        reader: src.reader || '',
        question: src.question || '',
        outOfScope: src.outOfScope || '',
        confirmed: src.confirmed === true
      };
    });

    var roles = [];
    [0, 1, 2].forEach(function (i) {
      var r = getPath(data, 'agent.roles.' + i) || {};
      if (r.name) roles.push({ name: r.name, duty: r.duty || '', outputSchema: r.outputSchema || '' });
    });

    var orch = [];
    [0, 1, 2, 3, 4].forEach(function (i) {
      var o = getPath(data, 'orchestration.' + i) || {};
      orch.push({
        stage: ['ask', 'draw', 'build', 'verify', 'archive'][i],
        artifact: ['需求澄清单', '图显前置包', '可运行增量', '验收记录', '复盘 + 资产'][i],
        gate: o.gate || '',
        done: o.done === true
      });
    });

    return {
      schema: 'hnp.diagram-first/1',
      generatedAt: new Date().toISOString(),
      status: state.status,
      complexity: {
        level: state.level || '',
        reason: getPath(data, 'complexity.reason') || '',
        figuresRequired: state.cfg.figs.slice(),
        gates: state.cfg.gates.slice()
      },
      benchmark: {
        entry: getPath(data, 'benchmark.entry') || '',
        refs: (getPath(data, 'benchmark.refs') || []).filter(function (r) { return r && r.name; }),
        layers: getPath(data, 'benchmark.layers') || {},
        executability: getPath(data, 'benchmark.executability') || {},
        scale: getPath(data, 'benchmark.scale') || '',
        scaleNote: getPath(data, 'benchmark.scaleNote') || ''
      },
      app: {
        name: getPath(data, 'app.name') || '',
        oneLine: getPath(data, 'app.oneLine') || '',
        audience: getPath(data, 'app.audience') || '',
        reference: getPath(data, 'app.reference') || ''
      },
      effectImage: {
        mode: getPath(data, 'effectImage.mode') || 'placeholder',
        path: 'figures/effect.png',
        prompt: getPath(data, 'effectImage.prompt') || ''
      },
      figures: figs,
      agent: {
        topology: getPath(data, 'agent.topology') || '',
        roles: roles,
        needsServer: getPath(data, 'agent.needsServer') === 'true',
        needsAI: getPath(data, 'agent.needsAI') === 'true'
      },
      orchestration: orch,
      acceptance: ACCEPT.map(function (q, i) {
        return {
          id: 'Q' + (i + 1),
          question: q,
          answer: getPath(data, 'acceptance.' + i + '.answer') || ''
        };
      }),
      open: state.open.slice()
    };
  }

  function toMarkdown(p) {
    var L = [];
    L.push('# ' + (p.app.name || '（未命名应用）') + ' · 图显前置包');
    L.push('');
    L.push('> 由 diagram-first 工作台导出 · ' + p.status + ' · ' + p.generatedAt);
    L.push('');
    L.push('## 一句话');
    L.push(p.app.oneLine || '（未填）');
    L.push('');
    L.push('## 定级');
    L.push('- 级别：' + (p.complexity.level || '未定') + '（' + (p.complexity.reason || '无理由') + '）');
    L.push('- 需要的图：' + p.complexity.figuresRequired.join(' / '));
    L.push('- 质量门：' + p.complexity.gates.join(' / '));
    L.push('');
    L.push('## 对标（BDMP）');
    L.push('- 体量：' + (p.benchmark.scale || '未评'));
    (p.benchmark.refs || []).forEach(function (r) {
      L.push('- 参考：' + r.name + '（借 ' + (r.borrow || '未标注') + '）');
    });
    L.push('');
    L.push('## 五张图');
    Object.keys(p.figures).forEach(function (f) {
      var g = p.figures[f];
      L.push('### ' + FIG_NAMES[f] + (g.confirmed ? ' ✅' : ' ⬜'));
      L.push('- 图源：' + g.source);
      L.push('- 给谁看：' + (g.reader || '—'));
      L.push('- 回答什么：' + (g.question || '—'));
      L.push('- 不回答什么：' + (g.outOfScope || '—'));
    });
    L.push('');
    L.push('## 角色与回合');
    L.push('- 拓扑：' + (p.agent.topology || '未定'));
    (p.agent.roles || []).forEach(function (r) {
      L.push('  - ' + r.name + '：' + (r.duty || '—') + (r.outputSchema ? '，输出 ' + r.outputSchema : ''));
    });
    L.push('- 需要服务端：' + (p.agent.needsServer ? '是' : '否'));
    L.push('- 需要 ai 能力：' + (p.agent.needsAI ? '是' : '否'));
    L.push('');
    L.push('## 五段与门');
    p.orchestration.forEach(function (o) {
      L.push('- [' + (o.done ? 'x' : ' ') + '] ' + o.stage + ' · ' + o.artifact + ' · 门：' + o.gate);
    });
    L.push('');
    L.push('## 验收');
    (p.acceptance || []).forEach(function (a) {
      L.push('- **' + a.id + '** ' + a.question);
      L.push('  ' + (a.answer || '（未填）'));
    });
    L.push('');
    L.push('## 必须确认的三件事');
    L.push('1. 角色拓扑：' + (p.agent.topology || '未定'));
    L.push('2. 是否需要服务端：' + (p.agent.needsServer ? '需要' : '不需要'));
    L.push('3. 必须通过的硬验证：连续新局 5 次会话稳定 / 刷新 3 次不增长 / 停止后会话已清理');
    if (p.open.length) {
      L.push('');
      L.push('## 还差什么（' + p.open.length + ' 项）');
      p.open.forEach(function (k) { L.push('- ' + (LABELS[k] || k)); });
    }
    return L.join('\n');
  }

  function download(name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function snapshot() {
    var data = collect();
    return { data: data, state: evaluate(data) };
  }

  function exportJSON() {
    var s = snapshot();
    var payload = build(s.data, s.state);
    var text = JSON.stringify(payload, null, 2);
    // 调试/自动化钩子：导出结果同时挂在 window 上，方便核对结构，不参与业务
    window.__lastExport = payload;
    download('diagram-first.json', text, 'application/json;charset=utf-8');
    if (window.HNP && HNP.copy) HNP.copy(text);
    console.log('[diagram-first] 已导出', payload.status, '缺', payload.open.length, '项');
  }

  function exportMD() {
    var s = snapshot();
    var md = toMarkdown(build(s.data, s.state));
    download('app-spec.md', md, 'text/markdown;charset=utf-8');
    if (window.HNP && HNP.copy) HNP.copy(md);
  }

  function showOpen() {
    var s = snapshot();
    var out = document.getElementById('open-list');
    if (!out) return;
    if (!s.state.open.length) {
      out.textContent = '没有缺项。可以导出定稿了（status = ' + s.state.status + '）。';
      return;
    }
    out.textContent = '还差 ' + s.state.open.length + ' 项：\n' +
      s.state.open.map(function (k) { return '  - ' + (LABELS[k] || k) + '  [' + k + ']'; }).join('\n');
  }

  /* ---------------- 选择组 ---------------- */

  function initGroups() {
    document.querySelectorAll('[data-group]').forEach(function (group) {
      var path = group.getAttribute('data-group');
      var current = group.getAttribute('data-value') || '';
      group.querySelectorAll('[data-value]').forEach(function (btn) {
        if (btn.getAttribute('data-value') === current) btn.classList.add('is-on');
        btn.addEventListener('click', function () {
          group.setAttribute('data-value', btn.getAttribute('data-value'));
          group.querySelectorAll('[data-value]').forEach(function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          refresh();
        });
      });
    });
  }

  /* ---------------- 效果图 ---------------- */

  function initEffect() {
    var input = document.getElementById('effect-file');
    var preview = document.getElementById('effect-preview');
    var save = document.getElementById('btn-save-effect');
    var picked = null;

    if (input) {
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) return;
        picked = f;
        if (preview) {
          preview.src = URL.createObjectURL(f);
          preview.style.display = 'block';
        }
      });
    }

    if (save) {
      save.addEventListener('click', function () {
        if (!picked) { alert('先选一张图'); return; }
        var reader = new FileReader();
        reader.onload = function () {
          download('effect.png', reader.result, 'image/png');
          alert('已下载 effect.png。把它放进 figures/ 目录，然后重新打开页面即可。');
        };
        reader.readAsArrayBuffer(picked);
      });
    }
  }

  /* ---------------- 启动 ---------------- */

  var timer = null;
  function refresh() {
    var s = snapshot();
    render(s.state, s.data);
  }

  function boot() {
    initGroups();
    initEffect();

    document.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(refresh, 160);
    });
    document.addEventListener('change', function () { refresh(); });

    var bind = function (id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    bind('btn-json', exportJSON);
    bind('btn-json-2', exportJSON);
    bind('btn-md', exportMD);
    bind('btn-md-2', exportMD);
    bind('btn-check', showOpen);
    bind('btn-print', function () { window.print(); });

    refresh();

    if (window.HNP) {
      HNP.on('tabs:change', function () { refresh(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
