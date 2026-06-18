import fs from "node:fs";
import path from "node:path";
import {deriveExternalSessionMetrics} from "./history-site/session-derived-metrics.mjs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function latestSessionFile(dir) {
  const sessions = fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({file, session: readJson(path.join(dir, file))}))
    .sort((a, b) => a.session.observedAt.localeCompare(b.session.observedAt));
  if (!sessions.length) fail(`no session files found in ${dir}`);
  return sessions[sessions.length - 1];
}

const data = readJson("src/_data/public-cross-audit.json");
const latest = latestSessionFile("src/_data/sessions");
const derived = deriveExternalSessionMetrics(latest.session);
const checks = [
  ["external.latestSession", data.external.latestSession, derived.latestSession],
  ["external.routeCount", data.external.routeCount, derived.routeCount],
  ["external.lcpObservedSamples", data.external.lcpObservedSamples, derived.lcpObservedSamples],
  ["external.lcpTotalSamples", data.external.lcpTotalSamples, derived.lcpTotalSamples],
];

const mismatches = checks.filter(([, actual, expected]) => actual !== expected);
if (mismatches.length) {
  for (const [label, actual, expected] of mismatches) {
    console.error(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
  fail(`public-cross-audit external fields must match latest session ${latest.session.sessionId}`);
}

const reportText = JSON.stringify(data);
const expectedCoverage = `LCP ${derived.lcpObservedSamples}/${derived.lcpTotalSamples}`;
if (!reportText.includes(expectedCoverage)) {
  fail(`visible evidence text must include ${expectedCoverage}`);
}

console.log(`public-cross-audit external fields match latest session ${latest.session.sessionId}`);
