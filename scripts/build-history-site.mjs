import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "_site");
const assetDir = path.join(root, "history_static/assets");
const sessionsDir = path.join(root, "src/_data/sessions");
const publicCrossAuditPath = path.join(root, "src/_data/public-cross-audit.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(sourcePath, targetPath);
    else copyFile(sourcePath, targetPath);
  }
}

function cleanOutput() {
  fs.rmSync(outputDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100
  });
  ensureDir(outputDir);
}

function latestSession() {
  const sessions = fs.readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(path.join(sessionsDir, file)))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  if (sessions.length === 0) throw new Error("No session files found");
  return sessions[sessions.length - 1];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function routeMetric(session, routeId, viewport) {
  return (session.observations || []).find((item) =>
    item.routeId === routeId && item.viewport === viewport
  )?.metrics;
}

function maxMetric(session, metric) {
  const values = (session.observations || [])
    .map((item) => item.metrics?.[metric])
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}

function pageStyles() {
  return `<style>
    html, body { max-width: 100%; overflow-x: hidden; }
    .nav-links { flex-wrap: wrap; row-gap: 8px; }
    .hero { padding: 76px 0 72px; background: linear-gradient(180deg, #fff 0%, var(--bg-gray) 100%); }
    .hero__grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr); gap: 36px; align-items: start; }
    .hero__badge { display: inline-block; background: var(--accent-light); color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; padding: 7px 14px; border-radius: 999px; margin-bottom: 22px; }
    .hero__title { font-size: clamp(42px, 6vw, 76px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; margin-bottom: 24px; }
    .hero__title .hl { color: var(--accent); }
    .hero__lead { font-size: 17px; line-height: 1.82; color: var(--text-secondary); margin-bottom: 14px; max-width: 880px; }
    .hero__meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .hero__meta span { border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 8px 12px; font-size: 12px; color: var(--text-secondary); }
    .panel { background: #fff; border: 1px solid var(--border); border-radius: 16px; padding: 24px; box-shadow: var(--shadow); }
    .metric-grid, .cross-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 26px 0; }
    .metric-card, .cross-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .metric-card--warn, .cross-card--warn { background: var(--warning-light); border-color: var(--warning); }
    .metric-card--danger, .cross-card--danger { background: var(--danger-light); border-color: var(--danger); }
    .metric-card--success { background: var(--success-light); border-color: var(--success); }
    .card-label, .cross-label { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #4b5563; margin-bottom: 7px; }
    .card-value, .cross-value { font-size: 26px; font-weight: 850; line-height: 1.1; color: var(--text-primary); }
    .card-meta, .cross-meta { font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.55; }
    .callout-strong, .cross-callout { background: var(--bg-dark); color: #f4f4f4; border-radius: 14px; padding: 24px; margin-top: 24px; }
    .callout-strong p, .cross-callout p { color: #d8d8d8; }
    .cross-table-wrap { overflow-x: auto; max-width: 100%; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
    .cross-table { min-width: 860px; width: 100%; border-collapse: collapse; font-size: 13px; }
    .cross-table th, .cross-table td { padding: 12px 14px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border-light); }
    .cross-table th { background: var(--bg-gray); font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #4b5563; }
    .cross-table tr:last-child td { border-bottom: 0; }
    .pill { display: inline-block; border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 4px 9px; margin: 3px 4px 3px 0; font-size: 11px; color: var(--text-secondary); }
    .evidence-note { color: var(--text-secondary); font-size: 12px; line-height: 1.6; margin-top: 5px; }
    .deprecated { background: #fff7ed; border: 1px solid #f59e0b; border-left: 4px solid #d97706; border-radius: 12px; padding: 18px 20px; margin: 20px 0; color: #7c3e00; }
    .route-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .route-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .route-card h3 { font-size: 17px; margin-bottom: 8px; }
    .route-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.7; }
    .sessions-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
    .sessions-table { min-width: 900px; font-size: 13px; }
    .sessions-table th, .sessions-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); text-align: left; }
    .sessions-table th { background: var(--bg-gray); color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .footer__desc, .footer__col li, .footer__bottom { color: #bdbdbd; }
    .footer-heading { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #fff; margin-bottom: 12px; }
    .num { text-align: right !important; font-family: var(--font-mono); }
    .good { color: #0f6b3a; font-weight: 800; }
    .bad { color: #9f1d1d; font-weight: 800; }
    .warn { color: #854d0e; font-weight: 800; }
    .callout--danger .callout__label { color: #7f1d1d; }
    @media (max-width: 980px) { .hero__grid, .route-grid { grid-template-columns: 1fr; } .metric-grid, .cross-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 560px) { .metric-grid, .cross-grid { grid-template-columns: 1fr; } .nav-top__inner { height: auto; padding: 14px 0; align-items: flex-start; gap: 12px; flex-direction: column; } .hero { padding-top: 52px; } }
  </style>`;
}

