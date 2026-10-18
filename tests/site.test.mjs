/**
 * 手游16游戏盒子官网 — 静态站点单元测试（Phase E / T-DEV-12）
 * 契约：.codearts/specs/gamebox-website/design.md §5.2 测试矩阵 T-1~T-20（含 T-4b/T-12b）
 * 运行：node --test tests/
 * 依赖：零第三方依赖（node:test + node:assert/strict + node:fs + node:path + node:child_process + node:url）
 * 约定：本脚本只读不写，不修改任何站点文件；发现产品缺陷时保留失败用例并在 Phase E 报告中列明。
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
const SITE = 'https://shouyou16.github.io/';
const LINK_A = 'https://tui.buff.vip/37511'; // 仅允许出现在 index.html / download.html
const LINK_B = 'https://cvtui.appd.cn/chaov?surl=AxdNUZ'; // 仅允许出现在 guide.html
const FRIEND_URL = 'https://jdjdndn.github.io/'; // 必须出现在 links.html

const PAGES = ['index.html', 'games.html', 'download.html', 'guide.html', 'about.html', 'links.html', '404.html'];
const CONTENT_PAGES = ['games.html', 'download.html', 'guide.html', 'about.html', 'links.html']; // 5 个带面包屑的非首页
const DATA_PAGE = {
  'index.html': 'home',
  'games.html': 'games',
  'download.html': 'download',
  'guide.html': 'guide',
  'about.html': 'about',
  'links.html': 'links',
  '404.html': 'notfound',
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
const SITEMAP_URLS = [SITE, SITE + 'games.html', SITE + 'download.html', SITE + 'guide.html', SITE + 'about.html', SITE + 'links.html'];
const NAV_ITEMS = [
  ['index.html', '首页'],
  ['games.html', '游戏大全'],
  ['download.html', '下载'],
  ['guide.html', '攻略帮助'],
  ['about.html', '关于'],
  ['links.html', '友情链接'],
];
const CATEGORIES = ['rpg', 'card', 'casual', 'action', 'sim'];
const OG_IMAGE_URL = SITE + 'assets/images/og-image.png';
const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];
const SITE_TEXT_FILES = [...PAGES, 'llms.txt', 'robots.txt', 'sitemap.xml', 'assets/js/main.js', 'assets/css/main.css'];
const BRAND_BLACKLIST = ['手游十六', '手游16盒子', '手游１６', '手游游戏盒子', '手游 16', '手游16 游戏盒子', '16 游戏盒子'];
const SIZE_LIMITS = { js: 15 * 1024, css: 50 * 1024, html: 60 * 1024, pageTotal: 200 * 1024, ogImage: 300 * 1024 };

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
const INVENTORY = new Set(walkInventory(ROOT));

/* ====================================================================
 * T-1 ~ T-4b 链接纪律（C-08 红线：分发链接绝不与站内下载链接共页）
 * ==================================================================== */
