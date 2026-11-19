/* HNP 插件 · timeline — 时间轴逐项点亮 */
(function () {
  'use strict';
  if (!window.HNP) return;

  HNP.define('timeline', {
    mount: function (el, ctx) {
      var nodes = Array.prototype.slice.call(el.querySelectorAll('.hnp-tl__i'));
      if (!nodes.length) return;

      if (ctx.reducedMotion || !('IntersectionObserver' in window)) {
        nodes.forEach(function (n) { n.classList.add('on'); });
        return;
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('on');
          io.unobserve(entry.target);
        });
      }, { rootMargin: '-30% 0px -40% 0px' });

      nodes.forEach(function (n) { ctx.observer(io, n); });
    }
  });
})();