function nav(active) {
  const links = [
    ["index.html", "I · 总览", "index"],
    ["metrics.html", "II · 指标口径", "metrics"],
    ["forensics.html", "III · 证据链", "forensics"],
    ["trends.html", "IV · 性能趋势", "trends"],
    ["cross-audit.html", "V · 交叉审计", "cross"]
  ];
  return `<header>
  <div class="promo-banner"><span class="dot"></span>Momcozy 独立站公开审计 · 历史骨架与最新数据重审<span class="dot"></span></div>
  <nav class="nav-top">
    <div class="container">
      <div class="nav-top__inner">
        <a href="index.html#hero" class="nav-logo">路特 AI <span class="x">×</span> <span>Momcozy</span></a>
        <div class="nav-links">
          ${links.map(([href, label, key]) => `<a href="${href}" class="nav-main${active === key ? " nav-main--active" : ""}">${label}</a>`).join("")}
          <a href="index.html#decisions" class="nav-cta">决策建议</a>
        </div>
      </div>
    </div>
  </nav>
  </header>`;
}

function footer() {
  return `<footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <div class="footer__brand">路特 AI <span>×</span> Momcozy</div>
          <p class="footer__desc">公开站仅发布脱敏技术观察与口径结论；内部经营表、金额明细、收益模型输入和私有路径均不进入发布包。</p>
        </div>
        <div class="footer__col"><div class="footer-heading">当前状态</div><ul><li><strong>历史骨架</strong> 已恢复</li><li><strong>经营结论</strong> 已重审</li><li><strong>外部采集</strong> 已融合</li></ul></div>
        <div class="footer__col"><div class="footer-heading">验收重点</div><ul><li>中文主线</li><li>无私有数据泄露</li><li>每页有依据</li></ul></div>
        <div class="footer__col"><div class="footer-heading">下一步</div><ul><li>PDP 队列扩采</li><li>归因质量治理</li><li>实验验收</li></ul></div>
      </div>
      <div class="footer__bottom">© 2026 路特 AI 公司 · Momcozy 公开审计报告 · noindex</div>
    </div>
  </footer>`;
}

function page(title, active, body) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="Momcozy 独立站公开技术审计报告，按 2026-06-14 内外部数据重审更新。">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/shared.css">
  ${pageStyles()}