describe('链接纪律 T-1~T-4b（C-08 红线）', () => {
  it('T-1 任意单页链接A/B 不同时出现（整文件字符串计数，覆盖 JSON-LD/注释/任何角落）', (t) => {
    const table = [];
    for (const p of PAGES) {
      const a = count(pageHtml[p], LINK_A);
      const b = count(pageHtml[p], LINK_B);
      table.push(`${p}: linkA=${a}, linkB=${b}`);
      assert.ok(!(a > 0 && b > 0), `${p} 链接A(${a}处)与链接B(${b}处)共页，违反 C-08 红线`);
    }
    t.diagnostic(`链接计数表（T-1 交付输出）:\n${table.join('\n')}`);
  });

  it('T-2 链接A 仅分布于 index/download；链接B 仅分布于 guide；其余 4 页为 0', () => {
    assert.ok(count(pageHtml['index.html'], LINK_A) >= 1, 'index.html 应包含链接A');
    assert.ok(count(pageHtml['download.html'], LINK_A) >= 2, 'download.html 链接A 应 ≥2（主下载按钮 + CTA 按钮）');
    assert.ok(count(pageHtml['guide.html'], LINK_B) >= 1, 'guide.html 应包含链接B');
    for (const p of ['games.html', 'about.html', 'links.html', '404.html']) {
      assert.equal(count(pageHtml[p], LINK_A), 0, `${p} 不得出现链接A`);
      assert.equal(count(pageHtml[p], LINK_B), 0, `${p} 不得出现链接B`);
    }
  });

  it('T-3 链接A/B 与常量逐字符相等（域名字符串计数 = 精确URL计数，防转义/编码/改写变体）', () => {
    for (const p of PAGES) {
      const html = pageHtml[p];
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
  });

  it('T-4 含链接A/B 的 <a> 均带 target="_blank" 且 rel 含 noopener', () => {
    for (const p of PAGES) {
      for (const tag of anchors(pageHtml[p])) {
        if (!tag.includes(LINK_A) && !tag.includes(LINK_B)) continue;
        assert.ok(tag.includes('target="_blank"'), `${p} 下载外链缺少 target="_blank": ${tag}`);
        assert.match(tag, /rel="[^"]*\bnoopener\b[^"]*"/, `${p} 下载外链 rel 缺少 noopener: ${tag}`);
      }
    }
  });

  it('T-4b index Hero 主按钮与 download 主下载按钮 href == 链接A；guide ≥1 处 href == 链接B', () => {
    for (const p of ['index.html', 'download.html']) {
      const hit = anchors(pageHtml[p]).some((tag) => tag.includes(`href="${LINK_A}"`) && tag.includes('btn--primary'));
      assert.ok(hit, `${p} 应存在 class 含 btn--primary 且 href==链接A 的主按钮`);
    }
    const guideHit = anchors(pageHtml['guide.html']).some((tag) => tag.includes(`href="${LINK_B}"`));
    assert.ok(guideHit, 'guide.html 应存在 href==链接B 的链接');
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

  it('T-12d links.html 友链卡 ≥1、含 jdjdndn.github.io；每条友链含名称/URL/简介三要素', () => {
    const l = pageHtml['links.html'];
    const positions = [...l.matchAll(/class="link-card"/g)].map((m) => m.index);
    assert.ok(positions.length >= 1, `links.html 友链卡应 ≥1，实际 ${positions.length}`);
    assert.ok(
      count(l, FRIEND_URL) >= 2,
      `links.html 应包含 jdjdndn 友链（URL 展示 + href 至少 2 处），实际 ${count(l, FRIEND_URL)}`,
    );
    for (let i = 0; i < positions.length; i++) {
      const end = i + 1 < positions.length ? positions[i + 1] : l.length;
      const block = l.slice(positions[i], end);
      assert.ok(block.includes('<h3'), `友链卡 ${i + 1} 缺少名称（h3）`);
      assert.ok(block.includes('link-url'), `友链卡 ${i + 1} 缺少 URL 展示（p.link-url）`);
      assert.ok(count(block, '<p') >= 2, `友链卡 ${i + 1} 缺少简介（p）`);
      assert.ok(/href="https?:\/\//.test(block), `友链卡 ${i + 1} 缺少可点击的访问链接`);
    }
  });
});

/* ====================================================================
 * T-13 ~ T-17 设施与内链
 * ==================================================================== */
describe('设施与内链 T-13~T-17', () => {
  it('T-13 全站无以 / 开头的 src/href 引用（排除 http(s)://、#、mailto: 等外部/锚点形式）', () => {
    for (const p of PAGES) {
      for (const attr of ['src', 'href']) {
        for (const v of attrValues(pageHtml[p], attr)) {
          assert.ok(
            !v.startsWith('/'),
            `${p} ${attr} 使用了根绝对路径（违反"资产与本站文件同目录或子目录相对引用"契约）: ${v}`,
          );
        }
      }
    }
  });

  it('T-14 sitemap.xml 含且仅含 6 个预期 URL、无 404；lastmod 数量一致且为合法日期', () => {
    const xml = read('sitemap.xml');
    assert.ok(xml.includes('<?xml'), 'sitemap.xml 缺少 XML 声明');
    assert.ok(xml.includes('<urlset'), 'sitemap.xml 缺少 urlset 根元素');
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert.deepEqual(locs, SITEMAP_URLS, 'sitemap URL 集合（含顺序）与预期不符');
    assert.ok(!locs.some((u) => u.includes('404')), 'sitemap.xml 不得包含 404.html');
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

  it('T-15b llms.txt 含品牌名与 6 个页面 URL、sitemap 指引；且不含任何下载分发链接', () => {
    const llms = read('llms.txt');
    assert.ok(llms.includes(BRAND), 'llms.txt 缺少品牌名');
    for (const u of SITEMAP_URLS) {
      assert.ok(llms.includes(u), `llms.txt 缺少页面 URL: ${u}`);
    }
    assert.ok(llms.includes(`${SITE}sitemap.xml`), 'llms.txt 缺少 sitemap 指引');
    assert.equal(count(llms, 'tui.buff.vip'), 0, 'llms.txt 不得包含链接A');
    assert.equal(count(llms, 'cvtui.appd.cn'), 0, 'llms.txt 不得包含链接B');
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

  it('T-17 内链可达性：全站所有相对 href/src 均指向真实文件（大小写敏感比对）', () => {
    const refs = new Map(); // ref -> 引用来源页面
    for (const p of PAGES) {
      for (const attr of ['href', 'src']) {
        for (let v of attrValues(pageHtml[p], attr)) {
          if (!v || v.startsWith('#') || /^https?:/i.test(v) || /^(mailto|tel|data|javascript):/i.test(v)) continue;
          v = v.split('#')[0].split('?')[0];
          if (!v) continue;
          if (!refs.has(v)) refs.set(v, p);
        }
      }
    }
    assert.ok(refs.size >= 10, `内链引用数量异常（${refs.size}），预期 ≥10`);
    for (const [ref, from] of refs) {
      const target = ref.startsWith('/') ? ref.slice(1) : ref;
      assert.ok(
        INVENTORY.has(target),
        `内链 ${ref}（由 ${from} 引用）指向的文件不存在或大小写不符`,
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

  it('T-19d 零第三方资源：全站无 http(s):// 的 src= 引用', () => {
    for (const p of PAGES) {
      for (const v of attrValues(pageHtml[p], 'src')) {
        assert.ok(!/^https?:\/\//i.test(v), `${p} 引用了第三方资源（违反零第三方依赖）: ${v}`);
      }
    }
  });

  it('T-19e og-image.png <300KB 且为 PNG 魔数；favicon 三件套存在', () => {
    const img = fs.readFileSync(path.join(ROOT, 'assets/images/og-image.png'));
    assert.ok(img.length < SIZE_LIMITS.ogImage, `og-image.png ${img.length}B 超 ${SIZE_LIMITS.ogImage}B 预算`);
    assert.equal(img[0], 0x89, 'og-image.png 缺少 PNG 魔数第 1 字节 0x89');
    assert.equal(img[1], 0x50, 'og-image.png 缺少 PNG 魔数第 2 字节 0x50');
    assert.equal(img[2], 0x4e, 'og-image.png 缺少 PNG 魔数第 3 字节 0x4E');
    assert.equal(img[3], 0x47, 'og-image.png 缺少 PNG 魔数第 4 字节 0x47');
    for (const f of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png']) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} 不存在`);
    }
  });

  it('T-20 仓库根存在 .nojekyll 与 404.html（GitHub Pages 保障）', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.nojekyll')), '.nojekyll 不存在');
    assert.ok(fs.existsSync(path.join(ROOT, '404.html')), '404.html 不存在');
  });
});

/* ====================================================================
 * Phase E 说明：
 * - T-1~T-20（含 T-4b/T-12b）全部可自动化条目已覆盖；红项即产品缺陷，
 *   由 Phase E 报告列明（文件/行号/违反规则/修复建议），不在本测试中修复产品代码。
 * ==================================================================== */
