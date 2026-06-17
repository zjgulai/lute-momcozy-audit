# AGENTS.md — AI 协作规则（lute-momcozy-audit）

## 项目定位

本仓库是 **Momcozy 电商站技术审计报告的私密发布平台**，同时也是一个**周期性性能监控产品**。
当前站点按 owner 指令进入 **私密经营版**：允许在报告页面中写入真实经营金额、真实业务 KPI、历史经营数据和采集数据，用于完整恢复审计故事线。部署前由 owner 负责配置访问控制；AI 仍必须避免泄露密钥、私有路径、服务器地址和原始数据端点。

**生产地址**：https://shopify.lute-tlz-dddd.top
**部署方式**：腾讯云轻量服务器（按 owner 私钥与网络配置管理），接入 ai_video_nginx 容器，文件路径 /opt/momcozy-audit/html/

## 目录结构

```
Active build source:
scripts/build-history-site.mjs + src/_data/public-cross-audit.json + src/_data/sessions + history_static/assets/

src/_data/
  audit.json                  <- 最新审计快照（Overview/Metrics/Forensics 页数据源）
  public-cross-audit.json     <- 私密经营版网站生成输入
  sessions/                   <- 每次采集的独立 JSON 文件（YYYY-MM-DD.json）
    2026-03-12.json           <- 手工 baseline（confidence: low）
    2026-04-15.json           <- 手工 mid-cycle（confidence: low）
    2026-05-17.json           <- 手工 initial（confidence: low）
    2026-06-10.json           <- 自动化首次基线（confidence: medium，含 mobile block）
    2026-06-14.json           <- 自动化路由增强基线（confidence: medium）
  segment-sessions/           <- 分段复采归档（YYYY-MM-DD-label.json），不参与主趋势 latest session
src/assets/
  site.css                <- 全站样式（单文件）
  trends-charts.js        <- uPlot 图表逻辑（self-hosted，CSP 合规）
```

说明：
- `_site` 的 HTML 页面由 `scripts/build-history-site.mjs` 构建时实时产出
- 历史 Eleventy 页面源文件已归档，不再作为生产输入

```

config/
  release-contract.json       <- 发布身份契约
  public-data.schema.json <- audit.json 的 JSON Schema 约束
  session.schema.json     <- 每个 session 文件的 JSON Schema 约束
  collection-routes.json  <- 采集路由定义
scripts/
  collect.mjs             <- Playwright 自动采集（双视口 desktop+mobile，3 次重试）
  validate-public-data.mjs
  validate-sessions.mjs
  validate-segment-sessions.mjs
  safety-scan.mjs
  check-links.mjs
  serve.mjs
  build-history-site.mjs   <- 主构建器（私密经营版唯一生产构建入口）
  validate-release-contract.mjs <- 发布身份契约校验器
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
archive/
  eleventy-legacy/         <- 已归档的历史 Eleventy 模板，仅用于历史对照，不参与生产构建
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

### 新增分段复采 session（手动）

```bash
AUDIT_TARGET_URL=https://momcozy.com \
AUDIT_ROUTE_CONFIG=config/collection-routes-segmented-public.json \
AUDIT_OUTPUT_DIR=src/_data/segment-sessions \
AUDIT_SESSION_DATE=YYYY-MM-DD \
AUDIT_SESSION_LABEL=segmented-public-r1 \
npm run collect

npm run test:segment-sessions
npm test
```

owner 登录态、真实购物车和 checkout 分段必须额外设置 `AUDIT_STORAGE_STATE=<owner-provided-playwright-state>`；不得把无登录样本写成 owner-state 样本。

### 准备 owner storage state（本地私密文件）

owner state 必须存放在仓库目录外；脚本会拒绝仓库内路径，只输出 cookie/localStorage 计数摘要，不输出文件路径、账号、cookie 值或 localStorage 值。

```bash
AUDIT_TARGET_URL=https://momcozy.com \
AUDIT_STORAGE_STATE=<absolute-path-outside-repo> \
npm run owner-state:capture

AUDIT_STORAGE_STATE=<absolute-path-outside-repo> \
npm run owner-state:check

OWNER_SEGMENT_RUN_LABEL=r1 \
AUDIT_SESSION_DATE=YYYY-MM-DD \
npm run owner-state:command
```

拿到 owner state 后，再执行 `owner-state:command` 输出的采集命令；采集完成后必须跑 `npm run test:segment-sessions`、`npm run segment:aggregate`、`npm run test:segment-aggregation` 和 `npm test`。

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

## 敏感信息规则（私密经营版）

允许写入报告页面和结构化数据：
- 真实业务 KPI：ROI、AOV、monthly_revenue、overall_cvr 等
- 货币金额（$N、¥N 等）
- 历史经营数据、当前经营数据、采集数据和功能对比结论

仍然禁止写入任何面向站点发布的模板、数据文件或生成产物：
- 服务器 IP 或内网地址
- 私有文件路径（如 `~/.config`、`/var/local` 等本机目录）
- 私钥（-----BEGIN PRIVATE KEY-----）
- 原始 `/data/` 端点路径或任何直接暴露原始 `.json` 数据端点

AI 修改安全扫描时，只能放开真实金额与业务 KPI 检查；不得放开密钥、服务器地址、私有路径、原始数据端点检查。

## 本地开发

```bash
npm ci
npm run build
npm run collect              # 需设 AUDIT_TARGET_URL
npm run test:allowlist
npm run test:sessions
npm run test:segment-sessions
npm run test:safety
npm run test:links
npm run test:e2e
npm run test:a11y
npm test                     # 全套
 npm run serve                # http://localhost:8080
```

## CI/CD

- GitHub Pages: push main -> pages.yml
- 腾讯云: push main -> tencent.yml（build job -> deploy job，无重复测试）
- 月度采集: collect.yml 每月 1 日定时运行

腾讯云 secrets: DEPLOY_SSH_KEY / DEPLOY_HOST / DEPLOY_ROOT / DEPLOY_USER / PUBLIC_URL / AUDIT_TARGET_URL

## AI 操作约束

- 允许向报告模板或结构化数据写入真实金额与业务 KPI，但必须遵守“敏感信息规则（私密经营版）”中仍然禁止的项目
- 禁止 git push --force 或删除历史提交
- audit.json 的 confidence 只能取 "high" / "medium" / "low"
- recommendations 的 priority 只能取 "P0" / "P1" / "P2"
- 修改数据后必须先跑 npm run test:allowlist
- 新增 session 后必须跑 npm run test:sessions
- 新增 segment-sessions 后必须跑 npm run test:segment-sessions；分段复采不得污染 src/_data/sessions 的主趋势 latest session
- 禁止直接修改 ops/nginx/momcozy-audit.conf 作为生产操作
  生产 nginx 在 ai_video_nginx 容器内，配置路径: /opt/ai-video/deploy/lighthouse/nginx.conf
