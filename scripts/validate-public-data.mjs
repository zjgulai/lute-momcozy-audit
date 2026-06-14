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

function round2(value) {
  return Math.round(value * 100) / 100;
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

if (!latestSession.methodologyVersion?.includes("route-aggregate")) {
  fail(`latest session ${latestFile} is not a route aggregate session`);
}

const homepageDesktop = routeMetric(latestSession, "homepage", "desktop");
const homepageMobile = routeMetric(latestSession, "homepage", "mobile");
const productDesktop = routeMetric(latestSession, "product-detail", "desktop");
const productMobile = routeMetric(latestSession, "product-detail", "mobile");
if (!homepageDesktop || !homepageMobile || !productDesktop || !productMobile) {
  fail(`latest session ${latestFile} is missing homepage/product-detail desktop/mobile observations`);
}

const observedMetrics = allObservationMetrics(latestSession);
const lcpCoverage = round2(
  observedMetrics.filter((metrics) => typeof metrics.lcp === "number").length / observedMetrics.length * 100
);
const maxValue = (metric) => Math.max(...observedMetrics.map((metrics) => metrics[metric]).filter(Number.isFinite));
const lcpUnobserved = observedMetrics.filter((metrics) => metrics.lcp === null).length;
const productRuntimeErrors =
  productDesktop.consoleErrors + productDesktop.pageErrors +
  productMobile.consoleErrors + productMobile.pageErrors;
const desktopMissingAlt = homepageDesktop.missingAlt + productDesktop.missingAlt;

assertFinding("metrics", "LCP 可观测覆盖率", lcpCoverage);
assertFinding("metrics", "FCP（首页，桌面）", homepageDesktop.fcp);
assertFinding("metrics", "FCP（首页，移动）", homepageMobile.fcp);
assertFinding("metrics", "服务器响应（首页，桌面）", homepageDesktop.ttfb);
assertFinding("metrics", "服务器响应（商品详情，移动）", productMobile.ttfb);
assertFinding("metrics", "布局偏移（CLS）", maxValue("cls"));
assertFinding("metrics", "JavaScript 体积（首页）", homepageDesktop.jsKb);
assertFinding("metrics", "DOM 节点（首页）", homepageDesktop.domNodes);
assertFinding("metrics", "第三方失败（首页）", homepageDesktop.thirdPartyFailures);
assertFinding("metrics", "第三方失败（商品详情）", productDesktop.thirdPartyFailures);
assertFinding("metrics", "商品详情加载完成时间", round2(productDesktop.loadEventMs / 1000));
assertFinding("metrics", "商品详情图片格式覆盖率", productDesktop.imagesWebpPct);
assertFinding("metrics", "商品详情图片缺失 alt", productDesktop.missingAlt);

assertFinding("forensics", "第三方请求失败观测", maxValue("thirdPartyFailures"));
assertFinding("forensics", "长任务（long tasks）", maxValue("longTasks"));
assertFinding("forensics", "JavaScript 体积（最新）", maxValue("jsKb"));
assertFinding("forensics", "DOM 节点（最新）", maxValue("domNodes"));
assertFinding("forensics", "LCP 可观测风险", lcpUnobserved);
assertFinding("forensics", "审计覆盖路径", latestSession.routes.length);
assertFinding("forensics", "商品详情 DOM 规模", productDesktop.scriptTags);
assertFinding("forensics", "商品详情运行时错误", productRuntimeErrors);
assertFinding("forensics", "图片可访问性缺口", desktopMissingAlt);

const staleFindings = ["metrics", "forensics"]
  .flatMap((section) => data[section].map((item) => ({section, ...item})))
  .filter((item) => !item.source.includes(latestSession.sessionId));
if (staleFindings.length > 0) {
  fail(`findings must cite latest session ${latestSession.sessionId}: ${staleFindings.map((item) => item.label).join(", ")}`);
}

console.log(`public data matches the field allowlist and latest session ${latestSession.sessionId}`);
