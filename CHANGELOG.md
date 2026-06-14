# Changelog

## Unreleased

### Planning
- Added `docs/optimization-todo.md` with phased work for release reliability, collector coverage, data model evolution, review workflow, and production observability.
- Added `docs/legacy-history-migration.md` to document which legacy technical evidence was migrated and which sensitive categories were excluded.

### Data
- Expanded `audit.json` with sanitized legacy product-detail, image-format, DOM, script, console, and peer-benchmark evidence.
- Added follow-up recommendations for product-detail monitoring, optional-integration repair, and automated image checks.

### Validation
- Added source-level safety scanning for public content inputs.
- Added collection-route config validation.
- Added e2e assertions that Trends charts render non-empty uPlot widgets.
- Added `/trends/` to Tencent production smoke checks.
- Corrected the monthly collection cron comment to match the actual schedule.
- Added route/method session filtering on Trends charts and table row visibility.
- Added automated collection PR summaries with methodology notes, threshold checks, and reviewer checklist data in `collect.yml`.
- Added reviewer guidance for automated-session sanity checks (`docs/review-workflow.md`) and rendered threshold status cards for the latest automated scope on `/trends/`.
- Added production observability checks for response headers (CSP/frame policy/cache policy), noindex metadata, route availability (`/trends/`), and private path block status (accepting 403/404).
- Added external uptime monitor (`scripts/uptime-monitor.mjs`) and `npm run monitor:uptime` runbook for periodic out-of-band availability checks.
- Extended uptime monitoring with optional webhook alerting, optional title identity assertion, and optional line-delimited result logging.
- Extended uptime monitoring with optional homepage content markers and optional response-body SHA256 checks for deployment identity verification.
- Added `UPTIME_WEBHOOK_KIND` presets for Feishu/DingTalk/Slack webhook payload compatibility.
- Added alert suppression and escalation state for uptime monitoring (`UPTIME_ALERT_STATE_*`), including hour/day duplicate suppression and warning-run escalation thresholds.
- Added focused uptime monitor contract tests (`npm run test:uptime-monitor`) for alert policy and webhook payload behavior, and exported monitor helpers for future policy testing.
- Added resilient uptime fetch execution with configurable retry attempts and delay for transient network errors.
- Added webhook delivery retries in uptime monitoring (`UPTIME_WEBHOOK_RETRIES`, `UPTIME_WEBHOOK_RETRY_DELAY_MS`) with retriable network/5xx handling and updated runbook/test coverage.
- Added webhook payload contract validation, webhook delivery observability metadata, and exponential backoff/jitter controls for webhook retries.
- Added unit tests for webhook backoff delay computation (including multiplier, cap, and bounded jitter), exported retry delay helper, and included `test:uptime-monitor` in the main `npm test` pipeline.
- Added atomic alert-state persistence (`temp -> rename`) and machine-readable notification failure signaling (`notifyFailureSignals` + `notifyFailureCodes`) with test coverage.
- Added alert-state write retry controls, redacted notification-failure severity metadata, and `npm run monitor:notify-summary` for JSONL failure-code aggregation.
- Added optional uptime monitor JSONL summary to monthly collection reports plus `ops/uptime-cron.example` and `npm run test:uptime-cron` dry-run validation.

### Collector
- Added `config/collection-routes.json` for homepage plus representative product-detail collection.
- Updated `collect.mjs` to emit backward-compatible v2 homepage fields plus route-scoped aggregate metrics under `routes[]`.
- Added methodology versioning and aggregate-only route metrics for console errors, page errors, scripts, iframes, transfer size, image format coverage, missing alt/srcset, and above-fold lazy images.
- Added explicit LCP null-reason fields (`lcpNullReason`) for headless instrumentation.
- Added session `observations[]` for future route+viewport projection and kept legacy compatibility in `sessions.js` adapter.

---

## [3.3.0] — 2026-06-10

