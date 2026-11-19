/*!
 * 图显前置工作台 · seed.js
 * 把已确认的规格填进页面，让工作台一打开就是江小豚，而不是空白模板。
 * 数据在 data/jiangxiaotun.js（挂 window.SPUER_SEED）；地址栏加 ?empty 可跳过种子。
 * 只做同步读取、不 fetch——否则 file:// 下双击打开会读不到。
 * 依赖 spec.js 的既有接线：input/change 触发重算，选择组靠 data-group 的 data-value。
 */
(function () {
  'use strict';

  function skip() {
    return location.search.indexOf('empty') > -1;
  }

  function fire(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function setField(path, value) {
    var el = document.querySelector('[data-spec="' + path + '"]');
    if (!el) return false;
    if (el.type === 'checkbox') el.checked = value === true;
    else el.value = (value === null || value === undefined) ? '' : String(value);
    fire(el, 'input');
    fire(el, 'change');
    return true;
  }

  function setGroup(path, value) {
    var group = document.querySelector('[data-group="' + path + '"]');
    if (!group || !value) return false;
    group.setAttribute('data-value', value);
    group.querySelectorAll('[data-value]').forEach(function (btn) {
      btn.classList.toggle('is-on', btn.getAttribute('data-value') === value);
    });
    return true;
  }

  function boot() {
    if (skip()) return;

    var seed = window.SPUER_SEED;
    if (!seed) {
      console.info('[seed] 未找到 window.SPUER_SEED，按空模板运行。');
      return;
    }

    var miss = [];
    Object.keys(seed.groups || {}).forEach(function (k) {
      if (!setGroup(k, seed.groups[k])) miss.push(k);
    });
    Object.keys(seed.fields || {}).forEach(function (k) {
      if (!setField(k, seed.fields[k])) miss.push(k);
    });
    document.dispatchEvent(new Event('change', { bubbles: true }));
    if (miss.length) console.warn('[seed] 未匹配到字段：' + miss.join(', '));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
