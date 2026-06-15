import fs from "node:fs";
import {fileURLToPath} from "node:url";

const DEFAULT_CRON_FILE = "ops/uptime-cron.example";
const REQUIRED_ENV = [
  "PUBLIC_URL",
  "UPTIME_STRICT",
  "UPTIME_REQUIRE_NOINDEX",
  "UPTIME_EXPECT_BODY_MARKERS",
  "UPTIME_LOG_FILE",
  "UPTIME_ALERT_STATE_FILE"
];

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== "--dry-run");
  return {
    filePath: args[2] || process.env.UPTIME_CRON_FILE || DEFAULT_CRON_FILE
  };
}

function activeCronLines(content) {
  return String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function parseCronLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 6) {
    return null;
  }
  return {
    schedule: parts.slice(0, 5),
    command: parts.slice(5).join(" ")
  };
}

function extractEnv(command) {
  const env = {};
  for (const token of String(command || "").split(/\s+/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.+)$/.exec(token);
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function validateSchedule(schedule) {
  const issues = [];
  if (!Array.isArray(schedule) || schedule.length !== 5) {
    return ["cron schedule must have exactly five fields"];
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule;
  if (!/^(?:\*|\d{1,2}|\*\/\d{1,2})$/.test(minute)) {
    issues.push("minute field must be a simple minute or interval");
  }
  if (!/^(?:\*|\d{1,2})$/.test(hour)) {
    issues.push("hour field must be * or a simple hour");
  }
  if (!/^(?:\*|\d{1,2})$/.test(dayOfMonth)) {
    issues.push("day-of-month field must be * or a simple day");
  }
  if (!/^(?:\*|\d{1,2})$/.test(month)) {
    issues.push("month field must be * or a simple month");
  }
  if (!/^(?:\*|\d{1,2})$/.test(dayOfWeek)) {
    issues.push("day-of-week field must be * or a simple weekday");
  }

  return issues;
}

function validateCronEntry(entry, lineNumber) {
  const issues = [];
  if (!entry) {
    return [`line ${lineNumber}: invalid cron entry`];
  }

  for (const issue of validateSchedule(entry.schedule)) {
    issues.push(`line ${lineNumber}: ${issue}`);
  }

  const command = entry.command;
  const env = extractEnv(command);

  if (!/\bcd\s+\/opt\/momcozy-audit\b/.test(command)) {
    issues.push(`line ${lineNumber}: command must cd into /opt/momcozy-audit`);
  }
  if (!/\bnpm\s+run\s+monitor:uptime\b/.test(command)) {
    issues.push(`line ${lineNumber}: command must run npm run monitor:uptime`);
  }
  if (!/>>\s*logs\/uptime\.log\s+2>&1\b/.test(command)) {
    issues.push(`line ${lineNumber}: command must append stdout/stderr to logs/uptime.log`);
  }

  for (const key of REQUIRED_ENV) {
    if (!env[key]) {
      issues.push(`line ${lineNumber}: missing ${key}`);
    }
  }

  if (env.PUBLIC_URL && !/^https:\/\/[^/\s]+$/.test(env.PUBLIC_URL)) {
    issues.push(`line ${lineNumber}: PUBLIC_URL must be an https origin without path or trailing slash`);
  }
  if (env.UPTIME_STRICT && env.UPTIME_STRICT !== "1") {
    issues.push(`line ${lineNumber}: UPTIME_STRICT must be 1`);
  }
  if (env.UPTIME_REQUIRE_NOINDEX && env.UPTIME_REQUIRE_NOINDEX !== "1") {
    issues.push(`line ${lineNumber}: UPTIME_REQUIRE_NOINDEX must be 1`);
  }
  if (env.UPTIME_EXPECT_BODY_MARKERS) {
    const markers = env.UPTIME_EXPECT_BODY_MARKERS;
    const hasLute = markers.includes("路特") || markers.includes("\\u8def\\u7279");
    const hasMomcozy = markers.includes("Momcozy");
    const hasPrivateEdition = markers.includes("私密经营") || markers.includes("\\u79c1\\u5bc6\\u7ecf\\u8425");
    if (!hasLute || !hasMomcozy || !hasPrivateEdition) {
      issues.push(`line ${lineNumber}: UPTIME_EXPECT_BODY_MARKERS must include route identity and private-business markers`);
    }
  }
  if (env.UPTIME_LOG_FILE && !env.UPTIME_LOG_FILE.startsWith("logs/")) {
    issues.push(`line ${lineNumber}: UPTIME_LOG_FILE should write under logs/`);
  }
  if (env.UPTIME_ALERT_STATE_FILE && !env.UPTIME_ALERT_STATE_FILE.startsWith("logs/")) {
    issues.push(`line ${lineNumber}: UPTIME_ALERT_STATE_FILE should write under logs/`);
  }
  if (env.UPTIME_WEBHOOK_URL) {
    issues.push(`line ${lineNumber}: sample cron must not include a real webhook URL`);
  }
  if (/(?:\d{1,3}\.){3}\d{1,3}/.test(command)) {
    issues.push(`line ${lineNumber}: sample cron must not include a raw server address`);
  }

  return issues;
}

function validateCronContent(content) {
  const lines = activeCronLines(content);
  const entries = [];
  const issues = [];

  if (lines.length === 0) {
    issues.push("cron file has no active entries");
  }

  for (const [index, line] of lines.entries()) {
    const entry = parseCronLine(line);
    entries.push(entry);
    issues.push(...validateCronEntry(entry, index + 1));
  }

  return {
    ok: issues.length === 0,
    dryRun: true,
    activeEntries: entries.length,
    issues
  };
}

function main() {
  const {filePath} = parseArgs(process.argv);
  const result = validateCronContent(fs.readFileSync(filePath, "utf8"));
  console.log(JSON.stringify({file: filePath, ...result}, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  extractEnv,
  parseCronLine,
  validateCronContent
};