### Data
- Cross-validated all page narratives against actual session data
- Fixed 2 factual errors: TBT not in CrUX (was incorrectly cited); 3P failures cross-methodology comparison removed
- Fixed 3 misleading conclusions: FCP lab caveat added; JS blocking framing corrected; purchase-path scope limited
- Added TBT=0ms metric entry with full headless-mode explanation
- Added CrUX glossary entry explaining traffic threshold requirement
- Updated FCP/TBT/LCP glossary definitions with lab-vs-field context

### UI
- Fixed critical bug: `sessions-data` JSON escaped by Nunjucks (`&quot;`) causing all 6 uPlot charts to render empty — fixed with `| safe` filter
- Fixed mobile Trends table overflow (460px) — added `min-width: 780px`, `max-width: 100%`, edge-to-edge mobile display
- Added `<meta name="robots" content="noindex, nofollow">` to all pages
- Added inline SVG favicon (zero extra request, brand green `#16684d`)
- Added OG tags (`og:type`, `og:title`, `og:description`, `og:site_name`) to all pages
- Added `robots.txt` (Disallow: /)
- Fixed `check-links.mjs` to skip `data:` URI scheme

### Infrastructure
- Deployed to production: `https://shopify.lute-tlz-dddd.top`
- Updated nginx server block for `shopify.lute-tlz-dddd.top` with full security headers (HSTS, CSP, X-Frame, nosniff, Referrer-Policy, Permissions-Policy), correct cache strategy (HTML: no-store; assets: 1y immutable), proper 404 routing, and dedicated access/error logs
- Fixed nginx `add_header` inheritance by repeating security headers in each `location` block

---

## [3.2.0] — 2026-06-10

### Data
- Re-collected 2026-06-10 session with collect.mjs v2 (dual viewport + new metrics)
- Updated `audit.json` with 10 metrics: desktop+mobile FCP, TTFB, CLS, TBT, JS payload (1900 KB), DOM nodes (7299), total requests (506), desktop 3P failures (47), mobile 3P failures (33)
- Updated forensics with 6 entries: JS payload, 3P failures, DOM nodes, total requests, LCP observability, audit scope
- Updated recommendations with precise validation gates
- Expanded glossary to 8 terms (added TBT, INP, CrUX, DOM)

### Trends page
- Table expanded from 7 to 10 columns: added TBT, JS(KB), DOM nodes, Requests, 3P fail D/M
- Added 2 new uPlot charts: 3P Failures (with < 10 threshold line), Total Requests
- Added 3P Failures delta card (5th card)
- Updated `trends-charts.js` for new charts

---

## [3.1.0] — 2026-06-10

### Features
- Added `/trends/` page with uPlot time-series charts (LCP, FCP, TTFB, CLS)
- Added session table with methodology break indicator and manual/auto badge
- Added delta cards (latest vs previous session)
- Added `sessions/` data architecture (multi-file, one JSON per collection run)
- Added `sessions.js` Eleventy global data file (auto-sort, isAutomated, methodologyBreak flags)
- Added `config/session.schema.json` and `scripts/validate-sessions.mjs`
- Added `scripts/collect.mjs` — Playwright automated collection (dual viewport, 3 retries, W3C TTFB, confidence auto-compute)
- Added `.github/workflows/collect.yml` — monthly scheduled collection
- Added `.github/dependabot.yml`
- Updated nav with Trends link

### Data quality
- Downgraded 3 manual sessions (2026-03-12, -04-15, -05-17) to `confidence: low`
- Marked manual sessions with methodology break separator in trends table

---

## [3.0.0] — 2026-06-03

Initial public release.

- Sanitized 4-page audit site (Overview, Metrics, Forensics, 404)
- Eleventy SSG + Nunjucks templates
- JSON Schema allowlist for audit.json
- Safety scan, link check, Playwright e2e + a11y tests
- GitHub Pages CI (pages.yml)
- Tencent Cloud CI (tencent.yml) with SHA-256 integrity check and rollback
