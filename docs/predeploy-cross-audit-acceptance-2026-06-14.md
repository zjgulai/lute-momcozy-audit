# Predeploy Cross-Audit Acceptance (2026-06-14)

> Historical note: this document describes the earlier public-sanitized release boundary. The current release boundary is `docs/release-contract.md`.

## Scope

This historical cycle updated the public technical baseline for `2026-06-14` and ran the full production-readiness chain for Tencent deployment:

- Internal operating data refreshed from the workspace file
- External collection/session validation
- Source/schema/safety/link/accessibility gate checks
- Route-level smoke on production target
- Uptime-style strict monitoring pass

## Cross-audit evidence chain

- Internal source used for private validation: `m1/data/momcozy-real-data.xlsx` and derived files in `lute-ai-company-workspace/projects/momcozy-site-audit/m1/data/`.
- Public evidence source for this cycle: `src/_data/audit.json` + `src/_data/sessions/2026-06-14.json`.
- Governance: `operating data is used to constrain causality and prioritization only; no private business outcomes are published`.

## Round 1 — Boundary and safety checks

### Page boundary checks

- Overview/metrics/forensics/trends include an explicit public cross-audit boundary note.
- No forbidden private KPI/currency/server-path/private endpoint wording in the public edition.
- `npm run test:source-safety` — passed
- `npm run test:safety` — passed

### Internal-private/public boundary verification

- Internal operating metrics remain out of `src/_data/audit.json` public payload.
- Public pages present only sanitized technical indicators, confidence tags, and method/source metadata.

## Round 2 — Narrative and conclusion alignment (per page)

### `/` (Overview)

- New baseline tag in `meta`: `session-2026-06-14` / `3.3.1`.
- Verdict updated to reflect route-aware confirmation of LCP invisibility and frontend/third-party risks.
- Risks now include a route-validated LCP gap and higher route complexity on PDP.
- No direct business-outcome claim added in the public verdict.

### `/metrics`

- Added route-aware metric list with explicit `source + confidence`.
- Key high-signal updates:
  - LCP observability remains unobserved (4 samples).
  - JS payload now cited with route context (homepage + PDP).
  - Third-party failures split by route and viewport.
  - Product-detail image/accessibility probes added back into public metric stream.

### `/forensics`

- Added route-level forensics to show:
  - 3P failure spread across homepage/PDP.
  - DOM/script/iframe load complexity split by route.
  - Runtime faulting on PDP (console/page errors).
- Keeps explicit caveat that this is engineering evidence only and PDP conclusions are not business-causality assertions.

### `/trends`

- Continued methodology-break marker between manual and automated baselines.
- Delta/status cards render from the latest automated point (desktop primary route).
- `lcp trend` now marked N/A when route collection cannot measure LCP.
- Route filter data structure prepared (`routeIds`) for future scoped comparisons.

### Per-page conclusion quality check

- All pages use source-backed values present in `audit.json` and route/session data in `sessions/2026-06-14.json`.
- No page has undocumented numeric claims without a supporting source string.

## Round 3 — Data and schema integrity

- `npm run test:allowlist` — passed
- `npm run test:collection-config` — passed (`validated 2 collection route(s)`)
- `npm run test:sessions` — passed (`validated 5 session file(s)`)
- `npm run test:links` — checked 5 pages
- Full `npm test` — passed

## Round 4 — Decision and recommendation audit

- 7 recommendations are present; each has:
  - `priority` in `P0/P1/P2`
  - `title`
  - `action`
  - `validation` gate
- Recommendation priorities are consistent with critical technical blockers:
  1. Make LCP measurable on hero path
  2. Reduce JS payload
  3. Reduce 3P surface
  4. Reduce DOM size and PDP runtime/accessibility debt
  5. Extend route coverage

## Round 5 — Deployment readiness and smoke (hard gates)

### Local regression gates

- `npm test` suite (build, unit, schema, safety, links, uptime monitor tests, cron dry run, e2e, a11y): **all passed**
- Route smoke against production (`https://shopify.lute-tlz-dddd.top`) with strict checks:
  - `/` → 200
  - `/metrics/` → 200
  - `/forensics/` → 200
  - `/trends/` → 200
  - `/404.html` → 404
  - `/not-a-real-page` → 404
  - `/private-audit-canary` → 404 (accept 403/404)
- Security header checks pass:
  - `Content-Security-Policy` present
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy` present
  - `Cache-Control: no-cache, no-store`
- External strict monitor run:
  - `PUBLIC_URL=https://shopify.lute-tlz-dddd.top UPTIME_STRICT=1 UPTIME_REQUIRE_NOINDEX=1`
  - Result: `failures=0`, `warnings=0`, policy status `ok`.

## Remaining gaps and defect list

- No 3P failure baseline has been fully triaged to ownership; failures remain the largest cross-route risk.
- PDP is now in route set once, but no longer conversion-funnel depth (cart/checkout) covered.
- LCP remains unobservable in this headless route sampling; this is a strict data-gap and a required follow-up proof item.
- Accessibility regressions are currently surfaced as signal counts only; remediation ownership is still pending.

## Deployment execution status

- Technical baseline and validation chain is complete for deployment handoff.
- Next action: push to branch main so GitHub workflow `tencent.yml` executes build/upload/remote rollback checks, then run post-deploy smoke with noindex and private-route checks again.
