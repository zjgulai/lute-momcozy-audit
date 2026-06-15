import {hashSignals, pruneAlertState as pruneAlertStateWithTtl, isIssueState} from "./state.mjs";

const NOTIFY_SEVERITY_RANK = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};
const NOTIFY_SEVERITY_LABELS = Object.keys(NOTIFY_SEVERITY_RANK);
const DEFAULT_ALERT_STATE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const DEFAULT_FAILURE_SUPPRESS_MS = 60 * 60 * 1000;
const DEFAULT_WARNING_SUPPRESS_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WARNING_ESCALATE_COUNT = 3;
const DEFAULT_WARNING_ESCALATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ALERT_STATE_ENTRIES = 300;

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

export function inferNotifySeverity(code, detail) {
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

export function toNotifyFailureSummary(severityRank) {
  const rank = NOTIFY_SEVERITY_RANK[clampNotifySeverity(severityRank)] ?? 0;
  return NOTIFY_SEVERITY_LABELS.reduce((acc, label) => {
    acc[label] = rank >= NOTIFY_SEVERITY_RANK[label];
    return acc;
  }, {});
}

export function buildNotifyFailure(code, detail = "") {
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

export function addNotifyFailure(store, code, detail = "") {
  if (!store) return;
  const signal = buildNotifyFailure(code, detail);
  store.messages.push(signal.message);
  store.signals.push(signal);
  store.codes.add(signal.code);
  store.severity = highestNotifySeverity(store.severity || "low", signal.severity);
  store.severityByCode[signal.code] = highestNotifySeverity(store.severityByCode[signal.code] || "low", signal.severity);
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

function highestNotifySeverity(left, right) {
  const leftRank = NOTIFY_SEVERITY_RANK[left] ?? 0;
  const rightRank = NOTIFY_SEVERITY_RANK[right] ?? 0;
  return leftRank >= rightRank ? left : right;
}

export function pruneAlertState(state, nowMs, ttlMs = DEFAULT_ALERT_STATE_TTL_MS, maxEntries = DEFAULT_MAX_ALERT_STATE_ENTRIES) {
  return pruneAlertStateWithTtl(state, nowMs, ttlMs, maxEntries);
}

export function computeAlertPolicy(payload, state = {}, ttlMs = DEFAULT_ALERT_STATE_TTL_MS, failureSuppressMs = DEFAULT_FAILURE_SUPPRESS_MS, warningSuppressMs = DEFAULT_WARNING_SUPPRESS_MS, warningEscalateCount = DEFAULT_WARNING_ESCALATE_COUNT, warningEscalateWindowMs = DEFAULT_WARNING_ESCALATE_WINDOW_MS, maxEntries = DEFAULT_MAX_ALERT_STATE_ENTRIES) {
  const now = Date.now();
  const kind = payload.failures > 0 ? "failure" : payload.warnings > 0 ? "warning" : "ok";
  const policy = {
    status: kind,
    shouldNotify: false,
    isEscalated: false,
    reason: kind === "ok" ? "healthy" : "suppressing-duplicate"
  };
  if (kind === "ok") {
    return {policy, alertState: pruneAlertState(state, now, ttlMs, maxEntries)};
  }

  const messages = buildIssueMessages(payload, kind);
  const signature = hashSignals(messages);
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

  const ttlCutoff = now - ttlMs;
  nextState.occurrences = (nextState.occurrences || []).filter((ts) => Number.isFinite(ts) && ts >= ttlCutoff && ts <= now);
  nextState.notifications = (nextState.notifications || []).filter((ts) => Number.isFinite(ts) && ts >= ttlCutoff && ts <= now);
  nextState.escalations = (nextState.escalations || []).filter((ts) => Number.isFinite(ts) && ts >= ttlCutoff && ts <= now);
  nextState.occurrences.push(now);

  if (kind === "failure") {
    const lastNotified = nextState.lastNotifiedAt || 0;
    if (now - lastNotified >= failureSuppressMs) {
      policy.shouldNotify = true;
      policy.reason = "failure-window-advanced";
      nextState.lastNotifiedAt = now;
      nextState.notifications.push(now);
    }
  } else {
    const nowEscalation = nextState.lastEscalationAt || 0;
    const escalationWindow = now - warningEscalateWindowMs;
    const escalationSignals = nextState.occurrences.filter((ts) => ts >= escalationWindow).length;
    const shouldEscalate = escalationSignals >= warningEscalateCount && now - nowEscalation >= warningEscalateWindowMs;

    if (shouldEscalate) {
      policy.shouldNotify = true;
      policy.isEscalated = true;
      policy.reason = `warning-escalation-${warningEscalateCount}-in-${Math.max(1, Math.ceil(warningEscalateWindowMs / (60 * 60 * 1000)))}h`;
      nextState.lastNotifiedAt = now;
      nextState.lastEscalationAt = now;
      nextState.notifications.push(now);
      nextState.escalations.push(now);
    } else {
      const lastNotified = nextState.lastNotifiedAt || 0;
      if (now - lastNotified >= warningSuppressMs) {
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

export {highestNotifySeverity, NOTIFY_SEVERITY_RANK, NOTIFY_SEVERITY_LABELS};
