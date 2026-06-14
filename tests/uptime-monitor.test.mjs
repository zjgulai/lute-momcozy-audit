import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  computeAlertPolicy,
  makeWebhookPayload,
  writeAlertState,
  buildNotifyFailure,
  pruneAlertState,
  validateWebhookPayload,
  computeWebhookRetryDelayMs,
  fetchWithRetry,
  postWithRetry
} from "../scripts/uptime-monitor.mjs";
import {
  formatNotifyFailureSummaryMarkdown,
  summarizeNotifyFailuresFromLines
} from "../scripts/summarize-notify-failures.mjs";
import {
  validateCronContent
} from "../scripts/validate-uptime-cron.mjs";

function mockResponse(status = 200, body = "") {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    text: async () => body
  };
}

function withFakeNow(nowMs, fn) {
  const originalNow = Date.now;
  Date.now = () => nowMs;
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

test("computeAlertPolicy deduplicates failure notifications within window", () => {
  const failurePayload = {
    failures: 1,
    warnings: 0,
    checks: [{
      name: "home",
      ok: false,
      messages: ["status 500 not in [200]"],
      warnings: []
    }]
  };

  const now = 1_700_000_000_000;

  const eval1 = withFakeNow(now, () => computeAlertPolicy(failurePayload, {}));
  assert.equal(eval1.policy.shouldNotify, true);
  assert.equal(eval1.policy.status, "failure");
  assert.equal(eval1.policy.reason, "failure-window-advanced");

  const signature = eval1.signature;
  assert.equal(typeof signature, "string");
  const stateAfterFirst = eval1.alertState;

  const eval2 = withFakeNow(now + 10 * 60 * 1000, () => computeAlertPolicy(failurePayload, stateAfterFirst));
  assert.equal(eval2.policy.shouldNotify, false);
  assert.equal(eval2.policy.reason, "suppressing-duplicate");

  const eval3 = withFakeNow(now + 61 * 60 * 60 * 1000, () => computeAlertPolicy(failurePayload, stateAfterFirst));
  assert.equal(eval3.policy.shouldNotify, true);
  assert.equal(eval3.policy.reason, "failure-window-advanced");
});

test("computeAlertPolicy escalates warning signals that repeat inside a rolling window", () => {
  const warningPayload = {
    failures: 0,
    warnings: 1,
    checks: [{
      name: "home",
      ok: true,
      messages: [],
      warnings: ["header warnings are non-blocking in soft mode"]
    }]
  };

  const now = 1_700_000_000_000;

  const sample = computeAlertPolicy(warningPayload, {});
  const signature = sample.signature;
  const preseededState = {
    [signature]: {
      kind: "warning",
      firstSeenAt: now - 2 * 60 * 60 * 1000,
      lastSeenAt: now - 2 * 60 * 60 * 1000,
      occurrences: [
        now - 2 * 60 * 60 * 1000,
        now - 60 * 60 * 1000
      ],
      notifications: [now - 2 * 60 * 60 * 1000],
      escalations: [],
      lastNotifiedAt: now - 2 * 60 * 60 * 1000,
      lastEscalationAt: 0
    }
  };

  const next = withFakeNow(now, () => computeAlertPolicy(warningPayload, preseededState));

  assert.equal(next.policy.shouldNotify, true);
  assert.equal(next.policy.isEscalated, true);
  assert.equal(next.policy.reason, "warning-escalation-3-in-24h");

  const storedState = next.alertState?.[signature];
  assert.equal(Array.isArray(storedState.escalations), true);
  assert.equal(storedState.escalations.length >= 1, true);
});

test("makeWebhookPayload formats for multiple webhook kinds", () => {
  const payload = {timestamp: "2026-06-13T12:00:00.000Z", publicUrl: "https://example.com", strictMode: false, totalChecks: 2, failures: 1, warnings: 0, checks: []};

  const jsonPayload = makeWebhookPayload(payload, "json");
  assert.deepEqual(jsonPayload, payload);

  const feishuPayload = makeWebhookPayload(payload, "feishu");
  assert.equal(feishuPayload.msg_type, "text");
  assert.equal(typeof feishuPayload.content?.text, "string");

  const dingtalkPayload = makeWebhookPayload(payload, "dingtalk");
  assert.equal(dingtalkPayload.msgtype, "text");
  assert.equal(typeof dingtalkPayload.text?.content, "string");

  const slackPayload = makeWebhookPayload(payload, "slack");
  assert.equal(typeof slackPayload.text, "string");

  const unknownPayload = makeWebhookPayload(payload, "unknown");
  assert.equal(unknownPayload, payload);
});

test("validateWebhookPayload enforces channel payload contract", () => {
  const payload = {timestamp: "2026-06-13T12:00:00.000Z", publicUrl: "https://example.com", strictMode: false, totalChecks: 2, failures: 1, warnings: 0, checks: []};

  const jsonResult = validateWebhookPayload(makeWebhookPayload(payload, "json"), "json");
  assert.equal(jsonResult.ok, true);
  assert.equal(jsonResult.issues.length, 0);

  const feishuResult = validateWebhookPayload(makeWebhookPayload(payload, "feishu"), "feishu");
  assert.equal(feishuResult.ok, true);
  assert.equal(feishuResult.issues.length, 0);

  const dingtalkResult = validateWebhookPayload(makeWebhookPayload(payload, "dingtalk"), "dingtalk");
  assert.equal(dingtalkResult.ok, true);
  assert.equal(dingtalkResult.issues.length, 0);

  const slackResult = validateWebhookPayload(makeWebhookPayload(payload, "slack"), "slack");
  assert.equal(slackResult.ok, true);
  assert.equal(slackResult.issues.length, 0);

  const badSlackResult = validateWebhookPayload({msg_type: "text"}, "slack");
  assert.equal(badSlackResult.ok, false);
});

test("computeWebhookRetryDelayMs applies exponential backoff and cap", () => {
  assert.equal(computeWebhookRetryDelayMs(1, 500, 2, 0, 0), 500);
  assert.equal(computeWebhookRetryDelayMs(2, 500, 2, 0, 0), 1000);
  assert.equal(computeWebhookRetryDelayMs(3, 500, 2, 0, 0), 2000);
  assert.equal(computeWebhookRetryDelayMs(4, 500, 2, 1800, 0), 1800);
});

test("computeWebhookRetryDelayMs applies bounded jitter and remains within expected range", () => {
  const originalRandom = Math.random;
  Math.random = () => 0.75;
  try {
    const delay = computeWebhookRetryDelayMs(3, 1000, 2, 0, 20);
    assert.equal(delay, 4400);
  } finally {
    Math.random = originalRandom;
  }
});

test("fetchWithRetry retries transient fetch failures and succeeds on retry", async () => {
  const originalFetch = global.fetch;
  try {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("temporary network failure");
      }
      return mockResponse(200, "ok");
    };

    const result = await fetchWithRetry("https://example.com", 1000, 2, 0);
    assert.equal(attempts, 2);
    assert.equal(result.status, 200);
  } finally {
    global.fetch = originalFetch;
  }
});

