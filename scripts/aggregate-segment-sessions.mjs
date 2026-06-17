import fs from "node:fs";

import {
  buildPublicPilotFromSegmentSessions,
  loadSegmentSessions
} from "./segment-session-aggregation-lib.mjs";

const defaultSessionsDir = "src/_data/segment-sessions";
const defaultReportPath = "src/_data/public-cross-audit.json";

const args = new Set(process.argv.slice(2));
const sessionsDir = valueFor("--sessions-dir") || defaultSessionsDir;
const reportPath = valueFor("--report") || defaultReportPath;
const sessions = loadSegmentSessions(sessionsDir);
const publicPilot = buildPublicPilotFromSegmentSessions(sessions);

if (args.has("--write") || args.has("--check")) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  if (!report.segmentSamplingPlan?.publicPilot) {
    throw new Error(`${reportPath}: missing segmentSamplingPlan.publicPilot`);
  }

  if (args.has("--check")) {
    const expected = JSON.stringify(publicPilot);
    const actual = JSON.stringify(report.segmentSamplingPlan.publicPilot);
    if (actual !== expected) {
      console.error("segment publicPilot is stale; run npm run segment:aggregate");
      process.exit(1);
    }
    console.log(`segment publicPilot matches ${sessions.length} session file(s)`);
  }

  if (args.has("--write")) {
    report.segmentSamplingPlan.publicPilot = publicPilot;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`updated ${reportPath} from ${sessions.length} segment session file(s)`);
  }
} else {
  console.log(JSON.stringify(publicPilot, null, 2));
}

function valueFor(name) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}
