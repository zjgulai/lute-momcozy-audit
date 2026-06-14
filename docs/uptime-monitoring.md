# Uptime Monitoring Runbook

`npm run monitor:uptime` is a lightweight external monitor for quick availability checks. It is intentionally independent from GitHub Actions and intended for a remote cron host (VPS, monitoring VM, etc.).

## Default checks

- `https://<PUBLIC_URL>/` → `200`, plus optional security/noindex checks
- `https://<PUBLIC_URL>/metrics` (or `/metrics/`) → `200`
- `https://<PUBLIC_URL>/forensics` (or `/forensics/`) → `200`
- `https://<PUBLIC_URL>/trends` (or `/trends/`) → `200`
- `https://<PUBLIC_URL>/not-a-real-page` → `404`
- `https://<PUBLIC_URL>/private-audit-canary` (or `/private-audit-canary/`) → `403/404`

If you run this from a route where noindex can only be verified by robots.txt, the script records a warning rather than failing by default.

## Failure model

- The script exits `0` only when all required statuses and performance thresholds pass.
- Route status mismatches, response timeout, and timeout policy violations are hard failures.
- Security-header and noindex deviations are soft failures unless `UPTIME_STRICT=1` (or `UPTIME_REQUIRE_NOINDEX=1` for index policy).

## Scheduling

Use a separate host with `cron`:

```bash
*/5 * * * * cd /opt/momcozy-audit && PUBLIC_URL=https://shopify.lute-tlz-dddd.top npm run monitor:uptime >> logs/uptime.log 2>&1
```

The checked-in example is `ops/uptime-cron.example`. Validate it without making network requests:

```bash
npm run test:uptime-cron
```

## Environment variables

