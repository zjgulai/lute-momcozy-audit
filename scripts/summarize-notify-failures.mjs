import fs from "node:fs";
import {fileURLToPath} from "node:url";

const SEVERITY_RANK = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

function highestSeverity(left = "low", right = "low") {
  const leftRank = SEVERITY_RANK[left] ?? 0;
  const rightRank = SEVERITY_RANK[right] ?? 0;
  return leftRank >= rightRank ? left : right;
}

function summarizeNotifyFailuresFromLines(content) {
  const summary = {
    totalRuns: 0,
    runsWithNotifyFailures: 0,
    latestTimestamp: null,
    highestSeverity: "low",
    codes: {},
    severityByCode: {}
  };

  for (const rawLine of String(content || "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      continue;
    }

    summary.totalRuns += 1;
    if (record.timestamp) {
      summary.latestTimestamp = record.timestamp;
    }

    const codes = Array.isArray(record.notifyFailureCodes) ? record.notifyFailureCodes : [];
    if (codes.length === 0) {
      continue;
    }

    summary.runsWithNotifyFailures += 1;
    summary.highestSeverity = highestSeverity(summary.highestSeverity, record.notifyFailureSeverity || "low");

    for (const code of codes) {
      const safeCode = String(code || "").trim();
      if (!safeCode) continue;
      summary.codes[safeCode] = (summary.codes[safeCode] || 0) + 1;
      const severity = record.notifyFailureSeverityByCode?.[safeCode] || record.notifyFailureSeverity || "low";
      summary.severityByCode[safeCode] = highestSeverity(summary.severityByCode[safeCode] || "low", severity);
    }
  }

  return summary;
}

function formatNotifyFailureSummaryMarkdown(summary, options = {}) {
  const label = options.label || "Uptime monitor notification delivery";
  const lines = [
    `- ${label}: ${summary.runsWithNotifyFailures}/${summary.totalRuns} run(s) had notification delivery failures.`,
    `- Latest monitor timestamp: ${summary.latestTimestamp || "N/A"}.`,
    `- Highest notification-failure severity: ${summary.highestSeverity}.`
  ];

  const codes = Object.keys(summary.codes || {}).sort();
  if (codes.length === 0) {
    lines.push("- Failure codes: none observed.");
    return lines.join("\n");
  }

  lines.push("- Failure codes:");
  for (const code of codes) {
    lines.push(`  - ${code}: ${summary.codes[code]} run(s), severity ${summary.severityByCode?.[code] || "low"}`);
  }
  return lines.join("\n");
}

function readInput(inputPath) {
  if (inputPath) {
    return fs.readFileSync(inputPath, "utf8");
  }
  return fs.readFileSync(0, "utf8");
}

function main() {
  const inputPath = process.argv[2] || "";
  const summary = summarizeNotifyFailuresFromLines(readInput(inputPath));
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export {
  summarizeNotifyFailuresFromLines,
  formatNotifyFailureSummaryMarkdown
};
