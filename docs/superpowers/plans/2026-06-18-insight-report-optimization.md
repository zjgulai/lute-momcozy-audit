# Insight Report Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the generated Momcozy private business site from an audit evidence repository into a pyramid-style insight report whose claims, data, charts, layout, and docs are all machine-verifiable.

**Architecture:** Keep the current active build path: `scripts/build-history-site.mjs` reads `src/_data/public-cross-audit.json` and the latest file in `src/_data/sessions/`, then renders five static pages through `scripts/history-site/*`. Add a small data-derivation layer, report contracts, static chart components, and validators before rewriting visible narrative copy. Preserve existing release identity, route, safety, production layout, and Tencent deployment gates.

**Tech Stack:** Node.js ESM, Playwright, static HTML/CSS/SVG, JSON data files, existing npm scripts, existing Tencent/GitHub release workflow.

---

## Baseline From The Deep Audit

- Current generated pages: `/`, `/metrics.html`, `/forensics.html`, `/trends.html`, `/cross-audit.html`.
- Active generator: `scripts/build-history-site.mjs`, `scripts/history-site/pages.mjs`, `scripts/history-site/sections.mjs`, `scripts/history-site/layout.mjs`, `scripts/history-site/format.mjs`.
- Active asset source: `history_static/assets/` copied into `_site/assets/`.
- Inactive tracked assets: `src/assets/site.css`, `src/assets/trends-charts.js`.
- Current layout safety: `npm run audit:production-layout` passes, including oversized section heading regression.
- Main content gap: page stories are still audit-shaped, chart DOM is absent, and evidence counts drift from latest session data.
- Critical data conflict: `src/_data/public-cross-audit.json` says `external.lcpObservedSamples = 26` and `external.lcpTotalSamples = 26`, while `src/_data/sessions/2026-06-17.json` has 26 observations and all `metrics.lcp = null`.

## File Structure

Create:
- `scripts/history-site/session-derived-metrics.mjs`: derives report-safe external counts from the latest session.
- `scripts/history-site/charts.mjs`: server-rendered SVG/HTML charts used by active static pages.
- `config/insight-report-contract.json`: per-page story, chart, forbidden-language, and module-density contract.
- `scripts/validate-report-data-consistency.mjs`: fails when `public-cross-audit.json` and latest session disagree.
- `scripts/validate-insight-report-contract.mjs`: validates generated pages against story, chart, language, and layout-density rules.
- `docs/insight-report-contract.md`: human-readable contract for future report changes.

Modify:
- `scripts/build-history-site.mjs`: merge session-derived external data before rendering.
- `scripts/history-site/pages.mjs`: change visible report identity from `诊断报告` to `洞察报告` where appropriate.
- `scripts/history-site/layout.mjs`: add chart/drilldown styles and navigation copy adjustments.
- `scripts/history-site/format.mjs`: stop globally hiding `session-2026-06-17`; preserve visible evidence labels.
- `scripts/history-site/sections.mjs`: rewrite page bodies, reduce repeated modules, add chart components, remove unused audit sections after replacement coverage exists.
- `src/_data/public-cross-audit.json`: correct stale externally-derived counts and rewrite audit-shaped visible data fields.
- `tests/e2e.spec.mjs`: add browser checks for insight contract, chart presence, and forbidden audit wording.
- `scripts/audit-production-layout.mjs`: add high-density and chart-visibility checks where useful for production proof.
- `package.json`: add new test scripts and wire them into `npm test`.
- `AGENTS.md`: update active asset/source-of-truth documentation after code changes.
- `docs/private-data-provenance.md`, `docs/release-contract.md`, `docs/optimization-todo.md`: update current plan status and release acceptance language.

Deletion candidates after passing replacement tests:
- `src/assets/trends-charts.js`
- `src/assets/site.css`
- unused exports in `scripts/history-site/sections.mjs`: `pageAuditSection`, `diagnosticBridgeSection`, `storylineSection`, `thirdPartyGovernanceSection`, `segmentSamplingSection`, `featureComparisonSection`, `competitorRecollectPlanSection`, `playbookSection`, `roadmapSection`

Deletion risk and rollback:
- Risk: deleting inactive assets or unused section exports may remove code that a future doc still references.
- Pre-check: `rg -n "trends-charts|site.css|pageAuditSection|diagnosticBridgeSection|storylineSection|thirdPartyGovernanceSection|segmentSamplingSection|featureComparisonSection|competitorRecollectPlanSection|playbookSection|roadmapSection" .`
- Rollback: restore deleted assets with `git restore --source=HEAD~1 -- src/assets/trends-charts.js src/assets/site.css` and restore removed section functions with `git restore --source=HEAD~1 -- scripts/history-site/sections.mjs` before merge, or revert the cleanup commit if already committed.

---

## Phase 0: Prepare The Working Branch And Baseline

**Files:**
- Read: `.codex/session-thread.md`
- Read: `artifacts/deep-insight-audit-2026-06-18/summary.md`
- Read: `artifacts/deep-insight-audit-2026-06-18/page-audit.json`
- Read: `git status --short --branch`

- [ ] **Step 1: Create an implementation branch**

Run:

```bash
git status --short --branch
git switch -c codex/insight-report-optimization
```

Expected:

```text
## main...origin/main
Switched to a new branch 'codex/insight-report-optimization'
```

- [ ] **Step 2: Confirm the current audit artifacts exist**

Run:

```bash
test -f artifacts/deep-insight-audit-2026-06-18/summary.md
test -f artifacts/deep-insight-audit-2026-06-18/page-audit.json
```

Expected: both commands exit with status `0`.

- [ ] **Step 3: Record the current failing data fact**

Run:

```bash
node --input-type=module - <<'NODE'
import fs from "node:fs";
const data = JSON.parse(fs.readFileSync("src/_data/public-cross-audit.json", "utf8"));
const session = JSON.parse(fs.readFileSync("src/_data/sessions/2026-06-17.json", "utf8"));
const observations = session.observations || [];
const observed = observations.filter((item) => Number.isFinite(item.metrics?.lcp)).length;
console.log({
  publicCrossAudit: `${data.external.lcpObservedSamples}/${data.external.lcpTotalSamples}`,
  latestSession: `${observed}/${observations.length}`
});
NODE
```

