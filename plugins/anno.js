/* HNP 插件 · anno — 就地批注：选中即批，产出 JSON 与 kunpeng-ops annotations 台账对齐 */
(function () {
  'use strict';
  if (!window.HNP) return;

  var TYPES = [['agree', '认可'], ['reject', '否决'], ['hold', '悬置'], ['delegate', '代议'], ['note', '补充']];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function labelOf(t) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i][0] === t) return TYPES[i][1];
    return '补充';
  }

  function flash(btn, text) {
    var old = btn.textContent;
    btn.textContent = text;
    setTimeout(function () { btn.textContent = old; }, 1500);
  }

  HNP.define('anno', {
    mount: function (el, ctx) {
      var doc = ctx.document;
      var items = [];
      var cur = null;
      var typeSel = null;

      /* ---------- 浮标 ---------- */
      var pop = doc.createElement('div');
      pop.className = 'hnp-anno-pop';
      pop.innerHTML = '<button type="button">＋ 批注</button>';

      /* ---------- 表单 ---------- */
      var form = doc.createElement('div');
      form.className = 'hnp-anno-form';
      form.innerHTML =
        '<div class="hnp-anno-form__q"></div>' +
        '<div class="hnp-anno-types">' + TYPES.map(function (t) {
          return '<button class="hnp-anno-type" type="button" data-t="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        '<textarea rows="3" placeholder="写一句…（Ctrl+Enter 加入）"></textarea>' +
        '<div class="hnp-anno-form__f">' +
          '<button class="hnp-btn" type="button" data-a="cancel">取消</button>' +
          '<button class="hnp-btn pri" type="button" data-a="save">加入批注</button>' +
        '</div>';

      /* ---------- 篮子 ---------- */
      var basket = doc.createElement('div');
      basket.className = 'hnp-anno-basket';
      basket.innerHTML =
        '<div class="hnp-anno-basket__h">批注 <b>0</b> 条 <i>展开</i></div>' +
        '<div class="hnp-anno-basket__b"></div>' +
        '<div class="hnp-anno-basket__f">' +
          '<button class="hnp-btn pri" type="button" data-a="export">导出 JSON</button>' +
          '<button class="hnp-btn" type="button" data-a="text">复制为文本</button>' +
        '</div>';

      doc.body.appendChild(pop);
      doc.body.appendChild(form);
      doc.body.appendChild(basket);

      var qEl = form.querySelector('.hnp-anno-form__q');
      var taEl = form.querySelector('textarea');

      function hidePop() { pop.classList.remove('on'); }
      function hideForm() { form.classList.remove('on'); }

      ctx.nodes = [pop, form, basket];

      /* ---------- 选中即批 ---------- */
      ctx.on(doc, 'mouseup', function (e) {
        if (form.contains(e.target) || pop.contains(e.target) || basket.contains(e.target)) return;
        setTimeout(function () {
          var sel = window.getSelection();
          if (!sel || sel.isCollapsed || !sel.rangeCount) { hidePop(); return; }
          var text = String(sel).replace(/\s+/g, ' ').trim();
          if (text.length < 2) { hidePop(); return; }

          var range = sel.getRangeAt(0);
          var node = range.commonAncestorContainer;
          if (node.nodeType === 3) node = node.parentNode;
          var block = node.closest ? node.closest('[data-block]') : null;
          if (!block) { hidePop(); return; }

          var rect = range.getBoundingClientRect();
          if (!rect || (!rect.width && !rect.height)) { hidePop(); return; }

          cur = {
            block: block.getAttribute('data-block'),
            quote: text.slice(0, 90),
            rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)]
          };

          pop.style.left = (window.scrollX + rect.left + Math.max(0, rect.width / 2 - 36)) + 'px';
          pop.style.top = (window.scrollY + rect.bottom + 7) + 'px';
          pop.classList.add('on');
          hideForm();
        }, 12);
      });

      ctx.on(pop, 'click', function () {
        if (!cur) return;
        qEl.textContent = '「' + cur.quote + '」';
        taEl.value = '';
        typeSel = null;
        Array.prototype.forEach.call(form.querySelectorAll('.hnp-anno-type'), function (b) { b.classList.remove('on'); });

        var pr = pop.getBoundingClientRect();
        var maxLeft = window.scrollX + doc.documentElement.clientWidth - 340;
        form.style.left = Math.min(window.scrollX + pr.left, maxLeft) + 'px';
        form.style.top = (window.scrollY + pr.bottom + 6) + 'px';
        hidePop();
        form.classList.add('on');
        taEl.focus();
      });

      function save() {
        var note = taEl.value.trim();
        if (!note) { taEl.focus(); return; }
        var item = {
          id: 'A-' + (items.length + 1),
          block: cur.block,
          quote: cur.quote,
          type: typeSel || 'note',
          note: note,
          rect: cur.rect,
          at: new Date().toISOString()
        };
        items.push(item);
        taEl.value = '';
        hideForm();
        render();
        basket.classList.add('open');
        ctx.emit('anno:add', item);
      }

      /* ---------- 渲染 ---------- */
      function render() {
        basket.querySelector('.hnp-anno-basket__h b').textContent = items.length;
        basket.querySelector('.hnp-anno-basket__h i').textContent =
          basket.classList.contains('open') ? '收起' : '展开';

        var body = basket.querySelector('.hnp-anno-basket__b');
        if (!items.length) {
          body.innerHTML = '<div class="hnp-anno-item" style="color:var(--txt3)">还没有批注。选中页面上任意一句，点「＋ 批注」。</div>';
          return;
        }
        body.innerHTML = items.map(function (it, i) {
          return '<div class="hnp-anno-item">' +
            '<button class="hnp-anno-item__x" type="button" data-i="' + i + '" title="删除">×</button>' +
            '<div class="hnp-anno-item__m">' +
              '<span class="hnp-anno-t" data-t="' + it.type + '">' + labelOf(it.type) + '</span>' +
              '<span>' + esc(it.block) + '</span></div>' +
            '<div class="hnp-anno-item__q">「' + esc(it.quote) + '」</div>' +
            '<div class="hnp-anno-item__n">' + esc(it.note) + '</div>' +
          '</div>';
        }).join('');
      }

      ctx.on(form, 'click', function (e) {
        var t = e.target.closest('.hnp-anno-type');
        if (t) {
          Array.prototype.forEach.call(form.querySelectorAll('.hnp-anno-type'), function (b) { b.classList.remove('on'); });
          t.classList.add('on');
          typeSel = t.getAttribute('data-t');
          return;
        }
        var a = e.target.closest('[data-a]');
        if (!a) return;
        if (a.getAttribute('data-a') === 'cancel') hideForm();
        else save();
      });

      ctx.on(basket, 'click', function (e) {
        var x = e.target.closest('.hnp-anno-item__x');
        if (x) {
          var removed = items.splice(+x.getAttribute('data-i'), 1)[0];
          render();
          ctx.emit('anno:remove', removed);
          return;
        }
        var a = e.target.closest('[data-a]');
        if (!a) {
          if (e.target.closest('.hnp-anno-basket__h')) {
            basket.classList.toggle('open');
            basket.querySelector('.hnp-anno-basket__h i').textContent =
              basket.classList.contains('open') ? '收起' : '展开';
          }
          return;
        }
        if (a.getAttribute('data-a') === 'export') {
          var payload = {
            doc: doc.title,
            annotations: items,
            exportedAt: new Date().toISOString()
          };
          HNP.copy(JSON.stringify(payload, null, 2));
          flash(a, '已复制 JSON');
          ctx.emit('anno:export', payload);
        } else {
          HNP.copy(items.map(function (it, i) {
            return (i + 1) + '. [' + labelOf(it.type) + '][' + it.block + '] 「' + it.quote + '」→ ' + it.note;
          }).join('\n') || '（无批注）');
          flash(a, '已复制文本');
        }
      });

      ctx.on(taEl, 'keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
        if (e.key === 'Escape') hideForm();
      });
      ctx.on(doc, 'keydown', function (e) {
        if (e.key === 'Escape') { hidePop(); hideForm(); }
      });

      render();
      ctx.getItems = function () { return items.slice(); };
    },

    unmount: function (el, ctx) {
      (ctx.nodes || []).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      ctx.nodes = [];
    }
  });
})();
