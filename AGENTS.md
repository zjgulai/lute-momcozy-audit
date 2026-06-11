# AGENTS.md — AI 协作规则（lute-momcozy-audit）

## 项目定位

本仓库是 **Momcozy 电商站技术审计报告的公开发布平台**，同时也是一个**周期性性能监控产品**。
所有发布内容均经过脱敏处理，仅包含可公开的技术观察数据。

**生产地址**：https://shopify.lute-tlz-dddd.top
**部署方式**：腾讯云轻量服务器 101.34.52.232，接入 ai_video_nginx 容器，文件路径 /opt/momcozy-audit/html/

## 目录结构

```
src/_data/
  audit.json              <- 最新审计快照（Overview/Metrics/Forensics 页数据源）
  sessions.js             <- Eleventy 全局数据文件，聚合 sessions/ 目录，注入 isAutomated/methodologyBreak
  sessions/               <- 每次采集的独立 JSON 文件（YYYY-MM-DD.json）
    2026-03-12.json       <- 手工 baseline（confidence: low）
    2026-04-15.json       <- 手工 mid-cycle（confidence: low）
    2026-05-17.json       <- 手工 initial（confidence: low）
    2026-06-10.json       <- 自动化首次基线（confidence: medium，含 mobile block）
src/_includes/layout.njk  <- 共享 HTML 骨架（含 favicon/OG/robots meta）
src/index.njk             <- 概览页（Overview）
src/metrics.njk           <- 指标页（Metrics，10 个指标含 TBT/DOM/JS体积）
src/forensics.njk         <- 证据链页（Forensics）
src/trends.njk            <- 趋势页（Trends，uPlot 折线图 + 表格 + delta）
src/404.njk               <- 404 页
src/assets/
  site.css                <- 全站样式（单文件）
  trends-charts.js        <- uPlot 图表逻辑（self-hosted，CSP 合规）
src/robots.txt            <- Disallow: /（审计站不应被爬取）
config/
  public-data.schema.json <- audit.json 的 JSON Schema 约束
  session.schema.json     <- 每个 session 文件的 JSON Schema 约束
scripts/
  collect.mjs             <- Playwright 自动采集（双视口 desktop+mobile，3 次重试）
  validate-public-data.mjs
  validate-sessions.mjs
  safety-scan.mjs
  check-links.mjs
  serve.mjs
tests/
  e2e.spec.mjs            <- 5 页 x 2 视口，含 /trends/ 图表
  a11y.spec.mjs           <- axe-core，5 页
.github/workflows/
  pages.yml               <- GitHub Pages 自动发布
  tencent.yml             <- 腾讯云自动部署（build job -> deploy job，artifact 传递）
  collect.yml             <- 月度定时采集（每月 1 日 02:00 UTC，自动开 PR）
  dependabot.yml          <- npm + github-actions 依赖自动更新（每周一）
ops/
  nginx/momcozy-audit.conf <- 参考 nginx 配置（生产配置在 ai_video_nginx 容器内）
  README.md
```

## 数据更新流程

### 手工更新单快照（audit.json）

1. 编辑 src/_data/audit.json，遵循 config/public-data.schema.json 字段约束
2. npm run test:allowlist
3. npm test
4. git commit + push

### 新增采集 session（手动）

```bash
AUDIT_TARGET_URL=https://momcozy.com npm run collect
npm run test:sessions
npm test
```

### 新增采集 session（CI 定时）

每月 1 日 UTC 02:00 由 collect.yml 自动触发，采集后开 PR，人工 review 后 merge 发布。
需配置 GitHub Secret: AUDIT_TARGET_URL = https://momcozy.com

## Session 数据格式（v2，2026-06-10 起）

v2 session 包含双视口数据和新指标：
- metrics: lcp / fcp / ttfb / cls / tbt / domNodes / longTasks / totalRequests / jsKb / thirdPartyFailures
- mobile: lcp / fcp / ttfb / cls / tbt / thirdPartyFailures
- confidence: 由 computeConfidence() 自动计算（null 指标个数决定 high/medium/low）
- TTFB 公式: responseStart - fetchStart（W3C 标准，含 DNS+TCP+TLS）

旧格式（v1，2026-05-17 及之前）：无 mobile block，无新指标，confidence: low，手工采集。

## 脱敏规则（绝对禁止写入任何文件）

- 真实业务 KPI：ROI、AOV、monthly_revenue、overall_cvr
- 货币金额（$N、¥N 等）
- 服务器 IP 或内网地址
- 私有文件路径（/Users/、/home/）
- 私钥（-----BEGIN PRIVATE KEY-----）
- /data/ 端点路径或任何 .json 端点

## 本地开发

```bash
npm ci
npm run build
npm run collect              # 需设 AUDIT_TARGET_URL
npm run test:allowlist
npm run test:sessions
npm run test:safety
npm run test:links
npm run test:e2e
npm run test:a11y
npm test                     # 全套
npm run serve                # http://127.0.0.1:8080
```

## CI/CD

- GitHub Pages: push main -> pages.yml
- 腾讯云: push main -> tencent.yml（build job -> deploy job，无重复测试）
- 月度采集: collect.yml 每月 1 日定时运行

腾讯云 secrets: DEPLOY_SSH_KEY / DEPLOY_HOST / DEPLOY_ROOT / DEPLOY_USER / PUBLIC_URL / AUDIT_TARGET_URL

## AI 操作约束

- 禁止向任何模板或数据文件写入脱敏规则禁止的内容
- 禁止 git push --force 或删除历史提交
- audit.json 的 confidence 只能取 "high" / "medium" / "low"
- recommendations 的 priority 只能取 "P0" / "P1" / "P2"
- 修改数据后必须先跑 npm run test:allowlist
- 新增 session 后必须跑 npm run test:sessions
- 禁止直接修改 ops/nginx/momcozy-audit.conf 作为生产操作
  生产 nginx 在 ai_video_nginx 容器内，配置路径: /opt/ai-video/deploy/lighthouse/nginx.conf
