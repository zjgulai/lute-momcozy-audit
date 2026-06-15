import fs from "node:fs";
import path from "node:path";

import {page} from "./layout.mjs";
import {
  crossAuditBody,
  forensicsBody,
  metricsBody,
  overviewBody,
  trendsBody
} from "./sections.mjs";

export function writePage(outputDir, file, title, active, body) {
  fs.writeFileSync(path.join(outputDir, file), page(title, active, body), "utf8");
}

export function write404(outputDir) {
  const html = page("404 — Momcozy 审计报告", "none", `<section class="container" style="padding:80px 24px;">
    <p class="section__eyebrow">路特 AI × Momcozy</p>
    <p class="section__eyebrow">HTTP 404</p>
    <h1 class="section__title">页面不存在</h1>
    <p class="section__sub">请返回 Momcozy 独立站深度审计总览。</p>
    <p style="margin-top:28px;"><a class="nav-cta" href="index.html">返回总览</a></p>
  </section>`);
  fs.writeFileSync(path.join(outputDir, "404.html"), html, "utf8");
}

export function writeHistoryPages({outputDir, data, session}) {
  writePage(outputDir, "index.html", "I · 总览 — Momcozy 审计报告", "index", overviewBody(data));
  writePage(outputDir, "metrics.html", "II · 指标口径 — Momcozy 审计报告", "metrics", metricsBody(data));
  writePage(outputDir, "forensics.html", "III · 证据链 — Momcozy 审计报告", "forensics", forensicsBody(data));
  writePage(outputDir, "trends.html", "IV · 性能趋势 — Momcozy 审计报告", "trends", trendsBody(data, session));
  writePage(outputDir, "cross-audit.html", "V · 交叉审计 — Momcozy 审计报告", "cross", crossAuditBody(data));
}

