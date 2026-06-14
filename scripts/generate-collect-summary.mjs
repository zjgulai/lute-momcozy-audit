import fs from "node:fs";
import path from "node:path";
import {
  formatNotifyFailureSummaryMarkdown,
  summarizeNotifyFailuresFromLines
} from "./summarize-notify-failures.mjs";

const METRIC_THRESHOLDS = {
  lcp: {label: "LCP", threshold: 2.5, unit: "s", digits: 2},
  fcp: {label: "FCP", threshold: 1.8, unit: "s", digits: 2},
  ttfb: {label: "TTFB", threshold: 800, unit: "ms", digits: 0},
  cls: {label: "CLS", threshold: 0.1, unit: "score", digits: 4},
  tbt: {label: "TBT", threshold: 200, unit: "ms", digits: 0},
  domNodes: {label: "DOM Nodes", threshold: 1500, unit: "count", digits: 0},
  totalRequests: {label: "Requests", threshold: 400, unit: "count", digits: 0},
  jsKb: {label: "JS KB", threshold: 500, unit: "KB", digits: 0},
  thirdPartyFailures: {label: "3P failures", threshold: 10, unit: "count", digits: 0}
};

const OUTPUT_DIR = process.env.AUDIT_OUTPUT_DIR || "src/_data/sessions";
const SESSION_PATH = process.env.AUDIT_SESSION_PATH;
const SESSION_DATE = process.env.AUDIT_SESSION_DATE;
const SESSION_ID = process.env.AUDIT_SESSION_ID;
const UPTIME_LOG_FILE = process.env.UPTIME_LOG_FILE || process.env.UPTIME_MONITOR_LOG_FILE || "";

function isAutomatedSession(session) {
  return typeof session.collectedBy === "string" &&
    session.collectedBy.toLowerCase().includes("collect.mjs");
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  return value.toFixed(digits);
}

function formatThresholdRow(metric, value, status, deltaText) {
  const spec = METRIC_THRESHOLDS[metric];
  const threshold = `${spec.threshold} ${spec.unit}`;
  const display = `${value === null ? "N/A" : `${formatNumber(value, spec.digits)} ${spec.unit}`}`;
  return `| ${spec.label} | ${display} | ${threshold} | ${status} | ${deltaText} |`;
}

function thresholdStatus(metric, value) {
  if (value === null || value === undefined) return "N/A";
  const spec = METRIC_THRESHOLDS[metric];
  return value <= spec.threshold ? "PASS" : "FAIL";
}

function routeMetric(session, routeId, viewport, metric) {
  if (routeId === "all" || !Array.isArray(session?.routes) || session.routes.length === 0) {
    const bucket = viewport === "mobile" ? session.mobile : session.metrics;
    return bucket?.[metric] ?? null;
  }

  const route = session.routes.find((item) => item.routeId === routeId);
  if (!route?.viewports?.length) return null;
  const viewportBucket = route.viewports.find((item) => item.label === viewport);
  return viewportBucket?.metrics?.[metric] ?? null;
}

function primaryRouteId(session) {
  if (!Array.isArray(session?.routes) || session.routes.length === 0) return "all";
  const primary = session.routes.find((item) => item.primary) || session.routes[0];
  return primary?.routeId || "all";
}

function routeLabel(session, routeId) {
  if (!Array.isArray(session?.routes) || session.routes.length === 0) return "(top-level snapshot)";
  const match = session.routes.find((item) => item.routeId === routeId);
  if (!match) return routeId;
  return `${match.label} (${routeId})`;
}

