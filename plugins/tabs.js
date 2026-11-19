/* HNP 插件 · tabs — 标签页，支持方向键，容器内可有多组互不干扰 */
(function () {
  'use strict';
  if (!window.HNP) return;

  HNP.define('tabs', {
    mount: function (el, ctx) {
      var btns = Array.prototype.slice.call(el.querySelectorAll('.hnp-tab'));
      var panes = Array.prototype.slice.call(el.querySelectorAll('.hnp-pane'));
      if (!btns.length) return;

      function select(i) {
        btns.forEach(function (b) {
          b.setAttribute('aria-selected', 'false');
          b.setAttribute('tabindex', '-1');
        });
        panes.forEach(function (p) { p.classList.remove('on'); });
        if (btns[i]) {
          btns[i].setAttribute('aria-selected', 'true');
          btns[i].setAttribute('tabindex', '0');
        }
        if (panes[i]) panes[i].classList.add('on');
        ctx.emit('tabs:change', { index: i, el: el });
      }

      btns.forEach(function (btn, i) {
        btn.setAttribute('role', 'tab');
        ctx.on(btn, 'click', function () { select(i); });
        ctx.on(btn, 'keydown', function (e) {
          var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          var next = btns[(i + step + btns.length) % btns.length];
          next.focus();
          next.click();
        });
      });

      select(0);
    }
  });
})();
