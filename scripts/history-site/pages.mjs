import fs from "node:fs";
import path from "node:path";

import {page} from "./layout.mjs";
import {
  competitorsBody,
  crossAuditBody,
  forensicsBody,
  metricsBody,
  overviewBody,
  trendsBody
} from "./sections.mjs";

function buildMetaDescription(data, session) {
  const sessionDate = session?.sessionId ? session.sessionId.replace("session-", "") : "最新";
  return `Momcozy 独立站私密经营洞察报告，按当前经营数据、历史经营数据与 ${sessionDate} 自动采集刷新。`;
}

export function writePage(outputDir, file, title, active, body, metaDescription = buildMetaDescription(null, null)) {
  fs.writeFileSync(path.join(outputDir, file), page(title, active, body, metaDescription), "utf8");
}

export function write404(outputDir) {
  const html = page("404 — Momcozy 洞察报告", "none", `<section class="container" style="padding:80px 24px;">
    <p class="section__eyebrow">路特 AI × Momcozy</p>
    <p class="section__eyebrow">HTTP 404</p>
    <h1 class="section__title">页面不存在</h1>
    <p class="section__sub">请返回 Momcozy 独立站洞察报告总览。</p>
    <p style="margin-top:28px;"><a class="nav-cta" href="index.html">返回总览</a></p>
  </section>`);
  fs.writeFileSync(path.join(outputDir, "404.html"), html, "utf8");
}

export function writeHistoryPages({outputDir, data, session}) {
  const metaDescription = buildMetaDescription(data, session);
  writePage(outputDir, "index.html", "I · 总览 — Momcozy 洞察报告", "index", overviewBody(data), metaDescription);
  writePage(outputDir, "metrics.html", "II · 指标口径 — Momcozy 洞察报告", "metrics", metricsBody(data), metaDescription);
  writePage(outputDir, "forensics.html", "III · 风险归因 — Momcozy 洞察报告", "forensics", forensicsBody(data), metaDescription);
  writePage(outputDir, "trends.html", "IV · 趋势证据 — Momcozy 洞察报告", "trends", trendsBody(data, session), metaDescription);
  writePage(outputDir, "cross-audit.html", "V · 决策矩阵 — Momcozy 洞察报告", "cross", crossAuditBody(data), metaDescription);
  writePage(outputDir, "competitors.html", "VI · 竞品对比 — Momcozy 洞察报告", "competitors", competitorsBody(data), metaDescription);
}