Expected before Phase 1:

```text
{ publicCrossAudit: '26/26', latestSession: '0/26' }
```

---

## Phase 1: Evidence Integrity Gate

**Files:**
- Create: `scripts/history-site/session-derived-metrics.mjs`
- Create: `scripts/validate-report-data-consistency.mjs`
- Modify: `scripts/build-history-site.mjs`
- Modify: `src/_data/public-cross-audit.json`
- Modify: `package.json`

- [ ] **Step 1: Write the failing data consistency validator**

Create `scripts/validate-report-data-consistency.mjs`:

```js
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
```

- [ ] **Step 2: Run it and verify it fails**

Run:

```bash
node scripts/validate-report-data-consistency.mjs
```

Expected:

```text
external.lcpObservedSamples mismatch: expected 0, got 26
public-cross-audit external fields must match latest session session-2026-06-17
```

- [ ] **Step 3: Add the session-derived metrics helper**

Create `scripts/history-site/session-derived-metrics.mjs`:

```js
function observationsOf(session) {
  return Array.isArray(session?.observations) ? session.observations : [];
}

function routeMetric(session, routeId, viewport) {
  return observationsOf(session).find((item) =>
    item.routeId === routeId && item.viewport === viewport
  )?.metrics || null;
}

function maxMetric(session, metric) {
  const values = observationsOf(session)
    .map((item) => item.metrics?.[metric])
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function routeIds(session) {
  return [...new Set(observationsOf(session).map((item) => item.routeId).filter(Boolean))];
}

export function deriveExternalSessionMetrics(session) {
  const observations = observationsOf(session);
  const homepageDesktop = routeMetric(session, "homepage", "desktop");
  const homepageMobile = routeMetric(session, "homepage", "mobile");
  const lcpObservedSamples = observations.filter((item) => Number.isFinite(item.metrics?.lcp)).length;
  const routes = Array.isArray(session?.routes) && session.routes.length ? session.routes : routeIds(session);
  return {
    latestSession: session?.sessionId || "",
    routeCount: routes.length,
    routes,
    homepageTtfbDesktopMs: homepageDesktop?.ttfb ?? null,
    homepageTtfbMobileMs: homepageMobile?.ttfb ?? null,
    homepageFcpDesktopSec: homepageDesktop?.fcp ?? null,
    homepageFcpMobileSec: homepageMobile?.fcp ?? null,
    homepageJsKb: homepageDesktop?.jsKb ?? null,
    maxDomNodes: maxMetric(session, "domNodes"),
    maxThirdPartyFailures: maxMetric(session, "thirdPartyFailures"),
    lcpObservedSamples,
    lcpTotalSamples: observations.length
  };
}

export function mergeSessionDerivedExternal(data, session) {
  const derived = deriveExternalSessionMetrics(session);
  return {
    ...data,
    external: {
      ...data.external,
      ...derived
    }
  };
}
```

- [ ] **Step 4: Merge derived metrics during build**

Modify `scripts/build-history-site.mjs`:

```js
import {mergeSessionDerivedExternal} from "./history-site/session-derived-metrics.mjs";
```

Replace:

```js
const publicCrossAudit = readJson(publicCrossAuditPath);
if (fs.existsSync(competitorsDir)) {
  publicCrossAudit.competitorSnapshot = latestSession(competitorsDir, readJson);
}

writeHistoryPages({outputDir, data: publicCrossAudit, session});
```

With:

```js
const rawPublicCrossAudit = readJson(publicCrossAuditPath);
const publicCrossAudit = mergeSessionDerivedExternal(rawPublicCrossAudit, session);
if (fs.existsSync(competitorsDir)) {
  publicCrossAudit.competitorSnapshot = latestSession(competitorsDir, readJson);
}

writeHistoryPages({outputDir, data: publicCrossAudit, session});
```

- [ ] **Step 5: Correct the stored public-cross-audit count**

Modify `src/_data/public-cross-audit.json`:

```json
"lcpObservedSamples": 0,
"lcpTotalSamples": 26
```

Keep the existing visible evidence strings that say `LCP 0/26 样本可观测`.

- [ ] **Step 6: Wire the validator into npm scripts**

Modify `package.json`:

```json
"test:report-data-consistency": "node scripts/validate-report-data-consistency.mjs"
```

Insert `npm run test:report-data-consistency` after `npm run test:sessions` in the main `test` script.

- [ ] **Step 7: Verify Phase 1**

Run:

```bash
npm run build
npm run test:report-data-consistency
npm run test:allowlist
npm run test:sessions
```

Expected:

```text
built history-primary site with latest trend session session-2026-06-17
public-cross-audit external fields match latest session session-2026-06-17
public data matches the field allowlist and latest session session-2026-06-17
session data valid
```

- [ ] **Step 8: Commit Phase 1**

Run:

```bash
git add scripts/history-site/session-derived-metrics.mjs scripts/validate-report-data-consistency.mjs scripts/build-history-site.mjs src/_data/public-cross-audit.json package.json
git commit -m "fix: derive report evidence counts from latest session"
```

---

## Phase 2: Evidence Version Labels

**Files:**
- Modify: `scripts/history-site/format.mjs`
- Modify: `scripts/history-site/sections.mjs`
- Modify: `tests/e2e.spec.mjs`

- [ ] **Step 1: Add a failing E2E check for evidence version visibility**

Append to `tests/e2e.spec.mjs`:

```js
test("key report pages show readable evidence labels without hiding the source session", async ({page}) => {
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const text = await page.locator("body").innerText();
    expect(text).toContain("最新外部采集");
    expect(text).toContain(publicCrossAudit.external.latestSession);
  }
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm run build
npx playwright test tests/e2e.spec.mjs -g "evidence labels"
```

Expected before the copy fix: fail because global replacements hide `session-2026-06-17`.

- [ ] **Step 3: Remove session-ID hiding from global escaping**

Modify `scripts/history-site/format.mjs` by replacing the first five replacement rules:

