# Public Audit Rules

- This repository contains only allowlisted, sanitized public findings.
- Never add real business KPIs, revenue, conversion, AOV, monetary ROI, server addresses, private paths, customer data, or raw evidence.
- All three pages render from `src/_data/audit.json`.
- Build output must not expose `/data/` or any JSON endpoint.
- `npm test` is required before publication.