</head>
<body>
${nav(active)}
<main>
${body}
</main>
${footer()}
</body>
</html>`;
}

function sourcePills(references) {
  return references.map((reference) => `<span class="pill">${escapeHtml(reference)}</span>`).join("");
}

function conclusionRows(conclusions) {
  return conclusions.map((item) => `<tr>
    <td><strong>${escapeHtml(item.id)}</strong></td>
    <td>${escapeHtml(item.issue)}</td>
    <td>${escapeHtml(item.verdict)}<div class="evidence-note">证据：${escapeHtml(item.evidence)}</div></td>
    <td>${escapeHtml(item.confidence)}</td>
    <td>${sourcePills(item.references)}</td>
  </tr>`).join("");
}

function selectedConclusions(data, pageName) {
  const update = data.pageUpdates.find((item) => item.page === pageName);
  const ids = new Set(update?.conclusionIds || data.conclusions.map((item) => item.id));
  return data.conclusions.filter((item) => ids.has(item.id));
}

function pageRoute(data, pageName) {
  return data.pageUpdates.find((item) => item.page === pageName)?.route || "公开摘要已按最新交叉审计刷新。";
}

function crossAuditCards(data) {
  return `<div class="cross-grid">
    <div class="cross-card cross-card--warn">
      <div class="cross-label">内部数据状态</div>
      <div class="cross-value">${escapeHtml(data.internal.assessment)}</div>
      <div class="cross-meta">${data.internal.statusCounts.PASS} PASS / ${data.internal.statusCounts.WARN} WARN / ${data.internal.statusCounts.FAIL} FAIL</div>
    </div>
    <div class="cross-card cross-card--warn">
      <div class="cross-label">观察窗口</div>
      <div class="cross-value">${data.internal.trafficObservedDays}d / ${data.internal.salesObservedDays}d</div>
      <div class="cross-meta">流量观察天数 / 销售观察天数，不可强行合并</div>
    </div>
    <div class="cross-card cross-card--danger">
      <div class="cross-label">外部技术债最大值</div>
      <div class="cross-value">${data.external.maxThirdPartyFailures} 次</div>
      <div class="cross-meta">第三方失败；PDP ${escapeHtml(data.external.pdpThirdPartyFailures)}</div>
    </div>
    <div class="cross-card">
      <div class="cross-label">PDP 下一轮队列</div>
      <div class="cross-value">${data.internal.pdpWatchlistCount} 个</div>
      <div class="cross-meta">内部 watchlist；公开采集目前覆盖 ${data.external.routeCount} 条路径</div>
    </div>
  </div>`;
}

function crossAuditSection(data, pageName) {
  return `<section class="section section--gray" id="cross-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">2026-06-14 · 内外部数据刷新</div>
        <h2 class="section__title">本页结论已按最新经营数据重审</h2>
        <p class="section__sub">${escapeHtml(pageRoute(data, pageName))}</p>
      </div>
      ${crossAuditCards(data)}
      <div class="deprecated"><strong>覆盖旧叙事：</strong>旧版高收益点估、旧窗口经营口径和 SEO 变现故事不再作为当前决策依据。当前公开页只发布脱敏摘要；原始经营表、金额明细和收益模型输入不进入公开站。</div>
      <div class="cross-table-wrap">
        <table class="cross-table">
          <thead><tr><th>ID</th><th>问题</th><th>当前结论与证据</th><th>等级</th><th>参考依据</th></tr></thead>
          <tbody>${conclusionRows(selectedConclusions(data, pageName))}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

function hero(data) {
  return `<section class="hero" id="hero">
    <div class="container">
      <div class="hero__grid">
        <div>
          <span class="hero__badge">M1 v2.0 历史骨架 · 2026-06-14 数据重审版</span>
          <h1 class="hero__title">旧收益叙事失效，<br><span class="hl">技术债仍成立</span>。</h1>
          <p class="hero__lead"><strong>先把话说重：</strong>历史报告中的高收益点估、旧窗口经营口径和 SEO 变现故事不能继续当作当前决策基线。今天覆盖更新后的经营数据只能支持方向性诊断和实验假设。</p>
          <p class="hero__lead">外部自动采集没有推翻技术判断。首页与代表性 PDP 仍暴露约 1.9MB JS、最高 ${data.external.maxDomNodes.toLocaleString("en-US")} DOM 节点、最高 ${data.external.maxThirdPartyFailures} 次第三方失败，LCP ${data.external.lcpObservedSamples}/${data.external.lcpTotalSamples} 可观测。</p>
          <div class="hero__meta">
            <span>经营刷新 · ${data.internal.statusCounts.PASS} PASS / ${data.internal.statusCounts.WARN} WARN / ${data.internal.statusCounts.FAIL} FAIL</span>
            <span>公开采集 · ${escapeHtml(data.external.latestSession)} · ${data.external.routeCount} 路径</span>
            <span>边界 · 不公开原始经营明细</span>
          </div>
        </div>
        <div class="panel">
          <div class="card-label">当前决策状态</div>
          <div class="card-value" style="font-size:42px;color:var(--accent);">降级为假设</div>
          <p class="card-meta">旧版收益点估不再作为承诺收益；只保留为待实验验证的方向性假设。</p>
          ${crossAuditCards(data)}
        </div>
      </div>
    </div>
  </section>`;
}

