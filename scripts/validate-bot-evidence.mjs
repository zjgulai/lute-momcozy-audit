import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const evidencePath = process.argv[2] || process.env.BOT_EVIDENCE_PATH || "src/_data/bot-evidence.json";
const schemaPath = "config/bot-evidence.schema.json";
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const validate = new Ajv2020({strict: false}).compile(schema);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function walkStrings(value, visitor, pointer = "$") {
  if (typeof value === "string") {
    visitor(value, pointer);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visitor, `${pointer}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      walkStrings(item, visitor, `${pointer}.${key}`);
    }
  }
}

function assertNoSensitiveStrings(data) {
  const forbidden = [
    [/\/Users\//i, "private filesystem path"],
    [/\/home\//i, "private filesystem path"],
    [/(?:\d{1,3}\.){3}\d{1,3}/, "server address or raw client IP"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/https?:\/\//i, "raw URL"],
    [/\b(cookie|localStorage|sessionStorage|email|user_id|customer_id)\b/i, "user-level identifier"]
  ];
  walkStrings(data, (text, pointer) => {
    for (const [pattern, label] of forbidden) {
      if (pattern.test(text)) fail(`${evidencePath} ${pointer}: forbidden ${label}`);
    }
  });
}

function sourceState(id) {
  return evidence.requiredSources.find((source) => source.id === id)?.state || "";
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`${label} contains duplicate ${item}`);
    seen.add(item);
  }
}

function assertMeasuredEvidence() {
  const requiredSourceIds = ["owner_analytics", "bot_log", "human_bot_dimension"];
  for (const id of requiredSourceIds) {
    if (sourceState(id) !== "ready") {
      fail(`measured bot evidence requires ${id} source state ready`);
    }
  }

  const segments = evidence.metrics?.segments || [];
  const segmentIds = segments.map((item) => item.segment);
  assertUnique(segmentIds, "metrics.segments");
  for (const segment of evidence.requiredSegments) {
    if (!segmentIds.includes(segment)) fail(`metrics.segments missing required segment ${segment}`);
  }

  const total = segments.reduce((sum, item) => sum + item.sessions, 0);
  if (total !== evidence.metrics.totalSessions) {
    fail(`metrics totalSessions mismatch: expected ${evidence.metrics.totalSessions}, got ${total}`);
  }
}

function assertMissingEvidence() {
  const readyCount = evidence.requiredSources.filter((source) => source.state === "ready").length;
  if (readyCount === evidence.requiredSources.length) {
    fail(`${evidence.status} bot evidence cannot mark every required source ready`);
  }
}

if (!validate(evidence)) {
  console.error(validate.errors);
  process.exit(1);
}

assertNoSensitiveStrings(evidence);
assertUnique(evidence.requiredSources.map((source) => source.id), "requiredSources");
assertUnique(evidence.requiredSegments, "requiredSegments");

if (evidence.status === "measured") {
  assertMeasuredEvidence();
} else {
  assertMissingEvidence();
}

console.log(`bot evidence ${evidence.status} contract passed for ${path.relative(process.cwd(), evidencePath)}`);
