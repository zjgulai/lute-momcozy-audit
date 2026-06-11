# Lute Momcozy Audit

Public, sanitized technical audit of the Momcozy storefront — a periodic performance monitoring product.

**Production**: https://shopify.lute-tlz-dddd.top  
**Audit version**: 3.3.0  
**Last session**: 2026-06-10 (automated, dual-viewport)

## Quick Start

```bash
npm ci
npm test        # build + validate schema + sessions + safety + links + e2e + a11y
npm run serve   # local preview at http://127.0.0.1:8080
```

## Requirements

- Node.js 22+
- Chromium (installed automatically by `npx playwright install --with-deps chromium`)

## Pages

| Route | Template | Description |
|---|---|---|
| `/` | `src/index.njk` | Overview — verdict, strengths, risks, recommendations |
| `/metrics/` | `src/metrics.njk` | 10 metrics (FCP desktop+mobile, TTFB, CLS, TBT, JS KB, DOM nodes, requests, 3P failures) |
| `/forensics/` | `src/forensics.njk` | Evidence trail and audit limitations |
| `/trends/` | `src/trends.njk` | uPlot charts + session table + delta cards |
| `/404.html` | `src/404.njk` | Not-found page |

## Data Architecture

### audit.json — single-snapshot source for Overview/Metrics/Forensics

One file, schema-validated, all pages driven from it. Update when publishing a new audit cycle.

### sessions/ — time-series archive for Trends

One JSON file per collection run (`YYYY-MM-DD.json`). The `sessions.js` Eleventy data file reads and sorts them automatically, injecting `isAutomated` and `methodologyBreak` flags.

**Session format v2** (from 2026-06-10): dual viewport, new metrics (TBT, DOM nodes, JS KB, total requests), mobile block, auto-computed confidence.

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

### Add a new session (scheduled CI)

`collect.yml` runs automatically on the 1st of each month at 02:00 UTC.
Requires GitHub Secret: `AUDIT_TARGET_URL=https://momcozy.com`

## Safety Scan

`npm run test:safety` scans `_site/` for forbidden patterns:
private paths, server addresses, monetary amounts, business KPIs,
private keys, `/data/` endpoints.

## Deployment

### GitHub Pages (automatic)
Push to `main` → `pages.yml` builds, tests, and deploys.

### Tencent Cloud (automatic)
Push to `main` → `tencent.yml` (build+test job → deploy job via artifact, no duplicate testing).

Required repository secrets:

| Secret | Value |
|---|---|
| `DEPLOY_SSH_KEY` | SSH private key for the deploy user |
| `DEPLOY_HOST` | `101.34.52.232` |
| `DEPLOY_ROOT` | `/opt/momcozy-audit` |
| `DEPLOY_USER` | `ubuntu` |
| `PUBLIC_URL` | `https://shopify.lute-tlz-dddd.top` |
| `AUDIT_TARGET_URL` | `https://momcozy.com` |

### Tencent Cloud — production nginx

The site is served by the shared `ai_video_nginx` container.  
Files live at `/opt/momcozy-audit/html/` (mounted as `/var/www/momcozy-audit` in the container).  
nginx config: `/opt/ai-video/deploy/lighthouse/nginx.conf` — the `shopify.lute-tlz-dddd.top` server block.

**Do not edit `ops/nginx/momcozy-audit.conf` as a production operation** — it is a reference copy only.

## Key Findings (2026-06-10 baseline)

| Metric | Value | Status |
|---|---|---|
| FCP desktop | 0.38 s | Good (lab, no throttling) |
| FCP mobile | 0.39 s | Good (lab, no throttling) |
| TTFB desktop | 253 ms | Good |
| CLS | 0 | Perfect |
| TBT | 0 ms | Lab artifact (3P scripts failed) |
| JS payload | 1,900 KB | **Critical — 3.8× budget** |
| DOM nodes | 7,299 | **Critical — 4.9× limit** |
| Total requests | 506 | High |
| 3P failures desktop | 47 | **Critical** |
| 3P failures mobile | 33 | **Critical** |
| LCP | null | Not observable (hero not LCP-eligible) |

Top P0 actions: reduce JS payload from 1.9 MB, fix 47 third-party failures, make hero an LCP-eligible element.