```js
const visibleReportReplacements = [
  [/2026-06-17 watchlist session/g, "watchlist 双视口样本"],
  [/PDP watchlist route pack 2026-06-17/g, "PDP watchlist 双视口样本"],
  [/watchlist route pack/g, "watchlist 采集包"],
  [/竞品复采二轮 competitor-recollect-2026-06-18/g, "竞品复采二轮样本"],
  [/competitor-recollect-2026-06-18/g, "竞品复采二轮样本"],
  [/competitor-recollect-v1-2026-06/g, "竞品复采方法"],
  [/内部经营数据校验摘要 2026-06-14/g, "内部经营数据摘要"],
  [/收益模型治理记录 2026-06-14/g, "收益模型治理记录"],
  [/校验项：/g, "证据来源："]
];
```

- [ ] **Step 4: Add explicit evidence badges in shared sections**

In `scripts/history-site/sections.mjs`, update `crossAuditSection()` section head:

```js
<div class="section__eyebrow">${escapeHtml(externalDate)} · 最新外部采集 · ${escapeHtml(data.external.latestSession || "")}</div>
```

In `trendsBody()`, update the latest section eyebrow:

```js
<div class="section__eyebrow">最新外部采集 · ${escapeHtml(session.sessionId)} · v3 路由感知</div>
```

- [ ] **Step 5: Verify Phase 2**

Run:

```bash
npm run build
npx playwright test tests/e2e.spec.mjs -g "evidence labels"
npm run test:release-parity
```

Expected: evidence-label test passes and release parity still passes.

- [ ] **Step 6: Commit Phase 2**

Run:

```bash
git add scripts/history-site/format.mjs scripts/history-site/sections.mjs tests/e2e.spec.mjs
git commit -m "fix: preserve report evidence session labels"
```

---

## Phase 3: Insight Report Contract

**Files:**
- Create: `config/insight-report-contract.json`
- Create: `scripts/validate-insight-report-contract.mjs`
- Modify: `package.json`
- Modify: `tests/e2e.spec.mjs`

- [ ] **Step 1: Create the insight contract**

Create `config/insight-report-contract.json`:

```json
{
  "version": "2026-06-18",
  "forbiddenNarrativeTerms": ["页面校验", "最终审计", "交叉审计", "审计桥接", "为什么先修", "本节只回答"],
  "allowedEvidenceTerms": ["复采", "证据版本", "验收", "owner", "诊断报告"],
  "maxVisibleSections": {
    "/": 9,
    "/metrics.html": 7,
    "/forensics.html": 6,
    "/trends.html": 5,
    "/cross-audit.html": 7
  },
  "pages": [
    {
      "path": "/",
      "role": "executive_overview",
      "decision": "真实经营数据回归，关键风险收敛。",
      "requiredProofs": ["归因可信度", "PDP", "第三方失败", "预算"],
      "requiredActions": ["冻结错误预算", "kill-list", "验收"],
      "requiredCharts": ["chart-overview-proof"]
    },
    {
      "path": "/metrics.html",
      "role": "metric_governance",
      "decision": "先统一口径，再讨论增长。",
      "requiredProofs": ["可用", "不可用", "当前 workbook", "历史经营"],
      "requiredActions": ["口径", "下一步", "验收"],
      "requiredCharts": ["chart-kpi-direction"]
    },
    {
      "path": "/forensics.html",
      "role": "risk_ownership",
      "decision": "先判归属和必要性，再处理脚本与 PDP 负担。",
      "requiredProofs": ["第三方失败", "DOM", "PDP", "owner"],
      "requiredActions": ["归属", "kill-list", "复采"],
      "requiredCharts": ["chart-risk-ranking"]
    },
    {
      "path": "/trends.html",
      "role": "trend_evidence",
      "decision": "趋势必须和经营 caveat 一起读。",
      "requiredProofs": ["最新外部采集", "LCP", "JS", "DOM", "第三方失败"],
      "requiredActions": ["复采", "覆盖率", "验收"],
      "requiredCharts": ["chart-lcp-coverage", "chart-js-dom", "chart-third-party-failures"]
    },
    {
      "path": "/cross-audit.html",
      "role": "decision_matrix",
      "decision": "历史报告为基线，当前数据只保留可执行结论。",
      "requiredProofs": ["资源排序", "验收", "冲突", "执行战单"],
      "requiredActions": ["批准", "冻结", "推进"],
      "requiredCharts": ["chart-decision-matrix"]
    }
  ]
}
```

- [ ] **Step 2: Write the contract validator**

Create `scripts/validate-insight-report-contract.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

const contract = JSON.parse(fs.readFileSync("config/insight-report-contract.json", "utf8"));
const siteRoot = "_site";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function fileForRoute(route) {
  if (route === "/") return path.join(siteRoot, "index.html");
  return path.join(siteRoot, route.replace(/^\/+/, ""));
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

const failures = [];
for (const page of contract.pages) {
  const file = fileForRoute(page.path);
  if (!fs.existsSync(file)) {
    failures.push(`${page.path}: missing generated file ${file}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const text = stripHtml(html);
  if (!text.includes(page.decision)) failures.push(`${page.path}: missing page decision "${page.decision}"`);
  for (const proof of page.requiredProofs) {
    if (!text.includes(proof)) failures.push(`${page.path}: missing proof marker "${proof}"`);
  }
  for (const action of page.requiredActions) {
    if (!text.includes(action)) failures.push(`${page.path}: missing action marker "${action}"`);
  }
  for (const chartId of page.requiredCharts) {
    if (!html.includes(`id="${chartId}"`)) failures.push(`${page.path}: missing required chart #${chartId}`);
  }
  for (const forbidden of contract.forbiddenNarrativeTerms) {
    if (text.includes(forbidden)) failures.push(`${page.path}: forbidden audit narrative term "${forbidden}"`);
  }
  const sectionCount = countMatches(html, /<section\b/g);
  const maxSections = contract.maxVisibleSections[page.path];
  if (sectionCount > maxSections) failures.push(`${page.path}: section count ${sectionCount} exceeds ${maxSections}`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  fail(`insight report contract failed with ${failures.length} issue(s)`);
}

