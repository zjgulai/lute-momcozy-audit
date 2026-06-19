# Momcozy Insight Report Contract

The private business site is an insight report, not an audit appendix.

## Per-Page Requirements

Each primary page must have:

1. One decision headline.
2. Three or fewer first-layer proof pillars.
3. A caveat when data windows or metric methods differ.
4. One action path with an owner or acceptance gate.
5. At least one chart when the page discusses trend, KPI movement, ranking, or matrix comparison.

## Forbidden Visible Narrative Terms

- 页面校验
- 最终审计
- 交叉审计
- 审计桥接
- 为什么先修
- 本节只回答

## Allowed Evidence Metadata Terms

- 复采
- 证据版本
- 验收
- owner
- 诊断报告 (when referring to legacy artifact identity only)

## Machine Gates

Before any release, run all of:

```bash
npm run test:report-data-consistency
npm run test:insight-contract
npm run test:release-parity
npm run audit:production-layout
npm test
```

These gates verify:
- Data counts match the latest session (no stale `lcpObservedSamples` etc.)
- Each page follows the insight contract (decisions, proofs, actions, charts present; forbidden terms absent)
- Local and production page structure stay aligned
- Visual layout remains readable (no section density violations, no tall sections)

## New Insight Dimensions (added 2026-06-18)

Three new data dimensions are now present in `public-cross-audit.json`:

| Key | Description | Rendered On |
|---|---|---|
| `securityAudit` | Passive Playwright scan: CSP headers, double FB pixel, SRI gaps, store handle exposure, myshopify probe | `forensics.html` |
| `geoBaseline` | Perplexity AI citation test: 5 mother/baby purchase-intent queries, Momcozy positioning vs competitors | `cross-audit.html` |
| `seoTechnical` | PDP + competitor SEO technical layer: Product Schema, AggregateRating, canonical, meta title quality | `forensics.html` |

## Derived External Fields

`scripts/history-site/session-derived-metrics.mjs` derives `external.lcpObservedSamples`, `external.lcpTotalSamples`, `external.routeCount`, and `external.latestSession` at build time from the latest session. The `public-cross-audit.json` stores matching values for human review; `npm run test:report-data-consistency` fails when they drift.
