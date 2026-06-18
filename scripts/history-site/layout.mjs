import {escapeHtml} from "./format.mjs";

export function pageStyles() {
  return `<style>
    html, body { max-width: 100%; overflow-x: hidden; background: #f6f6f7; }
    html { scroll-padding-top: 24px; }
    body { color: #18181b; }
    .side-nav { position: fixed; inset: 0 auto 0 0; width: 292px; background: #111113; color: #f5f5f5; border-right: 1px solid #27272a; z-index: 100; display: flex; flex-direction: column; padding: 22px 18px; overflow-y: auto; overflow-x: hidden; }
    .side-nav__brand { display: block; color: #fff; font-size: 20px; font-weight: 850; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 8px; }
    .side-nav__brand span { color: #f0a4b7; }
    .side-nav__kicker { display: inline-flex; align-items: center; width: fit-content; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.08); color: #f8dbe3; border-radius: 999px; padding: 5px 9px; font-size: 10px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 18px; }
    .side-nav__status { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 20px; }
    .side-stat { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 9px 10px; min-width: 0; }
    .side-stat strong { display: block; color: #fff; font-size: 16px; line-height: 1.1; }
    .side-stat span { display: block; color: #b8b8bd; font-size: 10px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .side-nav__group { padding: 14px 0; border-top: 1px solid rgba(255,255,255,.1); }
    .side-nav__label { color: #8f8f96; font-size: 10px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 8px; }
    .side-nav__link { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #d7d7dc; border-radius: 8px; padding: 9px 10px; margin: 2px 0; font-size: 13px; font-weight: 750; line-height: 1.25; transition: background .15s, color .15s; }
    .side-nav__link:hover { background: rgba(255,255,255,.08); color: #fff; }
    .side-nav__link--active { background: #f8dbe3; color: #4c1625; }
    .side-nav__link--active:hover { background: #f8dbe3; color: #4c1625; }
    .side-nav__link small { color: inherit; opacity: .62; font-size: 10px; font-weight: 850; letter-spacing: .08em; }
    .side-nav__link--active small { opacity: 1; color: #4c1625; }
    .side-nav__foot { flex: 0 0 auto; color: #8f8f96; font-size: 11px; line-height: 1.55; margin-top: 14px; }
    .content-shell, .footer { margin-left: 292px; }
    .content-shell { min-height: 100vh; }
    .container { max-width: 1180px; padding: 0 34px; }
    .section { padding: 58px 0; }
    .section--gray { background: #f0f0f2; border-top: 1px solid #e5e5e8; border-bottom: 1px solid #e5e5e8; }
    .section__head { display: grid; grid-template-columns: minmax(170px, .34fr) minmax(280px, 1fr); gap: 18px; align-items: start; margin-bottom: 22px; }
    .section__title { font-size: 20px; line-height: 1.35; font-weight: 820; letter-spacing: 0; max-width: 780px; }
    .section__sub { max-width: 760px; }
    .evidence-session { text-transform: none; letter-spacing: 0; }
    .hero { padding: 50px 0 42px; background: linear-gradient(180deg, #fff 0%, #f6f6f7 100%); border-bottom: 1px solid #e8e8eb; }
    .hero__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 380px); gap: 24px; align-items: stretch; }
    .hero__badge { display: inline-block; background: var(--accent-light); color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; padding: 7px 14px; border-radius: 999px; margin-bottom: 22px; }
    .hero__title { font-size: clamp(42px, 6vw, 76px); font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; margin-bottom: 24px; }
    .hero__title .hl { color: var(--accent); }
    .hero__lead { font-size: 17px; line-height: 1.82; color: var(--text-secondary); margin-bottom: 14px; max-width: 880px; }
    .hero__meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .hero__meta span { border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 8px 12px; font-size: 12px; color: var(--text-secondary); }
    .panel { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 20px; box-shadow: var(--shadow); }
    .metric-grid, .cross-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 22px 0; }
    .metric-card, .cross-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
    .metric-card--warn, .cross-card--warn { background: var(--warning-light); border-color: var(--warning); }
    .metric-card--danger, .cross-card--danger { background: var(--danger-light); border-color: var(--danger); }
    .metric-card--success { background: var(--success-light); border-color: var(--success); }
    .card-label, .cross-label { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #4b5563; margin-bottom: 7px; }
    .card-value, .cross-value { font-size: 26px; font-weight: 850; line-height: 1.1; color: var(--text-primary); }
    .card-meta, .cross-meta { font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.55; }
    .callout-strong, .cross-callout { background: var(--bg-dark); color: #f4f4f4; border-radius: 10px; padding: 22px; margin-top: 22px; }
    .callout-strong p, .cross-callout p { color: #d8d8d8; }
    .cross-callout .card-label { color: #f8dbe3; }
    .cross-table-wrap { overflow-x: auto; max-width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #fff; box-shadow: 0 1px 0 rgba(0,0,0,.02); }
    .cross-table-wrap:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
    .cross-table { min-width: 860px; width: 100%; border-collapse: collapse; font-size: 13px; }
    .cross-table th, .cross-table td { padding: 12px 14px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border-light); }
    .cross-table th { background: var(--bg-gray); font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #4b5563; }
    .cross-table tr:last-child td { border-bottom: 0; }
    .cross-table ol { margin: 8px 0 0; padding-left: 18px; color: var(--text-secondary); line-height: 1.7; }
    .cross-table li { margin: 2px 0; }
    .pill { display: inline-block; border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 4px 9px; margin: 3px 4px 3px 0; font-size: 11px; color: var(--text-secondary); }
    .evidence-note { color: var(--text-secondary); font-size: 12px; line-height: 1.6; margin-top: 5px; }
    .deprecated { background: #fff7ed; border: 1px solid #f59e0b; border-left: 4px solid #d97706; border-radius: 8px; padding: 16px 18px; margin: 18px 0; color: #7c3e00; }
    .route-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 14px; }
    .route-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
    .route-card h3 { font-size: 17px; margin-bottom: 8px; }
    .route-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.7; }
    .backlog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
    .backlog-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; min-height: 176px; }
    .backlog-card h3 { font-size: 16px; line-height: 1.35; margin: 9px 0; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
    .badge--p0 { background: var(--danger); color: #fff; }
    .badge--p1 { background: #92400e; color: #fff; }
    .badge--p2 { background: #4b5563; color: #fff; }
    .badge--safe { background: var(--success-light); color: var(--success); }
    .backlog-card p { color: var(--text-secondary); font-size: 13px; line-height: 1.65; margin-top: 8px; }
    .playbook-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 14px; }
    .playbook-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .playbook-card__head { padding: 18px 20px; background: var(--bg-dark); color: #fff; }
    .playbook-card__head h3 { font-size: 17px; margin-bottom: 6px; }
    .playbook-card__head p { color: #d8d8d8; font-size: 13px; line-height: 1.65; }
    .playbook-card__body { padding: 18px 20px; }
    .playbook-card__body p { color: var(--text-secondary); font-size: 13px; line-height: 1.7; margin: 0 0 10px; }
    .playbook-card ol { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.75; }
    .playbook-gate { margin-top: 14px; border-top: 1px solid var(--border-light); padding-top: 12px; color: var(--accent); font-size: 13px; font-weight: 800; }
    .sessions-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
    .sessions-table { min-width: 900px; font-size: 13px; }
    .sessions-table th, .sessions-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-light); text-align: left; }
    .sessions-table th { background: var(--bg-gray); color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .footer { border-left: 1px solid #27272a; }
    .footer__desc, .footer__col li, .footer__bottom { color: #bdbdbd; }
    .footer-heading { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #fff; margin-bottom: 12px; }
    .num { text-align: right !important; font-family: var(--font-mono); }
    .good { color: #0f6b3a; font-weight: 800; }
    .bad { color: #9f1d1d; font-weight: 800; }
    .warn { color: #854d0e; font-weight: 800; }
    .callout--danger .callout__label { color: #7f1d1d; }
    .insight-chart { margin: 18px 0; padding: 16px; background: #fff; border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 1px 0 rgba(0,0,0,.02); max-width: 100%; }
    .insight-chart figcaption { display: grid; gap: 4px; margin: 0 0 12px; }
    .insight-chart figcaption strong { font-size: 15px; line-height: 1.35; color: var(--text-primary); }
    .insight-chart figcaption span, .insight-chart__note { color: var(--text-secondary); font-size: 12px; line-height: 1.65; }
    .insight-chart__note { margin: 12px 0 0; }
    .insight-bar, .paired-metric-list { display: grid; gap: 10px; }
    .insight-bar-row, .paired-metric { display: grid; grid-template-columns: minmax(120px, .34fr) minmax(160px, 1fr) minmax(86px, auto); gap: 10px; align-items: center; }
    .insight-bar-row__label, .paired-metric__label { color: var(--text-primary); font-size: 12px; font-weight: 800; line-height: 1.35; }
    .insight-bar-row__track, .paired-metric__bars { position: relative; min-height: 12px; background: #eef2f7; border-radius: 999px; overflow: hidden; }
    .insight-bar-row__track span { display: block; height: 100%; background: #2563eb; border-radius: inherit; }
    .insight-bar-row__value, .paired-metric__values { color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; text-align: right; }
    .paired-metric__bars { display: grid; gap: 3px; background: transparent; overflow: visible; }
    .paired-metric__bar { display: block; height: 8px; border-radius: 999px; }
    .paired-metric__bar--current { background: #2563eb; }
    .paired-metric__bar--historical { background: #0f766e; }
    .paired-metric__values { display: grid; gap: 2px; }
    .sankey-scroll { overflow-x: auto; max-width: 100%; border: 1px solid var(--border-light); border-radius: 8px; background: #fbfbfc; }
    .sankey-scroll:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
    .sankey-svg { display: block; width: 100%; min-width: 760px; height: auto; }
    .sankey-node rect { fill: #fff; stroke: #cbd5e1; stroke-width: 1; }
    .sankey-node text { fill: #18181b; font-size: 13px; font-weight: 800; text-anchor: middle; dominant-baseline: middle; }
    .sankey-node--muted rect { fill: #fff7ed; stroke: #f59e0b; }
    .sankey-node--unknown rect { fill: #f8fafc; stroke: #94a3b8; stroke-dasharray: 5 4; }
    .sankey-label { fill: #475569; font-size: 13px; }
    .sankey-label--strong { fill: #18181b; font-size: 15px; font-weight: 850; }
    .sankey-small { fill: #475569; font-size: 12px; }
    .insight-chart__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-top: 12px; }
    .insight-chart__facts div { display: grid; gap: 4px; padding: 12px; border: 1px solid var(--border-light); border-radius: 8px; background: #fafafa; }
    .insight-chart__facts strong { font-size: 12px; color: var(--text-primary); }
    .insight-chart__facts span { color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
    .insight-chart--missing { border-color: #f59e0b; background: #fffaf2; }
    @media (max-width: 1180px) { .side-nav { width: 248px; } .content-shell, .footer { margin-left: 248px; } .hero__grid { grid-template-columns: 1fr; } .section__head { grid-template-columns: 1fr; gap: 10px; } }
    @media (max-width: 820px) { .side-nav { position: relative; width: auto; min-height: 0; inset: auto; padding: 16px; } .side-nav__status { grid-template-columns: repeat(4, minmax(0, 1fr)); } .side-nav__group { padding: 10px 0; min-width: 0; } .side-nav__main { display: flex; max-width: 100%; min-width: 0; overflow-x: auto; overflow-y: hidden; gap: 8px; padding-bottom: 4px; scrollbar-width: none; } .side-nav__main::-webkit-scrollbar { display: none; } .side-nav__link { white-space: nowrap; margin: 0; flex: 0 0 auto; } .side-nav__foot { display: none; } .content-shell, .footer { margin-left: 0; } .container { padding: 0 18px; } .section { padding: 46px 0; } .hero { padding-top: 38px; } }
    @media (max-width: 560px) { .side-nav__status { grid-template-columns: repeat(2, minmax(0, 1fr)); } .metric-grid, .cross-grid, .playbook-grid { grid-template-columns: 1fr; } .section__title { font-size: 18px; } .hero__title { font-size: 40px; } .insight-chart { padding: 12px; } .insight-bar-row, .paired-metric { grid-template-columns: 1fr; gap: 6px; } .insight-bar-row__value, .paired-metric__values { text-align: left; } .sankey-svg { min-width: 680px; } }
  </style>`;
}

