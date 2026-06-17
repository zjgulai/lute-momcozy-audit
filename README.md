# Lute Momcozy Audit

Private-business technical and operating audit of the Momcozy storefront — also a periodic performance monitoring product.

**Production**: https://shopify.lute-tlz-dddd.top
**Release contract**: private-business (`docs/release-contract.md`)
**Last session**: 2026-06-17 (automated, PDP watchlist route-aware)

## Quick Start

```bash
npm ci
npm test        # build + schema + source safety + sessions + build safety + links + e2e + a11y
npm run test:competitor-plan # validate competitor recollect statuses and task execution plan
npm run release:checklist # generate a pre-release evidence checklist in artifacts/
npm run audit:production-layout # browser-based production visual/component audit with screenshots
npm run test:release-parity   # optional pre-release local-vs-production structure parity check
npm run serve   # local preview at http://localhost:8080
```

## Requirements

- Node.js 22+
- Chromium (installed automatically by `npx playwright install --with-deps chromium`)

## Pages

| Canonical route | Generated from | Description |
|---|---|---|
| `/` | `scripts/build-history-site.mjs` | Overview — private-business storyline, operating KPIs, evidence chain, and execution plan |
| `/metrics.html` | `scripts/build-history-site.mjs` | Metrics — operating KPI caveats plus route-aware technical metrics |
| `/forensics.html` | `scripts/build-history-site.mjs` | Forensics — evidence trail, third-party failure analysis, and audit limits |
| `/trends.html` | `scripts/build-history-site.mjs` | Trends — latest route-aware collection and methodology caveats |
| `/cross-audit.html` | `scripts/build-history-site.mjs` | Cross-audit — contradictions, final audit, strategy matrix, and execution orders |
| `/404.html` | `scripts/build-history-site.mjs` | Not-found page |

Slashless aliases such as `/metrics`, `/forensics`, and `/trends` may work through the local/static server. The `.html` routes above are the source-of-truth routes for documentation, testing, and release identity checks.

## Data Architecture

### Active build source

`scripts/build-history-site.mjs` is the production build entrypoint. It reads `src/_data/public-cross-audit.json`, combines it with the latest session file, copies `history_static/assets/`, and writes `_site/`.

Legacy Eleventy templates are still present for historical context, but they are not the active production build path.

### public-cross-audit.json — private-business report source

This is the current generated-site source for the private-business edition. It may include real amounts, real KPI labels, historical operating data, current operating data, collection data, and function-comparison conclusions approved by the owner.

### audit.json — technical snapshot validation source

`src/_data/audit.json` remains schema-validated and is used by validation scripts to keep latest technical findings aligned with the newest automated session.

### sessions/ — time-series archive for Trends

One JSON file per collection run (`YYYY-MM-DD.json`). The latest collection session is
resolved by `scripts/build-history-site.mjs` from `observedAt` and then fed through schema checks and threshold/route adapters.

**Session format v2** (from 2026-06-10): dual viewport, new metrics (TBT, DOM nodes, JS KB, total requests), mobile block, auto-computed confidence.

**Session format v3 route aggregate**: preserves the v2 top-level homepage fields for the existing Trends page, and also adds `methodologyVersion` plus a `routes[]` array. The default route config (`config/collection-routes.json`) covers homepage, representative PDP, cart, and checkout. The watchlist route pack (`config/collection-routes-pdp-watchlist.json`) covers homepage, 10 PDP routes, cart, and checkout. Each route stores desktop and mobile aggregate metrics only; raw request URLs are not persisted.

**Session format v1** (before 2026-05-17): manual browser, no mobile block, confidence: low. Not directly comparable to v2.

## Updating Audit Data

### Manual snapshot update

1. Edit `src/_data/audit.json`
2. `npm run test:allowlist` — validate schema
3. `npm run test:competitor-plan` — verify `public-cross-audit.json` competitor recollect status/task plan integrity
4. `npm test` — full suite
5. Commit and push

### Add a new session (manual)

```bash
AUDIT_TARGET_URL=https://momcozy.com npm run collect
npm run test:sessions
npm test
```

For local collector smoke tests, use `AUDIT_ROUTE_CONFIG`, `AUDIT_OUTPUT_DIR`, and `AUDIT_SESSION_DATE` to write a temporary session outside `src/_data/sessions/`.

### Add a new session (scheduled CI)

`collect.yml` runs automatically on the 1st of each month at 02:00 UTC.
Requires GitHub Secret: `AUDIT_TARGET_URL=https://momcozy.com`

## Safety Scan

`npm run test:release-contract` verifies that the generated `_site/` matches the private-business release identity.

`npm run test:source-safety` scans publication inputs for still-forbidden patterns before deployment.

`npm run test:safety` scans `_site/` for still-forbidden patterns: private paths, server addresses, private keys, and raw private endpoint patterns.

`npm run test:release-parity` compares local built artifacts against production pages for:
- required section anchors and sidebar anchors,
- minimum section content quality,
- empty tables inside required sections.