test("fetchWithRetry fails when all retry attempts fail", async () => {
  const originalFetch = global.fetch;
  try {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      throw new Error("transient failure");
    };

    await assert.rejects(
      () => fetchWithRetry("https://example.com", 1000, 2, 0),
      {message: "transient failure"}
    );
    assert.equal(attempts, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("postWithRetry retries transient webhook failures and succeeds on retry", async () => {
  const originalFetch = global.fetch;
  try {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error("webhook network flake");
      }
      return mockResponse(200, '{"ok":true}');
    };

    const result = await postWithRetry("https://example.com", {kind: "test"}, 1000, 2, 0);
    assert.equal(attempts, 2);
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(result.attempts, 2);
    assert.equal(result.retried, true);
    assert.equal(result.exhausted, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("postWithRetry retries transient HTTP 5xx statuses and returns final status", async () => {
  const originalFetch = global.fetch;
  try {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return mockResponse(503, `retry-${attempts}`);
    };

    const result = await postWithRetry("https://example.com", {kind: "test"}, 1000, 3, 0);
    assert.equal(attempts, 3);
    assert.equal(result.ok, false);
    assert.equal(result.attempts, 3);
    assert.equal(result.retried, true);
    assert.equal(result.exhausted, true);
    assert.equal(result.status, 503);
  } finally {
    global.fetch = originalFetch;
  }
});

test("pruneAlertState keeps only active tracked signals", () => {
  const now = 1_700_000_000_000;
  const stale = now - 30 * 24 * 60 * 60 * 1000;
  const state = {
    active: {
      firstSeenAt: now - 1000,
      lastSeenAt: now - 1000,
      occurrences: [now - 1000, stale],
      notifications: [stale],
      escalations: [stale]
    },
    staleSignal: {
      firstSeenAt: stale,
      lastSeenAt: stale,
      occurrences: [stale],
      notifications: [stale],
      escalations: [stale]
    }
  };

  const pruned = withFakeNow(now, () => pruneAlertState(state, now));
  assert.equal(Object.prototype.hasOwnProperty.call(pruned, "active"), true);
  assert.equal(Object.prototype.hasOwnProperty.call(pruned, "staleSignal"), false);
  assert.deepEqual(pruned.active.occurrences, [now - 1000]);
  assert.deepEqual(pruned.active.notifications, []);
  assert.deepEqual(pruned.active.escalations, []);
});

test("buildNotifyFailure builds machine-readable failure signal", () => {
  const signal = buildNotifyFailure("webhook_http", "status 503");
  assert.equal(signal.code, "webhook_http");
  assert.equal(signal.severity, "high");
  assert.equal(signal.detail, "status 503");
  assert.equal(signal.message, "webhook_http: status 503");
});

test("buildNotifyFailure redacts sensitive request error detail", () => {
  const signal = buildNotifyFailure("webhook_request_error", "failed https://hooks.example.com/send?access_token=abc123&x=1 token:secret-value");
  assert.equal(signal.severity, "high");
  assert.equal(signal.detail.includes("abc123"), false);
  assert.equal(signal.detail.includes("secret-value"), false);
  assert.equal(signal.detail.includes("https://<redacted-url>"), true);
});

test("writeAlertState writes atomically and does not leave temp artifacts", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-monitor-"));
  const stateFile = path.join(tempDir, "state.json");
  const payload = {issues: {abc: {firstSeenAt: 1, lastSeenAt: 1, occurrences: [1]}}};

  const result = await writeAlertState(stateFile, payload);

  assert.equal(result, true);
  assert.equal(fs.existsSync(stateFile), true);
  assert.equal(fs.readFileSync(stateFile, "utf8").trim(), JSON.stringify(payload, null, 2));
  assert.equal(
    fs.readdirSync(tempDir).filter((file) => file.startsWith("state.json.") && file.endsWith(".tmp")).length,
    0
  );
});

test("writeAlertState retries transient rename failures", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "uptime-monitor-retry-"));
  const stateFile = path.join(tempDir, "state.json");
  const payload = {issues: {retry: {firstSeenAt: 2, lastSeenAt: 2, occurrences: [2]}}};
  const originalRenameSync = fs.renameSync;
  let renameAttempts = 0;

  try {
    fs.renameSync = (from, to) => {
      renameAttempts += 1;
      if (renameAttempts === 1) {
        throw new Error("temporary rename failure");
      }
      return originalRenameSync(from, to);
    };

    const result = await writeAlertState(stateFile, payload, {
      attempts: 2,
      retryDelayMs: 0
    });

    assert.equal(result, true);
    assert.equal(renameAttempts, 2);
    assert.equal(fs.readFileSync(stateFile, "utf8").trim(), JSON.stringify(payload, null, 2));
    assert.equal(
      fs.readdirSync(tempDir).filter((file) => file.startsWith("state.json.") && file.endsWith(".tmp")).length,
      0
    );
  } finally {
    fs.renameSync = originalRenameSync;
  }
});

