import fs from "node:fs";
import {fileURLToPath} from "node:url";

import {
  makeDefaultChecks,
  parseOptionalChecks,
  parseStringList,
  checkContentSignals
} from "./uptime/checks.mjs";
import {DEFAULT_EXPECT_BODY_MARKERS} from "./uptime/identity.mjs";
import {
  buildWebhookPayload,
  makeWebhookPayload,
  validateWebhookPayload
} from "./uptime/webhooks.mjs";
import {addNotifyFailure, toNotifyFailureSummary, computeAlertPolicy, buildNotifyFailure, pruneAlertState} from "./uptime/alerts.mjs";
import {computeWebhookRetryDelayMs, fetchWithRetry, postWithRetry} from "./uptime/fetch.mjs";
import {readAlertState, writeAlertState} from "./uptime/state.mjs";

const DEFAULT_PUBLIC_URL = "https://shopify.lute-tlz-dddd.top";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RTT_MS = 5000;
const DEFAULT_LOG_SEPARATOR = "\n";
const DEFAULT_ALERT_STATE_FILE = ".uptime-monitor-state.json";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.MONITOR_URL || DEFAULT_PUBLIC_URL).replace(/\/+$/, "");
const STRICT_MODE = process.env.UPTIME_STRICT === "1";
const REQUIRE_NOINDEX = process.env.UPTIME_REQUIRE_NOINDEX === "1";
const TIMEOUT_MS = Number(process.env.UPTIME_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
const MAX_RTT_MS = Number(process.env.UPTIME_MAX_RTT_MS || DEFAULT_MAX_RTT_MS);
const WEBHOOK_URL = process.env.UPTIME_WEBHOOK_URL || "";
const NOTIFY_WARNINGS = process.env.UPTIME_NOTIFY_WARNINGS === "1";
const WEBHOOK_REQUIRE_SUCCESS = process.env.UPTIME_WEBHOOK_REQUIRE_SUCCESS === "1";
const LOG_FILE = process.env.UPTIME_LOG_FILE || "";
const MAX_LOG_ENTRIES = Number(process.env.UPTIME_LOG_MAX_ENTRIES || 0);
const EXPECT_TITLE_CONTAINS = process.env.UPTIME_EXPECT_TITLE_CONTAINS || "";
const EXPECT_BODY_MARKERS = parseStringList(process.env.UPTIME_EXPECT_BODY_MARKERS || "", DEFAULT_EXPECT_BODY_MARKERS);
const EXPECT_HOME_SHA256 = (process.env.UPTIME_EXPECT_HOME_SHA256 || "").trim().toLowerCase();
const WEBHOOK_KIND = (process.env.UPTIME_WEBHOOK_KIND || "json").toLowerCase();
const ALERT_STATE_FILE = process.env.UPTIME_ALERT_STATE_FILE || DEFAULT_ALERT_STATE_FILE;
const FAILURE_SUPPRESS_MS = (parsePositiveInt(process.env.UPTIME_FAILURE_SUPPRESS_HOURS, 1, 0) * 60) * 60 * 1000;
const WARNING_SUPPRESS_MS = (parsePositiveInt(process.env.UPTIME_WARNING_SUPPRESS_HOURS, 24, 0) * 60) * 60 * 1000;
const WARNING_ESCALATE_COUNT = parsePositiveInt(process.env.UPTIME_WARNING_ESCALATE_COUNT, 3, 1);
const WARNING_ESCALATE_WINDOW_MS = (parsePositiveInt(process.env.UPTIME_WARNING_ESCALATE_WINDOW_HOURS, 24, 1) * 60) * 60 * 1000;
const ALERT_STATE_TTL_MS = (parsePositiveInt(process.env.UPTIME_ALERT_STATE_TTL_DAYS, 14, 1) * 24) * 60 * 60 * 1000;
const ALERT_STATE_MAX_ENTRIES = parsePositiveInt(process.env.UPTIME_ALERT_STATE_MAX_ENTRIES, 300, 1);
const FETCH_RETRIES = parsePositiveInt(process.env.UPTIME_FETCH_RETRIES, 1, 1);
const FETCH_RETRY_DELAY_MS = parsePositiveInt(process.env.UPTIME_FETCH_RETRY_DELAY_MS, 500, 0);
const WEBHOOK_RETRIES = parsePositiveInt(process.env.UPTIME_WEBHOOK_RETRIES, 1, 1);
const WEBHOOK_RETRY_DELAY_MS = parsePositiveInt(process.env.UPTIME_WEBHOOK_RETRY_DELAY_MS, 500, 0);
const WEBHOOK_RETRY_MULTIPLIER = parsePositiveNumber(process.env.UPTIME_WEBHOOK_RETRY_MULTIPLIER, 2, 1);
const WEBHOOK_RETRY_MAX_DELAY_MS = parsePositiveInt(process.env.UPTIME_WEBHOOK_RETRY_MAX_DELAY_MS, 0, 0);
const WEBHOOK_RETRY_JITTER_PCT = parsePositiveNumber(process.env.UPTIME_WEBHOOK_RETRY_JITTER_PCT, 0, 0);
const ALERT_STATE_WRITE_RETRIES = parsePositiveInt(process.env.UPTIME_ALERT_STATE_WRITE_RETRIES, 3, 1);
const ALERT_STATE_WRITE_RETRY_DELAY_MS = parsePositiveInt(process.env.UPTIME_ALERT_STATE_WRITE_RETRY_DELAY_MS, 100, 0);
const ALERT_STATE_WRITE_RETRY_MULTIPLIER = parsePositiveNumber(process.env.UPTIME_ALERT_STATE_WRITE_RETRY_MULTIPLIER, 2, 1);
const ALERT_STATE_WRITE_RETRY_MAX_DELAY_MS = parsePositiveInt(process.env.UPTIME_ALERT_STATE_WRITE_RETRY_MAX_DELAY_MS, 1000, 0);
const ALERT_STATE_WRITE_RETRY_JITTER_PCT = parsePositiveNumber(process.env.UPTIME_ALERT_STATE_WRITE_RETRY_JITTER_PCT, 0, 0);

export const DEFAULT_CHECKS = makeDefaultChecks(DEFAULT_EXPECT_BODY_MARKERS, "");

function buildNoindexRegex() {
  return /<meta[^>]*\bname\s*=\s*['"]robots['"][^>]*\bcontent\s*=\s*['"][^'"]*noindex|<meta[^>]*\bcontent\s*=\s*['"][^'"]*noindex[^'"]*['"][^>]*\bname\s*=\s*['"]robots['"]/i;
}

function parsePositiveInt(raw, fallback, minimum = 0) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (!Number.isFinite(rounded) || rounded < minimum) return fallback;
  return rounded;
}

function parsePositiveNumber(raw, fallback, minimum = 0) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < minimum) return fallback;
  return parsed;
}

