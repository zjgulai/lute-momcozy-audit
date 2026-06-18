import fs from "node:fs";
import path from "node:path";
import {latestSession, readJson} from "./history-site/fs.mjs";
import {deriveExternalSessionMetrics} from "./history-site/session-derived-metrics.mjs";

const primaryHtmlFiles = [
  "_site/index.html",
  "_site/metrics.html",
  "_site/forensics.html",
  "_site/trends.html",
  "_site/cross-audit.html"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function valuesMatch(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function formatValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function visibleTextFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLcpCoverage(match) {
  const [, observed, total] = match.match(/LCP\s+(\d+)\s*\/\s*(\d+)/);
  return `LCP ${observed}/${total}`;
}

function lcpCoverageOccurrences(file) {
  if (!fs.existsSync(file)) {
    fail(`${file} not found; run npm run build before report data consistency validation`);
  }
  const visibleText = visibleTextFromHtml(fs.readFileSync(file, "utf8"));
  return [...visibleText.matchAll(/LCP\s+\d+\s*\/\s*\d+/g)].map((match) => ({
    file,
    coverage: normalizeLcpCoverage(match[0])
  }));
}

const data = readJson("src/_data/public-cross-audit.json");
const latest = latestSession("src/_data/sessions", readJson);
const derived = deriveExternalSessionMetrics(latest);
const external = data.external || {};
const checks = Object.entries(derived)
  .filter(([field]) => Object.hasOwn(external, field))
  .map(([field, expected]) => [`external.${field}`, external[field], expected]);

const mismatches = checks.filter(([, actual, expected]) => !valuesMatch(actual, expected));
if (mismatches.length) {
  for (const [label, actual, expected] of mismatches) {
    console.error(`${label} mismatch: expected ${formatValue(expected)}, got ${formatValue(actual)}`);
  }
  fail(`public-cross-audit external fields must match latest session ${latest.sessionId}`);
}

const expectedCoverage = `LCP ${derived.lcpObservedSamples}/${derived.lcpTotalSamples}`;
const htmlOccurrences = primaryHtmlFiles.flatMap(lcpCoverageOccurrences);
if (!htmlOccurrences.length) {
  fail(`generated primary HTML must include ${expectedCoverage}`);
}

const staleOccurrences = htmlOccurrences.filter((item) => item.coverage !== expectedCoverage);
if (staleOccurrences.length) {
  for (const item of staleOccurrences) {
    const relativeFile = path.relative(process.cwd(), item.file);
    console.error(
      `${relativeFile} visible LCP coverage mismatch: expected ${expectedCoverage}, got ${item.coverage}`
    );
  }
  fail(`generated primary HTML LCP coverage must match latest session ${latest.sessionId}`);
}

if (!htmlOccurrences.some((item) => item.coverage === expectedCoverage)) {
  fail(`generated primary HTML must include ${expectedCoverage}`);
}

console.log(`public-cross-audit external fields and generated HTML match latest session ${latest.sessionId}`);
