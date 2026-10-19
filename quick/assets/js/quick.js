/*!
 * 快玩游戏站 · quick 子站交互脚本（纯原生实现，零外部依赖）
 * ------------------------------------------------------------------
 * 维护纪律（重要，改动前必读）：
 *  1. 本文件禁止书写任何下载分发域名或站外跳转域名的明文，
 *     所有外部链接一律由 HTML 页面管理，脚本只负责行为增强；
 *  2. 禁止引入外部依赖：无网络请求、无动态模块加载；
 *  3. 全部功能均为渐进增强：禁用脚本时页面内容与链接仍完整可用。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  /* ── boot：标记脚本可用，供 CSS 折叠窄屏导航 ─────────────── */
  var boot = function () {
    document.documentElement.classList.add('q-js');
  };
  boot();

  /* ── nav：依据 body[data-qpage] 高亮当前页导航项 ─────────── */
  var nav = function () {
    var page = document.body.getAttribute('data-qpage');
    if (!page) {
      return;
    }
    var links = document.querySelectorAll('a.q-nav-link[data-qnav]');
    Array.prototype.forEach.call(links, function (link) {
      if (link.getAttribute('data-qnav') === page) {
        link.classList.add('is-on');
        link.setAttribute('aria-current', 'page');
      }
    });
  };
  nav();

  /* ── menu：窄屏（<720px）菜单开合，回桌面宽度自动复位 ────── */
  var menu = function () {
    var btn = document.querySelector('.q-menu-btn');
    var navEl = document.getElementById('q-nav');
    if (!btn || !navEl) {
      return;
    }

    var mq = window.matchMedia('(min-width: 720px)');

    var close = function () {
      navEl.classList.remove('is-on');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', function () {
      var on = navEl.classList.toggle('is-on');
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });

    /* 点击菜单内任一链接后收起 */
    navEl.addEventListener('click', function (e) {
      if (e.target instanceof Element && e.target.closest('a')) {
        close();
      }
    });

    /* 点击菜单外部区域收起 */
    document.addEventListener('click', function (e) {
      if (!navEl.classList.contains('is-on')) {
        return;
      }
      if (!navEl.contains(e.target) && !btn.contains(e.target)) {
        close();
      }
    });

    /* 按下 ESC 收起 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        close();
      }
    });

    /* 视口回到桌面宽度时复位折叠状态 */
    var onMqChange = function (e) {
      if (e.matches) {
        close();
      }
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onMqChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onMqChange); /* 旧版浏览器回退 */
    }
  };
  menu();

  /* ── filter：游戏大全页分类筛选（单选芯片 + 卡片显隐 + 空态） ── */
  var filter = function () {
    var bar = document.querySelector('.q-chipbar');
    if (!bar) {
      return;
    }
    var chips = bar.querySelectorAll('.q-chip[data-qfilter]');
    var games = document.querySelectorAll('.q-game[data-qcat]');
    var empty = document.querySelector('.q-empty');
    if (chips.length === 0 || games.length === 0) {
      return;
    }

    var apply = function (key) {
      var visible = 0;
      Array.prototype.forEach.call(games, function (game) {
        var show = key === 'all' || game.getAttribute('data-qcat') === key;
        if (show) {
          game.removeAttribute('hidden');
          visible += 1;
        } else {
          game.setAttribute('hidden', '');
        }
      });
      if (empty) {
        if (visible === 0) {
          empty.removeAttribute('hidden');
        } else {
          empty.setAttribute('hidden', '');
        }
      }
    };

    /* 初始化芯片的可按下状态（选中态由 HTML 预置） */
    Array.prototype.forEach.call(chips, function (chip) {
      chip.setAttribute(
        'aria-pressed',
        chip.classList.contains('is-on') ? 'true' : 'false'
      );
      chip.addEventListener('click', function () {
        Array.prototype.forEach.call(chips, function (other) {
          other.classList.remove('is-on');
          other.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('is-on');
        chip.setAttribute('aria-pressed', 'true');
        apply(chip.getAttribute('data-qfilter'));
      });
    });
  };
  filter();

  /* ── top：滚动超过一屏后显示回顶按钮 ─────────────────────── */
  var top = function () {
    var btn = document.getElementById('q-top-btn');
    if (!btn) {
      return;
    }

    var update = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      btn.classList.toggle('is-on', y > window.innerHeight);
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
  top();
})();