- `PUBLIC_URL`: override target base URL (default: https://shopify.lute-tlz-dddd.top)
- `UPTIME_STRICT`: set `1` to make header/noindex/RTT soft warnings hard failures.
- `UPTIME_TIMEOUT_MS`: per-request timeout in ms (default 8000).
- `UPTIME_MAX_RTT_MS`: maximum acceptable RTT in ms (default 5000).
- `UPTIME_REQUIRE_NOINDEX`: set `1` to require an explicit noindex signal on `/`.
- `UPTIME_EXPECT_TITLE_CONTAINS`: optional expected text that must appear in homepage `<title>`. Useful for preventing accidental monitoring of the wrong site.
- `UPTIME_CHECKS_JSON`: JSON array of checks (advanced override).
- `UPTIME_LOG_FILE`: optional file path to append every JSON run result (line-delimited JSON).
- `UPTIME_LOG_MAX_ENTRIES`: keep only the latest N lines in the file (`0` keeps all).
- `UPTIME_WEBHOOK_URL`: optional webhook endpoint for failures (POST payload is JSON).
- `UPTIME_NOTIFY_WARNINGS`: set `1` to notify on warning-only runs.
- `UPTIME_WEBHOOK_REQUIRE_SUCCESS`: set `1` to fail the script if webhook delivery fails.
- `UPTIME_EXPECT_BODY_MARKERS`: optional comma-separated or JSON list of required body substrings for homepage.
- `UPTIME_EXPECT_HOME_SHA256`: optional SHA-256 checksum expected for homepage body.
- `UPTIME_WEBHOOK_KIND`: one of `json` (default), `feishu`, `dingtalk`, `slack`.
- `UPTIME_FETCH_RETRIES`: number of fetch attempts per request when network calls fail (default: `1`, no retry).
- `UPTIME_FETCH_RETRY_DELAY_MS`: delay in ms between fetch retries (default: `500`).
- `UPTIME_WEBHOOK_RETRIES`: number of webhook delivery attempts (default: `1`, no retry).
- `UPTIME_WEBHOOK_RETRY_DELAY_MS`: delay in ms between webhook retries (default: `500`).
- `UPTIME_WEBHOOK_RETRY_MULTIPLIER`: multiplier for exponential backoff delay (default: `2`).
- `UPTIME_WEBHOOK_RETRY_MAX_DELAY_MS`: max delay between webhook retries in ms (`0` disables cap, default: `0`).
- `UPTIME_WEBHOOK_RETRY_JITTER_PCT`: jitter percentage applied to computed webhook backoff delay (`0`-`100`, default: `0`).
- `UPTIME_ALERT_STATE_FILE`: optional state persistence file path (default: `.uptime-monitor-state.json`).
- `UPTIME_ALERT_STATE_WRITE_RETRIES`: alert-state write attempts for transient filesystem errors (default: `3`).
- `UPTIME_ALERT_STATE_WRITE_RETRY_DELAY_MS`: base delay between state-write retries in ms (default: `100`).
- `UPTIME_ALERT_STATE_WRITE_RETRY_MULTIPLIER`: state-write retry backoff multiplier (default: `2`).
- `UPTIME_ALERT_STATE_WRITE_RETRY_MAX_DELAY_MS`: max delay between state-write retries in ms (default: `1000`).
- `UPTIME_ALERT_STATE_WRITE_RETRY_JITTER_PCT`: jitter percentage for state-write retry delay (`0`-`100`, default: `0`).
- `UPTIME_FAILURE_SUPPRESS_HOURS`: failure alert dedupe window in hours (default: `1`).
- `UPTIME_WARNING_SUPPRESS_HOURS`: warning alert dedupe window in hours (default: `24`).
- `UPTIME_WARNING_ESCALATE_COUNT`: warning escalation threshold, number of warning runs in the escalation window (default: `3`).
- `UPTIME_WARNING_ESCALATE_WINDOW_HOURS`: warning escalation window in hours (default: `24`).
- `UPTIME_ALERT_STATE_TTL_DAYS`: state file retention window in days (default: `14`).
- `UPTIME_ALERT_STATE_MAX_ENTRIES`: maximum number of signatures retained in state file (default: `300`).

### Alert rulebook

Each run builds a normalized issue signature from failed check messages (or warning messages when `UPTIME_NOTIFY_WARNINGS=1`).

- **Failure alerts**: notify once per issue signature per `UPTIME_FAILURE_SUPPRESS_HOURS`.
- **Warning alerts**: notify once per issue signature per `UPTIME_WARNING_SUPPRESS_HOURS`.
- **Warning escalation**: if a warning signature repeats `UPTIME_WARNING_ESCALATE_COUNT` times inside `UPTIME_WARNING_ESCALATE_WINDOW_HOURS`, emit an escalated alert (with `isEscalated=true` in the payload).
- Deduplicated alerts are suppressed and remain tracked in the state file for TTL/cleanup.

### Webhook payload mode

Use `UPTIME_WEBHOOK_KIND` to avoid custom relay wrappers:

- `UPTIME_WEBHOOK_KIND=feishu`
- `UPTIME_WEBHOOK_KIND=dingtalk`
- `UPTIME_WEBHOOK_KIND=slack`
- `UPTIME_WEBHOOK_KIND=json` (default; sends full JSON payload)

```bash
UPTIME_WEBHOOK_URL=https://hooks.example.com/alert \
UPTIME_NOTIFY_WARNINGS=1 \
UPTIME_WEBHOOK_REQUIRE_SUCCESS=1 \
UPTIME_WEBHOOK_KIND=slack \
UPTIME_FAILURE_SUPPRESS_HOURS=1 \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
UPTIME_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/..." \
UPTIME_WEBHOOK_KIND=feishu \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
UPTIME_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=..." \
UPTIME_WEBHOOK_KIND=dingtalk \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
UPTIME_EXPECT_TITLE_CONTAINS="Momcozy M1 v2.0" \
UPTIME_LOG_FILE=logs/monitor-results.log \
UPTIME_LOG_MAX_ENTRIES=240 \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
UPTIME_STRICT=1 \
UPTIME_CHECKS_JSON='[{"name":"home","paths":["/"],"expectedStatus":[200],"requireSecurityHeaders":true,"requireNoindex":true}]' \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
UPTIME_EXPECT_BODY_MARKERS='["Momcozy M1 v2.0"]' \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

```bash
HOME_SHA=$(curl -L -s https://shopify.lute-tlz-dddd.top/ | sha256sum | cut -d' ' -f1)
UPTIME_EXPECT_HOME_SHA256=$HOME_SHA \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

### Webhook retry behavior

The webhook sender retries delivery on:

- network exceptions (DNS/connection timeout/abort),
- webhook responses with HTTP 5xx status.

HTTP 4xx and successful HTTP responses are not retried. `UPTIME_WEBHOOK_RETRIES` controls total attempts; `UPTIME_WEBHOOK_RETRY_DELAY_MS` controls base delay for retries; `UPTIME_WEBHOOK_RETRY_MULTIPLIER` and jitter settings control exponential growth.

```bash
UPTIME_WEBHOOK_URL=https://hooks.example.com/alert \
UPTIME_WEBHOOK_RETRIES=3 \
UPTIME_WEBHOOK_RETRY_DELAY_MS=750 \
UPTIME_WEBHOOK_KIND=slack \
UPTIME_WEBHOOK_REQUIRE_SUCCESS=1 \
PUBLIC_URL=https://shopify.lute-tlz-dddd.top \
npm run monitor:uptime
```

Webhook deliveries now include structured delivery metadata in the output JSON under `webhookDelivery`:

- `kind`
- `attempts`
- `retried`
- `exhausted`
- `status`
- `httpOk`
- `validationIssues` (present only when payload validation fails)

Additionally, when delivery fails or is invalid, monitor output now includes machine-readable failure metadata:

- `notifyFailureSignals`: list of `{ code, severity, detail, message }`
- `notifyFailureCodes`: sorted unique failure code list for easy downstream aggregation
- `notifyFailureSeverity`: highest severity across notification failures
- `notifyFailureSeverityByCode`: highest severity per failure code
- `notifyFailureSeverityFlags`: boolean threshold map for `low` / `medium` / `high` / `critical`

Request-error details are redacted before output. Webhook URLs and token-like values are not retained in `notifyFailureSignals`.

Current supported codes:

- `webhook_payload_invalid`
- `webhook_http`
- `webhook_request_error`

To summarize line-delimited monitor output:

```bash
npm run monitor:notify-summary -- logs/monitor-results.log
```

The summary reports total runs, runs with notification failures, code counts, latest timestamp, and highest severity by code.

The monthly collection summary can include this same operational signal when run with `UPTIME_LOG_FILE`:

```bash
UPTIME_LOG_FILE=logs/monitor-results.log npm run collect:summary
```

## Acceptance evidence

For each run, archive:
- script output (JSON),
- current `uptime.log` line,
- any alert/dispatch evidence when exit code is non-zero.

For local regression checks of alert logic, run:

```bash
npm run test:uptime-monitor
```

This suite is now part of the default `npm test` command for routine regression coverage.