It also accepts:
- `RELEASE_PARITY_REPORT_PATH`: writes a JSON report for CI evidence (for example `artifacts/release-parity-<sha>.json`).
- `RELEASE_PARITY_SECTIONS`: when set to `0`, the report excludes per-section component states. Default is enabled.

Private-business edition allows real operating amounts and KPI labels in generated report pages. It still forbids secrets, private filesystem paths, server addresses, and raw data endpoint references.

## Current Roadmap

The active optimization roadmap is tracked in `docs/optimization-todo.md`.
Batch 1-15 are implemented.

The active release-consistency debt plan is tracked in `docs/superpowers/plans/2026-06-15-debt-release-consistency-governance.md`.

## Review Workflow

Monthly CI collection builds a PR with an auto-generated summary at `.github/collect-summary.md`
(`npm run collect:summary`), including:

- methodology/version summary,
- threshold status for the latest automated session,
- review checklist for methodology shifts and sensitive-content gates.

For manual review of data-only PRs and release-note conventions, follow `docs/review-workflow.md`.

## Deployment

### Pre-release evidence checklist

Before pushing a release branch or `main`, run:

```bash
npm run release:checklist
```

The command writes a Markdown evidence package under `artifacts/` with:

- current branch and commit,
- latest session and release-contract context,
- full local `npm test` status,
- local-vs-production release parity status,
- production uptime / route-contract status,
- a release-note draft and manual deploy checklist.

Use `npm run release:checklist -- --quick` when you only need a lightweight local gate before deeper CI validation. Optional flags:

- `--skip-parity`: skip production structure parity.
- `--skip-monitor`: skip production uptime checks.
- `--github-run-id=<tencent-run-id>` or `RELEASE_CHECKLIST_GITHUB_RUN_ID`: verify that a completed Tencent workflow run for the current commit produced both `verified-site-<sha>` and `production-layout-audit-<sha>` artifacts.
- `RELEASE_CHECKLIST_GITHUB_REPO`: override the GitHub repository slug used for artifact verification.
- `RELEASE_CHECKLIST_PUBLIC_URL`: override the production URL.
- `RELEASE_CHECKLIST_OUTPUT`: write the checklist to a specific Markdown path.

### Post-deploy visual component audit

After Tencent deployment finishes, run:

```bash
npm run audit:production-layout
```

The command opens the production site in Chromium across desktop, tablet, and mobile viewports. It writes screenshots plus JSON/Markdown diagnostics under `artifacts/`, covering:

- page status and console/page errors,
- document-level horizontal overflow,
- desktop left sidebar positioning and mobile responsive nav,
- sidebar anchor targets,
- table scroller behavior,
- visible text overflow in headings, nav, buttons, badges, and KPI cards,
- the `cross-audit.html#competitor-recollect` route table and task table.

Use `PRODUCTION_LAYOUT_BASE_URL` or `PUBLIC_URL` to audit a different deployment target, and `PRODUCTION_LAYOUT_OUTPUT_DIR` to choose a deterministic report path.

Tencent deployment also runs this audit automatically after the external smoke tests. The workflow writes the audit excerpt and artifact entry into the GitHub Actions run summary, then uploads the screenshots and diagnostics as the `production-layout-audit-<sha>` Actions artifact, so each production release has visual evidence attached to the run.

### GitHub Pages (automatic)
Push to `main` → `pages.yml` builds, tests, and deploys.

### Tencent Cloud (automatic)
Push to `main` → `tencent.yml` (build+test job → deploy job via artifact, no duplicate testing).

Required repository secrets:

| Secret | Value |
|---|---|
| `DEPLOY_SSH_KEY` | SSH private key for the deploy user |
| `DEPLOY_HOST` | Tencent Cloud host configured as a repository secret |
| `DEPLOY_ROOT` | `/opt/momcozy-audit` |
| `DEPLOY_USER` | `ubuntu` |
| `PUBLIC_URL` | `https://shopify.lute-tlz-dddd.top` |
| `AUDIT_TARGET_URL` | `https://momcozy.com` |

## Competitor recollect plan checks

竞品复采计划使用 `src/_data/public-cross-audit.json` 中的 `legacyRecovery.competitorMatrix` 与 `competitorRecollectPlan` 两类数据支撑。
`npm run test:competitor-plan` 会对以下内容做约束：

- `legacyRecovery.competitorMatrix[*]` 的维度、Momcozy 状态、竞品参照、学习项和 `recollectStatus` 结构校验
- `recollectStatus.state` 的状态值（`todo` / `pending` / `in_progress` / `blocked` / `done`）校验
- 计划任务 `competitorRecollectPlan.tasks` 的字段完整性、任务 ID 去重、状态值
- `commands` 字段为非空字符串列表（如有）

本仓库的 `npm test` 已将该校验固化到统一管道，避免“网站结构正常、但任务台账未闭环”的发布风险。

### External uptime monitoring (outside GitHub Actions)

Use `scripts/uptime-monitor.mjs` with `npm run monitor:uptime` on a separate host or VM:

```bash
cd /path/to/lute-momcozy-audit
PUBLIC_URL=https://shopify.lute-tlz-dddd.top npm run monitor:uptime
```

