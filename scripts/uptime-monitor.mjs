import fs from "node:fs";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const DEFAULT_PUBLIC_URL = "https://shopify.lute-tlz-dddd.top";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_RTT_MS = 5000;
const DEFAULT_LOG_SEPARATOR = "\n";
const DEFAULT_ALERT_STATE_FILE = ".uptime-monitor-state.json";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const DEFAULT_CHECKS = [
  {
    name: "home",
    paths: ["/"],
    expectedStatus: [200],
    requireSecurityHeaders: true,
    requireNoindex: true,
    contentContains: [],
    expectedBodySha256: ""
  },
  {
    name: "metrics",
    paths: ["/metrics", "/metrics/"],
    expectedStatus: [200]
  },
  {
    name: "forensics",
    paths: ["/forensics", "/forensics/"],
    expectedStatus: [200]
  },
  {
    name: "trends",
    paths: ["/trends", "/trends/"],
    expectedStatus: [200]
  },
  {
    name: "not-found",
    paths: ["/not-a-real-page"],
    expectedStatus: [404]
  },
  {
    name: "private-route-block",
    paths: ["/private-audit-canary", "/private-audit-canary/"],
    expectedStatus: [403, 404]
  }
];

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
const EXPECT_BODY_MARKERS = parseStringList(process.env.UPTIME_EXPECT_BODY_MARKERS || "", []);
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

const NOTIFY_SEVERITY_RANK = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};
const NOTIFY_SEVERITY_LABELS = Object.keys(NOTIFY_SEVERITY_RANK);

DEFAULT_CHECKS[0].contentContains = EXPECT_BODY_MARKERS;
DEFAULT_CHECKS[0].expectedBodySha256 = EXPECT_HOME_SHA256;

function buildNoindexRegex() {
  return /<meta[^>]*\bname\s*=\s*['"]robots['"][^>]*\bcontent\s*=\s*['"][^'"]*noindex|<meta[^>]*\bcontent\s*=\s*['"][^'"]*noindex[^'"]*['"][^>]*\bname\s*=\s*['"]robots['"]/i;
}

function parseOptionalChecks(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("UPTIME_CHECKS_JSON must be an array");
  return parsed.map((check) => ({
    name: check.name || "custom",
    paths: Array.isArray(check.paths) && check.paths.length > 0 ? check.paths : ["/"],
    expectedStatus: Array.isArray(check.expectedStatus) ? check.expectedStatus : [200],
    requireSecurityHeaders: Boolean(check.requireSecurityHeaders),
    requireNoindex: Boolean(check.requireNoindex),
    contentContains: parseStringList(check.contentContains || [], []),
    expectedBodySha256: typeof check.expectedBodySha256 === "string" ? check.expectedBodySha256.trim().toLowerCase() : ""
  }));
}

function parseStringList(raw, fallback = []) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value).trim())
      .filter(Boolean);
  }
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter(Boolean);
      }
    } catch (error) {
      throw new Error(`UPTIME_EXPECT_BODY_MARKERS must be JSON array or comma-separated list. ${error.message}`);
    }
  }

  return trimmed
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
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

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function isIssueState(value) {
  return typeof value === "object" && value !== null;
}

function pruneTsList(items, minAgeMs, nowMs) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.filter((item) => Number.isFinite(item) && item >= minAgeMs && item <= nowMs);
}

