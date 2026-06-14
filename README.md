# Lute Momcozy Audit

Public, sanitized technical audit of the Momcozy storefront — a periodic performance monitoring product.

**Production**: https://shopify.lute-tlz-dddd.top
**Audit version**: 3.3.1
**Last session**: 2026-06-14 (automated, route-aware)

## Quick Start

```bash
npm ci
npm test        # build + schema + source safety + sessions + build safety + links + e2e + a11y
npm run serve   # local preview at http://127.0.0.1:8080
```

## Requirements

- Node.js 22+
- Chromium (installed automatically by `npx playwright install --with-deps chromium`)

## Pages

| Route | Template | Description |
|---|---|---|
| `/` | `src/index.njk` | Overview — verdict, strengths, risks, recommendations |
| `/metrics/` | `src/metrics.njk` | 11 technical metrics including vitals, JS payload, DOM, requests, image coverage, and product-detail legacy evidence |
| `/forensics/` | `src/forensics.njk` | Evidence trail and audit limitations |
| `/trends/` | `src/trends.njk` | uPlot charts + session table + delta cards |
| `/404.html` | `src/404.njk` | Not-found page |

## Data Architecture

### audit.json — single-snapshot source for Overview/Metrics/Forensics

One file, schema-validated, all pages driven from it. Update when publishing a new audit cycle.

### sessions/ — time-series archive for Trends

One JSON file per collection run (`YYYY-MM-DD.json`). The `sessions.js` Eleventy data file reads and sorts them automatically, injecting `isAutomated` and `methodologyBreak` flags.

**Session format v2** (from 2026-06-10): dual viewport, new metrics (TBT, DOM nodes, JS KB, total requests), mobile block, auto-computed confidence.

**Session format v3 route aggregate** (next automated collection): preserves the v2 top-level homepage fields for the existing Trends page, and also adds `methodologyVersion` plus a `routes[]` array. Routes are defined in `config/collection-routes.json` and currently cover homepage plus one representative product-detail route. Each route stores desktop and mobile aggregate metrics only; raw request URLs are not persisted.

**Session format v1** (before 2026-05-17): manual browser, no mobile block, confidence: low. Not directly comparable to v2.

## Updating Audit Data

### Manual snapshot update

1. Edit `src/_data/audit.json`
2. `npm run test:allowlist` — validate schema
3. `npm test` — full suite
4. Commit and push

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

`npm run test:source-safety` scans public source inputs (`src/` and `docs/`) for forbidden patterns before publication.

`npm run test:safety` scans `_site/` for forbidden patterns:
private paths, server addresses, monetary amounts, business KPIs,
private keys, and raw private endpoint patterns.

## Current Roadmap

The active optimization roadmap is tracked in `docs/optimization-todo.md`.
Batch 1-15 are implemented.

## Review Workflow

Monthly CI collection builds a PR with an auto-generated summary at `.github/collect-summary.md`
(`npm run collect:summary`), including:

- methodology/version summary,
- threshold status for the latest automated session,
- review checklist for methodology shifts and sensitive-content gates.

For manual review of data-only PRs and release-note conventions, follow `docs/review-workflow.md`.

## Deployment

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
- `UPTIME_EXPECT_BODY_MARKERS`: optional comma-separated list or JSON array of required homepage body substrings.
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

## Key Findings (2026-06-14 baseline)

| Metric | Value | Status |
|---|---|---|
| FCP desktop | 0.58 s | Good (lab, no throttling) |
| FCP mobile | 0.34 s | Good (lab, no throttling) |
| TTFB desktop | 416 ms | Good |
| TTFB mobile | 213 ms | Good |
| CLS | 0 | Perfect |
| TBT | 0 ms | Lab artifact (3P scripts failed) |
| JS payload | 1,904 KB (homepage), 1,942 KB (product-detail) | **Critical — 3.8× budget** |
| DOM nodes | 7,356 (homepage) | **Critical — 4.9× limit** |
| Total requests | 504 | High |
| 3P failures desktop | 45 | **Critical** |
| 3P failures mobile | 44 (homepage), 55 (product-detail) | **Critical** |
| LCP | N/A (not observable) | Not observable (hero/background path) |

Top P0 actions: reduce JS payload from 1.9 MB, fix 45–56 third-party failures, make hero an LCP-eligible element and extend route coverage to cart/checkout.