function isIssueState(value) {
  return typeof value === "object" && value !== null;
}

function joinUrl(path) {
  return `${PUBLIC_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function hasAnyExpected(result, expected) {
  return expected.includes(result.status);
}

function hasNoindexSignal(body, robotsBody, robotsStatus) {
  if (buildNoindexRegex().test(body)) {
    return {found: true, strictFailure: false, warning: null};
  }

  if (robotsStatus === 200 && /^Disallow:\s*\/$/m.test(robotsBody || "")) {
    return {found: true, strictFailure: false, warning: "robots.txt indicates disallow /"};
  }

  return {
    found: false,
    strictFailure: REQUIRE_NOINDEX,
    warning: "noindex marker not found in response"
  };
}

async function checkNoindex(url) {
  const page = await fetchWithRetry(url, TIMEOUT_MS, FETCH_RETRIES, FETCH_RETRY_DELAY_MS);
  let robotsBody = "";
  let robotsStatus = null;

  try {
    const robotsUrl = `${PUBLIC_URL}/robots.txt`;
    const robots = await fetchWithRetry(robotsUrl, TIMEOUT_MS, FETCH_RETRIES, FETCH_RETRY_DELAY_MS);
    robotsBody = robots.body || "";
    robotsStatus = robots.status;
  } catch (error) {
    robotsStatus = null;
  }

  return {
    ...page,
    ...hasNoindexSignal(page.body || "", robotsBody, robotsStatus)
  };
}

async function checkExpectedTitle(result, expectedTitle) {
  const marker = String(expectedTitle || "").trim();
  if (!marker) return {ok: true, messages: []};

  const title = /<title>([\s\S]*?)<\/title>/i.exec(result.body || "");
  const value = title ? String(title[1]).trim() : "";
  if (!value) {
    return {ok: false, messages: ["expected <title> marker not found"]};
  }
  if (value.includes(marker)) {
    return {ok: true, messages: []};
  }
  return {ok: false, messages: [`title did not include "${marker}"`]};
}

function checkSecurityHeaders(headers, url) {
  const results = [];
  const checks = [
    {name: "content-security-policy", includes: "default-src 'self'"},
    {name: "x-frame-options", includes: "deny"},
    {name: "x-content-type-options", includes: "nosniff"},
    {name: "permissions-policy", includes: "camera=()"},
    {name: "cache-control", includes: "no-store"}
  ];

  let failed = false;
  for (const check of checks) {
    const value = headers[check.name] || "";
    if (!value.toLowerCase().includes(check.includes.toLowerCase())) {
      failed = true;
      results.push(`${check.name} missing "${check.includes}" on ${url}`);
    }
  }

  return {ok: !failed, issues: results};
}

async function runCheck(def) {
  let lastError;
  for (const path of def.paths) {
    try {
      const url = joinUrl(path);
      const result = path === "/" ? await checkNoindex(url) : await fetchWithRetry(url, TIMEOUT_MS, FETCH_RETRIES, FETCH_RETRY_DELAY_MS);

      const statusMatch = hasAnyExpected(result, def.expectedStatus);
      const base = {
        name: def.name,
        url,
        expectedStatus: def.expectedStatus,
        status: result.status,
        rttMs: result.rttMs,
        ok: false,
        messages: [],
        warnings: []
      };
      if (!statusMatch) {
        base.messages.push(`status ${result.status} not in [${def.expectedStatus.join(", ")}]`);
      } else {
        base.ok = true;
      }

      if (result.rttMs > MAX_RTT_MS) {
        base.ok = false;
        base.messages.push(`rtt ${result.rttMs}ms > ${MAX_RTT_MS}ms`);
      }

      if (def.requireSecurityHeaders && base.ok) {
        const headerCheck = checkSecurityHeaders(result.headers, url);
        if (!headerCheck.ok) {
          base.messages.push(...headerCheck.issues);
          if (STRICT_MODE) {
            base.ok = false;
          } else {
            base.warnings.push("header warnings are non-blocking in soft mode");
          }
        }
      }

      if (def.requireNoindex && path === "/") {
        if (!result.found) {
          base.messages.push(result.warning);
          if (result.strictFailure) base.ok = false;
          else base.warnings.push(result.warning);
        } else if (result.warning) {
          base.warnings.push(result.warning);
        }
      }

      if (path === "/" && EXPECT_TITLE_CONTAINS) {
        const titleCheck = await checkExpectedTitle(result, EXPECT_TITLE_CONTAINS);
        if (!titleCheck.ok) {
          base.messages.push(...titleCheck.messages);
          base.ok = false;
        }
      }

      const contentCheck = checkContentSignals(result.body || "", def);
      if (!contentCheck.ok) {
        base.messages.push(...contentCheck.messages);
        base.ok = false;
      }

      if (base.ok) {
        return base;
      }
      lastError = base;
    } catch (error) {
      lastError = {
        name: def.name,
        url: joinUrl(path),
        expectedStatus: def.expectedStatus,
        ok: false,
        messages: [error.message || String(error)],
        warnings: []
      };
    }
  }

  return {
    ...lastError,
    status: lastError?.status ?? null,
    rttMs: lastError?.rttMs ?? null,
    attempted: def.paths.slice(),
    ok: false
  };
}

function isIssueStateMap(value) {
  return isIssueState(value) && isIssueState(value.issues);
}

function buildMonitorChecks() {
  const checks = makeDefaultChecks(EXPECT_BODY_MARKERS, EXPECT_HOME_SHA256);
  return checks;
}

async function main() {
  const notifyFailureStore = {
    messages: [],
    signals: [],
    codes: new Set(),
    severity: "low",
    severityByCode: {}
  };
  const checks = parseOptionalChecks(process.env.UPTIME_CHECKS_JSON) || buildMonitorChecks();
  const results = [];

  for (const check of checks) {
    const result = await runCheck(check);
    results.push(result);
  }

  const failing = results.filter((check) => !check.ok).length;
  const warnings = results.flatMap((check) => check.warnings || []);
  const totalRtt = results.reduce((sum, item) => sum + (item.rttMs || 0), 0);
  const averageRtt = results.length ? Math.round(totalRtt / results.length) : null;
  const timestamp = new Date().toISOString();

  const payload = {
    timestamp,
    publicUrl: PUBLIC_URL,
    strictMode: STRICT_MODE,
    totalChecks: results.length,
    failures: failing,
    warnings: warnings.length,
    averageRttMs: averageRtt,
    checks: results
  };

  const statePayload = readAlertState(ALERT_STATE_FILE);
  const rawAlertState = isIssueStateMap(statePayload) ? statePayload.issues : {};
  const alertEvaluation = computeAlertPolicy(payload, rawAlertState, ALERT_STATE_TTL_MS, FAILURE_SUPPRESS_MS, WARNING_SUPPRESS_MS, WARNING_ESCALATE_COUNT, WARNING_ESCALATE_WINDOW_MS, ALERT_STATE_MAX_ENTRIES);
  const policy = alertEvaluation.policy;
  payload.alertPolicy = {
    status: policy.status,
    shouldNotify: policy.shouldNotify,
    reason: policy.reason,
    isEscalated: policy.isEscalated,
    signature: alertEvaluation.signature || null,
    signatureItems: alertEvaluation.issueMessages || []
  };

  if (alertEvaluation.alertState) {
    await writeAlertState(ALERT_STATE_FILE, {issues: alertEvaluation.alertState}, {
      attempts: ALERT_STATE_WRITE_RETRIES,
      retryDelayMs: ALERT_STATE_WRITE_RETRY_DELAY_MS,
      retryMultiplier: ALERT_STATE_WRITE_RETRY_MULTIPLIER,
      retryMaxDelayMs: ALERT_STATE_WRITE_RETRY_MAX_DELAY_MS,
      retryJitterPct: ALERT_STATE_WRITE_RETRY_JITTER_PCT
    });
  }

  if (LOG_FILE) {
    const line = JSON.stringify(payload);
    const existing = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8").trim() : "";
    let entries = existing ? existing.split("\n").filter(Boolean) : [];
    entries.push(line);
    if (MAX_LOG_ENTRIES > 0 && entries.length > MAX_LOG_ENTRIES) {
      entries = entries.slice(entries.length - MAX_LOG_ENTRIES);
    }
    fs.writeFileSync(LOG_FILE, entries.join(DEFAULT_LOG_SEPARATOR) + DEFAULT_LOG_SEPARATOR, "utf8");
  }

  const hasSignal = payload.failures > 0 || (NOTIFY_WARNINGS && payload.warnings > 0);
  if (WEBHOOK_URL && hasSignal && policy.shouldNotify) {
    const webhookPayload = makeWebhookPayload(payload, WEBHOOK_KIND);
    const webhookValidation = validateWebhookPayload(webhookPayload, WEBHOOK_KIND);
    payload.webhookDelivery = {
      kind: WEBHOOK_KIND,
      attempts: 0,
      retried: false,
      exhausted: false
    };

    if (!webhookValidation.ok) {
      payload.webhookDelivery.exhausted = true;
      payload.webhookDelivery.validationIssues = webhookValidation.issues;
      addNotifyFailure(notifyFailureStore, "webhook_payload_invalid", webhookValidation.issues.join(","));
    } else {
      try {
        const notifyResponse = await postWithRetry(WEBHOOK_URL, webhookPayload, TIMEOUT_MS, WEBHOOK_RETRIES, WEBHOOK_RETRY_DELAY_MS, {
          retryMultiplier: WEBHOOK_RETRY_MULTIPLIER,
          maxDelayMs: WEBHOOK_RETRY_MAX_DELAY_MS,
          jitterPercent: WEBHOOK_RETRY_JITTER_PCT
        });
        payload.webhookDelivery.attempts = notifyResponse.attempts || 0;
        payload.webhookDelivery.retried = Boolean(notifyResponse.retried);
        payload.webhookDelivery.exhausted = Boolean(notifyResponse.exhausted);
        payload.webhookDelivery.status = notifyResponse.status;
        payload.webhookDelivery.httpOk = notifyResponse.ok;
        if (!notifyResponse.ok) {
          addNotifyFailure(notifyFailureStore, "webhook_http", `status ${notifyResponse.status}`);
        }
      } catch (error) {
        payload.webhookDelivery.attempts = Number.isFinite(Number(error?.webhookAttempts)) ? error.webhookAttempts : WEBHOOK_RETRIES;
        payload.webhookDelivery.exhausted = true;
        payload.webhookDelivery.retried = payload.webhookDelivery.attempts > 1;
        addNotifyFailure(notifyFailureStore, "webhook_request_error", error.message || String(error));
      }
    }
  }

  if (notifyFailureStore.messages.length > 0) {
    payload.notifyFailures = notifyFailureStore.messages;
    payload.notifyFailureSignals = notifyFailureStore.signals;
    payload.notifyFailureCodes = Array.from(notifyFailureStore.codes).sort();
    payload.notifyFailureSeverity = notifyFailureStore.severity;
    payload.notifyFailureSeverityByCode = notifyFailureStore.severityByCode;
    payload.notifyFailureSeverityFlags = toNotifyFailureSummary(notifyFailureStore.severity);
    console.error(`uptime monitor notification failed: ${notifyFailureStore.messages.join("; ")}`);
  }

  console.log(JSON.stringify(payload, null, 2));
  if (failing > 0) {
    process.exit(1);
  }
  if (notifyFailureStore.messages.length > 0 && WEBHOOK_REQUIRE_SUCCESS) {
    process.exit(1);
  }
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Monitor failure:", error.message || String(error));
    process.exit(1);
  });
}

export {
  DEFAULT_EXPECT_BODY_MARKERS,
  buildWebhookPayload,
  makeWebhookPayload,
  checkContentSignals,
  buildNotifyFailure,
  validateWebhookPayload,
  computeAlertPolicy,
  pruneAlertState,
  computeWebhookRetryDelayMs,
  writeAlertState,
  readAlertState,
  fetchWithRetry,
  postWithRetry
};
