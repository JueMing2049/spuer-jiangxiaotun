/*!
 * HNP · HTML Native Plugin  v0.1.0
 * 零依赖 · 原生 API · 注册制交互插件运行时
 * 加一行 script、写一个 data-hnp，页面就长出交互；双击 HTML 即可用，不需要任何人安装东西。
 */
(function (global) {
  'use strict';

  var VERSION = '0.3.0';
  var ATTR = 'data-hnp';

  var registry = Object.create(null);
  var order = [];
  var mounted = new WeakMap();   // Element -> { name: true }
  var live = [];                 // { name, el, ctx }
  var bus = Object.create(null);
  var booted = false;

  function warn() {
    if (!global.console || !console.warn) return;
    var args = ['[hnp]'].concat(Array.prototype.slice.call(arguments));
    console.warn.apply(console, args);
  }

  function reducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- 事件总线 ---------- */
  function on(evt, fn) {
    (bus[evt] || (bus[evt] = [])).push(fn);
    return function () { off(evt, fn); };
  }

  function off(evt, fn) {
    var list = bus[evt];
    if (!list) return;
    var i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  }

  function emit(evt, payload) {
    (bus[evt] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { warn('订阅者出错：' + evt, e); }
    });
    (bus['*'] || []).slice().forEach(function (fn) {
      try { fn({ type: evt, payload: payload }); } catch (e) { /* 通配订阅失败不影响主流程 */ }
    });
  }

  /* ---------- 带命名空间的安全存储 ---------- */
  function store(ns) {
    var prefix = 'hnp:' + ns + ':';
    function run(fn, fallback) {
      try { return fn(); } catch (e) { return fallback; }
    }
    return {
      get: function (k, d) {
        var v = run(function () { return global.localStorage.getItem(prefix + k); }, null);
        return v === null || v === undefined ? d : v;
      },
      set: function (k, v) { run(function () { global.localStorage.setItem(prefix + k, String(v)); }); },
      remove: function (k) { run(function () { global.localStorage.removeItem(prefix + k); }); },
      getJSON: function (k, d) {
        var raw = this.get(k, null);
        if (!raw) return d;
        return run(function () { return JSON.parse(raw); }, d);
      },
      setJSON: function (k, v) { this.set(k, JSON.stringify(v)); }
    };
  }

  /* ---------- 复制到剪贴板（含 execCommand 兜底） ---------- */
  function copy(text) {
    var done = false;
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { fallback(); });
      done = true;
    }
    if (!done) fallback();

    function fallback() {
      var ta = global.document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      global.document.body.appendChild(ta);
      ta.select();
      try { global.document.execCommand('copy'); } catch (e) { warn('复制失败', e); }
      global.document.body.removeChild(ta);
    }
  }

  /* ---------- 元素选项 ---------- */
  function readOpts(el) {
    var out = {};
    if (!el || !el.attributes) return out;
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name.indexOf('data-hnp-') !== 0) continue;
      var key = a.name.slice(9).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
      out[key] = a.value;
    }
    return out;
  }

  /* ---------- 上下文 ---------- */
  function makeCtx(name, spec, el) {
    var disposers = [];
    var opts = {};
    var defaults = spec.defaults || {};
    var raw = readOpts(el);
    Object.keys(defaults).forEach(function (k) { opts[k] = defaults[k]; });
    Object.keys(raw).forEach(function (k) { opts[k] = raw[k]; });

    var ctx = {
      name: name,
      el: el,
      opts: opts,
      document: global.document,
      reducedMotion: reducedMotion(),
      emit: emit,
      store: store(name),
      on: function (target, type, fn, opt) {
        if (!target || !target.addEventListener) return fn;
        target.addEventListener(type, fn, opt);
        disposers.push(function () { target.removeEventListener(type, fn, opt); });
        return fn;
      },
      every: function (ms, fn) {
        var id = global.setInterval(fn, ms);
        disposers.push(function () { global.clearInterval(id); });
        return id;
      },
      later: function (ms, fn) {
        var id = global.setTimeout(fn, ms);
        disposers.push(function () { global.clearTimeout(id); });
        return id;
      },
      observer: function (io, target) {
        if (!io || !target) return;
        io.observe(target);
        disposers.push(function () { try { io.unobserve(target); } catch (e) {} });
      },
      dispose: function () {
        var list = disposers.splice(0);
        list.forEach(function (d) { try { d(); } catch (e) {} });
      }
    };
    return ctx;
  }

  /* ---------- 注册 ---------- */
  function define(name, spec) {
    if (!name || typeof name !== 'string') {
      warn('define 需要一个插件名');
      return false;
    }
    if (!spec || typeof spec.mount !== 'function') {
      warn('插件 "' + name + '" 缺少 mount 方法');
      return false;
    }
    if (registry[name]) warn('插件 "' + name + '" 已被覆盖注册');
    else order.push(name);
    registry[name] = spec;
    return true;
  }

  function defined(name) { return !!registry[name]; }
  function plugins() { return order.slice(); }

  /* ---------- 挂载 ---------- */
  function mountOne(el, name) {
    var spec = registry[name];
    if (!spec) { warn('插件 "' + name + '" 未注册，已跳过'); return false; }

    var set = mounted.get(el);
    if (!set) { set = Object.create(null); mounted.set(el, set); }
    if (set[name]) return false;              // 幂等：同一元素同一插件只挂一次

    var ctx = makeCtx(name, spec, el);
    try {
      spec.mount(el, ctx);
    } catch (e) {
      warn('插件 "' + name + '" 挂载失败', e);
      ctx.dispose();
      return false;
    }
    set[name] = true;
    live.push({ name: name, el: el, ctx: ctx });
    emit('hnp:mount', { name: name, el: el });
    return true;
  }

  function mount(root, options) {
    var scope = root || global.document;
    if (!scope || !scope.querySelectorAll) return 0;
    var only = options && options.plugins ? options.plugins : null;
    var hit = [];

    if (scope.nodeType === 1 && scope.hasAttribute && scope.hasAttribute(ATTR)) hit.push(scope);
    Array.prototype.forEach.call(scope.querySelectorAll('[' + ATTR + ']'), function (el) { hit.push(el); });

    var count = 0;
    hit.forEach(function (el) {
      String(el.getAttribute(ATTR) || '').split(/\s+/).forEach(function (name) {
        if (!name) return;
        if (only && only.indexOf(name) === -1) return;
        if (mountOne(el, name)) count++;
      });
    });
    return count;
  }

  /* ---------- 卸载 ---------- */
  function unmount(root, name) {
    var scope = root || global.document;
    var removed = 0;
    live.slice().forEach(function (item) {
      if (name && item.name !== name) return;
      if (scope !== global.document && scope !== global.document.body &&
          item.el !== scope && !scope.contains(item.el)) return;

      var spec = registry[item.name];
      try { if (spec && typeof spec.unmount === 'function') spec.unmount(item.el, item.ctx); } catch (e) { warn('插件 "' + item.name + '" 卸载失败', e); }
      item.ctx.dispose();

      var set = mounted.get(item.el);
      if (set) delete set[item.name];

      var i = live.indexOf(item);
      if (i > -1) live.splice(i, 1);
      removed++;
      emit('hnp:unmount', { name: item.name, el: item.el });
    });
    return removed;
  }

  /* ---------- 自检信息（给 demo 与测试用） ---------- */
  function inspect() {
    var byName = {};
    live.forEach(function (item) { byName[item.name] = (byName[item.name] || 0) + 1; });
    return {
      version: VERSION,
      registered: plugins(),
      installed: live.length,
      byName: byName
    };
  }

  /* ---------- 按名取用 ---------- */
  function use(name) {
    if (!registry[name]) warn('插件 "' + name + '" 未注册');
    return { mount: function (root) { return mount(root, { plugins: [name] }); } };
  }

  /* ---------- 启动 ---------- */
  function boot() {
    if (booted) return;
    booted = true;
    var html = global.document.documentElement;
    var manual = html && html.getAttribute('data-hnp-auto') === 'false';
    var count = manual ? 0 : mount(global.document);
    emit('hnp:ready', { version: VERSION, mounted: count, auto: !manual });
  }

  global.HNP = {
    version: VERSION,
    define: define,
    defined: defined,
    plugins: plugins,
    use: use,
    mount: mount,
    unmount: unmount,
    on: on,
    off: off,
    emit: emit,
    store: store,
    copy: copy,
    inspect: inspect
  };

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
}(typeof window !== 'undefined' ? window : this));
