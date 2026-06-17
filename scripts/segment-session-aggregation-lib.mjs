import fs from "node:fs";
import path from "node:path";

const ROUTE_ORDER = [
  "pdp-m5-kol-utm",
  "pdp-s12-email-utm",
  "homepage-organic-control",
  "homepage-paid-social-utm",
  "checkout-anonymous-gate",
  "cart-empty-anonymous"
];

const SEGMENT_LABELS = {
  "pdp-m5-kol-utm": "KOL / creator UTM PDP",
  "pdp-s12-email-utm": "email UTM PDP",
  "homepage-organic-control": "organic/direct anonymous",
  "homepage-paid-social-utm": "paid social UTM",
  "checkout-anonymous-gate": "checkout anonymous gate",
  "cart-empty-anonymous": "empty cart anonymous"
};

export function loadSegmentSessions(sessionsDir) {
  if (!fs.existsSync(sessionsDir)) return [];

  return fs.readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(sessionsDir, file), "utf8")));
}

export function buildPublicPilotFromSegmentSessions(sessions) {
  const publicSessions = sessions
    .filter((session) => String(session.methodologyVersion || "").includes("segmented-public"))
    .sort(compareSessions);

  if (publicSessions.length === 0) {
    throw new Error("at least one segmented-public session is required");
  }

  const observations = publicSessions.flatMap((session) => (session.observations || [])
    .map((observation) => ({...observation, sessionLabel: session.sessionLabel})));
  const routeSummaries = new Map();
  for (const routeId of ROUTE_ORDER) {
    const routeObservations = observations.filter((observation) => observation.routeId === routeId);
    if (routeObservations.length === 0) continue;
    routeSummaries.set(routeId, summarizeRoute(routeId, routeObservations));
  }

  const requiredRoutes = ROUTE_ORDER.filter((routeId) => !routeSummaries.has(routeId));
  if (requiredRoutes.length > 0) {
    throw new Error(`missing required segmented route(s): ${requiredRoutes.join(", ")}`);
  }

  const sessionId = buildSessionId(publicSessions);
  const observedAt = publicSessions.map((session) => session.observedAt).filter(Boolean).sort().at(-1);
  const methodologyVersion = singleValue(publicSessions.map((session) => session.methodologyVersion));
  const routeCount = new Set(observations.map((observation) => observation.routeId)).size;
  const viewportObservationCount = observations.length;
  const kol = routeSummaries.get("pdp-m5-kol-utm");
  const email = routeSummaries.get("pdp-s12-email-utm");
  const homepage = routeSummaries.get("homepage-organic-control");
  const paid = routeSummaries.get("homepage-paid-social-utm");
  const checkout = routeSummaries.get("checkout-anonymous-gate");
  const runLabel = runLabelFromSessionLabel(homepage.maxTtfbSessionLabel || homepage.maxFcpSessionLabel);
  const runCountLabel = publicSessions.length === 3 ? "三轮" : `${publicSessions.length} 轮`;

  return {
    sessionId,
    observedAt,
    methodologyVersion,
    confidence: "low",
    scope: `公开匿名 ${publicSessions.length}-run archive；${publicSessions.length} 个 session、${routeCount} 条 route、${viewportObservationCount} 个 viewport observation。用于确认公开分段风险，不代表登录态、真实购物车或真实 checkout。`,
    decisionRead: [
      `PDP UTM 是当前最先治理的公开风险面：KOL M5 与 email S12 的第三方失败中位数分别为 ${formatNumber(kol.medianThirdPartyFailures)} / ${formatNumber(email.medianThirdPartyFailures)}，约为首页 control 与 public checkout gate 的 2 倍。`,
      `首页 paid-social UTM 与 organic/direct control 的第三方失败中位数几乎相同（${formatNumber(paid.medianThirdPartyFailures)} vs ${formatNumber(homepage.medianThirdPartyFailures)}），不能继续用“流量入口变了”解释所有问题。`,
      `KOL M5 PDP 的 JS 中位数 ${formatNumber(kol.medianJsKb)}KB、错误中位数 ${formatNumber(kol.medianRuntimeErrors)}；这是稳定脚本治理问题，不是一次性 FCP 尖峰。`,
      `首页 control 在 ${runLabel} 出现 TTFB/FCP 尖峰，但 paid-social 与 PDP 没有同步尖峰；这更像边缘/网络波动，不能替代脚本治理结论。`,
      "空购物车与 public checkout gate 只能说明公开门槛和空状态；真实 checkout 仍必须等 owner storage state 后重采。"
    ],
    rows: ROUTE_ORDER.map((routeId) => rowFromSummary(routeSummaries.get(routeId), {homepage, paid, checkout, runLabel, runCountLabel}))
  };
}

function compareSessions(a, b) {
  return String(a.sessionLabel || a.sessionId || "").localeCompare(String(b.sessionLabel || b.sessionId || ""), undefined, {numeric: true});
}