Recommended `cron` entry for a 5-minute heartbeat (append to crontab):

```text
*/5 * * * * cd /path/to/lute-momcozy-audit && PUBLIC_URL=https://shopify.lute-tlz-dddd.top npm run monitor:uptime >> logs/uptime.log 2>&1
```

Production cron template: `ops/uptime-cron.example`.

Optional environment flags:

- `UPTIME_STRICT=1`: enforce non-blocking checks from soft warnings (security headers / noindex / max RTT) as hard failures.
- `UPTIME_TIMEOUT_MS=10000`: per-probe timeout.
- `UPTIME_MAX_RTT_MS=5000`: maximum acceptable request time.
- `UPTIME_REQUIRE_NOINDEX=1`: noindex check must pass or script exits non-zero.
- `UPTIME_CHECKS_JSON='[{"name":"home","paths":["/"],"expectedStatus":[200],"requireSecurityHeaders":true}]'`: override check set.
- `UPTIME_EXPECT_TITLE_CONTAINS`: optional homepage title marker to verify target identity.
- `UPTIME_EXPECT_BODY_MARKERS`: comma-separated list or JSON array that overrides the default homepage identity markers (`路特 AI`, `Momcozy`, `私密经营`).
- `UPTIME_EXPECT_HOME_SHA256`: optional homepage body SHA256 checksum for deploy identity.
- `UPTIME_FETCH_RETRIES`: number of fetch attempts per request when the network call fails (default: `1`).
- `UPTIME_FETCH_RETRY_DELAY_MS`: delay in milliseconds between retry attempts (default: `500`).
- `UPTIME_LOG_FILE`: JSON line-delimited output path.
- `UPTIME_WEBHOOK_URL`: optional webhook endpoint for failures.
- `UPTIME_WEBHOOK_KIND`: `json` (default), `feishu`, `dingtalk`, `slack`.
- `UPTIME_NOTIFY_WARNINGS=1`: include warning-only states in webhook notifications.
- `UPTIME_ALERT_STATE_FILE`: optional persistent alert state path (default: `.uptime-monitor-state.json`).
- `UPTIME_ALERT_STATE_WRITE_RETRIES`: alert-state write attempts for transient filesystem errors (default: `3`).
- `UPTIME_FAILURE_SUPPRESS_HOURS`: failure dedupe window in hours (default: `1`).
- `UPTIME_WARNING_SUPPRESS_HOURS`: warning dedupe window in hours (default: `24`).
- `UPTIME_WARNING_ESCALATE_COUNT`: number of warning runs to trigger escalation within the escalation window (default: `3`).
- `UPTIME_WARNING_ESCALATE_WINDOW_HOURS`: window size for warning escalation in hours (default: `24`).
- `UPTIME_ALERT_STATE_TTL_DAYS`: alert-state retention window in days (default: `14`).
- `UPTIME_ALERT_STATE_MAX_ENTRIES`: number of in-memory issue keys to retain in state file (default: `300`).

You can also run monitor contract tests locally:

```bash
npm run test:uptime-monitor
```

To aggregate notification delivery failures from a JSONL monitor log:

```bash
npm run monitor:notify-summary -- logs/monitor-results.log
```

To dry-run validate the production cron template without network requests:

```bash
npm run test:uptime-cron
```

Detailed usage and alerting expectations are in `docs/uptime-monitoring.md`.

### Tencent Cloud — production nginx

The site is served by the shared `ai_video_nginx` container.
Files live at `/opt/momcozy-audit/html/` (mounted as `/var/www/momcozy-audit` in the container).
nginx config: `/opt/ai-video/deploy/lighthouse/nginx.conf` — the `shopify.lute-tlz-dddd.top` server block.

**Do not edit `ops/nginx/momcozy-audit.conf` as a production operation** — it is a reference copy only.

## Key Findings (2026-06-17 PDP watchlist baseline)

| Metric | Value | Status |
|---|---|---|
| FCP desktop | 0.33 s (homepage) | Good (lab, no throttling) |
| FCP mobile | 0.33 s (homepage) | Good (lab, no throttling) |
| TTFB desktop | 247 ms (homepage) | Good |
| TTFB mobile | 214 ms (homepage) | Good |
| CLS | 0 | Perfect |
| TBT | 0 ms | Lab artifact (3P scripts failed) |
| JS payload | 1,903 KB (homepage), 2,214 KB (PDP watchlist max) | **Critical — 4.4× budget** |
| DOM nodes | 11,729 (PDP watchlist max) | **Critical — 7.8× limit** |
| Total requests | 798 (PDP watchlist max) | High |
| 3P failures desktop | 91 (PDP watchlist max) | **Critical** |
| 3P failures mobile | 91 (PDP watchlist max) | **Critical** |
| LCP | 0 / 26 observable samples | Not observable (hero/PDP lead asset path) |

Top P0 actions: reduce JS payload from 1.9–2.2 MB, fix up to 91 third-party failures, make hero/PDP lead assets LCP-eligible, and turn the 10-PDP watchlist into repeated segmented samples rather than a single-run conclusion.