console.log(`insight report contract passed for ${contract.pages.length} pages`);
```

- [ ] **Step 3: Wire into package scripts**

Modify `package.json`:

```json
"test:insight-contract": "npm run build && node scripts/validate-insight-report-contract.mjs"
```

Insert `npm run test:insight-contract` after `npm run test:release-contract` in the main `test` script.

- [ ] **Step 4: Add browser-side chart existence check**

Append to `tests/e2e.spec.mjs`:

```js
const insightContract = JSON.parse(fs.readFileSync(new URL("../config/insight-report-contract.json", import.meta.url), "utf8"));

test("insight report pages render required charts and decisions", async ({page}) => {
  for (const contractPage of insightContract.pages) {
    await page.goto(contractPage.path);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain(contractPage.decision);
    for (const chartId of contractPage.requiredCharts) {
      await expect(page.locator(`#${chartId}`)).toHaveCount(1);
      await expect(page.locator(`#${chartId}`)).toBeVisible();
    }
  }
});
```

- [ ] **Step 5: Run and capture expected failures**

Run:

```bash
npm run test:insight-contract
npx playwright test tests/e2e.spec.mjs -g "insight report pages render required charts"
```

Expected before narrative/chart work: failures for missing charts and excess sections.

- [ ] **Step 6: Commit the failing contract separately**

Run:

```bash
git add config/insight-report-contract.json scripts/validate-insight-report-contract.mjs package.json tests/e2e.spec.mjs
git commit -m "test: add insight report contract gate"
```

### Phase 3b: User Metric Attribution Contract Supplement

User-added requirement for this report: `www.momcozy.com` 中机器人占比高等因素，以及转化率低、停留时间短、跳出率高的问题，都需要详细诊断出来，列出事实，桑基图这些都要有反映，有对比，以指标为导向进行诊断、归因。

Contract supplement:
- The insight contract must require visible metric facts for `转化率`, `停留`, `跳出率`, and `机器人占比` or `爬虫占比`.
- The contract must require `当前` vs `历史` comparison language on the relevant decision pages.
- The contract must require attribution markers, including `归因` and a human/bot gate marker such as `human/bot`.
- `/metrics.html` must require a behavior/conversion Sankey chart id, currently `chart-behavior-sankey`.
- `/cross-audit.html` or `/` must require a bot/attribution Sankey chart id, currently `chart-bot-attribution-sankey`.
- If no measured bot-share value exists in repository data, the page must explicitly label `机器人占比/爬虫占比为缺失或待复证证据` and request owner analytics, bot logs, or a human-bot dimension for re-validation. The report must not present bot share as a quantified fact until that evidence exists.

Phase 3b implementation scope is contract-only: update `config/insight-report-contract.json`, generalize optional marker validation in `scripts/validate-insight-report-contract.mjs`, and keep the gate red until Phase 4/5 add the actual charts and narrative.

---

## Phase 4: Static Chart Components

Phase 4 must implement metric-driven diagnostic chart components for conversion, dwell/stay time, bounce rate, and human/bot attribution. At minimum, add a behavior/conversion Sankey for `/metrics.html` and a bot/attribution Sankey for `/cross-audit.html` or `/`, using explicit labels for current vs historical comparison where source data supports it. When bot share is not measured, the chart or adjacent evidence block must show a missing-evidence state rather than an invented percentage.

**Files:**
- Create: `scripts/history-site/charts.mjs`
- Modify: `scripts/history-site/layout.mjs`
- Modify: `scripts/history-site/sections.mjs`

- [ ] **Step 1: Create static chart helpers**

Create `scripts/history-site/charts.mjs`:

```js
import {escapeHtml, fixed, integer} from "./format.mjs";

function finite(value) {
  return Number.isFinite(value) ? value : 0;
}

