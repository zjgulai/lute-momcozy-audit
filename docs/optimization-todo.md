# Optimization TODO

This roadmap tracks the work needed to turn the private-business audit site into a sturdier recurring monitoring product.

Current release contract: `docs/release-contract.md`

## Batch 1 - Release Reliability

- [x] Document the current capability, risk, and optimization plan.
- [x] Cover the Trends page in Tencent production smoke checks.
- [x] Correct the monthly collection schedule comment.
- [x] Add source-level safety scanning for public content inputs.
- [x] Assert that Trends charts render non-empty in e2e tests.
- [x] Sync README and changelog with the migrated technical evidence.

## Batch 2 - Collector Coverage

- [x] Add a route configuration file for homepage and representative product-detail collection.
- [x] Capture product-detail metrics with the same desktop and mobile policy as homepage metrics.
- [x] Add console error count, script tag count, iframe count, transfer size, image format coverage, missing alt count, missing srcset count, and above-fold lazy image count.
- [x] Store only route-scoped aggregate metrics, not raw request URLs.
- [x] Add a methodology version field so old and new sessions can be rendered without mixing incompatible values.

## Batch 3 - Data Model

- [x] Design session v3 with `routes[]`, `viewports[]`, and `observations[]`.
- [x] Keep a compatibility adapter for existing v1 and v2 session files.
- [x] Make confidence route-aware and cap confidence when primary metrics are missing.
- [x] Add explicit null-reason fields for unobservable LCP.
- [x] Add route and method filters to the Trends page.

## Batch 4 - Review Workflow

- [x] Generate a monthly collection summary in the automated PR body.
- [x] Add a reviewer checklist for methodology breaks, sensitive content, and threshold regressions.
- [x] Add threshold status cards for latest automated sessions.
- [x] Add release notes guidance for data-only changes.

## Batch 5 - Production Observability

- [x] Add external smoke checks for all public routes after deploy.
- [x] Add production smoke checks for response headers (CSP, frame options, permissions policy, cache-control) and noindex behavior.
- [x] Add a lightweight uptime monitor outside GitHub Actions (`npm run monitor:uptime`, `scripts/uptime-monitor.mjs`) and external cron execution guidance.
- [x] Verify private data-path requests are blocked (403/404 accepted in production, 404 in local safety expectations).

## Batch 6 - Deployment Identity & Alerting

- [x] Extend external monitor with deployment identity checks (body marker + optional SHA256).
- [x] Add webhook channel presets/templates for common channels (Feishu/DingTalk/Slack) and onboarding docs.
- [x] Define an escalation rulebook for recurring warning-only states and duplicate alerts (per-day/per-hour suppression).

## Batch 7 - Alert Noise Control

- [x] Add dedupe/escalation policy state for webhook notifications to avoid duplicate alerts.
- [x] Escalate recurring warning-only alerts when repeated signals cross a rolling threshold.
- [x] Persist alert fingerprints and suppressions in a state file for robust external-cron operation.

## Batch 8 - Monitor Hardening and Testability

- [x] Add unit tests for alert policy decisions and webhook payload serialization.
- [x] Add TTL-pruning verification for stored alert state.
- [x] Add `npm run test:uptime-monitor` to make monitor regressions part of routine checks.

## Batch 9 - Monitoring Reliability

- [x] Add configurable retry attempts and delay for transient request failures in `scripts/uptime-monitor.mjs`.
- [x] Cover retry behavior with unit tests using mocked `fetch` in `tests/uptime-monitor.test.mjs`.

## Batch 10 - Notification Reliability

- [x] Add configurable webhook retry attempts and delay for transient webhook delivery failures.
- [x] Retry webhook delivery on retriable network errors and 5xx responses while keeping 4xx as terminal.
- [x] Document webhook retry behavior and environment controls in the uptime monitoring runbook.

## Batch 11 - Delivery Contract & Observability

- [x] Add webhook payload contract validation for `json`/`feishu`/`dingtalk`/`slack` payload shapes.
- [x] Emit webhook delivery metadata (attempts/retried/exhausted/status) in monitor output.
- [x] Move webhook retry schedule to exponential backoff with optional delay cap and jitter controls.

## Acceptance Gates

- `npm test` passes locally and in CI.
- Source and built-output safety scans pass.
- `/trends/` has rendered chart widgets in e2e.
- Production smoke covers `/`, `/metrics/`, `/forensics/`, `/trends/`, and 404 paths.
- Newly collected sessions are schema-valid and reviewed before publication.

## Batch 12 - Monitor Regression Gate

- [x] Add webhook retry backoff/jitter helper unit coverage.
- [x] Export retry delay helper for deterministic unit testing.
- [x] Include `test:uptime-monitor` in the main `npm test` pipeline.

## Batch 13 - Durable State and Alert Codes

- [x] Write alert state file atomically (temp-write + rename) to reduce partial writes under external-cron concurrency.
- [x] Add machine-readable webhook-notification failure signaling (`notifyFailureSignals` + `notifyFailureCodes`).
- [x] Add tests for atomic state write behavior and failure signal payload shape.

## Batch 14 - Alert-State Resilience and Failure Consumption

- [x] Retry alert-state writes with configurable backoff to reduce transient filesystem failures.
- [x] Add notification failure severity and redacted error detail for downstream routing.
- [x] Add `npm run monitor:notify-summary` to aggregate `notifyFailureCodes` from JSONL monitor logs.

## Batch 15 - Monthly Ops Evidence and Cron Dry Run

- [x] Include optional uptime monitor JSONL notification-failure summary in the monthly collection PR report.
- [x] Add a production cron example with JSONL log and alert-state file paths.
- [x] Add `npm run test:uptime-cron` dry-run validation for the cron example and include it in `npm test`.