export function nav(active) {
  const links = [
    ["index.html", "I · 总览", "index"],
    ["metrics.html", "II · 指标口径", "metrics"],
    ["forensics.html", "III · 风险归因", "forensics"],
    ["trends.html", "IV · 趋势证据", "trends"],
    ["cross-audit.html", "V · 决策矩阵", "cross"]
  ];
  return `<nav class="side-nav" aria-label="Momcozy 洞察报告导航">
    <a href="index.html#hero" class="side-nav__brand">路特 AI <span>×</span><br>Momcozy</a>
    <div class="side-nav__kicker">Momcozy 经营洞察</div>
    <div class="side-nav__status" aria-label="报告状态">
      <div class="side-stat"><strong>5</strong><span>主页面</span></div>
      <div class="side-stat"><strong>KPI</strong><span>真实写入</span></div>
      <div class="side-stat"><strong>noindex</strong><span>访问边界</span></div>
    </div>
    <div class="side-nav__group">
      <div class="side-nav__label">主报告</div>
      <div class="side-nav__main">
        ${links.map(([href, label, key], index) => `<a href="${href}" class="side-nav__link${active === key ? " side-nav__link--active" : ""}"><span>${label}</span><small>0${index + 1}</small></a>`).join("")}
      </div>
    </div>
    <p class="side-nav__foot">真实金额与 KPI 已写入；密钥、服务器地址、私有路径和原始数据端点仍被排除。</p>
  </nav>`;
}