function overviewBody(data) {
  return `${hero(data)}
  <section class="section" id="health">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">I · 总览重审</div>
        <h2 class="section__title">当前经营数据可用，但不能被过度消费</h2>
        <p class="section__sub">今天更新后的 workbook 通过了核心算术校验，但仍有 3 个 WARN：流量与销售观察窗口不一致、币种需要 owner 确认、自然搜索关键词行为空。</p>
      </div>
      ${crossAuditCards(data)}
      <div class="callout-strong">
        <div class="card-label" style="color:#fbbf24;">尖锐结论</div>
        <p>经营漏斗支持“优化值得做”，但不能证明“某个技术修复直接产生某个收益点估”。P0/P1 应以可复现技术债和实验验收指标排序，而不是用旧版月化收益承诺排序。</p>
      </div>
    </div>
  </section>
  ${crossAuditSection(data, "index.html")}
  <section class="section" id="top15">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">历史 Top 15 · 当前改判</div>
        <h2 class="section__title">Top 15 病灶不再按旧收益点估排序</h2>
        <p class="section__sub">旧站的 Top 15 结构保留为执行清单，但排序依据改成：公开可复现、影响路径明确、可灰度验证、可回滚。</p>
      </div>
      <div class="route-grid">
        <div class="route-card"><h3>P0 · 第三方失败与归因盲区</h3><p>最高 56 次失败是当前最强公开证据。先枚举域名、归属、业务用途和失败率，再决定保留、延迟或移除。</p></div>
        <div class="route-card"><h3>P0 · 前端重量与 DOM 膨胀</h3><p>首页与代表性 PDP 都复现了重量问题，说明不是单页偶发。验收指标应绑定 JS 体积、DOM 节点、请求数和交互阻塞。</p></div>
        <div class="route-card"><h3>P1 · PDP 队列扩采</h3><p>内部 watchlist 有 10 个 PDP，但公开采集只有 1 条代表性 PDP。下一轮必须扩成页面队列，避免以偏概全。</p></div>
      </div>
    </div>
  </section>
  <section class="section section--gray" id="decisions">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">决策建议</div>
        <h2 class="section__title">上线前只批准三件事</h2>
        <p class="section__sub">一是口径治理，二是可复现技术债修复，三是实验验收。其余涉及收入承诺、渠道预算、SEO 变现的判断全部等待数据补齐。</p>
      </div>
      <div class="cross-table-wrap">
        <table class="cross-table">
          <thead><tr><th>优先级</th><th>动作</th><th>验收依据</th><th>不做什么</th></tr></thead>
          <tbody>
            <tr><td><strong>P0</strong></td><td>恢复并锁定当前中文主线站点</td><td>5 页中文、noindex、无敏感经营数据、链接与移动端通过</td><td>不再发布旧收益点估</td></tr>
            <tr><td><strong>P0</strong></td><td>第三方失败治理</td><td>失败域名清单、owner、加载策略、回滚窗口</td><td>不直接删除归因组件</td></tr>
            <tr><td><strong>P1</strong></td><td>PDP 队列扩采</td><td>watchlist 覆盖、双视口、每页独立指标</td><td>不把单条 PDP 当全站代表</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

function metricsBody(data) {
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">II · 指标口径 · 最新治理版</span>
      <h1 class="hero__title">先统一口径，<br><span class="hl">再讨论增长。</span></h1>
      <p class="hero__lead">这页不再把旧 25 指标当作全部当前事实。最新经营数据只能支持三类表达：可复算漏斗、需要 caveat 的经营口径、暂时冻结的 SEO 变现故事。</p>
      <p class="hero__lead">公开可用的强证据来自外部自动采集：TTFB 不是主问题，JS、DOM、第三方失败和 LCP 不可观测才是工程优先级。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  <section class="section section--gray" id="funnel">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">口径治理</div>
        <h2 class="section__title">旧漏斗图只保留为历史，不再作为当前承诺收益依据</h2>
        <p class="section__sub">内部漏斗校验通过，说明业务摩擦真实存在；但 traffic/sales 窗口不一致、币种待确认、SEO keyword rows = ${data.internal.naturalSearchRows}，所以当前只允许做实验假设。</p>
      </div>
      <div class="cross-table-wrap">
        <table class="cross-table">
          <thead><tr><th>口径</th><th>当前判定</th><th>可以怎么用</th><th>不能怎么用</th><th>依据</th></tr></thead>
          <tbody>
            <tr><td>内部经营漏斗</td><td>可复算，但需 caveat</td><td>作为实验 baseline 与优先级方向</td><td>直接承诺收益</td><td>内部经营数据校验摘要</td></tr>
            <tr><td>外部性能采集</td><td>可公开复核</td><td>定位 JS、DOM、第三方失败、LCP 风险</td><td>单独证明收入因果</td><td>${escapeHtml(data.external.latestSession)}</td></tr>
            <tr><td>PDP watchlist</td><td>私有执行队列</td><td>扩展 recurring collector 与页面级排查</td><td>代表全站 PDP</td><td>内部 watchlist ${data.internal.pdpWatchlistCount} 个</td></tr>
            <tr><td>SEO 变现</td><td>冻结</td><td>等待独立搜索源补齐</td><td>继续沿用旧 SEO 收益故事</td><td>keyword rows = ${data.internal.naturalSearchRows}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  ${crossAuditSection(data, "metrics.html")}
  <section class="section" id="metric-dictionary">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">指标字典 · 当前公开版</div>
        <h2 class="section__title">只保留公开可复核指标</h2>
        <p class="section__sub">本页公开发布的指标限于技术观测与口径状态；经营金额、私有转化细分和收益模型输入只留在内部分析环境。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">TTFB</div><div class="card-value">416 / 213ms</div><div class="card-meta">首页桌面 / 移动；不是当前主因</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">JS</div><div class="card-value">1.9MB+</div><div class="card-meta">首页与 PDP 均处高位</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">DOM</div><div class="card-value">${data.external.maxDomNodes.toLocaleString("en-US")}</div><div class="card-meta">最大观测节点数</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">LCP</div><div class="card-value">${data.external.lcpObservedSamples}/${data.external.lcpTotalSamples}</div><div class="card-meta">样本未可观测，需补采</div></div>
      </div>
    </div>
  </section>`;
}