function sanitizeFailureDetail(code, detail) {
  let output = String(detail || "").trim();
  if (!output) {
    return "";
  }

  if (code === "webhook_request_error") {
    output = output.replace(/https?:\/\/[^\s'"`]+/g, "https://<redacted-url>");
    output = output.replace(/([?&](?:token|secret|access[_-]?token|api[_-]?key|authorization)=)[^&\s'"`]+/gi, "$1<redacted>");
    output = output.replace(/((?:token|secret|access[_-]?token|api[_-]?key|authorization):)[^\s,;"']+/gi, "$1<redacted>");
  }

  if (output.length > 240) {
    output = output.slice(0, 237) + "...";
  }

  return output;
}

function clampNotifySeverity(rawSeverity) {
  if (typeof rawSeverity === "string" && NOTIFY_SEVERITY_RANK[rawSeverity.toLowerCase()] !== undefined) {
    return rawSeverity.toLowerCase();
  }
  return "medium";
}

function inferNotifySeverity(code, detail) {
  if (code === "webhook_payload_invalid") {
    return "medium";
  }
  if (code === "webhook_http") {
    if (/^status\s+5\d\d/.test(String(detail || ""))) {
      return "high";
    }
    if (/^status\s+4\d\d/.test(String(detail || ""))) {
      return "medium";
    }
    return "medium";
  }
  if (code === "webhook_request_error") {
    return "high";
  }
  return "medium";
}

function toNotifyFailureSummary(severityRank) {
  const rank = NOTIFY_SEVERITY_RANK[clampNotifySeverity(severityRank)] ?? 0;
  return NOTIFY_SEVERITY_LABELS.reduce((acc, label) => {
    acc[label] = rank >= NOTIFY_SEVERITY_RANK[label];
    return acc;
  }, {});
}

function highestNotifySeverity(left, right) {
  const leftRank = NOTIFY_SEVERITY_RANK[left] ?? 0;
  const rightRank = NOTIFY_SEVERITY_RANK[right] ?? 0;
  return leftRank >= rightRank ? left : right;
}

function readAlertState(filePath) {
  if (!filePath) return {};
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (isIssueState(parsed) && isIssueState(parsed.issues)) {
      return parsed;
    }
  } catch (error) {
    return {};
  }
  return {};
}

async function writeAlertState(filePath, state, options = {}) {
  if (!filePath) return false;

  const maxAttempts = Math.max(1, parsePositiveInt(options.attempts, ALERT_STATE_WRITE_RETRIES, 1));
  const retryDelayMs = parsePositiveInt(options.retryDelayMs, ALERT_STATE_WRITE_RETRY_DELAY_MS, 0);
  const retryMultiplier = parsePositiveNumber(options.retryMultiplier, ALERT_STATE_WRITE_RETRY_MULTIPLIER, 1);
  const retryMaxDelayMs = parsePositiveInt(options.retryMaxDelayMs, ALERT_STATE_WRITE_RETRY_MAX_DELAY_MS, 0);
  const retryJitterPct = parsePositiveNumber(options.retryJitterPct, ALERT_STATE_WRITE_RETRY_JITTER_PCT, 0);
  const payload = JSON.stringify(state, null, 2);
  const payloadWithEol = `${payload}\n`;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tempFilePath = `${filePath}.${Date.now()}.${process.pid || "0"}.${Math.floor(Math.random() * 1e6)}.${attempt}.tmp`;

    try {
      fs.writeFileSync(tempFilePath, payloadWithEol, "utf8");
      fs.renameSync(tempFilePath, filePath);
      return true;
    } catch (error) {
      lastError = error;
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error(`uptime monitor cannot clean temporary state file ${tempFilePath}: ${cleanupError.message || String(cleanupError)}`);
        }
      }

      if (attempt >= maxAttempts) {
        break;
      }

      const sleepMs = computeRetryDelayMs(attempt, retryDelayMs, retryMultiplier, retryMaxDelayMs, retryJitterPct);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    }
  }

  console.error(`uptime monitor cannot write state file ${filePath}: ${lastError ? lastError.message || String(lastError) : "unknown error"}`);
  return false;
}

function buildNotifyFailure(code, detail = "") {
  const safeCode = typeof code === "string" && code.trim() ? code.trim() : "unknown";
  const safeDetail = sanitizeFailureDetail(safeCode, detail);
  const severity = inferNotifySeverity(safeCode, safeDetail);
  return {
    code: safeCode,
    severity,
    detail: safeDetail,
    message: `${safeCode}${safeDetail ? `: ${safeDetail}` : ""}`
  };
}

function addNotifyFailure(store, code, detail = "") {
  if (!store) return;
  const signal = buildNotifyFailure(code, detail);
  store.messages.push(signal.message);
  store.signals.push(signal);
  store.codes.add(signal.code);
  store.severity = highestNotifySeverity(store.severity || "low", signal.severity);
  store.severityByCode[signal.code] = highestNotifySeverity(store.severityByCode[signal.code] || "low", signal.severity);
}

function pruneAlertState(state, nowMs) {
  const cutOff = nowMs - ALERT_STATE_TTL_MS;
  const stateKeys = Object.keys(state || {})
    .map((signature) => ({
      signature,
      issue: state[signature]
    }))
    .filter(({issue}) => {
      const lastSeen = issue?.lastSeenAt || issue?.lastNotifiedAt || issue?.lastEscalationAt || 0;
      return lastSeen >= cutOff;
    })
    .sort((left, right) => (right.issue.lastSeenAt || 0) - (left.issue.lastSeenAt || 0))
    .slice(0, ALERT_STATE_MAX_ENTRIES)
    .map(({signature}) => signature);

  const pruned = {};
  for (const signature of stateKeys) {
    const issue = state[signature] || {};
    pruned[signature] = Object.assign({}, issue, {
      occurrences: pruneTsList(issue.occurrences || [], cutOff, nowMs),
      notifications: pruneTsList(issue.notifications || [], cutOff, nowMs),
      escalations: pruneTsList(issue.escalations || [], cutOff, nowMs)
    });
  }
  return pruned;
}

function buildIssueMessages(payload, kind) {
  const checks = payload.checks || [];
  const lines = [];

  if (kind === "failure") {
    for (const check of checks) {
      if (check.ok) continue;
      const messages = check.messages || [];
      if (!messages.length) {
        lines.push(`${check.name}:failure`);
      } else {
        for (const message of messages) {
          lines.push(`${check.name}:failure:${String(message).trim()}`);
        }
      }
    }
  } else {
    for (const check of checks) {
      const messages = check.warnings || [];
      for (const message of messages) {
        lines.push(`${check.name}:warning:${String(message).trim()}`);
      }
    }
  }

  if (lines.length === 0) {
    lines.push(`${kind}:generic`);
  }

  return lines.sort();
}

function buildIssueFingerprint(messages) {
  return sha256Hex(messages.join("||"));
}

function computeAlertPolicy(payload, state) {
  const now = Date.now();
  const kind = payload.failures > 0 ? "failure" : payload.warnings > 0 ? "warning" : "ok";
  const policy = {
    status: kind,
    shouldNotify: false,
    isEscalated: false,
    reason: kind === "ok" ? "healthy" : "suppressing-duplicate"
  };
  if (kind === "ok") {
    return {policy, alertState: pruneAlertState(state, now)};
  }

  const messages = buildIssueMessages(payload, kind);
  const signature = buildIssueFingerprint(messages);
  const issueState = isIssueState(state[signature]) ? state[signature] : null;

  const base = {
    kind,
    signature,
    firstSeenAt: now,
    lastSeenAt: now,
    occurrences: [],
    lastNotifiedAt: null,
    lastEscalationAt: null
  };
  const previousState = isIssueState(issueState) ? issueState : {};
  const nextState = Object.assign(base, previousState);
  nextState.kind = kind;
  nextState.lastSeenAt = now;
  nextState.firstSeenAt = Math.min(nextState.firstSeenAt ?? now, now);

  const ttlCutoff = now - ALERT_STATE_TTL_MS;
  nextState.occurrences = pruneTsList((nextState.occurrences || []), ttlCutoff, now);
  nextState.notifications = pruneTsList((nextState.notifications || []), ttlCutoff, now);
  nextState.escalations = pruneTsList((nextState.escalations || []), ttlCutoff, now);
  nextState.occurrences.push(now);

  if (kind === "failure") {
    const lastNotified = nextState.lastNotifiedAt || 0;
    if (now - lastNotified >= FAILURE_SUPPRESS_MS) {
      policy.shouldNotify = true;
      policy.reason = "failure-window-advanced";
      nextState.lastNotifiedAt = now;
      nextState.notifications.push(now);
    }
  } else {
    const nowEscalation = nextState.lastEscalationAt || 0;
    const escalationWindow = now - WARNING_ESCALATE_WINDOW_MS;
    const escalationSignals = nextState.occurrences.filter((ts) => ts >= escalationWindow).length;
    const shouldEscalate = escalationSignals >= WARNING_ESCALATE_COUNT && now - nowEscalation >= WARNING_ESCALATE_WINDOW_MS;

    if (shouldEscalate) {
      policy.shouldNotify = true;
      policy.isEscalated = true;
      policy.reason = `warning-escalation-${WARNING_ESCALATE_COUNT}-in-${Math.max(1, Math.ceil(WARNING_ESCALATE_WINDOW_MS / HOUR_MS))}h`;
      nextState.lastNotifiedAt = now;
      nextState.lastEscalationAt = now;
      nextState.notifications.push(now);
      nextState.escalations.push(now);
    } else {
      const lastNotified = nextState.lastNotifiedAt || 0;
      if (now - lastNotified >= WARNING_SUPPRESS_MS) {
        policy.shouldNotify = true;
        policy.reason = "warning-window-advanced";
        nextState.lastNotifiedAt = now;
        nextState.notifications.push(now);
      }
    }
  }

  const nextStateMap = Object.assign({}, state);
  nextStateMap[signature] = nextState;
  return {
    policy,
    signature,
    issueMessages: messages,
    alertState: nextStateMap
  };
}

function checkContentSignals(body, def) {
  const messages = [];
  const markers = Array.isArray(def.contentContains) ? def.contentContains : [];
  const text = String(body || "");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      messages.push(`content marker "${marker}" not found`);
    }
  }

  if (def.expectedBodySha256) {
    const digest = sha256Hex(text);
    if (digest !== def.expectedBodySha256) {
      messages.push(`body sha256 mismatch: expected ${def.expectedBodySha256}, got ${digest}`);
    }
  }

  return {ok: messages.length === 0, messages};
}