export function footer() {
  return `<footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <div class="footer__brand">路特 AI <span>×</span> Momcozy</div>
          <p class="footer__desc">私密经营版包含真实经营金额、真实 KPI、历史数据和自动采集证据；仍不发布密钥、服务器地址、私有路径或原始数据端点。</p>
        </div>
        <div class="footer__col"><div class="footer-heading">当前状态</div><ul><li><strong>历史骨架</strong> 已恢复</li><li><strong>真实 KPI</strong> 已写入</li><li><strong>外部采集</strong> 已融合</li></ul></div>
        <div class="footer__col"><div class="footer-heading">验收重点</div><ul><li>中文主线</li><li>私密访问控制</li><li>每页有依据</li></ul></div>
        <div class="footer__col"><div class="footer-heading">下一步</div><ul><li>PDP 队列扩采</li><li>归因质量治理</li><li>实验验收</li></ul></div>
      </div>
      <div class="footer__bottom">© 2026 路特 AI 公司 · Momcozy 私密经营洞察报告 · noindex</div>
    </div>
  </footer>`;
}

export function page(title, active, body, metaDescription = "Momcozy 独立站私密经营洞察报告") {
  const sanitizedDescription = escapeHtml(metaDescription);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="description" content="${sanitizedDescription}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/shared.css">
  ${pageStyles()}
</head>
<body>
${nav(active)}
<main class="content-shell">
${body}
</main>
${footer()}
</body>
</html>`;
}