function pctWidth(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function barChart({id, title, subtitle = "", rows, valueFormat = integer}) {
  const safeRows = rows.filter((row) => Number.isFinite(row.value));
  const max = Math.max(...safeRows.map((row) => row.value), 1);
  return `<div class="insight-chart" id="${escapeHtml(id)}" role="img" aria-label="${escapeHtml(title)}">
    <div class="insight-chart__head">
      <h3>${escapeHtml(title)}</h3>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
    </div>
    <div class="insight-chart__bars">
      ${safeRows.map((row) => `<div class="insight-chart__row">
        <div class="insight-chart__label">${escapeHtml(row.label)}</div>
        <div class="insight-chart__track"><span style="width:${fixed(pctWidth(row.value, max), 1)}%"></span></div>
        <div class="insight-chart__value">${escapeHtml(valueFormat(row.value))}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

export function coverageChart({id, title, observed, total}) {
  const safeObserved = finite(observed);
  const safeTotal = Math.max(finite(total), safeObserved, 1);
  const missing = Math.max(safeTotal - safeObserved, 0);
  return barChart({
    id,
    title,
    subtitle: `可观测 ${safeObserved}/${safeTotal}；缺口 ${missing}/${safeTotal}`,
    rows: [
      {label: "可观测", value: safeObserved},
      {label: "不可观测", value: missing}
    ],
    valueFormat: integer
  });
}

export function pairedMetricChart({id, title, leftLabel, rightLabel, leftValue, rightValue, unit = ""}) {
  return barChart({
    id,
    title,
    subtitle: `${leftLabel} 与 ${rightLabel} 的当前对比`,
    rows: [
      {label: leftLabel, value: leftValue},
      {label: rightLabel, value: rightValue}
    ],
    valueFormat: (value) => `${integer(value)}${unit}`
  });
}
```

- [ ] **Step 2: Add chart styles to `layout.mjs`**

Inside `pageStyles()` CSS string in `scripts/history-site/layout.mjs`, add:

```css
.insight-chart { margin-top: 20px; padding: 20px; border: 1px solid var(--border); background: #fff; border-radius: 8px; }
.insight-chart__head h3 { margin: 0; color: var(--ink); font-size: 17px; line-height: 1.35; }
.insight-chart__head p { margin: 6px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
.insight-chart__bars { display: grid; gap: 12px; margin-top: 16px; }
.insight-chart__row { display: grid; grid-template-columns: minmax(96px, 150px) minmax(0, 1fr) minmax(56px, max-content); gap: 12px; align-items: center; }
.insight-chart__label { color: var(--ink); font-size: 13px; font-weight: 700; }
.insight-chart__track { height: 12px; overflow: hidden; border-radius: 999px; background: #ece8ea; }
.insight-chart__track span { display: block; height: 100%; min-width: 2px; border-radius: inherit; background: var(--accent); }
.insight-chart__value { color: var(--ink); font-size: 13px; font-weight: 800; text-align: right; }
@media (max-width: 560px) {
  .insight-chart__row { grid-template-columns: 1fr; gap: 6px; }
  .insight-chart__value { text-align: left; }
}
```

- [ ] **Step 3: Import chart helpers in sections**

At the top of `scripts/history-site/sections.mjs`, add:

```js
import {
  barChart,
  coverageChart,
  pairedMetricChart
} from "./charts.mjs";
```

- [ ] **Step 4: Verify chart helper syntax**

Run:

```bash
node --check scripts/history-site/charts.mjs
npm run build
```

Expected:

```text
built history-primary site with latest trend session session-2026-06-17
```

- [ ] **Step 5: Commit Phase 4**

Run:

```bash
git add scripts/history-site/charts.mjs scripts/history-site/layout.mjs scripts/history-site/sections.mjs
git commit -m "feat: add static insight chart components"
```

---

## Phase 5: Rewrite Page Storylines And Module Order

Phase 5 must rewrite the visible report as an indicator-led diagnosis: diagnose low conversion rate, short dwell/stay time, high bounce rate, and bot/crawler share risk through facts, current vs historical comparison, Sankey-backed flows, and attribution statements. The wording must distinguish measured facts from hypotheses. If repository data still lacks measured bot share, the page must say the bot/crawler share is missing or pending re-validation evidence and must name the needed owner analytics, bot log, or human-bot dimension before any quantified claim.

**Files:**
- Modify: `scripts/history-site/pages.mjs`
- Modify: `scripts/history-site/layout.mjs`
- Modify: `scripts/history-site/sections.mjs`
- Modify: `src/_data/public-cross-audit.json`
- Modify: `scripts/page-structure-contract.mjs`

- [ ] **Step 1: Rename visible report identity**

Modify `scripts/history-site/pages.mjs`:

```js
return `Momcozy 独立站私密经营洞察报告，按当前经营数据、历史经营数据与 ${sessionDate} 自动采集刷新。`;
```

Change page titles:

```js
writePage(outputDir, "index.html", "I · 总览 — Momcozy 洞察报告", "index", overviewBody(data), metaDescription);
writePage(outputDir, "metrics.html", "II · 指标口径 — Momcozy 洞察报告", "metrics", metricsBody(data), metaDescription);
writePage(outputDir, "forensics.html", "III · 风险归因 — Momcozy 洞察报告", "forensics", forensicsBody(data), metaDescription);
writePage(outputDir, "trends.html", "IV · 趋势证据 — Momcozy 洞察报告", "trends", trendsBody(data, session), metaDescription);
writePage(outputDir, "cross-audit.html", "V · 决策矩阵 — Momcozy 洞察报告", "cross", crossAuditBody(data), metaDescription);
```

- [ ] **Step 2: Rename sidebar labels**

Modify `nav(active)` in `scripts/history-site/layout.mjs`:

```js
const items = [
  ["index.html", "I · 总览", "index"],
  ["metrics.html", "II · 指标口径", "metrics"],
  ["forensics.html", "III · 风险归因", "forensics"],
  ["trends.html", "IV · 趋势证据", "trends"],
  ["cross-audit.html", "V · 决策矩阵", "cross"]
];
```

Change default page description:

```js
export function page(title, active, body, metaDescription = "Momcozy 独立站私密经营洞察报告") {
```

- [ ] **Step 3: Replace homepage body with executive pyramid**

Replace `overviewBody(data)` return value in `scripts/history-site/sections.mjs` with:

```js
return `${hero(data)}
  ${logicChainSection(data)}
  ${hardConclusionsSection(data)}
  <section class="section" id="overview-proof">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">三条证据 · 预算取舍 · 验收门槛</div>
        <h2 class="section__title">真实经营数据回归，关键风险收敛。</h2>
        <p class="section__sub">本页只保留经营判断需要的三层证据：归因可信度、PDP 负担、第三方失败。原始表格进入后续页面，不在总览重复展开。</p>
      </div>
      ${barChart({
        id: "chart-overview-proof",
        title: "总览证据强度",
        subtitle: "数值越高，越应该优先进入执行战单",
        rows: [
          {label: "第三方失败", value: data.external.maxThirdPartyFailures},
          {label: "PDP 队列", value: data.internal.pdpWatchlistCount},
          {label: "LCP 不可观测样本", value: data.external.lcpTotalSamples - data.external.lcpObservedSamples}
        ]
      })}
    </div>
  </section>
  ${operatingBridgeSection(data)}
  ${businessKpiSection(data)}
  ${trafficAttributionSection(data)}
  ${executionOrdersSection(data, "decisions")}`;
```

- [ ] **Step 4: Replace metrics body with口径 first**

Replace `metricsBody(data)` return value:

```js
return `${hero(data)}
  <section class="section section--gray" id="metric-governance">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">可用 / 不可用 / 下一步</div>
        <h2 class="section__title">先统一口径，再讨论增长。</h2>
        <p class="section__sub">当前 workbook 可用于判断预算优先级；历史经营 JSON 可用于恢复假设；两者不能直接拼成承诺收益。</p>
      </div>
      ${pairedMetricChart({
        id: "chart-kpi-direction",
        title: "经营口径只支持方向判断",
        leftLabel: "流量窗口天数",
        rightLabel: "销售窗口天数",
        leftValue: data.internal.trafficObservedDays,
        rightValue: data.internal.salesObservedDays,
        unit: "d"
      })}
    </div>
  </section>
  ${operatingBridgeSection(data)}
  ${businessKpiSection(data)}
  ${trafficAttributionSection(data)}
  ${funnelSection(data)}
  ${metricDictionarySection(data)}`;
```

- [ ] **Step 5: Replace forensics language with risk ownership**

Update `forensicsBody(data)` to keep the same evidence sections but lead with:

```js
<div class="section__eyebrow">风险归属 · 脚本必要性 · PDP 负担</div>
<h1 class="hero__title">先判归属和必要性，再处理脚本与 PDP 负担。</h1>
```

Add this chart section before `fatalSection(data)`:

```js
<section class="section section--gray" id="risk-chart">
  <div class="container">
    <div class="section__head">
      <div class="section__eyebrow">风险排序 · 复现强度</div>
      <h2 class="section__title">风险排序不是按声音大小，而是按复现强度。</h2>
      <p class="section__sub">先看跨路径复现和责任边界，再决定脚本、PDP 和第三方域名的处理顺序。</p>
    </div>
    ${barChart({
      id: "chart-risk-ranking",
      title: "风险排序不是按声音大小，而是按复现强度",
      subtitle: "来自最新外部采集与 watchlist 双视口样本",
      rows: [
        {label: "最高第三方失败", value: data.external.maxThirdPartyFailures},
        {label: "最大 DOM 节点", value: data.external.maxDomNodes},
        {label: "PDP watchlist", value: data.internal.pdpWatchlistCount}
      ]
    })}
  </div>
</section>
```

- [ ] **Step 6: Replace trends body with charts first**

Add `routeMetric` to the import from `./format.mjs`, then in `trendsBody(data, session)`, place this section before the route table:

```js
<section class="section" id="trend-charts">
  <div class="container">
    <div class="section__head">
      <div class="section__eyebrow">趋势图表 · 覆盖率先行</div>
      <h2 class="section__title">趋势必须先说明哪些指标能读，哪些指标不能读。</h2>
      <p class="section__sub">LCP 当前仍是覆盖率问题；JS、DOM、请求量和第三方失败才是这一轮可以进入趋势图的主证据。</p>
    </div>
    ${coverageChart({
      id: "chart-lcp-coverage",
      title: "LCP 覆盖率先决定趋势可信度",
      observed: data.external.lcpObservedSamples,
      total: data.external.lcpTotalSamples
    })}
    ${pairedMetricChart({
      id: "chart-js-dom",
      title: "前端重量与 DOM 规模仍是主风险",
      leftLabel: "首页 JS KB",
      rightLabel: "最大 DOM 节点",
      leftValue: data.external.homepageJsKb,
      rightValue: data.external.maxDomNodes
    })}
    ${barChart({
      id: "chart-third-party-failures",
      title: "第三方失败决定先查归属",
      subtitle: "最新 13 路由双视口样本",
      rows: [
        {label: "首页第三方失败", value: routeMetric(session, "homepage", "desktop")?.thirdPartyFailures || 0},
        {label: "最高第三方失败", value: data.external.maxThirdPartyFailures}
      ]
    })}
  </div>
</section>
```

Keep `latestRows(session)` below the charts inside a `<details class="evidence-drilldown" open>`.

- [ ] **Step 7: Replace cross-audit with final decision matrix**

Change `crossAuditBody(data)` so it renders:

```js
return `${hero(data)}
  ${hardConclusionsSection(data)}
  ${crossMatrixSection(data)}
  ${contradictionsSection(data)}
  ${executionOrdersSection(data, "execution-orders")}
  <section class="section section--gray" id="decision-chart">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">矩阵摘要 · 资源批准</div>
        <h2 class="section__title">历史报告为基线，当前数据只保留可执行结论。</h2>
        <p class="section__sub">决策总表不重复全部证据，只保留会影响预算、技术排期和验收边界的判断。</p>
      </div>
      ${barChart({
        id: "chart-decision-matrix",
        title: "进入执行战单的证据优先级",
        rows: [
          {label: "第三方失败", value: data.external.maxThirdPartyFailures},
          {label: "PDP 下一轮队列", value: data.internal.pdpWatchlistCount},
          {label: "冲突处理项", value: decisionData(data).hardConclusions.length}
        ]
      })}
    </div>
  </section>`;
```

- [ ] **Step 8: Update page structure contract**

Modify `scripts/page-structure-contract.mjs` so `pageComponentMap` matches the new visible modules:

```js
export const pageComponentMap = {
  "/": ["hero", "insight-chain", "hard-conclusions", "overview-proof", "operating-bridge", "business-kpi", "traffic-attribution", "decisions"],
  "/metrics.html": ["hero", "metric-governance", "operating-bridge", "business-kpi", "traffic-attribution", "funnel", "metric-dictionary"],
  "/forensics.html": ["scene", "risk-chart", "bot-audit", "fatal", "top15", "pdp"],
  "/trends.html": ["hero", "trend-charts", "latest-v3"],
  "/cross-audit.html": ["hero", "hard-conclusions", "cross-matrix", "contradictions", "execution-orders", "decision-chart"]
};
```

Update `pageNavigationContract` labels to avoid `重审结论`, `病灶`, and `诊断`.

- [ ] **Step 9: Verify Phase 5**

Run:

```bash
npm run build
npm run test:insight-contract
npm run test:release-parity
npx playwright test tests/e2e.spec.mjs -g "insight report|page structure|appendix-style|stable"
```

Expected: all commands pass; section counts are below the contract caps.

- [ ] **Step 10: Commit Phase 5**

Run:

```bash
git add scripts/history-site/pages.mjs scripts/history-site/layout.mjs scripts/history-site/sections.mjs scripts/page-structure-contract.mjs src/_data/public-cross-audit.json tests/e2e.spec.mjs
git commit -m "feat: reshape pages into insight report narrative"
```

---

## Phase 6: Layout Density And Drilldown

**Files:**
- Modify: `scripts/history-site/layout.mjs`
- Modify: `scripts/history-site/sections.mjs`
- Modify: `scripts/audit-production-layout.mjs`

- [ ] **Step 1: Add drilldown styles**

Add to `pageStyles()`:

```css
.evidence-drilldown { margin-top: 18px; border: 1px solid var(--border); border-radius: 8px; background: #fff; }
.evidence-drilldown summary { cursor: pointer; padding: 14px 16px; color: var(--ink); font-weight: 800; }
.evidence-drilldown > :not(summary) { margin: 0 16px 16px; }
```

- [ ] **Step 2: Wrap raw tables that are not first-layer evidence**

In `crossAuditSection(data, pageName)`, wrap the table:

```js
<details class="evidence-drilldown">
  <summary>查看本页证据明细</summary>
  <div class="cross-table-wrap" tabindex="0">
    <table class="cross-table">
      <thead><tr><th>ID</th><th>问题</th><th>当前结论与证据</th><th>等级</th><th>参考依据</th></tr></thead>
      <tbody>${conclusionRows(selectedConclusions(data, pageName))}</tbody>
    </table>
  </div>
</details>
```

In `trendsBody(data, session)`, wrap `.sessions-wrap` similarly:

```js
<details class="evidence-drilldown" open>
  <summary>查看 13 路由双视口原始表</summary>
  <div class="sessions-wrap" tabindex="0">
    <table class="sessions-table">
      <thead><tr><th>路线</th><th>视口</th><th>FCP (s)</th><th>TTFB (ms)</th><th>CLS</th><th>JS (KB)</th><th>DOM</th><th>请求</th><th>3P 失败</th></tr></thead>
      <tbody>${latestRows(session)}</tbody>
    </table>
  </div>
</details>
```

- [ ] **Step 3: Add production density checks**

In `scripts/audit-production-layout.mjs`, add these fields to the `state` object returned by `page.evaluate()`:

```js
openDetailsCount: document.querySelectorAll("details[open]").length,
insightChartCount: document.querySelectorAll(".insight-chart").length,
tallSectionIssues: Array.from(document.querySelectorAll(".section"))
  .map((section) => {
    const bounds = section.getBoundingClientRect();
    return {
      id: section.id || "",
      height: Math.round(bounds.height),
      viewportHeight: window.innerHeight
    };
  })
  .filter((item) => item.height > item.viewportHeight * 1.8)
```

Then add issues:

```js
if (state.tallSectionIssues.length) issues.push(`tall sections ${state.tallSectionIssues.length}`);
if (pageKey === "trends" && state.insightChartCount < 3) issues.push(`trend charts ${state.insightChartCount}`);
```

- [ ] **Step 4: Verify Phase 6**

Run:

```bash
npm run build
PRODUCTION_LAYOUT_BASE_URL=http://127.0.0.1:8080 PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/insight-layout-local npm run audit:production-layout
```

Expected:

```text
failedChecks: 0
```

- [ ] **Step 5: Commit Phase 6**

Run:

```bash
git add scripts/history-site/layout.mjs scripts/history-site/sections.mjs scripts/audit-production-layout.mjs
git commit -m "test: enforce insight report layout density"
```

---

## Phase 7: Remove Audit-Shaped Source Debt

**Files:**
- Modify: `scripts/history-site/sections.mjs`
- Modify: `src/_data/public-cross-audit.json`
- Delete after verification: `src/assets/trends-charts.js`
- Delete after verification: `src/assets/site.css`

- [ ] **Step 1: Confirm unused exports are not referenced**

Run:

```bash
rg -n "pageAuditSection|diagnosticBridgeSection|storylineSection|thirdPartyGovernanceSection|segmentSamplingSection|featureComparisonSection|competitorRecollectPlanSection|playbookSection|roadmapSection" scripts src tests docs
```

Expected before deletion: matches only in `scripts/history-site/sections.mjs` and documentation that is being updated in Phase 8.

- [ ] **Step 2: Remove unused exports from `sections.mjs`**

Delete these full function blocks:

```text
pageAuditSection
diagnosticBridgeSection
storylineSection
thirdPartyGovernanceSection
segmentSamplingSection
featureComparisonSection
competitorRecollectPlanSection
playbookSection
roadmapSection
```

Keep functions used by active bodies: `logicChainSection`, `hardConclusionsSection`, `executionOrdersSection`, `crossMatrixSection`, `contradictionsSection`, `operatingBridgeSection`, `businessKpiSection`, `trafficAttributionSection`, `botGovernanceSection`, `diagnosticBacklogSection`, `competitorMatrixSection`, `latestRows`, and the five body functions.

- [ ] **Step 3: Remove inactive tracked assets**

Run:

```bash
git rm src/assets/trends-charts.js src/assets/site.css
```

- [ ] **Step 4: Remove visible dependency on `finalAudit`**

In `src/_data/public-cross-audit.json`, remove the `finalAudit.pageAudits` entries if no validator or active page reads them.

Keep `finalAudit.crossMatrix` and `finalAudit.contradictions` only if `crossMatrixSection(data)` and `contradictionsSection(data)` still read them. If those sections use `decisionArchitecture`, move needed rows into `decisionArchitecture` and delete `finalAudit` completely in the same commit.

- [ ] **Step 5: Verify cleanup**

Run:

```bash
npm run build
npm run test:insight-contract
npm run test:release-parity
npm run test:source-safety
npm test
```

Expected: all commands pass.

- [ ] **Step 6: Commit Phase 7**

Run:

```bash
git add scripts/history-site/sections.mjs src/_data/public-cross-audit.json
git add -u src/assets
git commit -m "refactor: remove inactive audit report source debt"
```

---

## Phase 8: Documentation Debt Cleanup

**Files:**
- Create: `docs/insight-report-contract.md`
- Modify: `AGENTS.md`
- Modify: `docs/private-data-provenance.md`
- Modify: `docs/release-contract.md`
- Modify: `docs/optimization-todo.md`

- [ ] **Step 1: Create the human-readable insight contract**

Create `docs/insight-report-contract.md`:

```markdown
# Momcozy Insight Report Contract

The private business site is an insight report, not an audit appendix.

Each primary page must have:

1. One decision headline.
2. Three or fewer first-layer proof pillars.
3. A caveat when data windows or metric methods differ.
4. One action path with an owner or acceptance gate.
5. At least one chart when the page discusses trend, KPI movement, ranking, or matrix comparison.

Forbidden visible narrative terms:

- 页面校验
- 最终审计
- 交叉审计
- 审计桥接
- 为什么先修
- 本节只回答

Allowed evidence metadata terms:

- 复采
- 证据版本
- 验收
- owner
- 诊断报告 when referring to legacy artifact identity only

Machine gates:

- `npm run test:report-data-consistency`
- `npm run test:insight-contract`
- `npm run test:release-parity`
- `npm run audit:production-layout`
- `npm test`
```

- [ ] **Step 2: Update AGENTS active source documentation**

In `AGENTS.md`, replace the asset block:

```text
history_static/assets/           <- active static assets copied into _site/assets
scripts/history-site/charts.mjs  <- active static chart renderer
```

Remove statements that say `src/assets/trends-charts.js` is active chart logic.

- [ ] **Step 3: Update release docs**

In `docs/release-contract.md`, add:

````markdown
## Insight Report Gates

Before deployment, the private business report must pass:

```bash
npm run test:report-data-consistency
npm run test:insight-contract
npm run test:release-parity
PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/production-layout-insight npm run audit:production-layout
```

These gates verify that data counts match the latest session, each page follows the insight contract, local and production page structure stay aligned, and visual layout remains readable.
````

- [ ] **Step 4: Update provenance docs**

In `docs/private-data-provenance.md`, add:

```markdown
## Derived External Fields

The report does not manually trust `external.lcpObservedSamples`, `external.lcpTotalSamples`, `external.routeCount`, or `external.latestSession` during build. `scripts/history-site/session-derived-metrics.mjs` derives these fields from the latest session in `src/_data/sessions/`.

`src/_data/public-cross-audit.json` may keep matching values for human review, but `npm run test:report-data-consistency` fails when they drift from the latest session.
```

- [ ] **Step 5: Close or rewrite stale optimization notes**

In `docs/optimization-todo.md`, add a current status section:

```markdown
## Current Priority: Insight Report Conversion

The current priority is not adding more audit appendix material. The active work is:

1. Evidence integrity.
2. Pyramid-style page storylines.
3. Data-to-chart mapping.
4. Layout density reduction.
5. Source and documentation cleanup.
```

- [ ] **Step 6: Verify docs do not reintroduce forbidden source risk**

Run:

```bash
npm run test:source-safety
rg -n "src/assets/trends-charts|页面校验|最终审计|交叉审计|审计桥接|为什么先修|本节只回答" AGENTS.md docs scripts/history-site src/_data/public-cross-audit.json
```

Expected: source safety passes; the `rg` command returns only historical context inside this implementation plan or no matches outside allowed legacy references.

- [ ] **Step 7: Commit Phase 8**

Run:

```bash
git add docs/insight-report-contract.md AGENTS.md docs/private-data-provenance.md docs/release-contract.md docs/optimization-todo.md
git commit -m "docs: define insight report contract"
```

---

## Phase 9: Full Verification And Production Proof

**Files:**
- Read: generated `_site/`
- Read: production layout artifacts
- Read: GitHub/Tencent workflow status after PR merge

- [ ] **Step 1: Run local full verification**

Run:

```bash
npm run build
npm run test:report-data-consistency
npm run test:insight-contract
npm run test:allowlist
npm run test:source-safety
npm run test:release-parity
npm test
```

Expected: all commands pass.

- [ ] **Step 2: Run local visual proof**

Start the local server:

```bash
npm run serve
```

In another terminal, run:

```bash
PRODUCTION_LAYOUT_BASE_URL=http://127.0.0.1:8080 PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/insight-report-layout-local npm run audit:production-layout
```

Expected: `failedChecks: 0`.

- [ ] **Step 3: Inspect key pages in browser screenshots**

Open these screenshots from `artifacts/insight-report-layout-local/`:

```text
index-desktop.png
metrics-desktop.png
forensics-desktop.png
trends-desktop.png
cross-audit-desktop.png
index-mobile.png
trends-mobile.png
cross-audit-mobile.png
```

Pass criteria:
- One hero headline per page.
- No oversized body section title.
- Charts are visible on pages that require charts.
- Tables are not the first visible artifact on Trends.
- Mobile has no horizontal overflow.

- [ ] **Step 4: Create PR and watch checks**

Run:

```bash
git status --short
git push -u origin codex/insight-report-optimization
gh pr create --draft --title "Convert Momcozy site into insight report" --body-file docs/superpowers/plans/2026-06-18-insight-report-optimization.md
gh pr checks --watch
```

Expected: required checks pass or fail with actionable logs.

- [ ] **Step 5: Merge only after local and PR checks pass**

Run:

```bash
gh pr merge --squash --delete-branch
gh run list --workflow tencent.yml --limit 3
```

Expected: Tencent workflow starts from the merge commit.

- [ ] **Step 6: Verify production**

Run:

```bash
TENCENT_RUN_ID="$(gh run list --workflow tencent.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
gh run watch "$TENCENT_RUN_ID" --exit-status
PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/insight-report-layout-prod npm run audit:production-layout
npm run test:release-parity
```

Expected:
- Tencent workflow completes successfully.
- Production layout audit reports `failedChecks: 0`.
- Release parity passes against production.

---

## Self-Review Checklist

- Spec coverage:
  - Storyline pyramid: Phase 3 and Phase 5.
  - Conclusion/evidence consistency: Phase 1 and Phase 2.
  - Data-to-chart mapping: Phase 3, Phase 4, Phase 5.
  - Audit wording removal: Phase 3, Phase 5, Phase 8.
  - Layout density: Phase 6 and Phase 9.
  - Engineering/docs debt: Phase 7 and Phase 8.
- Placeholder scan: no placeholder examples, no vague deferred error handling, no unnamed files.
- Type consistency:
  - `deriveExternalSessionMetrics()` is imported by both build and validator.
  - Chart IDs match `config/insight-report-contract.json`.
  - `test:insight-contract` builds before reading `_site`.
- Risk ordering:
  - Evidence integrity is fixed before copy and layout.
  - Deletions happen after replacement tests pass.
  - Production checks happen after PR merge and Tencent deployment.
