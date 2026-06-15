# Release Contract

The current Momcozy audit site is the private-business edition.

## Active Build Source

- `scripts/build-history-site.mjs`
- `src/_data/public-cross-audit.json`
- latest session in `src/_data/sessions/`
- `history_static/assets/`

Legacy Eleventy templates are retained for historical context only. They are not the active production build path.

## Canonical Generated Routes

- `/`
- `/metrics.html`
- `/forensics.html`
- `/trends.html`
- `/cross-audit.html`
- `/404.html`

- `/metrics`, `/forensics`, `/trends` are accepted aliases and return `200`.
- `/metrics/`, `/forensics/`, `/trends/` are not canonical and must return `404`.
- `.html` routes are the source-of-truth for release identity, docs, and release checks.

## Allowed In Generated Report Pages

- real operating amount fields
- real KPI labels such as ROI, AOV, monthly revenue, and conversion rate
- historical operating data and current collection evidence
- function comparison conclusions
- strategy execution recommendations

## Still Forbidden In Generated Report Pages

- secret keys
- private filesystem paths
- server addresses
- raw data endpoint references
- direct raw structured data file links

## Identity Markers

Required private-business markers:

- `路特 AI`
- `Momcozy`
- `私密经营`
- `真实金额`
- `真实 KPI`

Forbidden stale public-edition markers:

- `公开审计`
- `公开摘要`
- `nav-top`

## Enforcement

- `npm run test:release-contract`
- `npm test`
- Tencent deployment smoke checks must require the private-business marker.
- External uptime monitoring must require the private-business marker by default.
