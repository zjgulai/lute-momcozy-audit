import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const validator = "scripts/validate-bot-evidence.mjs";

function runValidator(file) {
  return spawnSync("node", [validator, file], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
}

function writeFixture(data) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-evidence-"));
  const file = path.join(dir, "bot-evidence.json");
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function baseEvidence() {
  return {
    schemaVersion: "bot-evidence-v1",
    status: "measured",
    domain: "www.momcozy.com",
    updatedAt: "2026-06-18",
    summary: "脱敏聚合 bot evidence fixture",
    evidenceWindow: {
      current: "2026-06-01 to 2026-06-17",
      baseline: "historical M1 v2.0",
      grain: "session"
    },
    requiredSources: [
      {
        id: "owner_analytics",
        label: "Owner analytics human/bot 分段聚合",
        state: "ready",
        requiredFields: ["date", "channel", "sessions", "conversion_rate", "bounce_rate", "avg_stay_sec"]
      },
      {
        id: "bot_log",
        label: "Bot / crawler 日志聚合",
        state: "ready",
        requiredFields: ["date", "bot_family", "requests", "sessions", "route_group"]
      },
      {
        id: "human_bot_dimension",
        label: "Human / bot 统一维度映射",
        state: "ready",
        requiredFields: ["segment", "classification_rule", "confidence", "exclusion_policy"]
      }
    ],
    requiredSegments: ["human", "bot", "crawler", "unknown"],
    diagnosticQuestions: [
      "机器人占比或爬虫占比是否污染渠道归因。",
      "human 与 bot/crawler 分段是否解释转化率差异。",
      "bot/crawler 是否集中在关键路径。"
    ],
    acceptanceGates: [
      "脱敏聚合。",
      "sessions 合计等于 totalSessions。",
      "同一时间窗。",
      "三类证据齐备。"
    ],
    metrics: {
      totalSessions: 1000,
      segments: [
        {segment: "human", sessions: 760, conversionRate: 0.022, bounceRate: 0.42, avgStaySec: 72.1},
        {segment: "bot", sessions: 110, conversionRate: 0, bounceRate: 0.91, avgStaySec: 2.7},
        {segment: "crawler", sessions: 80, conversionRate: 0, bounceRate: 0.88, avgStaySec: 3.4},
        {segment: "unknown", sessions: 50, conversionRate: 0.006, bounceRate: 0.69, avgStaySec: 18.2}
      ]
    }
  };
}

test("default bot evidence marks bot share as missing", () => {
  const output = execFileSync("node", [validator], {encoding: "utf8"});
  assert.match(output, /bot evidence missing contract passed/);
});

test("measured bot evidence accepts aggregate human bot segments", () => {
  const result = runValidator(writeFixture(baseEvidence()));
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /bot evidence measured contract passed/);
});

test("measured bot evidence rejects mismatched segment totals", () => {
  const data = baseEvidence();
  data.metrics.segments[0].sessions = 700;
  const result = runValidator(writeFixture(data));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /totalSessions mismatch/);
});

test("measured bot evidence requires all three source lanes to be ready", () => {
  const data = baseEvidence();
  data.requiredSources[1].state = "missing";
  const result = runValidator(writeFixture(data));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /bot_log source state ready/);
});

test("bot evidence rejects raw URLs and user-level identifiers", () => {
  const data = baseEvidence();
  data.summary = "Source export https://analytics.example.invalid with cookie column";
  const result = runValidator(writeFixture(data));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /forbidden raw URL/);
});
