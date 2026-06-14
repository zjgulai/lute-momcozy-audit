# Legacy History Migration

This note records how useful material from the retired history project was folded into the current sanitized Eleventy audit product.

## Relationship Between Projects

The history project was an older static report package. It mixed public technical observations with private business context, static HTML pages, screenshots, and raw working files. The current project is the maintained public monitoring surface. It publishes schema-validated audit data, recurring session files, accessibility checks, link checks, and safety scanning.

The current project is the canonical home after this migration.

## Migrated

- Product-detail technical evidence from the May 17 manual deep dive.
- Homepage image-format and lazy-loading observations.
- Product-detail resource, DOM, script, iframe, and console-error signals.
- Peer-store technical benchmark context, rewritten as bounded qualitative evidence.
- Actionable follow-up items for product-detail monitoring, broken optional integrations, and automated image checks.

All migrated material was rewritten into `src/_data/audit.json` so it is rendered through the existing Overview, Metrics, and Forensics pages.

## Excluded

- Private business metrics and impact estimates.
- Monetary amounts and commercial sizing.
- Raw old static HTML pages.
- Raw data files from the retired project.
- Full endpoint URLs, private infrastructure details, and local filesystem paths.
- Screenshots that were not needed by the current public report model.

## Validation Boundary

The migrated technical observations are marked low confidence unless they were already reproduced by the newer automated collector. They should guide the next collector expansion, not act as hard release gates until collected by the current `scripts/collect.mjs` flow.
