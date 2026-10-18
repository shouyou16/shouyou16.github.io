/*!
 * 手游16游戏盒子官网 - 全站交互脚本（main.js）
 * ------------------------------------------------------------
 * 适用站点: https://shouyou16.github.io/
 * 版权: © 2026 手游16游戏盒子
 *
 * 链接纪律警示（FR-LINKRULE-03，全文档最高优先级）：
 *   链接A（下载链接）仅允许出现在 index.html / download.html；
 *   链接B（攻略页下载链接）仅允许出现在 guide.html；
 *   两条链接绝不允许共页；本脚本被全部页面共享，故不得书写任何下载外链 URL 字面量。
 *
 * 技术约束：IIFE + 'use strict'；无 ES Modules、无 fetch/XHR（file:// 兼容，D4）；
 *          仅消费 §2.2 A 钩子契约（html.js / body[data-page] / a[data-nav] /
 *          .menu-toggle / #site-nav / [data-reveal] / #back-to-top /
 *          .filter-btn[data-filter] / .game-card[data-category] / .empty-state[hidden]）；
 *          钩子不存在时静默跳过（跨页面安全）。
 */
(function () {
  'use strict';

  var doc = document;
  var win = window;

  /* boot：渐进增强总开关——html.js 类（D3 / FR-INTER-08）。
     CSS 以 .js 前缀门控动效与折叠态；无 JS 时内容与导航全部可见可用。 */
  doc.documentElement.classList.add('js');

  /* ---------------------------------------------------------------
     nav：当前页导航高亮（FR-INTER-01）
     读取 body[data-page]，与 a.nav-link[data-nav] 匹配后加 .is-active。
     --------------------------------------------------------------- */
  (function nav() {
    var page = doc.body.getAttribute('data-page');
    if (!page) { return; }
    var links = doc.querySelectorAll('.nav-link[data-nav]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-nav') === page) {
        links[i].classList.add('is-active');
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }());

  /* ---------------------------------------------------------------
     menu：移动端汉堡菜单（FR-INTER-05/06）
     < 768px 切换 #site-nav.is-open + aria-expanded；
     点击菜单项 / 菜单外区域 / ESC 收起；回桌面宽度自动复位。
     --------------------------------------------------------------- */
  (function menu() {
    var toggle = doc.querySelector('.menu-toggle');
    var navEl = doc.getElementById('site-nav');
    if (!toggle || !navEl) { return; }

    function setOpen(open) {
      navEl.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!navEl.classList.contains('is-open'));
    });

    /* 点击菜单内链接：先收起，跳转交给浏览器默认行为 */
    navEl.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a') : null;
      if (link) { setOpen(false); }
    });

    /* 点击菜单外区域收起 */
    doc.addEventListener('click', function (e) {
      if (!navEl.classList.contains('is-open')) { return; }
      if (navEl.contains(e.target) || toggle.contains(e.target)) { return; }
      setOpen(false);
    });

    /* ESC 收起并回焦按钮 */
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      if (navEl.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* 视口回到桌面宽度时复位折叠态 */
    win.addEventListener('resize', function () {
      if (win.innerWidth >= 768) { setOpen(false); }
    });
  }());

  /* ---------------------------------------------------------------
     reveal：滚动进入显现（FR-INTER-03，一次性，AC-21）
     IntersectionObserver 进入视口 → 加 .is-revealed → 立即 unobserve；
     不支持 IO 的环境直接全部显现（NFR-COMPAT-02 优雅降级）。
     --------------------------------------------------------------- */
  (function reveal() {
    var items = doc.querySelectorAll('[data-reveal]');
    if (!items.length) { return; }

    if (!('IntersectionObserver' in win)) {
      for (var i = 0; i < items.length; i++) { items[i].classList.add('is-revealed'); }
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-revealed');
          io.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    for (var j = 0; j < items.length; j++) { io.observe(items[j]); }
  }());

  /* ---------------------------------------------------------------
     backTop：返回顶部（FR-INTER-02）
     滚动超过一屏移除 hidden，反之恢复；scroll 监听 passive + rAF 节流；
     点击平滑回顶（prefers-reduced-motion 由 CSS 覆盖，JS 不重复处理）。
     --------------------------------------------------------------- */
  (function backTop() {
    var btn = doc.getElementById('back-to-top');
    if (!btn) { return; }

    var ticking = false;
    function update() {
      var show = win.scrollY > win.innerHeight;
      if (show === btn.hidden) { btn.hidden = !show; }
      ticking = false;
    }
    win.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; win.requestAnimationFrame(update); }
    }, { passive: true });
    update();

    btn.addEventListener('click', function () {
      win.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }());

  /* ---------------------------------------------------------------
     filter：games.html 分类筛选（FR-GAMES-03/04/05）
     仅在 .filter-bar 钩子存在时激活；切换 .is-active + aria-pressed；
     按 data-filter 与 .game-card[data-category] 匹配做 display 显隐
     （仅显隐，不生成内容，NFR-AI-02）；结果为 0 时显示 .empty-state。
     --------------------------------------------------------------- */
  (function filter() {
    var bar = doc.querySelector('.filter-bar');
    if (!bar) { return; }
    var btns = bar.querySelectorAll('.filter-btn[data-filter]');
    var cards = doc.querySelectorAll('.game-card[data-category]');
    var empty = doc.querySelector('.empty-state');
    if (!btns.length || !cards.length) { return; }

    function apply(key) {
      var visible = 0;
      for (var i = 0; i < cards.length; i++) {
        var match = key === 'all' || cards[i].getAttribute('data-category') === key;
        cards[i].hidden = !match;
        if (match) { visible++; }
      }
      if (empty) { empty.hidden = visible !== 0; }
    }

    bar.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.filter-btn[data-filter]') : null;
      if (!btn) { return; }
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i] === btn;
        btns[i].classList.toggle('is-active', on);
        btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      apply(btn.getAttribute('data-filter'));
    });
  }());
}());
