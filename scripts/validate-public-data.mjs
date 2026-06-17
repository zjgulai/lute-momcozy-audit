import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const schema = JSON.parse(fs.readFileSync("config/public-data.schema.json", "utf8"));
const data = JSON.parse(fs.readFileSync("src/_data/audit.json", "utf8"));
const validate = new Ajv2020({strict: false}).compile(schema);
if (!validate(data)) {
  console.error(validate.errors);
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readSessions() {
  const dir = "src/_data/sessions";
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      file,
      session: JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
    }))
    .sort((a, b) => a.session.observedAt.localeCompare(b.session.observedAt));
}

function routeMetric(session, routeId, viewport) {
  const observation = (session.observations || []).find((item) =>
    item.routeId === routeId && item.viewport === viewport
  );
  return observation?.metrics || null;
}

function allObservationMetrics(session) {
  return (session.observations || []).map((item) => item.metrics).filter(Boolean);
}

function findingByLabel(section, label) {
  const finding = data[section].find((item) => item.label === label);
  if (!finding) fail(`missing ${section} finding: ${label}`);
  return finding;
}

function assertClose(actual, expected, label) {
  const tolerance = 0.005;
  if (Math.abs(Number(actual) - Number(expected)) > tolerance) {
    fail(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function assertFinding(section, label, expected) {
  const finding = findingByLabel(section, label);
  assertClose(finding.value, expected, `${section}.${label}`);
}

function assertAnyFinding(section, labels, expected) {
  const label = labels.find((item) => data[section].some((finding) => finding.label === item));
  if (!label) fail(`missing ${section} finding: ${labels.join(" or ")}`);
  assertFinding(section, label, expected);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function pickPdpWorst(session, metric) {
  const candidates = (session.observations || [])
    .filter((item) => item.routeId?.startsWith("pdp-") && Number.isFinite(item.metrics?.[metric]));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, item) => item.metrics[metric] > best.metrics[metric] ? item : best);
}

const sessions = readSessions();
if (sessions.length === 0) fail("no session files found");

const {file: latestFile, session: latestSession} = sessions[sessions.length - 1];
if (data.meta.sessionId !== latestSession.sessionId) {
  fail(`audit.json meta.sessionId must match latest session ${latestSession.sessionId}, got ${data.meta.sessionId}`);
}

const [latestYear, latestMonth, latestDay] = latestSession.observedAt.split("-").map(Number);
const latestDisplayDate = `${latestYear} 年 ${latestMonth} 月 ${latestDay} 日`;
if (data.meta.latestObservedAt !== latestDisplayDate || data.meta.observedAt !== latestDisplayDate) {
  fail(`audit.json observedAt/latestObservedAt must both be ${latestDisplayDate}`);
}

if (!latestSession.methodologyVersion?.startsWith("collector-v3-") || !Array.isArray(latestSession.routes)) {
  fail(`latest session ${latestFile} is not a route aggregate session`);
}

const homepageDesktop = routeMetric(latestSession, "homepage", "desktop");
const homepageMobile = routeMetric(latestSession, "homepage", "mobile");
let productDesktop = routeMetric(latestSession, "product-detail", "desktop");
let productMobile = routeMetric(latestSession, "product-detail", "mobile");
if (!productDesktop || !productMobile) {
  const worstPdp = pickPdpWorst(latestSession, "thirdPartyFailures");
  if (worstPdp) {
    productDesktop = routeMetric(latestSession, worstPdp.routeId, "desktop");
    productMobile = routeMetric(latestSession, worstPdp.routeId, "mobile");
  }
}
if (!homepageDesktop || !homepageMobile || !productDesktop || !productMobile) {
  fail(`latest session ${latestFile} is missing homepage and PDP desktop/mobile observations`);
}

const observedMetrics = allObservationMetrics(latestSession);
const lcpCoverage = round2(
  observedMetrics.filter((metrics) => typeof metrics.lcp === "number").length / observedMetrics.length * 100
);
const maxValue = (metric) => Math.max(...observedMetrics.map((metrics) => metrics[metric]).filter(Number.isFinite));
const maxHomepageValue = (metric) => Math.max(...[homepageDesktop, homepageMobile].map((metrics) => metrics[metric]).filter(Number.isFinite));
const maxPdpValue = (metric) => pickPdpWorst(latestSession, metric)?.metrics?.[metric];
const maxPdpErrors = Math.max(...(latestSession.observations || [])
  .filter((item) => item.routeId?.startsWith("pdp-"))
  .map((item) => item.metrics.consoleErrors + item.metrics.pageErrors)
  .filter(Number.isFinite));
const lcpUnobserved = observedMetrics.filter((metrics) => metrics.lcp === null).length;
const productRuntimeErrors =
  productDesktop.consoleErrors + productDesktop.pageErrors +
  productMobile.consoleErrors + productMobile.pageErrors;

assertFinding("metrics", "LCP 可观测覆盖率", lcpCoverage);
assertFinding("metrics", "FCP（首页，桌面）", homepageDesktop.fcp);
assertFinding("metrics", "FCP（首页，移动）", homepageMobile.fcp);
assertFinding("metrics", "服务器响应（首页，桌面）", homepageDesktop.ttfb);
assertAnyFinding("metrics", ["服务器响应（商品详情，移动）", "服务器响应（PDP watchlist 最差）"], maxPdpValue("ttfb") ?? productMobile.ttfb);
assertFinding("metrics", "布局偏移（CLS）", maxValue("cls"));
assertFinding("metrics", "JavaScript 体积（首页）", homepageDesktop.jsKb);
assertFinding("metrics", "DOM 节点（首页）", maxHomepageValue("domNodes"));
assertFinding("metrics", "第三方失败（首页）", homepageDesktop.thirdPartyFailures);
assertAnyFinding("metrics", ["第三方失败（商品详情）", "第三方失败（PDP watchlist）"], maxPdpValue("thirdPartyFailures") ?? productDesktop.thirdPartyFailures);
assertAnyFinding("metrics", ["商品详情加载完成时间", "PDP watchlist 加载完成时间"], round2((maxPdpValue("loadEventMs") ?? productDesktop.loadEventMs) / 1000));
assertAnyFinding("metrics", ["商品详情图片格式覆盖率", "PDP watchlist 图片格式覆盖率"], maxPdpValue("imagesWebpPct") ?? productDesktop.imagesWebpPct);
assertAnyFinding("metrics", ["商品详情图片缺失 alt", "PDP watchlist 图片缺失 alt"], maxPdpValue("missingAlt") ?? productDesktop.missingAlt);

assertFinding("forensics", "第三方请求失败观测", maxValue("thirdPartyFailures"));
assertFinding("forensics", "长任务（long tasks）", maxValue("longTasks"));
assertFinding("forensics", "JavaScript 体积（最新）", maxValue("jsKb"));
assertFinding("forensics", "DOM 节点（最新）", maxValue("domNodes"));
assertFinding("forensics", "LCP 可观测风险", lcpUnobserved);
assertFinding("forensics", "诊断覆盖路径", latestSession.routes.length);
assertAnyFinding("forensics", ["商品详情 DOM 规模", "PDP watchlist DOM 规模"], maxPdpValue("scriptTags") ?? productDesktop.scriptTags);
assertAnyFinding("forensics", ["商品详情运行时错误", "PDP watchlist 运行时错误"], Number.isFinite(maxPdpErrors) ? maxPdpErrors : productRuntimeErrors);
assertFinding("forensics", "图片可访问性缺口", maxValue("missingAlt"));

const staleFindings = ["metrics", "forensics"]
  .flatMap((section) => data[section].map((item) => ({section, ...item})))
  .filter((item) => !item.source.includes(latestSession.sessionId));
if (staleFindings.length > 0) {
  fail(`findings must cite latest session ${latestSession.sessionId}: ${staleFindings.map((item) => item.label).join(", ")}`);
}

console.log(`public data matches the field allowlist and latest session ${latestSession.sessionId}`);