function webhookSummaryText(payload) {
  const lines = [
    `Momcozy uptime check at ${payload.timestamp}`,
    `URL: ${payload.publicUrl}`,
    `Mode: strict=${payload.strictMode ? "on" : "off"}`,
    `Checks: ${payload.totalChecks}, failures: ${payload.failures}, warnings: ${payload.warnings}`
  ];

  for (const check of payload.checks) {
    const state = check.ok ? "OK" : "FAIL";
    const message = (check.messages || []).length ? `; ${(check.messages || []).join("; ")}` : "";
    lines.push(`${state} ${check.name} ${check.url} => ${check.status}${message}`);
  }

  return lines.join("\n");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateWebhookPayload(payload, webhookKind = WEBHOOK_KIND) {
  const normalizedKind = String(webhookKind || "json").toLowerCase();
  const issues = [];

  if (normalizedKind === "json") {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      issues.push("json webhook payload must be an object");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "feishu") {
    const content = payload?.content;
    if (payload?.msg_type !== "text") {
      issues.push('feishu payload must set msg_type to "text"');
    }
    if (!content || !isNonEmptyString(content?.text)) {
      issues.push("feishu payload must include content.text string");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "dingtalk") {
    const text = payload?.text;
    if (payload?.msgtype !== "text") {
      issues.push('dingtalk payload must set msgtype to "text"');
    }
    if (!text || !isNonEmptyString(text?.content)) {
      issues.push("dingtalk payload must include text.content string");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "slack") {
    if (!isNonEmptyString(payload?.text)) {
      issues.push("slack payload must include text string");
    }
    return {ok: issues.length === 0, issues};
  }

  return {ok: true, issues: []};
}

function makeWebhookPayload(payload, webhookKind = WEBHOOK_KIND) {
  const normalizedKind = String(webhookKind || "json").toLowerCase();
  const text = webhookSummaryText(payload);
  if (normalizedKind === "feishu") {
    return {
      msg_type: "text",
      content: {text}
    };
  }
  if (normalizedKind === "dingtalk") {
    return {
      msgtype: "text",
      text: {content: text}
    };
  }
  if (normalizedKind === "slack") {
    return {
      text
    };
  }

  return payload;
}

function buildWebhookPayload(payload) {
  return makeWebhookPayload(payload, WEBHOOK_KIND);
}

function normalizeHeaders(headers) {
  return Object.fromEntries(Array.from(headers.entries(), ([key, value]) => [key.toLowerCase(), value]));
}

function joinUrl(path) {
  return `${PUBLIC_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "LuteMomcozyAuditMonitor/1.0"
      }
    });
    const rttMs = Date.now() - start;
    const body = await response.text();
    return {
      ok: true,
      status: response.status,
      headers: normalizeHeaders(response.headers),
      body,
      rttMs
    };
  } finally {
    clearTimeout(timer);
  }
}

async function postWithTimeout(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "user-agent": "LuteMomcozyAuditMonitor/1.0"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      body
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(status) {
  if (status >= 500 && status <= 599) {
    return true;
  }
  return false;
}

function computeRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent) {
  if (retryMultiplier <= 1 || baseDelayMs <= 0) {
    return baseDelayMs;
  }

  const exponent = attempt - 1;
  let delay = baseDelayMs * retryMultiplier ** exponent;
  if (maxDelayMs > 0) {
    delay = Math.min(delay, maxDelayMs);
  }

  if (jitterPercent <= 0) {
    return delay;
  }

  const jitterRatio = jitterPercent / 100;
  const boundedJitter = Math.min(1, Math.max(0, jitterRatio));
  const offset = (Math.random() * 2 - 1) * boundedJitter;
  return Math.max(0, Math.round(delay + delay * offset));
}

function computeWebhookRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent) {
  return computeRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent);
}

async function postWithRetry(url, payload, timeoutMs, attempts = WEBHOOK_RETRIES, retryDelayMs = WEBHOOK_RETRY_DELAY_MS) {
  const parsedAttempts = Math.max(1, parsePositiveInt(attempts, 1, 1));
  let lastError;
  let attemptsDone = 0;

  for (let attempt = 1; attempt <= parsedAttempts; attempt++) {
    attemptsDone = attempt;
    try {
      const response = await postWithTimeout(url, payload, timeoutMs);
      if (response.ok) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: false
        };
      }

      if (!isRetryableStatus(response.status)) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: false
        };
      }

      if (attempt >= parsedAttempts) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: true
        };
      }

      const sleepMs = computeWebhookRetryDelayMs(attempt, retryDelayMs, WEBHOOK_RETRY_MULTIPLIER, WEBHOOK_RETRY_MAX_DELAY_MS, WEBHOOK_RETRY_JITTER_PCT);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    } catch (error) {
      lastError = error;
      if (attempt >= parsedAttempts) {
        if (typeof error === "object") {
          error.webhookAttempts = attempt;
          error.webhookRetriesExhausted = true;
        }
        throw error;
      }
      const sleepMs = computeWebhookRetryDelayMs(attempt, retryDelayMs, WEBHOOK_RETRY_MULTIPLIER, WEBHOOK_RETRY_MAX_DELAY_MS, WEBHOOK_RETRY_JITTER_PCT);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    }
  }

  if (lastError) {
    if (typeof lastError === "object") {
      lastError.webhookAttempts = attemptsDone;
      lastError.webhookRetriesExhausted = true;
    }
    throw lastError;
  }

  return {
    ok: false,
    status: 0,
    body: ""
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, timeoutMs, attempts = FETCH_RETRIES, retryDelayMs = FETCH_RETRY_DELAY_MS) {
  const parsedAttempts = Math.max(1, parsePositiveInt(attempts, 1, 1));
  let lastError;

  for (let attempt = 1; attempt <= parsedAttempts; attempt++) {
    try {
      return await fetchWithTimeout(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= parsedAttempts) {
        throw error;
      }
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError;
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
};

async function checkNoindex(url) {
  const page = await fetchWithRetry(url, TIMEOUT_MS);
  let robotsBody = "";
  let robotsStatus = null;

  try {
    const robotsUrl = `${PUBLIC_URL}/robots.txt`;
    const robots = await fetchWithRetry(robotsUrl, TIMEOUT_MS);
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
      const result = path === "/" ? await checkNoindex(url) : await fetchWithRetry(url, TIMEOUT_MS);

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

async function main() {
  const notifyFailureStore = {
    messages: [],
    signals: [],
    codes: new Set(),
    severity: "low",
    severityByCode: {}
  };
  const checks = parseOptionalChecks(process.env.UPTIME_CHECKS_JSON) || DEFAULT_CHECKS;
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
  const rawAlertState = isIssueState(statePayload.issues) ? statePayload.issues : {};
  const alertEvaluation = computeAlertPolicy(payload, rawAlertState);
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
    const prunedState = pruneAlertState(alertEvaluation.alertState, Date.now());
    await writeAlertState(ALERT_STATE_FILE, {issues: prunedState});
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
    const webhookPayload = buildWebhookPayload(payload);
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
        const notifyResponse = await postWithRetry(WEBHOOK_URL, webhookPayload, TIMEOUT_MS);
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
  buildWebhookPayload,
  makeWebhookPayload,
  validateWebhookPayload,
  computeAlertPolicy,
  computeWebhookRetryDelayMs,
  writeAlertState,
  buildNotifyFailure,
  pruneAlertState,
  fetchWithRetry,
  postWithRetry
};
