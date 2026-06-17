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
    .side-nav__group--anchors { flex: 1 1 auto; min-height: 0; }
    .side-nav__label { color: #8f8f96; font-size: 10px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 8px; }
    .side-nav__link { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #d7d7dc; border-radius: 8px; padding: 9px 10px; margin: 2px 0; font-size: 13px; font-weight: 750; line-height: 1.25; transition: background .15s, color .15s; }
    .side-nav__link:hover { background: rgba(255,255,255,.08); color: #fff; }
    .side-nav__link--active { background: #f8dbe3; color: #4c1625; }
    .side-nav__link--active:hover { background: #f8dbe3; color: #4c1625; }
    .side-nav__link small { color: inherit; opacity: .62; font-size: 10px; font-weight: 850; letter-spacing: .08em; }
    .side-nav__link--active small { opacity: 1; color: #4c1625; }
    .side-nav__anchor { display: block; color: #b8b8bd; border-radius: 7px; padding: 7px 9px; font-size: 12px; line-height: 1.2; }
    .side-nav__anchor:hover { color: #fff; background: rgba(255,255,255,.07); }
    .side-nav__cta { display: block; text-align: center; background: #f8dbe3; color: #4c1625; border-radius: 8px; padding: 10px 12px; font-size: 12px; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; margin-top: 12px; }
    .side-nav__foot { color: #8f8f96; font-size: 11px; line-height: 1.55; margin-top: 14px; }
    .content-shell, .footer { margin-left: 292px; }
    .content-shell { min-height: 100vh; }
    .container { max-width: 1180px; padding: 0 34px; }
    .section { padding: 58px 0; }
    .section--gray { background: #f0f0f2; border-top: 1px solid #e5e5e8; border-bottom: 1px solid #e5e5e8; }
    .section__head { display: grid; grid-template-columns: minmax(240px, .74fr) minmax(280px, 1fr); gap: 28px; align-items: end; margin-bottom: 28px; }
    .section__title { font-size: clamp(28px, 3.4vw, 44px); letter-spacing: -0.025em; }
    .section__sub { max-width: 760px; }
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
    .matrix-wrap { overflow-x: auto; max-width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #fff; box-shadow: 0 1px 0 rgba(0,0,0,.02); }
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
    .story-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; margin-top: 20px; }
    .story-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 18px; }
    .story-card__num { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 850; font-size: 13px; margin-bottom: 12px; }
    .story-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.75; }
    .feature-table { min-width: 1040px; width: 100%; border-collapse: collapse; font-size: 13px; }
    .feature-table th, .feature-table td { padding: 13px 14px; border-bottom: 1px solid var(--border-light); vertical-align: top; text-align: left; }
    .feature-table th { background: var(--bg-dark); color: #fff; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; }
    .feature-table tr:last-child td { border-bottom: 0; }
    .signal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
    .signal-card { background: #fff; border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: 8px; padding: 18px; }
    .signal-card h3 { font-size: 17px; margin-bottom: 10px; }
    .signal-card dl { display: grid; gap: 10px; margin: 0; }
    .signal-card dt { font-size: 10px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; color: #525252; }
    .signal-card dd { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.7; }
    .backlog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
    .backlog-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; min-height: 176px; }
    .backlog-card h3 { font-size: 16px; line-height: 1.35; margin: 9px 0; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
    .badge--p0 { background: var(--danger); color: #fff; }
    .badge--p1 { background: #92400e; color: #fff; }
    .badge--p2 { background: #4b5563; color: #fff; }
    .badge--safe { background: var(--success-light); color: var(--success); }
    .backlog-card p { color: var(--text-secondary); font-size: 13px; line-height: 1.65; margin-top: 8px; }
    .matrix-mini { min-width: 920px; font-size: 13px; }
    .matrix-mini th, .matrix-mini td { padding: 13px 14px; border-bottom: 1px solid var(--border-light); text-align: left; vertical-align: top; }
    .matrix-mini th { background: var(--bg-dark); color: #fff; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; }
    .playbook-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 14px; }
    .playbook-card { background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .playbook-card__head { padding: 18px 20px; background: var(--bg-dark); color: #fff; }
    .playbook-card__head h3 { font-size: 17px; margin-bottom: 6px; }
    .playbook-card__head p { color: #d8d8d8; font-size: 13px; line-height: 1.65; }
    .playbook-card__body { padding: 18px 20px; }
    .playbook-card__body p { color: var(--text-secondary); font-size: 13px; line-height: 1.7; margin: 0 0 10px; }
    .playbook-card ol { margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.75; }
    .playbook-gate { margin-top: 14px; border-top: 1px solid var(--border-light); padding-top: 12px; color: var(--accent); font-size: 13px; font-weight: 800; }
    .roadmap-lite { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .roadmap-step { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 18px; position: relative; }
    .roadmap-step__phase { font-size: 10px; color: var(--accent); font-weight: 850; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 10px; }
    .roadmap-step h3 { font-size: 18px; margin-bottom: 8px; }
    .roadmap-step p { color: var(--text-secondary); font-size: 13px; line-height: 1.7; margin-top: 8px; }
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
    @media (max-width: 1180px) { .side-nav { width: 248px; } .content-shell, .footer { margin-left: 248px; } .hero__grid { grid-template-columns: 1fr; } .section__head { grid-template-columns: 1fr; gap: 10px; } }
    @media (max-width: 820px) { .side-nav { position: relative; width: auto; min-height: 0; inset: auto; padding: 16px; } .side-nav__status { grid-template-columns: repeat(4, minmax(0, 1fr)); } .side-nav__group { padding: 10px 0; min-width: 0; } .side-nav__group--anchors { flex: none; } .side-nav__main, .side-nav__anchors { display: flex; max-width: 100%; min-width: 0; overflow-x: auto; gap: 8px; padding-bottom: 4px; scrollbar-width: none; } .side-nav__main::-webkit-scrollbar, .side-nav__anchors::-webkit-scrollbar { display: none; } .side-nav__link, .side-nav__anchor { white-space: nowrap; margin: 0; flex: 0 0 auto; } .side-nav__cta { text-align: left; width: fit-content; max-width: 100%; } .side-nav__foot { display: none; } .content-shell, .footer { margin-left: 0; } .container { padding: 0 18px; } .section { padding: 46px 0; } .hero { padding-top: 38px; } }
    @media (max-width: 560px) { .side-nav__status { grid-template-columns: repeat(2, minmax(0, 1fr)); } .metric-grid, .cross-grid, .playbook-grid { grid-template-columns: 1fr; } .section__title { font-size: 28px; } .hero__title { font-size: 40px; } }
  </style>`;
}

export function nav(active) {
  const links = [
    ["index.html", "I · 总览", "index"],
    ["metrics.html", "II · 指标口径", "metrics"],
    ["forensics.html", "III · 证据链", "forensics"],
    ["trends.html", "IV · 性能趋势", "trends"],
    ["cross-audit.html", "V · 交叉审计", "cross"]
  ];
  const pageAnchors = {
    index: {
      label: "总览锚点",
      ctaHref: "index.html#decisions",
      ctaLabel: "查看执行战单",
      anchors: [
        ["index.html#feature-compare", "功能对比"],
        ["index.html#insight-chain", "洞察链路"],
        ["index.html#hard-conclusions", "硬结论"],
        ["index.html#final-audit", "最终审计"],
        ["index.html#diagnostic-bridge", "站内外诊断桥接"],
        ["index.html#operating-bridge", "经营信号"],
        ["index.html#traffic-attribution", "渠道诊断"],
        ["index.html#asset-attribution", "资产保护"],
        ["index.html#bot-audit", "爬虫治理"],
        ["index.html#top15", "Top 15 病灶"],
        ["index.html#matrix", "竞品矩阵"],
        ["index.html#decisions", "执行战单"],
        ["index.html#code", "PR 实验卡"],
        ["index.html#roadmap", "Sprint 路线图"]
      ]
    },
    metrics: {
      label: "本页锚点",
      ctaHref: "metrics.html#funnel",
      ctaLabel: "查看口径治理",
      anchors: [
        ["metrics.html#hero", "指标结论"],
        ["metrics.html#final-audit", "最终审计"],
        ["metrics.html#diagnostic-bridge", "站内外诊断桥接"],
        ["metrics.html#operating-bridge", "经营信号"],
        ["metrics.html#business-kpi", "真实 KPI"],
        ["metrics.html#funnel", "口径治理"],
        ["metrics.html#traffic-attribution", "渠道诊断"],
        ["metrics.html#cross-audit", "重审结论"],
        ["metrics.html#metric-dictionary", "指标字典"]
      ]
    },
    forensics: {
      label: "本页锚点",
      ctaHref: "forensics.html#top15",
      ctaLabel: "查看病灶清单",
      anchors: [
        ["forensics.html#scene", "证据总览"],
        ["forensics.html#final-audit", "最终审计"],
        ["forensics.html#diagnostic-bridge", "站内外诊断桥接"],
        ["forensics.html#bot-audit", "爬虫治理"],
        ["forensics.html#cross-audit", "重审结论"],
        ["forensics.html#fatal", "第三方失败"],
        ["forensics.html#top15", "Top 15 病灶"],
        ["forensics.html#pdp", "PDP 覆盖"]
      ]
    },
    trends: {
      label: "本页锚点",
      ctaHref: "trends.html#latest-v3",
      ctaLabel: "查看最新采集",
      anchors: [
        ["trends.html#hero", "趋势结论"],
        ["trends.html#final-audit", "最终审计"],
        ["trends.html#diagnostic-bridge", "站内外诊断桥接"],
        ["trends.html#cross-audit", "重审结论"],
        ["trends.html#latest-v3", "最新采集"]
      ]
    },
    cross: {
      label: "本页锚点",
      ctaHref: "cross-audit.html#execution-orders",
      ctaLabel: "查看执行战单",
      anchors: [
        ["cross-audit.html#final-audit", "最终审计"],
        ["cross-audit.html#diagnostic-bridge", "站内外诊断桥接"],
        ["cross-audit.html#storyline", "故事线"],
        ["cross-audit.html#insight-chain", "洞察链路"],
        ["cross-audit.html#hard-conclusions", "硬结论"],
        ["cross-audit.html#cross-matrix", "策略矩阵"],
        ["cross-audit.html#contradictions", "矛盾识别"],
        ["cross-audit.html#feature-compare", "功能对比"],
        ["cross-audit.html#operating-bridge", "经营信号"],
        ["cross-audit.html#business-kpi", "真实 KPI"],
        ["cross-audit.html#cross-audit", "重审结论"],
        ["cross-audit.html#matrix", "竞品矩阵"],
        ["cross-audit.html#competitor-recollect", "竞品重采"],
        ["cross-audit.html#segment-sampling", "分段复采"],
        ["cross-audit.html#third-party-governance", "第三方治理"],
        ["cross-audit.html#execution-orders", "执行战单"],
        ["cross-audit.html#code", "PR 实验卡"],
        ["cross-audit.html#roadmap", "Sprint 路线图"]
      ]
    }
  };
  const anchorConfig = pageAnchors[active] || pageAnchors.index;
  const anchors = anchorConfig.anchors;
  return `<nav class="side-nav" aria-label="Momcozy 审计报告导航">
    <a href="index.html#hero" class="side-nav__brand">路特 AI <span>×</span><br>Momcozy</a>
    <div class="side-nav__kicker">私密经营审计</div>
    <div class="side-nav__status" aria-label="报告状态">
      <div class="side-stat"><strong>5</strong><span>主页面</span></div>
      <div class="side-stat"><strong>${anchors.length}</strong><span>核心锚点</span></div>
      <div class="side-stat"><strong>KPI</strong><span>真实写入</span></div>
      <div class="side-stat"><strong>noindex</strong><span>访问边界</span></div>
    </div>
    <div class="side-nav__group">
      <div class="side-nav__label">主报告</div>
      <div class="side-nav__main">
        ${links.map(([href, label, key], index) => `<a href="${href}" class="side-nav__link${active === key ? " side-nav__link--active" : ""}"><span>${label}</span><small>0${index + 1}</small></a>`).join("")}
      </div>
    </div>
    <div class="side-nav__group side-nav__group--anchors">
      <div class="side-nav__label">${anchorConfig.label}</div>
      <div class="side-nav__anchors">
        ${anchors.map(([href, label]) => `<a class="side-nav__anchor" href="${href}">${label}</a>`).join("")}
      </div>
    </div>
    <a href="${anchorConfig.ctaHref}" class="side-nav__cta">${anchorConfig.ctaLabel}</a>
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
      <div class="footer__bottom">© 2026 路特 AI 公司 · Momcozy 私密经营审计报告 · noindex</div>
    </div>
  </footer>`;
}

export function page(title, active, body, metaDescription = "Momcozy 独立站私密经营审计报告") {
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