function forensicsBody(data) {
  return `<section class="hero" id="scene">
    <div class="container">
      <span class="hero__badge">III · 证据链重审 · 2026-06-14</span>
      <h1 class="hero__title">证据仍尖锐，<br><span class="hl">因果必须收紧。</span></h1>
      <p class="hero__lead">本页保留历史法医取证的“现场化”表达，但把旧版“修复即收益”的表达改成证据等级：第三方失败、JS/DOM 膨胀、LCP 不可观测可以公开复核；收入影响只能在私有实验中验证。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${crossAuditSection(data, "forensics.html")}
  <section class="section" id="fatal">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">证据 1 · 第三方失败</div>
        <h2 class="section__title">不是“删脚本”，而是先判归属和必要性</h2>
        <p class="section__sub">外部采集显示 PDP 第三方失败达到 ${escapeHtml(data.external.pdpThirdPartyFailures)}。这些失败可能同时影响性能、归因和实验数据，因此不能简单当作纯前端问题。</p>
      </div>
      <div class="route-grid">
        <div class="route-card"><h3>归因盲区</h3><p>失败组件可能让广告、再营销或实验记录出现偏差。治理顺序是 owner、用途、失败率、加载策略、回滚窗口。</p></div>
        <div class="route-card"><h3>性能压力</h3><p>第三方失败通常伴随重试、长任务和额外请求。验收要看失败数、请求数、脚本数和页面错误是否同步下降。</p></div>
        <div class="route-card"><h3>决策边界</h3><p>公开页只能证明技术风险存在，不能单独证明经营收益。后续收益判断必须走灰度或实验。</p></div>
      </div>
    </div>
  </section>
  <section class="section section--gray" id="pdp">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">证据 2 · PDP 代表性不足</div>
        <h2 class="section__title">代表性 PDP 不能代表所有商品页</h2>
        <p class="section__sub">内部 watchlist 有 ${data.internal.pdpWatchlistCount} 个 PDP，公开采集目前只有 homepage 与 product-detail 两条路径。下一轮必须按队列扩采。</p>
      </div>
      <div class="callout callout--danger">
        <div class="callout__label">当前缺口</div>
        <div class="callout__title">没有覆盖 cart / checkout / 多 PDP 队列，就不能完成全站闭环验收。</div>
        <div class="callout__body">这不是形式问题。单条 PDP 只能说明风险复现，不能证明所有 PDP 的风险排序，也不能证明最终交易链路影响。</div>
      </div>
    </div>
  </section>`;
}