function buildSessionId(sessions) {
  const labels = sessions.map((session) => String(session.sessionLabel || "").trim()).filter(Boolean);
  const parsed = labels.map((label) => label.match(/^(.*)-r(\d+)$/));
  if (parsed.every(Boolean)) {
    const base = parsed[0][1];
    const runs = parsed.map((match) => Number(match[2])).sort((a, b) => a - b);
    if (parsed.every((match) => match[1] === base)) {
      return `${base}-r${runs[0]}-r${runs.at(-1)}`;
    }
  }
  return labels.join("+");
}

function singleValue(values) {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length !== 1) {
    throw new Error(`expected exactly one methodologyVersion, received ${unique.join(", ") || "(none)"}`);
  }
  return unique[0];
}

function summarizeRoute(routeId, observations) {
  const metrics = observations.map((observation) => observation.metrics || {});
  const maxTtfbObservation = maxObservation(observations, (observation) => observation.metrics?.ttfb);
  const maxFcpObservation = maxObservation(observations, (observation) => observation.metrics?.fcp);
  return {
    segment: SEGMENT_LABELS[routeId] || observations[0]?.routeLabel || routeId,
    routeId,
    maxFcp: max(metrics.map((item) => item.fcp)),
    maxTtfb: max(metrics.map((item) => item.ttfb)),
    maxJsKb: max(metrics.map((item) => item.jsKb)),
    maxThirdPartyFailures: max(metrics.map((item) => item.thirdPartyFailures)),
    maxRuntimeErrors: max(metrics.map(runtimeErrors)),
    medianThirdPartyFailures: median(metrics.map((item) => item.thirdPartyFailures)),
    medianJsKb: median(metrics.map((item) => item.jsKb)),
    medianRuntimeErrors: median(metrics.map(runtimeErrors)),
    maxTtfbSessionLabel: maxTtfbObservation?.sessionLabel,
    maxFcpSessionLabel: maxFcpObservation?.sessionLabel
  };
}

function rowFromSummary(summary, context) {
  return {
    segment: summary.segment,
    routeId: summary.routeId,
    maxFcp: `${formatSeconds(summary.maxFcp)}s`,
    maxTtfb: `${formatNumber(summary.maxTtfb)}ms`,
    maxJsKb: `${formatNumber(summary.maxJsKb)}KB`,
    maxThirdPartyFailures: summary.maxThirdPartyFailures,
    maxRuntimeErrors: summary.maxRuntimeErrors,
    interpretation: interpretationFor(summary, context)
  };
}

function interpretationFor(summary, {homepage, paid, checkout, runLabel, runCountLabel}) {
  switch (summary.routeId) {
    case "pdp-m5-kol-utm":
      return `${runCountLabel}稳定最高风险：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}、JS 中位数 ${formatNumber(summary.medianJsKb)}KB、错误中位数 ${formatNumber(summary.medianRuntimeErrors)}。优先做 KOL PDP 首屏减载和第三方按需加载。`;
    case "pdp-s12-email-utm":
      return `PDP 层共性问题：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}，接近 KOL PDP；JS 低于 M5，说明商品页资源差异与 PDP 归因链路同时存在。`;
    case "homepage-organic-control":
      return `首页控制组有一次 ${runLabel} TTFB/FCP 尖峰，但 3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}；这是基础预算约束，不是 PDP UTM 高风险的主因。`;
    case "homepage-paid-social-utm":
      return `与 organic/direct control 基本同级：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}。首页投放 UTM 不是当前公开样本里的主要增量风险。`;
    case "checkout-anonymous-gate":
      return `public gate 稳定为首页量级：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}；它只能证明公开门槛，不证明真实 checkout 完成链路。`;
    case "cart-empty-anonymous":
      return `最稳定的低风险对照：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}、错误中位数 ${formatNumber(summary.medianRuntimeErrors)}；继续作为 owner-state cart/checkout 的公开对照组。`;
    default:
      return `公开分段样本：3P 失败中位数 ${formatNumber(summary.medianThirdPartyFailures)}，需与 control ${formatNumber(homepage?.medianThirdPartyFailures)}、paid ${formatNumber(paid?.medianThirdPartyFailures)}、checkout gate ${formatNumber(checkout?.medianThirdPartyFailures)} 做交叉判断。`;
  }
}

function maxObservation(observations, valueFor) {
  return observations.reduce((winner, observation) => {
    const value = valueFor(observation);
    if (!Number.isFinite(value)) return winner;
    if (!winner || value > winner.value) return {value, sessionLabel: observation.sessionLabel};
    return winner;
  }, null);
}

function runLabelFromSessionLabel(sessionLabel) {
  const match = String(sessionLabel || "").match(/-r(\d+)$/);
  return match ? `r${match[1]}` : "该轮";
}

function runtimeErrors(metrics) {
  return toNumber(metrics.consoleErrors) + toNumber(metrics.pageErrors);
}

function max(values) {
  const numbers = values.map(toNullableNumber).filter((value) => value !== null);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

function median(values) {
  const numbers = values.map(toNullableNumber).filter((value) => value !== null).sort((a, b) => a - b);
  if (numbers.length === 0) return null;
  const mid = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 1 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
}

function toNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "N/A";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatSeconds(value) {
  if (value === null || value === undefined) return "N/A";
  return value.toFixed(2);
}
