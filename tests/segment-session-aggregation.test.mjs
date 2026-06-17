import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildPublicPilotFromSegmentSessions,
  loadSegmentSessions
} from "../scripts/segment-session-aggregation-lib.mjs";

const sessionsDir = "src/_data/segment-sessions";

test("buildPublicPilotFromSegmentSessions computes stable three-run public findings", () => {
  const sessions = loadSegmentSessions(sessionsDir)
    .filter((session) => /^segmented-public-r[1-3]$/.test(session.sessionLabel || ""));
  const pilot = buildPublicPilotFromSegmentSessions(sessions);

  assert.equal(pilot.sessionId, "segmented-public-r1-r3");
  assert.equal(pilot.observedAt, "2026-06-17");
  assert.equal(pilot.methodologyVersion, "collector-v3-segmented-public-2026-06");
  assert.equal(pilot.scope, "公开匿名 3-run archive；3 个 session、6 条 route、36 个 viewport observation。用于确认公开分段风险，不代表登录态、真实购物车或真实 checkout。");
  assert.deepEqual(pilot.decisionRead, [
    "PDP UTM 是当前最先治理的公开风险面：KOL M5 与 email S12 的第三方失败中位数分别为 90.5 / 89.5，约为首页 control 与 public checkout gate 的 2 倍。",
    "首页 paid-social UTM 与 organic/direct control 的第三方失败中位数几乎相同（45.5 vs 45.5），不能继续用“流量入口变了”解释所有问题。",
    "KOL M5 PDP 的 JS 中位数 2201.5KB、错误中位数 8.5；这是稳定脚本治理问题，不是一次性 FCP 尖峰。",
    "首页 control 在 r2 出现 TTFB/FCP 尖峰，但 paid-social 与 PDP 没有同步尖峰；这更像边缘/网络波动，不能替代脚本治理结论。",
    "空购物车与 public checkout gate 只能说明公开门槛和空状态；真实 checkout 仍必须等 owner storage state 后重采。"
  ]);

  const kol = pilot.rows.find((row) => row.routeId === "pdp-m5-kol-utm");
  assert.deepEqual(kol, {
    segment: "KOL / creator UTM PDP",
    routeId: "pdp-m5-kol-utm",
    maxFcp: "0.52s",
    maxTtfb: "279ms",
    maxJsKb: "2214KB",
    maxThirdPartyFailures: 93,
    maxRuntimeErrors: 9,
    interpretation: "三轮稳定最高风险：3P 失败中位数 90.5、JS 中位数 2201.5KB、错误中位数 8.5。优先做 KOL PDP 首屏减载和第三方按需加载。"
  });

  const paidSocial = pilot.rows.find((row) => row.routeId === "homepage-paid-social-utm");
  assert.equal(paidSocial.interpretation, "与 organic/direct control 基本同级：3P 失败中位数 45.5。首页投放 UTM 不是当前公开样本里的主要增量风险。");

  const serialized = JSON.stringify(pilot);
  assert.equal(serialized.includes("src/_data/segment-sessions"), false);
  assert.equal(serialized.includes("/data/"), false);
});

test("generated public pilot matches the report data block", () => {
  const sessions = loadSegmentSessions(sessionsDir);
  const pilot = buildPublicPilotFromSegmentSessions(sessions);
  const report = JSON.parse(fs.readFileSync(path.join("src", "_data", "public-cross-audit.json"), "utf8"));

  assert.deepEqual(report.segmentSamplingPlan.publicPilot, pilot);
});