function latestRows(session) {
  const rows = [
    ["首页", "desktop", routeMetric(session, "homepage", "desktop")],
    ["首页", "mobile", routeMetric(session, "homepage", "mobile")],
    ["代表性 PDP", "desktop", routeMetric(session, "product-detail", "desktop")],
    ["代表性 PDP", "mobile", routeMetric(session, "product-detail", "mobile")]
  ];
  for (const [, , metrics] of rows) {
    if (!metrics) throw new Error("Latest route-aware session is missing required route metrics");
  }
  return rows.map(([route, viewport, metrics]) => `<tr>
    <td>${route}</td>
    <td>${viewport}</td>
    <td class="num good">${metrics.fcp}</td>
    <td class="num good">${metrics.ttfb}</td>
    <td class="num good">${metrics.cls}</td>
    <td class="num bad">${metrics.jsKb}</td>
    <td class="num bad">${metrics.domNodes}</td>
    <td class="num bad">${metrics.totalRequests}</td>
    <td class="num bad">${metrics.thirdPartyFailures}</td>
  </tr>`).join("");
}

function trendsBody(data, session) {
  const maxJs = maxMetric(session, "jsKb");
  const maxDom = maxMetric(session, "domNodes");
  const maxFailures = maxMetric(session, "thirdPartyFailures");
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">IV · 性能趋势 · M1 → M3</span>
      <h1 class="hero__title">5 次采集，<br><span class="hl">趋势必须和经营 caveat 一起读。</span></h1>
      <p class="hero__lead">趋势页已经追加 ${escapeHtml(data.external.latestSession)}。外部采集证明技术债持续存在；内部经营刷新证明收益点估必须实验化。两者合在一起，结论更尖锐：先修可复现技术债，但不要用旧收益承诺包装它。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${crossAuditSection(data, "trends.html")}
  <section class="section" id="latest-v3">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">最新融合 · v3 路由感知自动化基线</div>
        <h2 class="section__title">2026-06-14：趋势页已并入最新外部采集</h2>
        <p class="section__sub">v3 采集覆盖 homepage / product-detail × 桌面/移动双视口；旧 M2 首页趋势只作为历史参照，不再被当作最新结论。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">最新 session</div><div class="card-value">${escapeHtml(session.observedAt)}</div><div class="card-meta">${escapeHtml(session.methodologyVersion)}</div></div>
        <div class="metric-card metric-card--success"><div class="card-label">TTFB 仍非主因</div><div class="card-value">${data.external.homepageTtfbDesktopMs} / ${data.external.homepageTtfbMobileMs}ms</div><div class="card-meta">首页桌面 / 移动</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">3P 失败最大值</div><div class="card-value">${maxFailures}</div><div class="card-meta">PDP ${escapeHtml(data.external.pdpThirdPartyFailures)}</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">LCP 可观测</div><div class="card-value">${data.external.lcpObservedSamples} / ${data.external.lcpTotalSamples}</div><div class="card-meta">全部路由-视口样本未观测</div></div>
      </div>
      <div class="sessions-wrap">
        <table class="sessions-table">
          <thead><tr><th>路线</th><th>视口</th><th>FCP (s)</th><th>TTFB (ms)</th><th>CLS</th><th>JS (KB)</th><th>DOM</th><th>请求</th><th>3P 失败</th></tr></thead>
          <tbody>${latestRows(session)}</tbody>
        </table>
      </div>
      <div class="callout-strong">
        <div class="card-label" style="color:#fbbf24;">融合结论</div>
        <p>最新数据没有推翻历史站的主判断，只是把问题从首页推进到“首页 + 商品详情路径均复现”：客户端体积最大 ${Math.round(maxJs / 1024 * 10) / 10}MB、DOM 最大 ${maxDom.toLocaleString("en-US")} 节点、第三方失败最大 ${maxFailures}，仍是核心技术债。</p>
      </div>
    </div>
  </section>`;
}

function crossAuditBody(data) {
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">V · 2026-06-14 · 内外部数据重审</span>
      <h1 class="hero__title">历史报告为骨架，<br><span class="hl">最新数据改结论。</span></h1>
      <p class="hero__lead">本页集中呈现公开可发布的交叉审计结论。它来自私有经营数据刷新和公开外部采集的交叉验证，但不发布原始经营表、金额明细或收益模型输入。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${crossAuditSection(data, "cross-audit.html")}`;
}

