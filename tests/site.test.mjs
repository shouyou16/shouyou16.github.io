/**
 * 手游16游戏盒子官网 — 静态站点单元测试（Phase E / T-DEV-12 + quick-site-revamp Phase E）
 * 契约：
 *   - .codearts/specs/gamebox-website/design.md §5.2 测试矩阵 T-1~T-20（含 T-4b/T-12b）
 *   - .codearts/specs/quick-site-revamp/design.md §2.2.5 测试矩阵演化（T 组 13 条演化 + Q-1~Q-13 新增）
 *   - .codearts/specs/quick-site-revamp/tasks.md 工作包 C（T-C-01）与 §2.2.5B Q 契约
 * 运行：node --test tests/
 * 依赖：零第三方依赖（node:test + node:assert/strict + node:fs + node:path + node:child_process + node:url）
 * 约定：本脚本只读不写，不修改任何站点文件；发现产品缺陷时保留失败用例并在 Phase E 报告中列明。
 * AC 回映射（quick-site-revamp design.md §2.2.5）：
 *   AC 链接域→T-1~T-4b/Q-5/Q-6；AC 新站域→Q-1~Q-3/Q-7/Q-11/Q-13；AC 差异域→Q-4；
 *   AC 友链域→T-12d/Q-9；AC 邮箱域→T-15b/Q-8；AC 设施域→T-14/T-15b/T-17/T-19e/Q-10。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/* ========== 常量（测试断言的单一事实来源） ========== */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = '手游16游戏盒子';
const QUICK_BRAND = '快玩游戏站';
const SITE = 'https://shouyou16.github.io/';
const LINK_A = 'https://tui.buff.vip/37511'; // 链接A：仅允许出现在主站 index.html / download.html / guide.html
const LINK_B = 'https://cvtui.appd.cn/chaov?surl=AxdNUZ'; // 链接B：仅允许出现在 quick/home.html（1）与 quick/download.html（3，含 JSON-LD downloadUrl）
const FRIEND_URL = 'https://jdjdndn.github.io/'; // 必须出现在主站 links.html 与 quick/links.html
const REAL_EMAIL = '2667389861@qq.com'; // 真实联系邮箱（quick-site-revamp 邮箱域契约）

const PAGES = ['index.html', 'games.html', 'download.html', 'guide.html', 'about.html', 'links.html', '404.html'];
const QUICK_PAGES = ['home.html', 'games.html', 'download.html', 'help.html', 'about.html', 'links.html']; // quick/ 子站 6 页（无 index.html）
const ALL_PAGES = [...PAGES, ...QUICK_PAGES.map((p) => `quick/${p}`)]; // 13 页统一命名（quick/ 前缀）
const PAGE_BASE_DIR = (page) => (page.startsWith('quick/') ? 'quick/' : ''); // 页面所在目录（内链解析用）
const CONTENT_PAGES = ['games.html', 'download.html', 'guide.html', 'about.html', 'links.html']; // 5 个带面包屑的非首页
const QUICK_CONTENT_PAGES = QUICK_PAGES.slice(1); // quick 5 个非首页
const DATA_PAGE = {
  'index.html': 'home',
  'games.html': 'games',
  'download.html': 'download',
  'guide.html': 'guide',
  'about.html': 'about',
  'links.html': 'links',
  '404.html': 'notfound',
};
const QUICK_DATA_PAGE = {
  'home.html': 'home',
  'games.html': 'games',
  'download.html': 'download',
  'help.html': 'help',
  'about.html': 'about',
  'links.html': 'links',
};
const CANONICAL = {
  'index.html': SITE,
  'games.html': SITE + 'games.html',
  'download.html': SITE + 'download.html',
  'guide.html': SITE + 'guide.html',
  'about.html': SITE + 'about.html',
  'links.html': SITE + 'links.html',
  '404.html': SITE + '404.html',
};
const QUICK_CANONICAL = Object.fromEntries(QUICK_PAGES.map((p) => [p, `${SITE}quick/${p}`]));
const SITEMAP_URLS = [
  // §2.2.1 清单：主站 6 + quick 6（quick 首页为 quick/home.html 完整 URL，禁止 quick/ 裸目录）
  SITE,
  SITE + 'games.html',
  SITE + 'download.html',
  SITE + 'guide.html',
  SITE + 'about.html',
  SITE + 'links.html',
  SITE + 'quick/home.html',
  SITE + 'quick/games.html',
  SITE + 'quick/download.html',
  SITE + 'quick/help.html',
  SITE + 'quick/about.html',
  SITE + 'quick/links.html',
];
const NAV_ITEMS = [
  ['index.html', '首页'],
  ['games.html', '游戏大全'],
  ['download.html', '下载'],
  ['guide.html', '攻略帮助'],
  ['about.html', '关于'],
  ['links.html', '友情链接'],
];
const QUICK_NAV_ITEMS = [
  ['home.html', '首页'],
  ['games.html', '游戏大全'],
  ['download.html', '下载安装'],
  ['help.html', '帮助中心'],
  ['about.html', '关于'],
  ['links.html', '友情链接'],
];
const CATEGORIES = ['rpg', 'card', 'casual', 'action', 'sim']; // 与 quick 站 QUICK_CATEGORIES 一致（design.md §3.2）
const QUICK_CATEGORIES = CATEGORIES;
const OG_IMAGE_URL = SITE + 'assets/images/og-image.png';
const QUICK_OG_IMAGE_URL = SITE + 'quick/assets/images/og-image.png';
const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];
const SITE_TEXT_FILES = [...PAGES, 'llms.txt', 'robots.txt', 'sitemap.xml', 'assets/js/main.js', 'assets/css/main.css'];
const BRAND_BLACKLIST = ['手游十六', '手游16盒子', '手游１６', '手游游戏盒子', '手游 16', '手游16 游戏盒子', '16 游戏盒子'];
const SIZE_LIMITS = { js: 15 * 1024, css: 50 * 1024, html: 60 * 1024, pageTotal: 200 * 1024, ogImage: 300 * 1024 };
/* quick 站设计差异契约常量（design.md §2.2.5B Q-4） */
const MAIN_CORE_CLASS_SUBSTRINGS = ['btn--', 'game-card', 'link-card', 'kicker', 'breadcrumb', 'section-head', 'stats-bar'];
const MAIN_CORE_COLORS = ['#7C3AED', '#6D28D9', '#A78BFA', '#22D3EE', '#0B1020', '#141B2E', '#1B2440']; // quick.css 不得出现
const FRIEND_DOMAINS = ['jdjdndn.github.io', 'wcbblll.cc', 'dlhaoka.com']; // 两站 links 页共同外链

/* ========== 基础工具（纯字符串级，零 DOM 依赖） ========== */
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sizeOf = (rel) => fs.statSync(path.join(ROOT, rel)).size;

/** 子串精确计数（整文件字符串计数，覆盖 JSON-LD、注释、任何角落） */
function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** 提取某属性的全部取值：attr="value" */
function attrValues(html, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, 'g');
  return [...html.matchAll(re)].map((m) => m[1]);
}

/** 提取全部 <a ...> 开标签（本站点 HTML 中 <a> 标签均为单行） */
function anchors(html) {
  return [...html.matchAll(/<a\s[^>]*>/g)].map((m) => m[0]);
}