test("summarizeNotifyFailuresFromLines aggregates notify failure codes", () => {
  const lines = [
    JSON.stringify({timestamp: "2026-06-14T01:00:00.000Z", notifyFailureCodes: ["webhook_http"], notifyFailureSeverity: "high", notifyFailureSeverityByCode: {webhook_http: "high"}}),
    JSON.stringify({timestamp: "2026-06-14T01:05:00.000Z", notifyFailureCodes: ["webhook_http", "webhook_request_error"], notifyFailureSeverity: "high", notifyFailureSeverityByCode: {webhook_http: "medium", webhook_request_error: "high"}}),
    JSON.stringify({timestamp: "2026-06-14T01:10:00.000Z", totalChecks: 6})
  ].join("\n");

  const summary = summarizeNotifyFailuresFromLines(lines);

  assert.equal(summary.totalRuns, 3);
  assert.equal(summary.runsWithNotifyFailures, 2);
  assert.equal(summary.latestTimestamp, "2026-06-14T01:10:00.000Z");
  assert.equal(summary.highestSeverity, "high");
  assert.deepEqual(summary.codes, {
    webhook_http: 2,
    webhook_request_error: 1
  });
  assert.deepEqual(summary.severityByCode, {
    webhook_http: "high",
    webhook_request_error: "high"
  });
});

test("formatNotifyFailureSummaryMarkdown renders monthly ops summary lines", () => {
  const summary = summarizeNotifyFailuresFromLines(JSON.stringify({
    timestamp: "2026-06-14T02:00:00.000Z",
    notifyFailureCodes: ["webhook_http"],
    notifyFailureSeverity: "high",
    notifyFailureSeverityByCode: {webhook_http: "high"}
  }));

  const markdown = formatNotifyFailureSummaryMarkdown(summary);

  assert.match(markdown, /1\/1 run\(s\) had notification delivery failures/);
  assert.match(markdown, /webhook_http: 1 run\(s\), severity high/);
});

test("validateCronContent accepts production uptime cron example shape", () => {
  const cron = [
    "*/5 * * * * cd /opt/momcozy-audit && PUBLIC_URL=https://shopify.lute-tlz-dddd.top UPTIME_STRICT=1 UPTIME_LOG_FILE=logs/monitor-results.log UPTIME_ALERT_STATE_FILE=logs/uptime-alert-state.json npm run monitor:uptime >> logs/uptime.log 2>&1"
  ].join("\n");

  const result = validateCronContent(cron);

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.activeEntries, 1);
  assert.deepEqual(result.issues, []);
});

test("validateCronContent rejects cron entries without monitor log output", () => {
  const cron = "*/5 * * * * cd /opt/momcozy-audit && PUBLIC_URL=https://shopify.lute-tlz-dddd.top npm run monitor:uptime";

  const result = validateCronContent(cron);

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.includes("UPTIME_LOG_FILE")), true);
  assert.equal(result.issues.some((issue) => issue.includes("logs/uptime.log")), true);
});