function write404() {
  const html = page("404 — Momcozy 审计报告", "none", `<section class="container" style="padding:80px 24px;">
    <p class="section__eyebrow">路特 AI × Momcozy</p>
    <p class="section__eyebrow">HTTP 404</p>
    <h1 class="section__title">页面不存在</h1>
    <p class="section__sub">请返回 Momcozy 独立站深度审计总览。</p>
    <p style="margin-top:28px;"><a class="nav-cta" href="index.html">返回总览</a></p>
  </section>`);
  fs.writeFileSync(path.join(outputDir, "404.html"), html, "utf8");
}

function writePage(file, title, active, body) {
  fs.writeFileSync(path.join(outputDir, file), page(title, active, body), "utf8");
}

cleanOutput();
copyDir(assetDir, path.join(outputDir, "assets"));
copyFile(path.join(root, "history_static/.nojekyll"), path.join(outputDir, ".nojekyll"));

const session = latestSession();
const publicCrossAudit = readJson(publicCrossAuditPath);

writePage("index.html", "I · 总览 — Momcozy 审计报告", "index", overviewBody(publicCrossAudit));
writePage("metrics.html", "II · 指标口径 — Momcozy 审计报告", "metrics", metricsBody(publicCrossAudit));
writePage("forensics.html", "III · 证据链 — Momcozy 审计报告", "forensics", forensicsBody(publicCrossAudit));
writePage("trends.html", "IV · 性能趋势 — Momcozy 审计报告", "trends", trendsBody(publicCrossAudit, session));
writePage("cross-audit.html", "V · 交叉审计 — Momcozy 审计报告", "cross", crossAuditBody(publicCrossAudit));
write404();
fs.writeFileSync(path.join(outputDir, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");

console.log(`built history-primary site with latest trend session ${session.sessionId}`);