/** 提取 meta 内容：<meta name|property="key" content="..."> */
function metaContent(html, key, attr = 'name') {
  const m = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`));
  return m ? m[1] : null;
}

/** 提取 #site-nav 主导航区块 */
function navBlock(html) {
  const m = html.match(/<nav id="site-nav"[\s\S]*?<\/nav>/);
  return m ? m[0] : null;
}

/** 提取 quick 站 q-nav 主导航区块 */
function qNavBlock(html) {
  const m = html.match(/<nav class="q-nav"[\s\S]*?<\/nav>/);
  return m ? m[0] : null;
}

/** quick 导航项归一化：[href, text] 有序数组（剔除当页高亮类 is-on，只保留语义） */
function qNavItemsOf(html) {
  const nav = qNavBlock(html);
  if (!nav) return null;
  return [...nav.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], stripTags(m[2]).trim()]);
}

/** 去除 HTML 标签（保留纯文本） */
function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

/** class 词级精确计数：匹配 class 值中的完整类名（排除 q-game-cover 等连字符衍生类对 q-game 的误计） */
function classCount(html, cls) {
  return (html.match(new RegExp(`class="[^"]*\\b${cls}\\b(?![-\\w])[^"]*"`, 'g')) || []).length;
}

/** 解析 JSON-LD 并展平 @graph：返回实体对象数组 */
function ldGraph(raw) {
  const data = JSON.parse(raw);
  return Array.isArray(data['@graph']) ? data['@graph'] : [data];
}

/** 提取全部 JSON-LD 实体（跨块展平） */
function ldEntities(html) {
  return ldJsonBlocks(html).flatMap((raw) => ldGraph(raw));
}

/** sRGB 相对亮度（WCAG 公式，用于 Q-4 背景亮度断言） */
function relativeLuminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** 提取 CSS 自定义属性声明值：--name: value; */
function cssVar(css, name) {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

/** 导航项归一化：[href, text] 有序数组（天然剔除当页高亮类，只保留语义） */
function navItemsOf(html) {
  const nav = navBlock(html);
  if (!nav) return null;
  return [...nav.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map((m) => [m[1], m[2].trim()]);
}

/** 提取页脚区块 */
function footerBlock(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/);
  return m ? m[0] : null;
}

/** 提取全部 JSON-LD 脚本内容 */
function ldJsonBlocks(html) {
  return [...html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** 递归收集仓库真实文件清单（相对路径、正斜杠、保留原始大小写） */
function walkInventory(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.codearts', '.github', 'node_modules', 'tests'].includes(entry.name)) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkInventory(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

/* ========== 一次性加载（全部断言共享同一份内存快照） ========== */
const pageHtml = Object.fromEntries(PAGES.map((p) => [p, read(p)]));
const quickHtml = Object.fromEntries(QUICK_PAGES.map((p) => [p, read(`quick/${p}`)]));
const allPageHtml = { ...pageHtml, ...Object.fromEntries(QUICK_PAGES.map((p) => [`quick/${p}`, quickHtml[p]])) };
const INVENTORY = new Set(walkInventory(ROOT));

/* ====================================================================
 * T-1 ~ T-4b 链接纪律（C-08 红线：分发链接绝不与站内下载链接共页）
 * ==================================================================== */
describe('链接纪律 T-1~T-4b（C-08 红线）', () => {
  it('T-1 任意单页链接A/B 不同时出现（ALL 13 页整文件字符串计数，覆盖 JSON-LD/注释/任何角落）', (t) => {
    const table = [];
    for (const p of ALL_PAGES) {
      const a = count(allPageHtml[p], LINK_A);
      const b = count(allPageHtml[p], LINK_B);
      table.push(`${p}: linkA=${a}, linkB=${b}`);
      assert.ok(!(a > 0 && b > 0), `${p} 链接A(${a}处)与链接B(${b}处)共页，违反 C-08 红线`);
    }
    t.diagnostic(`链接计数表（T-1 交付输出，13 页）:\n${table.join('\n')}`);
  });

  it('T-2 链接A 仅分布于 index/download/guide；链接B 仅分布于 quick/home 与 quick/download；其余 8 页为 0', () => {
    assert.ok(count(pageHtml['index.html'], LINK_A) >= 1, 'index.html 应包含链接A');
    assert.ok(count(pageHtml['download.html'], LINK_A) >= 2, 'download.html 链接A 应 ≥2（主下载按钮 + CTA 按钮）');
    assert.ok(count(pageHtml['guide.html'], LINK_A) >= 2, 'guide.html 链接A 应 ≥2（指南更换后的 2 处主按钮）');
    assert.ok(count(quickHtml['home.html'], LINK_B) >= 1, 'quick/home.html 应包含链接B');
    assert.ok(count(quickHtml['download.html'], LINK_B) >= 3, 'quick/download.html 链接B 应 =3（2 处 <a> + 1 处 JSON-LD downloadUrl）');
    for (const p of ['games.html', 'about.html', 'links.html', '404.html']) {
      assert.equal(count(pageHtml[p], LINK_A), 0, `${p} 不得出现链接A`);
      assert.equal(count(pageHtml[p], LINK_B), 0, `${p} 不得出现链接B`);
    }
    for (const p of QUICK_CONTENT_PAGES.filter((x) => x !== 'download.html')) {
      assert.equal(count(quickHtml[p], LINK_A), 0, `quick/${p} 不得出现链接A`);
      assert.equal(count(quickHtml[p], LINK_B), 0, `quick/${p} 不得出现链接B`);
    }
    assert.equal(count(quickHtml['games.html'], LINK_A), 0, 'quick/games.html 不得出现链接A');
    // quick 全站禁链接A（A 是主站专属分发通道）
    for (const p of QUICK_PAGES) {
      assert.equal(count(quickHtml[p], LINK_A), 0, `quick/${p} 不得出现链接A（链接A 仅限主站 index/download/guide）`);
    }
  });

  it('T-3 链接A/B 与常量逐字符相等（13 页 + quick.css/quick.js；域名字符串计数 = 精确URL计数，防转义/编码/改写变体）', () => {
    for (const p of ALL_PAGES) {
      const html = allPageHtml[p];
      assert.equal(
        count(html, 'tui.buff.vip'),
        count(html, LINK_A),
        `${p} 存在链接A 的非精确变体（URL 转义/编码/残缺）`,
      );
      assert.equal(
        count(html, 'cvtui.appd.cn'),
        count(html, LINK_B),
        `${p} 存在链接B 的非精确变体（URL 转义/编码/残缺）`,
      );
      for (const href of attrValues(html, 'href')) {
        if (href.includes('tui.buff.vip')) {
          assert.equal(href, LINK_A, `${p} href 与链接A 常量不一致: ${href}`);
        }
        if (href.includes('cvtui.appd.cn')) {
          assert.equal(href, LINK_B, `${p} href 与链接B 常量不一致: ${href}`);
        }
      }
    }
    // 样式与脚本中 A/B 域名计数 = 0（design.md §2.2.5A T-3 演化）
    for (const f of ['quick/assets/css/quick.css', 'quick/assets/js/quick.js']) {
      const text = read(f);
      assert.equal(count(text, 'tui.buff.vip'), 0, `${f} 不得包含链接A 域名`);
      assert.equal(count(text, 'cvtui.appd.cn'), 0, `${f} 不得包含链接B 域名`);
    }
  });

  it('T-4 含链接A/B 的 <a> 均带 target="_blank" 且 rel 含 noopener（13 页）', () => {
    for (const p of ALL_PAGES) {
      for (const tag of anchors(allPageHtml[p])) {
        if (!tag.includes(LINK_A) && !tag.includes(LINK_B)) continue;
        assert.ok(tag.includes('target="_blank"'), `${p} 下载外链缺少 target="_blank": ${tag}`);
        assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/, `${p} 下载外链 rel 缺少 noopener: ${tag}`);
      }
    }
  });

  it('T-4b index Hero 主按钮与 download 主下载按钮 href == 链接A；guide ≥2 处 href == 链接A 且 ≥1 处为 btn--primary 主按钮', () => {
    for (const p of ['index.html', 'download.html']) {
      const hit = anchors(pageHtml[p]).some((tag) => tag.includes(`href="${LINK_A}"`) && tag.includes('btn--primary'));
      assert.ok(hit, `${p} 应存在 class 含 btn--primary 且 href==链接A 的主按钮`);
    }
    const guideAHits = anchors(pageHtml['guide.html']).filter((tag) => tag.includes(`href="${LINK_A}"`));
    assert.ok(guideAHits.length >= 2, `guide.html 应 ≥2 处 href==链接A，实际 ${guideAHits.length}`);
    assert.ok(
      guideAHits.some((tag) => tag.includes('btn--primary')),
      'guide.html 链接A 中应 ≥1 处为 btn--primary 主按钮',
    );
    // 链接B 已从 guide 迁移至 quick 站（design.md §2.2.5A T-4b 演化：链接B 表述删除）
    assert.equal(count(pageHtml['guide.html'], LINK_B), 0, 'guide.html 不得再出现链接B（已迁移至 quick 站）');
  });
});

/* ====================================================================
 * T-5 ~ T-10 页面骨架与 SEO
 * ==================================================================== */
describe('页面骨架 T-5~T-10', () => {
  it('T-5a 每页 title 非空且含品牌名；七页 title 互不相同', () => {
    const titles = PAGES.map((p) => {
      const m = pageHtml[p].match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(m, `${p} 缺少 <title>`);
      assert.ok(m[1].trim().length > 0, `${p} title 为空`);
      assert.ok(m[1].includes(BRAND), `${p} title 未包含品牌名: ${m[1]}`);
      return m[1];
    });
    assert.equal(new Set(titles).size, PAGES.length, '七页 title 存在重复');
  });

  it('T-5b 每页 meta description 存在、20~160 字符；七页互不相同', () => {
    const descs = PAGES.map((p) => {
      const d = metaContent(pageHtml[p], 'description');
      assert.ok(d, `${p} 缺少 meta description`);
      assert.ok(
        d.length >= 20 && d.length <= 160,
        `${p} description 长度 ${d.length} 字符，超出 20~160 范围`,
      );
      return d;
    });
    assert.equal(new Set(descs).size, PAGES.length, '七页 description 存在重复');
  });

  it('T-5c 每页 canonical 为预期绝对 URL，且 og:url 与 canonical 一致', () => {
    for (const p of PAGES) {
      const m = pageHtml[p].match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
      assert.ok(m, `${p} 缺少 canonical`);
      assert.equal(m[1], CANONICAL[p], `${p} canonical 应为 ${CANONICAL[p]}，实际 ${m[1]}`);
      assert.equal(
        metaContent(pageHtml[p], 'og:url', 'property'),
        CANONICAL[p],
        `${p} og:url 与 canonical 不一致`,
      );
    }
  });

  it('T-5d 每页 og:title/og:description/og:type/og:url/og:image 齐全；og:image 指向真实存在的文件', () => {
    for (const p of PAGES) {
      const html = pageHtml[p];
      for (const key of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) {
        assert.ok(metaContent(html, key, 'property'), `${p} 缺少 ${key}`);
      }
      assert.equal(
        metaContent(html, 'og:image', 'property'),
        OG_IMAGE_URL,
        `${p} og:image 应统一指向 ${OG_IMAGE_URL}`,
      );
      assert.equal(metaContent(html, 'og:type', 'property'), 'website', `${p} og:type 应为 website`);
    }
    assert.ok(
      fs.existsSync(path.join(ROOT, 'assets/images/og-image.png')),
      'og:image 对应的物理文件 assets/images/og-image.png 不存在',
    );
  });

  it('T-5e 每页 <html lang="zh-CN">', () => {
    for (const p of PAGES) {
      assert.match(pageHtml[p], /<html\s+lang="zh-CN"\s*>/, `${p} html 标签缺少 lang="zh-CN"`);
    }
  });

  it('T-6 每页 h1 恰好 1 个；h1/h2/h3 文档序列无跳级（首个标题必须是 h1）', () => {
    for (const p of PAGES) {
      const html = pageHtml[p];
      const h1Count = [...html.matchAll(/<h1(\s[^>]*)?>/g)].length;
      assert.equal(h1Count, 1, `${p} h1 数量应为 1，实际 ${h1Count}`);
      const levels = [...html.matchAll(/<h([1-3])(\s[^>]*)?>/g)].map((m) => Number(m[1]));
      assert.ok(levels.length >= 3, `${p} 标题数量异常（${levels.length}）`);
      assert.equal(levels[0], 1, `${p} 文档首个标题应为 h1，实际 h${levels[0]}`);
      for (let i = 1; i < levels.length; i++) {
        assert.ok(
          levels[i] - levels[i - 1] <= 1,
          `${p} 标题跳级: h${levels[i - 1]} → h${levels[i]}（第 ${i + 1} 个标题，序列 [${levels.join(',')}]）`,
        );
      }
    }
  });
});

describe('页面骨架（续）T-7~T-10', () => {
  it('T-7 每页含 header/nav/main/footer；body[data-page] 与文件名一一对应', () => {
    for (const p of PAGES) {
      const html = pageHtml[p];
      assert.match(html, /<header[\s>]/, `${p} 缺少 <header>`);
      assert.match(html, /<nav[\s>]/, `${p} 缺少 <nav>`);
      assert.match(html, /<main[\s>]/, `${p} 缺少 <main>`);
      assert.ok(footerBlock(html), `${p} 缺少 <footer>`);
      assert.match(
        html,
        new RegExp(`<body[^>]*data-page="${DATA_PAGE[p]}"`),
        `${p} body[data-page] 应为 "${DATA_PAGE[p]}"`,
      );
    }
  });

  it('T-8 七页主导航归一化后完全一致（六项菜单、顺序、href、文本）', () => {
    const baseline = navItemsOf(pageHtml['index.html']);
    assert.ok(baseline, 'index.html 缺少 #site-nav 主导航');
    assert.deepEqual(
      baseline,
      NAV_ITEMS,
      '主导航六项（href+文本+顺序）与基准不一致',
    );
    for (const p of PAGES) {
      const items = navItemsOf(pageHtml[p]);
      assert.ok(items, `${p} 缺少 #site-nav 主导航`);
      assert.deepEqual(items, baseline, `${p} 主导航与全站基准不一致（剔除当页高亮后应相同）`);
    }
  });

  it('T-9 五个非首页页均含面包屑，且"首页"项指向 index.html', () => {
    for (const p of CONTENT_PAGES) {
      const bc = pageHtml[p].match(/<nav class="breadcrumb"[\s\S]*?<\/nav>/);
      assert.ok(bc, `${p} 缺少面包屑导航`);
      assert.ok(bc[0].includes('href="index.html"'), `${p} 面包屑"首页"未指向 index.html`);
    }
  });

  it('T-10 每页页脚均含 6 个主页面链接', () => {
    for (const p of PAGES) {
      const f = footerBlock(pageHtml[p]);
      assert.ok(f, `${p} 缺少 footer 区块`);
      for (const [href] of NAV_ITEMS) {
        assert.ok(f.includes(`href="${href}"`), `${p} 页脚缺少主页面链接 ${href}`);
      }
    }
  });
});