function routeMetricsInfo(session, routeId) {
  if (!Array.isArray(session?.routes) || session.routes.length === 0) return [];
  return session.routes.map((route) => {
    const routeLabelText = `${route.label} (${route.routeId})${route.primary ? " [primary]" : ""}`;
    const desktop = route.viewports?.find((item) => item.label === "desktop")?.metrics ?? {};
    const mobile = route.viewports?.find((item) => item.label === "mobile")?.metrics ?? {};
    const lcpNullReason = desktop.lcp === null
      ? (desktop.lcpNullReason || "unobserved in desktop")
      : null;
    return `${routeLabelText} · desktop LCP: ${formatNumber(desktop.lcp, 2)} s (${lcpNullReason || "ok"})`;
  });
}

function toDelta(current, previous, digits = 0) {
  if (current === null || previous === null || current === undefined || previous === undefined) {
    return "N/A";
  }
  const delta = current - previous;
  if (delta === 0) return "flat";
  const direction = delta > 0 ? "↑" : "↓";
  return `${direction} ${formatNumber(Math.abs(delta), digits)} ${delta > 0 ? "worse" : "better"}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readUptimeMonitorSummary(filePath) {
  if (!filePath) {
    return {
      configured: false,
      available: false,
      summary: null
    };
  }

  try {
    if (!fs.existsSync(filePath)) {
      return {
        configured: true,
        available: false,
        summary: null
      };
    }
    return {
      configured: true,
      available: true,
      summary: summarizeNotifyFailuresFromLines(fs.readFileSync(filePath, "utf8"))
    };
  } catch {
    return {
      configured: true,
      available: false,
      summary: null
    };
  }
}

function collectSessions() {
  if (!fs.existsSync(OUTPUT_DIR)) return [];
  return fs
    .readdirSync(OUTPUT_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(OUTPUT_DIR, file))
    .map(readJson)
    .filter((session) => session && typeof session.observedAt === "string")
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

function resolveCurrentSessionPath() {
  if (SESSION_PATH && fs.existsSync(SESSION_PATH)) return SESSION_PATH;

  if (SESSION_DATE) {
    const datePath = path.join(OUTPUT_DIR, `${SESSION_DATE}.json`);
    if (fs.existsSync(datePath)) return datePath;
  }

  if (SESSION_ID) {
    const idPath = path.join(OUTPUT_DIR, `${SESSION_ID}.json`);
    if (fs.existsSync(idPath)) return idPath;
  }

  const sessions = collectSessions();
  if (!sessions.length) return null;
  const explicit = sessions.find((session) => session.sessionId === SESSION_ID);
  if (explicit) return path.join(OUTPUT_DIR, `${explicit.observedAt}.json`);

  if (SESSION_DATE) {
    const candidate = sessions.find((session) => session.observedAt === SESSION_DATE);
    if (candidate) return path.join(OUTPUT_DIR, `${candidate.observedAt}.json`);
  }

  return path.join(OUTPUT_DIR, `${sessions[sessions.length - 1].observedAt}.json`);
}

const currentSessionPath = resolveCurrentSessionPath();
if (!currentSessionPath) {
  console.error("No session file available for summary generation.");
  process.exit(1);
}
if (!fs.existsSync(currentSessionPath)) {
  console.error(`Session file not found: ${currentSessionPath}`);
  process.exit(1);
}

const currentSession = readJson(currentSessionPath);
const allSessions = collectSessions();
const currentObservedAt = currentSession.observedAt;
const previousSession = [...allSessions]
  .filter((session) => isAutomatedSession(session))
  .filter((session) => session.observedAt < currentObservedAt)
  .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
  .at(-1) || null;

const primaryRoute = primaryRouteId(currentSession);
const currentMethodology = currentSession.methodologyVersion || "collector-v2-legacy-dual-viewport";
const methodologyChange = previousSession &&
  (previousSession.methodologyVersion || "collector-v2-legacy-dual-viewport") !== currentMethodology;
const priorMethodology = previousSession?.methodologyVersion || "collector-v2-legacy-dual-viewport";
const previousDate = previousSession?.observedAt || "(none)";

console.log("# Automated collection summary");
console.log("");
console.log(`- **Date:** ${currentSession.observedAt}`);
console.log(`- **Methodology:** ${currentMethodology}`);
console.log(`- **Primary route:** ${routeLabel(currentSession, primaryRoute)}`);
console.log(`- **Target:** ${currentSession.targetUrl || "unknown"}`);
console.log(`- **Collected by:** ${currentSession.collectedBy || "unknown"}`);
console.log(`- **Collected method:** Automated`);
console.log(`- **Confidence:** ${currentSession.confidence || "unknown"}`);
console.log("");

console.log("## Captured routes");
if (Array.isArray(currentSession.routes) && currentSession.routes.length > 0) {
  for (const routeLine of routeMetricsInfo(currentSession, primaryRoute)) {
    console.log(`- ${routeLine}`);
  }
} else {
  console.log("- top-level snapshot only (v1/v2 compatibility session)");
}
console.log("");

console.log("## Methodology continuity");
if (previousSession) {
  console.log(`- Previous automated session: ${previousDate}`);
  console.log(`- Previous methodology version: ${priorMethodology}`);
  console.log(`- Methodology break: ${methodologyChange ? "YES" : "NO"}`);
} else {
  console.log("- No previous automated session found in local archive.");
}
console.log("");

console.log("## Threshold checks (desktop, primary route)");
console.log("| Metric | Current | Threshold | Status | Δ vs previous |");
console.log("|---|---|---:|---:|---|");
for (const metric of Object.keys(METRIC_THRESHOLDS)) {
  const spec = METRIC_THRESHOLDS[metric];
  const currentValue = routeMetric(currentSession, primaryRoute, "desktop", metric);
  const previousValue = previousSession ? routeMetric(previousSession, primaryRoute, "desktop", metric) : null;
  const status = thresholdStatus(metric, currentValue);
  const delta = toDelta(currentValue, previousValue, spec.digits);
  console.log(formatThresholdRow(metric, currentValue, status, delta));
}
console.log("");

console.log("## Uptime monitor operations");
const uptimeSummary = readUptimeMonitorSummary(UPTIME_LOG_FILE);
if (!uptimeSummary.configured) {
  console.log("- Uptime monitor log summary: not configured for this summary run.");
  console.log("- Reviewer action: attach external monitor JSONL summary before monthly approval when available.");
} else if (!uptimeSummary.available) {
  console.log("- Uptime monitor log summary: configured, but no readable JSONL log was available for this summary run.");
  console.log("- Reviewer action: verify external monitor output separately before monthly approval.");
} else {
  console.log(formatNotifyFailureSummaryMarkdown(uptimeSummary.summary));
  console.log("- Reviewer action: investigate any non-empty notification failure code before approving the monthly run.");
}
console.log("");

console.log("## Review checklist");
console.log([
  "- [ ] Confirm route/config scope and methodology version are expected for this run.",
  "- [ ] Confirm route-by-route comparison notes if route set changed.",
  "- [ ] Confirm no manual/methodology mixing in automated review (review Trend table breakpoints and commentary).",
  "- [ ] Confirm uptime monitor JSONL summary is attached or explicitly unavailable.",
  "- [ ] Confirm notification delivery failure codes are empty or have owner-visible remediation notes.",
  "- [ ] Run and verify all safety gates: `npm run test:source-safety` and `npm run test:safety`.",
  "- [ ] Run and verify schema + full validation chain: `npm run test:sessions` and `npm test`.",
  "- [ ] Validate threshold regressions are intentional or include explicit remediation notes."
].join("\n"));
console.log("");

console.log("## Data-only changes release notes guidance");
console.log("- Keep code/config scope unchanged unless collector framework changes are intentional.");
console.log("- PR title/body should include: methodology version, route set, and whether any thresholds regressed.");
console.log("- If data-only changes include methodology breaks, call out the non-comparability in the release summary.");
console.log("- For trend-sensitive values, provide reviewer-visible rationale for any PASS/FAIL status changes.");