/* ====================================================================
 * T-11 ~ T-12b 内容量保障
 * ==================================================================== */
describe('内容量 T-11~T-12b', () => {
  it('T-11 games.html 游戏卡 ≥12、data-category 全部合法且去重 ≥4；index 热门游戏卡 ≥6', () => {
    const games = pageHtml['games.html'];
    const cardCount = count(games, 'class="game-card');
    assert.ok(cardCount >= 12, `games.html 游戏卡应 ≥12，实际 ${cardCount}`);
    const cats = [...games.matchAll(/data-category="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(cats.length >= 12, `games.html data-category 数量异常（${cats.length}）`);
    for (const c of cats) {
      assert.ok(CATEGORIES.includes(c), `games.html 非法分类值: ${c}（合法枚举: ${CATEGORIES.join('/')}）`);
    }
    assert.ok(new Set(cats).size >= 4, `分类去重后应 ≥4，实际 ${new Set(cats).size}`);
    const idxCards = count(pageHtml['index.html'], 'class="game-card');
    assert.ok(idxCards >= 6, `index.html 热门游戏卡应 ≥6，实际 ${idxCards}`);
  });

  it('T-11b games.html 分类筛选按钮 ≥5，且包含"全部"按钮', () => {
    const games = pageHtml['games.html'];
    const filters = [...games.matchAll(/data-filter="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(filters.length >= 5, `分类筛选按钮应 ≥5，实际 ${filters.length}`);
    assert.ok(filters.includes('all'), '筛选按钮缺少 data-filter="all"（全部）');
    assert.match(
      games,
      /<button[^>]*data-filter="all"[^>]*>\s*全部\s*<\/button>/,
      '"全部"筛选按钮文本缺失',
    );
  });

  it('T-12a index.html 内容量：stat-item≥3、feature-card≥4、game-card≥6、step-item≥3、faq-item≥4、news-item≥3', () => {
    const h = pageHtml['index.html'];
    assert.ok(count(h, 'class="stat-item') >= 3, 'index stat-item 应 ≥3');
    assert.ok(count(h, 'feature-card') >= 4, 'index feature-card 应 ≥4');
    assert.ok(count(h, 'class="game-card') >= 6, 'index game-card 应 ≥6');
    assert.ok(count(h, 'class="step-item') >= 3, 'index step-item 应 ≥3');
    assert.ok(count(h, '<details class="faq-item') >= 4, 'index faq-item（details）应 ≥4');
    assert.ok(count(h, 'class="news-item') >= 3, 'index news-item 应 ≥3');
  });

  it('T-12b guide.html FAQ 条目 ≥6；download.html 安装步骤 ≥4 且含"未知来源"', () => {
    assert.ok(
      count(pageHtml['guide.html'], '<details class="faq-item') >= 6,
      'guide.html FAQ 条目应 ≥6',
    );
    const d = pageHtml['download.html'];
    const steps = count(d, 'class="step-item');
    assert.ok(steps >= 4, `download.html 安装步骤应 ≥4，实际 ${steps}`);
    assert.ok(d.includes('未知来源'), 'download.html 安装步骤未提及"未知来源"设置');
  });

  it('T-12c download.html 版本信息 ≥3 项、系统要求表 ≥2 行、链接A ≥2 处', () => {
    const d = pageHtml['download.html'];
    const ver = d.match(/class="version-info"[\s\S]*?<\/dl>/);
    assert.ok(ver, 'download.html 缺少版本信息区（dl.version-info）');
    assert.ok(count(ver[0], '<dt') >= 3, `版本信息应 ≥3 项（dt），实际 ${count(ver[0], '<dt')}`);
    const table = d.match(/<table[\s\S]*?<\/table>/);
    assert.ok(table, 'download.html 缺少系统要求表');
    assert.ok(count(table[0], '<tr') >= 2, `系统要求表应 ≥2 行，实际 ${count(table[0], '<tr')}`);
    assert.ok(count(d, LINK_A) >= 2, 'download.html 链接A 应 ≥2 处');
  });

  it('T-12d links.html 友链卡恰好 4 张（quick 互链 + jdjdndn + wcbblll + dlhaoka）；每条友链含名称/URL/简介三要素；example. = 0', () => {
    const l = pageHtml['links.html'];
    const positions = [...l.matchAll(/class="link-card"/g)].map((m) => m.index);
    assert.equal(positions.length, 4, `links.html 友链卡应恰好 4 张，实际 ${positions.length}`);
    // 4 张卡内容契约：quick 互链卡（href=quick/home.html + 展示完整 URL）+ 3 个外链域名
    assert.ok(l.includes('href="quick/home.html"'), 'links.html 缺少指向 quick/home.html 的互链 href');
    assert.ok(l.includes(`${SITE}quick/home.html`), 'links.html 应展示 quick 站完整 URL（https://shouyou16.github.io/quick/home.html）');
    for (const domain of FRIEND_DOMAINS) {
      assert.ok(count(l, domain) >= 2, `links.html 应包含 ${domain} 友链（URL 展示 + href 至少 2 处），实际 ${count(l, domain)}`);
    }
    // 展示性占位域名清零（quick-site-revamp 真实友链契约）
    assert.equal(count(l, 'example.'), 0, 'links.html 不得出现 example.* 展示性域名');
    for (let i = 0; i < positions.length; i++) {
      const end = i + 1 < positions.length ? positions[i + 1] : l.length;
      const block = l.slice(positions[i], end);
      assert.ok(block.includes('<h3'), `友链卡 ${i + 1} 缺少名称（h3）`);
      assert.ok(block.includes('link-url'), `友链卡 ${i + 1} 缺少 URL 展示（p.link-url）`);
      assert.ok(count(block, '<p') >= 2, `友链卡 ${i + 1} 缺少简介（p）`);
      assert.ok(/href="https?:\/\//.test(block) || block.includes('href="quick/home.html"'), `友链卡 ${i + 1} 缺少可点击的访问链接`);
    }
  });
});

/* ====================================================================
 * T-13 ~ T-17 设施与内链
 * ==================================================================== */
describe('设施与内链 T-13~T-17', () => {
  it('T-13 全站（13 页）无以 / 开头的 src/href 引用（排除 http(s)://、#、mailto: 等外部/锚点形式）', () => {
    for (const p of ALL_PAGES) {
      for (const attr of ['src', 'href']) {
        for (const v of attrValues(allPageHtml[p], attr)) {
          assert.ok(
            !v.startsWith('/'),
            `${p} ${attr} 使用了根绝对路径（违反"资产与本站文件同目录或子目录相对引用"契约）: ${v}`,
          );
        }
      }
    }
  });

  it('T-14 sitemap.xml 含且仅含 12 个预期 URL（主站 6 + quick 6）、无 404、无 quick/ 裸目录；lastmod 数量一致且为合法日期', () => {
    const xml = read('sitemap.xml');
    assert.ok(xml.includes('<?xml'), 'sitemap.xml 缺少 XML 声明');
    assert.ok(xml.includes('<urlset'), 'sitemap.xml 缺少 urlset 根元素');
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, SITEMAP_URLS, 'sitemap URL 集合（含顺序）与预期不符（12 URL：主站 6 + quick 6）');
    assert.ok(!locs.some((u) => u.includes('404')), 'sitemap.xml 不得包含 404.html');
    assert.ok(!locs.some((u) => u.endsWith('/quick/')), 'sitemap.xml 不得出现 quick/ 裸目录 URL（quick 无 index.html）');
    assert.ok(!locs.some((u) => u.endsWith('/quick')), 'sitemap.xml 不得出现 quick 裸目录 URL');
    const lastmods = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    assert.equal(lastmods.length, locs.length, 'lastmod 数量与 URL 数量不一致');
    for (const d of lastmods) {
      assert.match(d, /^\d{4}-\d{2}-\d{2}$/, `lastmod 格式应为 YYYY-MM-DD: ${d}`);
      assert.ok(!Number.isNaN(Date.parse(d)), `lastmod 非法日期: ${d}`);
    }
    // sitemap 中每个 URL 都映射到仓库真实文件
    for (const loc of locs) {
      assert.ok(loc.startsWith(SITE), `sitemap URL 未使用基准地址: ${loc}`);
      const rel = loc.slice(SITE.length);
      const target = rel === '' ? 'index.html' : rel;
      assert.ok(INVENTORY.has(target), `sitemap URL 指向的文件不存在: ${loc}`);
    }
  });

  it('T-15a robots.txt 含 User-agent: *、Allow: /、Sitemap 行；5 个 AI 爬虫均有 Allow 规则', () => {
    const robots = read('robots.txt');
    assert.ok(robots.includes('User-agent: *'), 'robots.txt 缺少 User-agent: *');
    assert.ok(/^Allow:\s*\/$/m.test(robots), 'robots.txt 缺少 Allow: /');
    assert.ok(robots.includes(`Sitemap: ${SITE}sitemap.xml`), 'robots.txt 缺少 Sitemap 声明行');
    for (const bot of AI_BOTS) {
      assert.ok(
        new RegExp(`User-agent:\\s*${bot}[\\s\\S]{0,120}Allow:\\s*/`).test(robots),
        `robots.txt 缺少 ${bot} 的 Allow 规则`,
      );
    }
  });

  it('T-15b llms.txt 含品牌名与 12 个页面 URL（6 主站 + 6 quick）、sitemap 指引、真邮箱；且不含任何下载分发链接与 example. 域名', () => {
    const llms = read('llms.txt');
    assert.ok(llms.includes(BRAND), 'llms.txt 缺少品牌名');
    for (const u of SITEMAP_URLS) {
      assert.ok(llms.includes(u), `llms.txt 缺少页面 URL: ${u}`);
    }
    assert.ok(llms.includes(QUICK_BRAND), 'llms.txt 缺少 quick 站品牌名「快玩游戏站」');
    assert.ok(llms.includes(`${SITE}sitemap.xml`), 'llms.txt 缺少 sitemap 指引');
    assert.ok(llms.includes(REAL_EMAIL), `llms.txt 缺少真实联系邮箱 ${REAL_EMAIL}`);
    assert.equal(count(llms, 'tui.buff.vip'), 0, 'llms.txt 不得包含链接A');
    assert.equal(count(llms, 'cvtui.appd.cn'), 0, 'llms.txt 不得包含链接B');
    assert.equal(count(llms, 'example.'), 0, 'llms.txt 不得出现 example.* 展示性域名');
  });

  it('T-16 品牌名拼写统一：每页品牌名 >0、全站文本黑名单变体 =0；404.html 含首页与下载页链接', () => {
    for (const p of PAGES) {
      assert.ok(count(pageHtml[p], BRAND) > 0, `${p} 未出现品牌名`);
    }
    for (const f of SITE_TEXT_FILES) {
      const text = read(f);
      for (const bad of BRAND_BLACKLIST) {
        assert.equal(count(text, bad), 0, `${f} 出现品牌变体拼写 "${bad}"（违反 T-16 品牌统一）`);
      }
    }
    const nf = pageHtml['404.html'];
    assert.ok(nf.includes('href="index.html"'), '404.html 缺少返回首页链接');
    assert.ok(nf.includes('href="download.html"'), '404.html 缺少前往下载页链接');
  });

  it('T-17 内链可达性：全站（13 页）所有相对 href/src 均指向真实文件（目录感知解析，天然覆盖 quick/home.html 与 ../index.html 两条跨站互链）', () => {
    const refs = new Map(); // ref（页面相对原值）-> 引用来源页面
    for (const p of ALL_PAGES) {
      const base = PAGE_BASE_DIR(p); // '' 或 'quick/'
      for (const attr of ['href', 'src']) {
        for (let v of attrValues(allPageHtml[p], attr)) {
          if (!v || v.startsWith('#') || /^https?:/i.test(v) || /^(mailto|tel|data|javascript):/i.test(v)) continue;
          v = v.split('#')[0].split('?')[0];
          if (!v) continue;
          // 目录感知解析：quick 页内 "home.html" -> quick/home.html；"../index.html" -> index.html
          let resolved;
          if (v.startsWith('../')) resolved = v.slice(3);
          else if (v.startsWith('./')) resolved = base + v.slice(2);
          else resolved = base + v;
          const key = `${p} -> ${v}`;
          if (!refs.has(key)) refs.set(key, resolved);
        }
      }
    }
    assert.ok(refs.size >= 10, `内链引用数量异常（${refs.size}），预期 ≥10`);
    for (const [key, resolved] of refs) {
      assert.ok(
        INVENTORY.has(resolved),
        `内链 ${key}（解析为 ${resolved}）指向的文件不存在或大小写不符`,
      );
    }
  });
});

/* ====================================================================
 * T-18 JSON-LD 结构化数据（AC-30）
 * ==================================================================== */
describe('JSON-LD T-18（AC-30）', () => {
  it('T-18a 每页 ld+json 均可 JSON.parse，@context 为 schema.org 且含 @type', () => {
    for (const p of PAGES) {
      const blocks = ldJsonBlocks(pageHtml[p]);
      assert.ok(blocks.length >= 1, `${p} 缺少 JSON-LD 结构化数据`);
      for (const raw of blocks) {
        let data;
        assert.doesNotThrow(() => { data = JSON.parse(raw); }, `${p} JSON-LD 解析失败: ${raw.slice(0, 80)}...`);
        assert.equal(data['@context'], 'https://schema.org', `${p} JSON-LD @context 异常`);
        assert.ok(data['@type'], `${p} JSON-LD 缺少 @type`);
      }
    }
  });

  it('T-18b download.html 含 SoftwareApplication：downloadUrl==链接A、Android、GameApplication', () => {
    const objs = ldJsonBlocks(pageHtml['download.html']).map((raw) => JSON.parse(raw));
    const app = objs.find((o) => o['@type'] === 'SoftwareApplication');
    assert.ok(app, 'download.html JSON-LD 缺少 SoftwareApplication');
    assert.equal(app.downloadUrl, LINK_A, 'SoftwareApplication.downloadUrl 必须逐字符等于链接A');
    assert.equal(app.operatingSystem, 'Android', 'SoftwareApplication.operatingSystem 应为 Android');
    assert.equal(app.applicationCategory, 'GameApplication', 'SoftwareApplication.applicationCategory 应为 GameApplication');
  });

  it('T-18c guide.html 含 FAQPage+HowTo+BreadcrumbList，且 JSON-LD 不含任何下载 URL', () => {
    const raws = ldJsonBlocks(pageHtml['guide.html']);
    const types = raws.map((r) => JSON.parse(r)['@type']);
    for (const t of ['FAQPage', 'HowTo', 'BreadcrumbList']) {
      assert.ok(types.includes(t), `guide.html JSON-LD 缺少 ${t}`);
    }
    for (const raw of raws) {
      assert.ok(!raw.includes('tui.buff.vip'), 'guide.html JSON-LD 不得包含链接A（下载 URL）');
      assert.ok(!raw.includes('cvtui.appd.cn'), 'guide.html JSON-LD 不得包含链接B（下载 URL）');
    }
  });

  it('T-18d 非首页 6 页均含 BreadcrumbList；index.html 含 FAQPage 与 ItemList', () => {
    for (const p of [...CONTENT_PAGES, '404.html']) {
      const types = ldJsonBlocks(pageHtml[p]).map((r) => JSON.parse(r)['@type']);
      assert.ok(types.includes('BreadcrumbList'), `${p} JSON-LD 缺少 BreadcrumbList`);
    }
    const idxTypes = ldJsonBlocks(pageHtml['index.html']).map((r) => JSON.parse(r)['@type']);
    assert.ok(idxTypes.includes('FAQPage'), 'index.html JSON-LD 缺少 FAQPage');
    assert.ok(idxTypes.includes('ItemList'), 'index.html JSON-LD 缺少 ItemList');
  });

  it('T-18e 全部 7 页均含全站必带的 Organization 与 WebSite JSON-LD（覆盖盲区修复：原断言仅查首页）', () => {
    for (const p of PAGES) {
      const types = ldJsonBlocks(pageHtml[p]).map((r) => JSON.parse(r)['@type']);
      assert.ok(types.includes('Organization'), `${p} JSON-LD 缺少全站必带的 Organization`);
      assert.ok(types.includes('WebSite'), `${p} JSON-LD 缺少全站必带的 WebSite`);
    }
  });
});

/* ====================================================================
 * T-19 ~ T-20 资产与仓库（零第三方依赖、体积预算、Pages 保障）
 * ==================================================================== */
describe('资产与仓库 T-19~T-20', () => {
  it('T-19a main.js 通过 node --check 语法检查、<15KB、含渐进增强开关、无 fetch/XHR/import(', () => {
    const jsPath = path.join(ROOT, 'assets/js/main.js');
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', jsPath], { stdio: 'pipe' }),
      'main.js 未通过 node --check 语法检查',
    );
    const jsSize = sizeOf('assets/js/main.js');
    assert.ok(jsSize < SIZE_LIMITS.js, `main.js ${jsSize}B 超 ${SIZE_LIMITS.js}B 预算`);
    const js = read('assets/js/main.js');
    assert.match(
      js,
      /\b(?:doc|document)\.documentElement\.classList\.add\(\s*['"]js['"]\s*\)/,
      'main.js 缺少渐进增强开关（documentElement.classList.add("js")）',
    );
    assert.doesNotMatch(js, /\bfetch\s*\(/, 'main.js 不得调用 fetch（违反 file:// 零请求契约）');
    assert.doesNotMatch(js, /\bXMLHttpRequest\b/, 'main.js 不得使用 XMLHttpRequest');
    assert.doesNotMatch(js, /\bimport\s*\(/, 'main.js 不得使用动态 import()');
  });

  it('T-19b main.css <50KB 且含 :root 设计令牌根', () => {
    const cssSize = sizeOf('assets/css/main.css');
    assert.ok(cssSize < SIZE_LIMITS.css, `main.css ${cssSize}B 超 ${SIZE_LIMITS.css}B 预算`);
    assert.ok(read('assets/css/main.css').includes(':root'), 'main.css 缺少 :root 设计令牌声明');
  });

  it('T-19c 每页 HTML <60KB，单页 HTML+CSS+JS 合计 <200KB', () => {
    const cssSize = sizeOf('assets/css/main.css');
    const jsSize = sizeOf('assets/js/main.js');
    for (const p of PAGES) {
      const s = sizeOf(p);
      assert.ok(s < SIZE_LIMITS.html, `${p} ${s}B 超 ${SIZE_LIMITS.html}B 预算`);
      assert.ok(
        s + cssSize + jsSize < SIZE_LIMITS.pageTotal,
        `${p} HTML+CSS+JS 合计 ${s + cssSize + jsSize}B 超 ${SIZE_LIMITS.pageTotal}B 预算`,
      );
    }
  });

  it('T-19d 零第三方资源：全站（13 页）无 http(s):// 的 src= 引用', () => {
    for (const p of ALL_PAGES) {
      for (const v of attrValues(allPageHtml[p], 'src')) {
        assert.ok(!/^https?:\/\//i.test(v), `${p} 引用了第三方资源（违反零第三方依赖）: ${v}`);
      }
    }
  });

  it('T-19e og-image.png <300KB 且为 PNG 魔数；favicon 三件套存在；quick og-image 与 favicon.svg 存在且合规', () => {
    const img = fs.readFileSync(path.join(ROOT, 'assets/images/og-image.png'));
    assert.ok(img.length < SIZE_LIMITS.ogImage, `og-image.png ${img.length}B 超 ${SIZE_LIMITS.ogImage}B 预算`);
    assert.equal(img[0], 0x89, 'og-image.png 缺少 PNG 魔数第 1 字节 0x89');
    assert.equal(img[1], 0x50, 'og-image.png 缺少 PNG 魔数第 2 字节 0x50');
    assert.equal(img[2], 0x4e, 'og-image.png 缺少 PNG 魔数第 3 字节 0x4E');
    assert.equal(img[3], 0x47, 'og-image.png 缺少 PNG 魔数第 4 字节 0x47');
    for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} 不存在`);
    }
    // quick 站资产（design.md §2.2.5A T-19e 演化：追加断言）
    const qImg = fs.readFileSync(path.join(ROOT, 'quick/assets/images/og-image.png'));
    assert.ok(qImg.length < SIZE_LIMITS.ogImage, `quick/og-image.png ${qImg.length}B 超 ${SIZE_LIMITS.ogImage}B 预算`);
    assert.equal(qImg[0], 0x89, 'quick/og-image.png 缺少 PNG 魔数第 1 字节 0x89');
    assert.equal(qImg[1], 0x50, 'quick/og-image.png 缺少 PNG 魔数第 2 字节 0x50');
    assert.equal(qImg[2], 0x4e, 'quick/og-image.png 缺少 PNG 魔数第 3 字节 0x4E');
    assert.equal(qImg[3], 0x47, 'quick/og-image.png 缺少 PNG 魔数第 4 字节 0x47');
    assert.ok(fs.existsSync(path.join(ROOT, 'quick/assets/images/favicon.svg')), 'quick/assets/images/favicon.svg 不存在');
  });

  it('T-19f favicon PNG 回退三端齐备：主站 192 存在且为 PNG；quick 32/192/180 存在且为 PNG；13 页标签声明齐全（SVG+32+192+apple-touch）', () => {
    // 产物：主站 favicon-192.png + quick favicon-32/favicon-192/apple-touch-icon（均需真实存在且为 PNG 魔数）
    const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
    for (const f of ['favicon-192.png', 'quick/assets/images/favicon-32.png', 'quick/assets/images/favicon-192.png', 'quick/assets/images/apple-touch-icon.png']) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} 不存在（favicon PNG 回退缺失）`);
      const bytes = fs.readFileSync(path.join(ROOT, f));
      PNG_MAGIC.forEach((b, i) => assert.equal(bytes[i], b, `${f} 缺少 PNG 魔数第 ${i + 1} 字节 0x${b.toString(16)}`));
    }
    // 声明：主站 7 页含 favicon.svg + favicon-32.png + favicon-192.png + apple-touch-icon.png 四条 link；
    //       quick 6 页含 assets/images/ 下同名四条（目录感知）
    for (const p of PAGES) {
      const html = pageHtml[p];
      assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="favicon\.svg">/, `${p} 缺少 SVG favicon 声明`);
      assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="favicon-32\.png">/, `${p} 缺少 32x32 PNG 回退声明`);
      assert.match(html, /<link rel="icon" type="image\/png" sizes="192x192" href="favicon-192\.png">/, `${p} 缺少 192x192 PNG 回退声明（Android Chrome）`);
      assert.match(html, /<link rel="apple-touch-icon" href="apple-touch-icon\.png">/, `${p} 缺少 apple-touch-icon 声明（iOS）`);
    }
    for (const p of QUICK_PAGES) {
      const html = quickHtml[p];
      const dir = 'assets/images/';
      assert.match(html, new RegExp(`<link rel="icon" type="image/svg\\+xml" href="${dir}favicon\\.svg">`), `quick/${p} 缺少 SVG favicon 声明`);
      assert.match(html, new RegExp(`<link rel="icon" type="image/png" sizes="32x32" href="${dir}favicon-32\\.png">`), `quick/${p} 缺少 32x32 PNG 回退声明`);
      assert.match(html, new RegExp(`<link rel="icon" type="image/png" sizes="192x192" href="${dir}favicon-192\\.png">`), `quick/${p} 缺少 192x192 PNG 回退声明（Android Chrome）`);
      assert.match(html, new RegExp(`<link rel="apple-touch-icon" href="${dir}apple-touch-icon\\.png">`), `quick/${p} 缺少 apple-touch-icon 声明（iOS）`);
    }
    // 尺寸互异：quick 三个 PNG 体积应互不相同（防同名复制占位）
    const sizes = ['favicon-32.png', 'favicon-192.png', 'apple-touch-icon.png'].map((f) => sizeOf(`quick/assets/images/${f}`));
    assert.equal(new Set(sizes).size, 3, `quick favicon PNG 体积互异校验失败（防占位复制）: ${sizes.join('/')}`);
  });

  it('T-20 仓库根存在 .nojekyll 与 404.html（GitHub Pages 保障）', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll 不存在');
    assert.ok(fs.existsSync(path.join(ROOT, '404.html')), '404.html 不存在');
  });
});

/* ====================================================================
 * Q-1 ~ Q-7 quick 站专属契约（quick-site-revamp design.md §2.2.5B）
 * ==================================================================== */
describe('quick 站 Q-1~Q-7（quick-site-revamp）', () => {
  it('Q-1 目录结构：quick/ 恰好 6 个 HTML、无 index.html、4 项资产文件存在', () => {
    const quickDir = path.join(ROOT, 'quick');
    assert.ok(fs.existsSync(quickDir) && fs.statSync(quickDir).isDirectory(), 'quick/ 目录不存在');
    const htmlFiles = fs.readdirSync(quickDir).filter((f) => f.endsWith('.html')).sort();
    assert.deepEqual(
      htmlFiles,
      [...QUICK_PAGES].sort(),
      `quick/ 应恰好包含 6 个 HTML（${QUICK_PAGES.join('/')}），实际: ${htmlFiles.join('/')}`,
    );
    assert.ok(!fs.existsSync(path.join(ROOT, 'quick/index.html')), 'quick/index.html 不应存在（quick 站首页为 quick/home.html）');
    for (const f of ['quick/assets/css/quick.css', 'quick/assets/js/quick.js', 'quick/assets/images/og-image.png', 'quick/assets/images/favicon.svg']) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} 不存在`);
    }
  });

  it('Q-2 SEO 元数据：title/description/canonical/og 五件套/lang；6 页互不相同', () => {
    const titles = [];
    const descs = [];
    for (const p of QUICK_PAGES) {
      const html = quickHtml[p];
      const tm = html.match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(tm, `quick/${p} 缺少 <title>`);
      assert.ok(tm[1].includes(QUICK_BRAND), `quick/${p} title 应含「${QUICK_BRAND}」: ${tm[1]}`);
      titles.push(tm[1]);
      const d = metaContent(html, 'description');
      assert.ok(d, `quick/${p} 缺少 meta description`);
      assert.ok(d.length >= 20 && d.length <= 160, `quick/${p} description 长度 ${d.length} 字符，超出 20~160 范围`);
      descs.push(d);
      const cm = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/);
      assert.ok(cm, `quick/${p} 缺少 canonical`);
      assert.equal(cm[1], QUICK_CANONICAL[p], `quick/${p} canonical 应为 ${QUICK_CANONICAL[p]}，实际 ${cm[1]}`);
      assert.equal(metaContent(html, 'og:url', 'property'), QUICK_CANONICAL[p], `quick/${p} og:url 与 canonical 不一致`);
      for (const key of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) {
        assert.ok(metaContent(html, key, 'property'), `quick/${p} 缺少 ${key}`);
      }
      assert.equal(
        metaContent(html, 'og:image', 'property'),
        QUICK_OG_IMAGE_URL,
        `quick/${p} og:image 应统一指向 ${QUICK_OG_IMAGE_URL}`,
      );
      assert.match(html, /<html\s+lang="zh-CN"\s*>/, `quick/${p} html 标签缺少 lang="zh-CN"`);
    }
    assert.equal(new Set(titles).size, QUICK_PAGES.length, 'quick 6 页 title 存在重复');
    assert.equal(new Set(descs).size, QUICK_PAGES.length, 'quick 6 页 description 存在重复');
  });

  it('Q-3 页面骨架：h1 恰 1、标题序列无跳级、header/nav/main/footer、body[data-qpage]', () => {
    for (const p of QUICK_PAGES) {
      const html = quickHtml[p];
      const h1Count = [...html.matchAll(/<h1(\s[^>]*)?>/g)].length;
      assert.equal(h1Count, 1, `quick/${p} h1 数量应为 1，实际 ${h1Count}`);
      const levels = [...html.matchAll(/<h([1-6])(\s[^>]*)?>/g)].map((m) => Number(m[1]));
      assert.ok(levels.length >= 3, `quick/${p} 标题数量异常（${levels.length}）`);
      assert.equal(levels[0], 1, `quick/${p} 文档首个标题应为 h1，实际 h${levels[0]}`);
      for (let i = 1; i < levels.length; i++) {
        assert.ok(
          levels[i] - levels[i - 1] <= 1,
          `quick/${p} 标题跳级: h${levels[i - 1]} → h${levels[i]}（第 ${i + 1} 个标题，序列 [${levels.join(',')}]）`,
        );
      }
      assert.match(html, /<header[\s>]/, `quick/${p} 缺少 <header>`);
      assert.match(html, /<nav[\s>]/, `quick/${p} 缺少 <nav>`);
      assert.match(html, /<main[\s>]/, `quick/${p} 缺少 <main>`);
      assert.ok(footerBlock(html), `quick/${p} 缺少 <footer>`);
      assert.match(
        html,
        new RegExp(`<body[^>]*data-qpage="${QUICK_DATA_PAGE[p]}"`),
        `quick/${p} body[data-qpage] 应为 "${QUICK_DATA_PAGE[p]}"`,
      );
    }
  });

  it('Q-4 设计差异：不引主站资产、无主站类名、quick.css 无主站 7 色、令牌与断点契约', () => {
    // ① 不引用 main.css/main.js
    for (const p of QUICK_PAGES) {
      assert.ok(!quickHtml[p].includes('main.css'), `quick/${p} 不得引用主站 main.css`);
      assert.ok(!quickHtml[p].includes('main.js'), `quick/${p} 不得引用主站 main.js`);
    }
    // ② class 值不含主站核心类名子串
    for (const p of QUICK_PAGES) {
      for (const cls of attrValues(quickHtml[p], 'class')) {
        for (const sub of MAIN_CORE_CLASS_SUBSTRINGS) {
          assert.ok(!cls.includes(sub), `quick/${p} class 值含主站核心类名 "${sub}": ${cls}`);
        }
      }
    }
    // ③ quick.css 不含主站 7 个核心色值（大小写不敏感）
    const css = read('quick/assets/css/quick.css');
    const cssUpper = css.toUpperCase();
    for (const c of MAIN_CORE_COLORS) {
      assert.equal(count(cssUpper, c.toUpperCase()), 0, `quick.css 不得包含主站核心色值 ${c}`);
    }
    // ④ --q-color-bg-base 亮度 > 0.85（浅色模式）
    const bg = cssVar(css, '--q-color-bg-base');
    assert.ok(bg, 'quick.css 缺少 --q-color-bg-base 声明');
    assert.match(bg, /^#[0-9a-fA-F]{6}$/, `--q-color-bg-base 应为 6 位十六进制色值: ${bg}`);
    assert.ok(
      relativeLuminance(bg) > 0.85,
      `--q-color-bg-base（${bg}）相对亮度 ${relativeLuminance(bg).toFixed(4)} 应 > 0.85（浅色模式）`,
    );
    // ⑤ --q-color-primary = #E8613C
    const primary = cssVar(css, '--q-color-primary');
    assert.ok(primary, 'quick.css 缺少 --q-color-primary 声明');
    assert.equal(primary.toUpperCase(), '#E8613C', `--q-color-primary 应为 #E8613C，实际 ${primary}`);
    // ⑥ --q-radius-lg ≥ 20px
    const radius = cssVar(css, '--q-radius-lg');
    assert.ok(radius, 'quick.css 缺少 --q-radius-lg 声明');
    assert.ok(
      /^[\d.]+px$/.test(radius) && parseFloat(radius) >= 20,
      `--q-radius-lg 应 ≥20px，实际 ${radius}`,
    );
    // ⑦ --q-font-serif 存在
    assert.ok(cssVar(css, '--q-font-serif'), 'quick.css 缺少 --q-font-serif 声明');
    // ⑧ 断点 720/1080，禁 768/1024
    assert.match(css, /@media\s*\(\s*min-width:\s*720px\s*\)/, 'quick.css 缺少 @media (min-width: 720px) 断点');
    assert.match(css, /@media\s*\(\s*min-width:\s*1080px\s*\)/, 'quick.css 缺少 @media (min-width: 1080px) 断点');
    assert.equal(count(css, '768px'), 0, 'quick.css 不得出现 768px 断点');
    assert.equal(count(css, '1024px'), 0, 'quick.css 不得出现 1024px 断点');
  });

  it('Q-5 链接B 纪律：URL_B 仅在 home（=1）与 download（整文件=3、正文 ≥2）；URL_A 在 quick 6 页 = 0；A/B 不共页', () => {
    assert.equal(count(quickHtml['home.html'], LINK_B), 1, `quick/home.html 链接B 整文件计数应 =1，实际 ${count(quickHtml['home.html'], LINK_B)}`);
    const dl = quickHtml['download.html'];
    assert.equal(count(dl, LINK_B), 3, `quick/download.html 链接B 整文件计数应 =3（2 处 <a> + JSON-LD downloadUrl），实际 ${count(dl, LINK_B)}`);
    const dlAnchorB = anchors(dl).filter((tag) => tag.includes(LINK_B)).length;
    assert.ok(dlAnchorB >= 2, `quick/download.html 正文（<a>）链接B 应 ≥2，实际 ${dlAnchorB}`);
    for (const p of ['games.html', 'help.html', 'about.html', 'links.html']) {
      assert.equal(count(quickHtml[p], LINK_B), 0, `quick/${p} 不得出现链接B`);
    }
    for (const p of QUICK_PAGES) {
      assert.equal(count(quickHtml[p], LINK_A), 0, `quick/${p} 不得出现链接A（A 为主站专属分发通道）`);
    }
  });

  it('Q-6 链接B 主按钮：home Hero 与 download 主下载按钮 href==URL_B 且为 q-btn-solid q-btn-big；含 B 的 <a> 均 _blank+noopener', () => {
    for (const p of ['home.html', 'download.html']) {
      const hit = anchors(quickHtml[p]).some(
        (tag) => tag.includes(`href="${LINK_B}"`) && /q-btn-solid/.test(tag) && /q-btn-big/.test(tag),
      );
      assert.ok(hit, `quick/${p} 应存在 class 含 q-btn-solid q-btn-big 且 href==链接B 的主按钮`);
    }
    for (const p of QUICK_PAGES) {
      for (const tag of anchors(quickHtml[p])) {
        if (!tag.includes(LINK_B)) continue;
        assert.ok(tag.includes('target="_blank"'), `quick/${p} 链接B 缺少 target="_blank": ${tag}`);
        assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/, `quick/${p} 链接B rel 缺少 noopener: ${tag}`);
      }
    }
  });

  it('Q-7 内容量：home/games/download/help/about/links 板块内容契约', () => {
    const home = quickHtml['home.html'];
    assert.ok(classCount(home, 'q-stat') >= 3, `home .q-stat 应 ≥3，实际 ${classCount(home, 'q-stat')}`);
    assert.ok(classCount(home, 'q-feature') >= 4, `home .q-feature 应 ≥4，实际 ${classCount(home, 'q-feature')}`);
    assert.ok(classCount(home, 'q-game') >= 6, `home .q-game 应 ≥6，实际 ${classCount(home, 'q-game')}`);
    assert.ok(classCount(home, 'q-step') >= 3, `home .q-step 应 ≥3，实际 ${classCount(home, 'q-step')}`);
    assert.ok(count(home, '<details class="q-faq') >= 4, `home details.q-faq 应 ≥4，实际 ${count(home, '<details class="q-faq')}`);
    const games = quickHtml['games.html'];
    assert.ok(classCount(games, 'q-game') >= 12, `games .q-game 应 ≥12，实际 ${classCount(games, 'q-game')}`);
    const cats = [...games.matchAll(/data-qcat="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(cats.length >= 12, `games data-qcat 数量异常（${cats.length}）`);
    const catDist = {};
    for (const c of cats) {
      assert.ok(QUICK_CATEGORIES.includes(c), `games 非法分类值: ${c}（合法枚举: ${QUICK_CATEGORIES.join('/')}）`);
      catDist[c] = (catDist[c] || 0) + 1;
    }
    for (const c of QUICK_CATEGORIES) {
      assert.ok(catDist[c] >= 2, `games 分类 ${c} 应 ≥2 款，实际 ${catDist[c] || 0}`);
    }
    const chips = [...games.matchAll(/data-qfilter="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(chips.length >= 5, `games .q-chip 筛选按钮应 ≥5，实际 ${chips.length}`);
    assert.ok(chips.includes('all'), 'games 筛选按钮缺少 data-qfilter="all"（全部）');
    assert.match(games, /<button[^>]*data-qfilter="all"[^>]*>\s*全部\s*<\/button>/, 'games「全部」筛选按钮文本缺失');
    const dl = quickHtml['download.html'];
    const verBlock = dl.split('id="q-ver"')[1]?.split('</section>')[0] || '';
    assert.ok(verBlock, 'download 缺少版本信息区（#q-ver）');
    assert.ok(count(verBlock, '<dt') >= 3, `download 版本信息应 ≥3 项（dt），实际 ${count(verBlock, '<dt')}`);
    const sysBlock = dl.split('id="q-sys"')[1]?.split('</section>')[0] || '';
    assert.ok(sysBlock, 'download 缺少系统要求区（#q-sys）');
    assert.ok(count(sysBlock, '<tr') >= 2, `download 系统要求表应 ≥2 行，实际 ${count(sysBlock, '<tr')}`);
    assert.ok(
      sysBlock.includes('Android 6.0'),
      'download 系统要求表最低系统版本应为「Android 6.0」（design.md §1.3.1③ 契约口径，防回退）',
    );
    assert.ok(classCount(dl, 'q-step') >= 4, `download 安装步骤 .q-step 应 ≥4，实际 ${classCount(dl, 'q-step')}`);
    assert.ok(dl.includes('未知来源'), 'download 安装步骤未提及"未知来源"设置');
    const help = quickHtml['help.html'];
    assert.ok(count(help, '<details class="q-faq') >= 6, `help FAQ 应 ≥6，实际 ${count(help, '<details class="q-faq')}`);
    assert.ok(classCount(help, 'q-step') >= 4, `help 教程步骤 .q-step 应 ≥4，实际 ${classCount(help, 'q-step')}`);
    const articles = help.split('<article').slice(1).map((s) => s.split('</article>')[0]);
    assert.ok(articles.length >= 2, `help 攻略文章应 ≥2 篇，实际 ${articles.length}`);
    articles.forEach((a, i) => {
      const pCount = (a.match(/<p\b/g) || []).length;
      assert.ok(pCount >= 3, `help 攻略文章 ${i + 1} 应 ≥3 自然段，实际 ${pCount}`);
    });
    assert.ok(
      classCount(help, 'q-trouble') >= 3,
      `help .q-trouble 故障排查条目应 ≥3，实际 ${classCount(help, 'q-trouble')}（design.md §2.2.5B Q-7 契约：症状 → 处置条目元素）`,
    );
    const about = quickHtml['about.html'];
    const storyBlock = about.split('id="q-story"')[1]?.split('</section>')[0] || '';
    assert.ok(storyBlock, 'about 缺少站点故事区（#q-story）');
    const storyText = stripTags(storyBlock).replace(/\s+/g, '');
    assert.ok(storyText.length >= 200, `about 故事正文（去标签）应 ≥200 字，实际 ${storyText.length}`);
    assert.ok(classCount(about, 'q-milestone') >= 4, `about .q-milestone 应 ≥4，实际 ${classCount(about, 'q-milestone')}`);
    const ql = quickHtml['links.html'];
    assert.equal(classCount(ql, 'q-friend'), 4, `quick/links.html 友链卡应恰好 4 张，实际 ${classCount(ql, 'q-friend')}`);
  });
});

/* ====================================================================
 * Q-8 ~ Q-13 quick 站专属契约（quick-site-revamp design.md §2.2.5B，续）
 * ==================================================================== */
describe('quick 站 Q-8~Q-13（quick-site-revamp）', () => {
  it('Q-8 真实邮箱：主站 about/links + llms.txt + quick 6 页 mailto 真邮箱各 ≥1；全仓 13 页 + llms.txt + sitemap.xml 中 example. 域名 = 0', () => {
    for (const p of ['about.html', 'links.html']) {
      assert.ok(
        pageHtml[p].includes(`mailto:${REAL_EMAIL}`),
        `主站 ${p} 应含 mailto:${REAL_EMAIL} 链接`,
      );
    }
    assert.ok(read('llms.txt').includes(REAL_EMAIL), `llms.txt 应包含真实邮箱 ${REAL_EMAIL}`);
    for (const p of QUICK_PAGES) {
      assert.ok(
        quickHtml[p].includes(`mailto:${REAL_EMAIL}`),
        `quick/${p} 应含 mailto:${REAL_EMAIL} 链接`,
      );
    }
    for (const p of ALL_PAGES) {
      assert.equal(
        count(allPageHtml[p], 'example.'),
        0,
        `${p} 不得出现 example.* 展示性域名（真实邮箱/友链契约）`,
      );
    }
    for (const f of ['llms.txt', 'sitemap.xml']) {
      assert.equal(count(read(f), 'example.'), 0, `${f} 不得出现 example.* 展示性域名`);
    }
  });

  it('Q-9 互链双向：主站 links ↔ quick/links；3 外链 _blank+noopener；两条站内互链同窗', () => {
    const ml = pageHtml['links.html'];
    assert.ok(ml.includes('href="quick/home.html"'), '主站 links.html 应含 href="quick/home.html" 互链');
    assert.ok(ml.includes(`${SITE}quick/home.html`), '主站 links.html 应展示 quick 站完整 URL');
    const ql = quickHtml['links.html'];
    assert.ok(ql.includes('href="../index.html"'), 'quick/links.html 应含 href="../index.html" 互链');
    assert.ok(ql.includes(SITE), `quick/links.html 应展示主站完整 URL（${SITE}）`);
    // 两页三外链均 _blank + noopener
    for (const [name, html] of [['links.html', ml], ['quick/links.html', ql]]) {
      for (const tag of anchors(html)) {
        const hit = FRIEND_DOMAINS.find((d) => tag.includes(d));
        if (!hit) continue;
        assert.ok(tag.includes('target="_blank"'), `${name} 外链 ${hit} 缺少 target="_blank": ${tag}`);
        assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/, `${name} 外链 ${hit} rel 缺少 noopener: ${tag}`);
      }
    }
    // 两条站内互链同窗（无 target）
    const mainCross = anchors(ml).find((tag) => tag.includes('href="quick/home.html"'));
    assert.ok(mainCross, '主站 links.html 未找到 quick 互链 <a>');
    assert.ok(!mainCross.includes('target='), `主站→quick 互链应同窗打开（无 target）: ${mainCross}`);
    const quickCross = anchors(ql).find((tag) => tag.includes('href="../index.html"'));
    assert.ok(quickCross, 'quick/links.html 未找到主站互链 <a>');
    assert.ok(!quickCross.includes('target='), `quick→主站互链应同窗打开（无 target）: ${quickCross}`);
  });

  it('Q-10 体积与零依赖：quick.css/quick.js/HTML 预算、node --check、渐进增强开关、无 fetch/XHR/import、og-image 预算', () => {
    const cssSize = sizeOf('quick/assets/css/quick.css');
    assert.ok(cssSize < SIZE_LIMITS.css, `quick.css ${cssSize}B 超 ${SIZE_LIMITS.css}B 预算`);
    assert.ok(read('quick/assets/css/quick.css').includes(':root'), 'quick.css 缺少 :root 设计令牌声明');
    const jsPath = path.join(ROOT, 'quick/assets/js/quick.js');
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', jsPath], { stdio: 'pipe' }),
      'quick.js 未通过 node --check 语法检查',
    );
    const jsSize = sizeOf('quick/assets/js/quick.js');
    assert.ok(jsSize < SIZE_LIMITS.js, `quick.js ${jsSize}B 超 ${SIZE_LIMITS.js}B 预算`);
    const js = read('quick/assets/js/quick.js');
    assert.match(
      js,
      /\b(?:doc|document)\.documentElement\.classList\.add\(\s*['"]q-js['"]\s*\)/,
      'quick.js 缺少渐进增强开关（documentElement.classList.add("q-js")）',
    );
    assert.doesNotMatch(js, /\bfetch\s*\(/, 'quick.js 不得调用 fetch（违反 file:// 零请求契约）');
    assert.doesNotMatch(js, /\bXMLHttpRequest\b/, 'quick.js 不得使用 XMLHttpRequest');
    assert.doesNotMatch(js, /\bimport\b/, 'quick.js 不得出现 import（静态或动态）');
    for (const p of QUICK_PAGES) {
      const s = sizeOf(`quick/${p}`);
      assert.ok(s < SIZE_LIMITS.html, `quick/${p} ${s}B 超 ${SIZE_LIMITS.html}B 预算`);
      assert.ok(
        s + cssSize + jsSize < SIZE_LIMITS.pageTotal,
        `quick/${p} HTML+CSS+JS 合计 ${s + cssSize + jsSize}B 超 ${SIZE_LIMITS.pageTotal}B 预算`,
      );
    }
    const qImg = fs.readFileSync(path.join(ROOT, 'quick/assets/images/og-image.png'));
    assert.ok(qImg.length < SIZE_LIMITS.ogImage, `quick/og-image.png ${qImg.length}B 超 ${SIZE_LIMITS.ogImage}B 预算`);
    assert.equal(qImg[0], 0x89, 'quick/og-image.png 缺少 PNG 魔数第 1 字节 0x89');
    assert.equal(qImg[1], 0x50, 'quick/og-image.png 缺少 PNG 魔数第 2 字节 0x50');
    assert.equal(qImg[2], 0x4e, 'quick/og-image.png 缺少 PNG 魔数第 3 字节 0x4E');
    assert.equal(qImg[3], 0x47, 'quick/og-image.png 缺少 PNG 魔数第 4 字节 0x47');
  });

  it('Q-11 JSON-LD：@context/@graph 可解析、Organization+WebSite、BreadcrumbList 首项、SoftwareApplication、FAQPage、ItemList、A/B 明文纪律', () => {
    for (const p of QUICK_PAGES) {
      const blocks = ldJsonBlocks(quickHtml[p]);
      assert.ok(blocks.length >= 1, `quick/${p} 缺少 JSON-LD 结构化数据`);
      for (const raw of blocks) {
        let data;
        assert.doesNotThrow(() => { data = JSON.parse(raw); }, `quick/${p} JSON-LD 解析失败: ${raw.slice(0, 80)}...`);
        assert.equal(data['@context'], 'https://schema.org', `quick/${p} JSON-LD @context 异常`);
      }
      const entities = ldEntities(quickHtml[p]);
      const types = entities.map((o) => o['@type']);
      assert.ok(types.includes('Organization'), `quick/${p} JSON-LD 缺少 Organization`);
      assert.ok(types.includes('WebSite'), `quick/${p} JSON-LD 缺少 WebSite`);
      const website = entities.find((o) => o['@type'] === 'WebSite');
      assert.equal(website.url, QUICK_CANONICAL['home.html'], `quick/${p} WebSite.url 应为 quick 首页绝对 URL`);
    }
    // 非 home 5 页含 BreadcrumbList 且首项 url=quick 首页
    for (const p of QUICK_CONTENT_PAGES) {
      const entities = ldEntities(quickHtml[p]);
      const bc = entities.find((o) => o['@type'] === 'BreadcrumbList');
      assert.ok(bc, `quick/${p} JSON-LD 缺少 BreadcrumbList`);
      const first = bc.itemListElement?.[0];
      assert.ok(first, `quick/${p} BreadcrumbList 缺少首项`);
      assert.equal(first.url, QUICK_CANONICAL['home.html'], `quick/${p} BreadcrumbList 首项 url 应为 quick 首页`);
      assert.equal(first.name, '首页', `quick/${p} BreadcrumbList 首项 name 应为「首页」`);
    }
    // download 含 SoftwareApplication
    const dlEntities = ldEntities(quickHtml['download.html']);
    const app = dlEntities.find((o) => o['@type'] === 'SoftwareApplication');
    assert.ok(app, 'quick/download.html JSON-LD 缺少 SoftwareApplication');
    assert.equal(app.downloadUrl, LINK_B, 'quick SoftwareApplication.downloadUrl 必须逐字符等于链接B');
    assert.equal(app.operatingSystem, 'Android', 'quick SoftwareApplication.operatingSystem 应为 Android');
    assert.equal(app.applicationCategory, 'GameApplication', 'quick SoftwareApplication.applicationCategory 应为 GameApplication');
    assert.equal(app.name, QUICK_BRAND, `quick SoftwareApplication.name 必须为「${QUICK_BRAND}」（品牌名契约，防回退为未定义第三品牌名）`);
    // home/help 含 FAQPage；home/games 含 ItemList
    for (const p of ['home.html', 'help.html']) {
      assert.ok(
        ldEntities(quickHtml[p]).some((o) => o['@type'] === 'FAQPage'),
        `quick/${p} JSON-LD 缺少 FAQPage`,
      );
    }
    for (const p of ['home.html', 'games.html']) {
      assert.ok(
        ldEntities(quickHtml[p]).some((o) => o['@type'] === 'ItemList'),
        `quick/${p} JSON-LD 缺少 ItemList`,
      );
    }
    // 除 download 的 downloadUrl 外全部 JSON-LD 无 A/B 明文
    for (const p of QUICK_PAGES) {
      for (const o of ldEntities(quickHtml[p])) {
        const s = JSON.stringify(o);
        if (o['@type'] === 'SoftwareApplication') {
          const sNoDl = JSON.stringify({ ...o, downloadUrl: '' });
          assert.equal(count(sNoDl, LINK_A) + count(sNoDl, LINK_B), 0, `quick/${p} SoftwareApplication 除 downloadUrl 外不得含 A/B 明文`);
        } else {
          assert.equal(count(s, LINK_A), 0, `quick/${p} JSON-LD（${o['@type']}）不得含链接A 明文`);
          assert.equal(count(s, LINK_B), 0, `quick/${p} JSON-LD（${o['@type']}）不得含链接B 明文`);
        }
      }
    }
  });

  it('Q-12 品牌隔离：quick 6 页 title 含「快玩游戏站」不含主站品牌名；正文品牌名 5 页=0、links 1~3 次；llms.txt 双品牌 ≥1', () => {
    for (const p of QUICK_PAGES) {
      const tm = quickHtml[p].match(/<title>([\s\S]*?)<\/title>/);
      assert.ok(tm && tm[1].includes(QUICK_BRAND), `quick/${p} title 应含「${QUICK_BRAND}」`);
      assert.ok(!tm[1].includes(BRAND), `quick/${p} title 不得含主站品牌名「${BRAND}」`);
    }
    for (const p of QUICK_CONTENT_PAGES.filter((x) => x !== 'links.html')) {
      assert.equal(
        count(quickHtml[p], BRAND),
        0,
        `quick/${p} 正文不得出现主站品牌名「${BRAND}」（Q-12 品牌隔离；姊妹站以泛指表述）`,
      );
    }
    assert.equal(count(quickHtml['home.html'], BRAND), 0, 'quick/home.html 正文不得出现主站品牌名（Q-12 品牌隔离）');
    const linksBrandCount = count(quickHtml['links.html'], BRAND);
    assert.ok(
      linksBrandCount >= 1 && linksBrandCount <= 3,
      `quick/links.html 主站品牌名应 1~3 次（友链卡互链表述），实际 ${linksBrandCount}`,
    );
    const llms = read('llms.txt');
    assert.ok(llms.includes(BRAND), 'llms.txt 应含主站品牌名');
    assert.ok(llms.includes(QUICK_BRAND), 'llms.txt 应含 quick 站品牌名');
  });

  it('Q-13 导航一致性：6 页主导航归一化一致、5 非首页面包屑指向 home、页脚 6 站内链接', () => {
    const baseline = qNavItemsOf(quickHtml['home.html']);
    assert.ok(baseline, 'quick/home.html 缺少 q-nav 主导航');
    assert.deepEqual(baseline, QUICK_NAV_ITEMS, 'quick 主导航六项（href+文本+顺序）与基准不一致');
    for (const p of QUICK_PAGES) {
      const items = qNavItemsOf(quickHtml[p]);
      assert.ok(items, `quick/${p} 缺少 q-nav 主导航`);
      assert.deepEqual(items, baseline, `quick/${p} 主导航与全站基准不一致（剔除当页高亮后应相同）`);
      // 导航链接均为站内相对链接（无 http/mailto/根路径）
      for (const [href] of items) {
        assert.ok(!/^(https?:|mailto:|\/)/.test(href), `quick/${p} 主导航应为站内相对链接: ${href}`);
      }
    }
    for (const p of QUICK_CONTENT_PAGES) {
      const html = quickHtml[p];
      assert.ok(classCount(html, 'q-crumb') >= 1, `quick/${p} 缺少 .q-crumb 面包屑`);
      const crumbNav = html.match(/<nav[^>]*aria-label="面包屑"[\s\S]*?<\/nav>/) || html.match(/class="q-crumb"[\s\S]*?<\/ol>/);
      assert.ok(crumbNav, `quick/${p} 面包屑区块缺失`);
      assert.ok(
        /<a\s[^>]*href="home\.html"/.test(crumbNav[0]),
        `quick/${p} 面包屑「首页」项应指向 home.html`,
      );
    }
    for (const p of QUICK_PAGES) {
      const f = footerBlock(quickHtml[p]);
      assert.ok(f, `quick/${p} 缺少 footer 区块`);
      for (const [href] of QUICK_NAV_ITEMS) {
        assert.ok(f.includes(`href="${href}"`), `quick/${p} 页脚缺少站内页面链接 ${href}`);
      }
    }
  });
});

/* ====================================================================
 * Phase E 说明：
 * - T-1~T-20（含 T-4b/T-12b）全部可自动化条目已覆盖；红项即产品缺陷，
 *   由 Phase E 报告列明（文件/行号/违反规则/修复建议），不在本测试中修复产品代码。
 * - Q-1~Q-13 为 quick-site-revamp 新站契约（design.md §2.2.5B）；
 *   同样遵循"断言即契约，红项=产品缺陷"原则。
 * - T-20（.nojekyll 缺失）为预存在缺陷（Phase D 基线即失败），
 *   quick-site-revamp design.md 未将其纳入本次范围，保持原样上报。
 * ==================================================================== */

