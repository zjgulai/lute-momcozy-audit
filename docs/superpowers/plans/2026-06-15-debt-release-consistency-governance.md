# Debt And Release Consistency Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the debt that can make local, GitHub Pages, and Tencent Cloud publish different Momcozy audit-site experiences.

**Architecture:** Establish one source-of-truth contract for the generated private business audit site, then make docs, tests, monitors, and deployment checks enforce that contract. Keep the existing generator and CI path for the first pass, then split large scripts only after release identity gates are hard.

**Tech Stack:** Node.js 22+, Playwright, axe-core, JSON Schema/Ajv, GitHub Actions, static `_site` artifact deployment, Tencent Cloud static hosting.

---

## Audit Diagnosis

### Critical Debt

1. **Release identity debt:** Local generated pages are now private-business edition with left sidebar navigation, while production still serves the previous top-navigation build. The default uptime monitor passes production because it checks availability and generic identity, not the exact release edition.
2. **Documentation boundary debt:** `AGENTS.md` defines the current private-business edition, but `README.md`, `docs/predeploy-cross-audit-acceptance-2026-06-14.md`, `docs/legacy-history-migration.md`, and the old predeploy plan still describe a public sanitized site.
3. **Source-of-truth debt:** The active build is `scripts/build-history-site.mjs` from `src/_data/public-cross-audit.json`, but the repository still contains Eleventy templates, legacy `src/*.html`, and docs that describe the old Eleventy route model.
4. **Route contract debt:** The actual generated site supports slashless route aliases and `.html` files; trailing slash aliases return 404. Several docs and smoke descriptions still imply trailing slash routes are primary pages.
5. **Safety-scan coverage debt:** Source safety scans cover `src`, `docs`, and `history_static`, but not root governance files such as `README.md` and `AGENTS.md`. This lets stale policy language or infrastructure details survive outside scanned release inputs.

### Major Debt

1. **Generator maintainability debt:** `scripts/build-history-site.mjs` is over 1,100 lines and owns layout, navigation, data mapping, content rendering, output cleanup, and asset copying in one file.
2. **Monitor maintainability debt:** `scripts/uptime-monitor.mjs` is over 1,000 lines and owns probing, alerting, retries, webhook formats, state persistence, and reporting in one file.
3. **Private data provenance debt:** Current private KPI data is represented in `public-cross-audit.json`, but there is no dedicated provenance manifest that states which private inputs were transformed, when, by which script/manual process, and which exact public fields were derived.
4. **Deployment state debt:** There are local uncommitted release changes. Until committed and pushed, CI success on `main` only proves the older production artifact, not the current private-business redesign.
5. **Artifact hygiene debt:** Design audit screenshots and notes are useful local evidence, but `artifacts/` is currently untracked and not covered by a clear keep-or-ignore policy.

### Moderate Debt

1. **Versioning debt:** `package.json` version and `README.md` audit version do not express the current private-business release stage consistently.
2. **Acceptance-doc debt:** The old acceptance doc is historically useful but reads like the current release gate. It needs an explicit superseded banner or a new current acceptance document.
3. **Collection scope debt:** The collector covers homepage plus one representative product-detail route. It still does not cover cart, checkout, or a multi-PDP queue.
4. **Local/prod header parity debt:** Local `serve.mjs` does not emit production cache-control headers, so strict uptime monitor checks fail locally even when content is correct.
5. **Workflow duplication debt:** Tencent workflow contains many inline shell assertions. These are effective but hard to unit-test and easy to drift from the local monitor contract.

---

## Phase 0: Freeze Current Risk Window

**Files:**
- Read: `git status --short --branch`
- Read: `scripts/build-history-site.mjs`
- Read: `tests/e2e.spec.mjs`
- Read: `artifacts/design-audit-2026-06-15/notes.md`

- [ ] **Step 1: Confirm the local release delta is intentional**

Run:

```bash
git status --short --branch
git diff --stat
```

Expected:

```text
## main...origin/main
 M .gitignore
 M AGENTS.md
 M scripts/build-history-site.mjs
 M scripts/safety-scan-source.mjs
 M scripts/safety-scan.mjs
 M src/_data/public-cross-audit.json
 M tests/e2e.spec.mjs
?? artifacts/
```

- [ ] **Step 2: Decide artifact policy before staging**

Run:

```bash
find artifacts/design-audit-2026-06-15 -maxdepth 1 -type f -print | sort
```

Expected: five PNG screenshots and `notes.md`.

- [ ] **Step 3: Record release identity markers**

Run:

```bash
LOCAL_PREVIEW=http://localhost:8080
node --input-type=module - <<'NODE'
const targets = [
  ["local", `${process.env.LOCAL_PREVIEW}/`],
  ["prod", "https://shopify.lute-tlz-dddd.top/"]
];
for (const [label, url] of targets) {
  const response = await fetch(url);
  const body = await response.text();
  console.log(label, {
    status: response.status,
    sideNav: body.includes('class="side-nav"'),
    privateEdition: body.includes("私密经营"),
    oldTopNav: body.includes("nav-top")
  });
}
NODE
```

Expected before deployment: local has `sideNav: true` and production still has `oldTopNav: true`.

---

## Phase 1: Define One Release Contract

**Files:**
- Create: `config/release-contract.json`
- Create: `scripts/validate-release-contract.mjs`
- Modify: `package.json`
- Modify: `tests/e2e.spec.mjs`

- [ ] **Step 1: Create the release contract**

Create `config/release-contract.json`:

```json
{
  "edition": "private-business",
  "requiredMarkers": ["路特 AI", "Momcozy", "私密经营", "真实金额", "真实 KPI"],
  "forbiddenMarkers": ["公开审计", "公开摘要", "nav-top"],
  "pages": [
    {"path": "/", "status": 200, "markers": ["真实经营数据回归", "side-nav"]},
    {"path": "/metrics.html", "status": 200, "markers": ["指标字典", "真实经营 KPI"]},
    {"path": "/forensics.html", "status": 200, "markers": ["证据链", "第三方失败"]},
    {"path": "/trends.html", "status": 200, "markers": ["性能趋势", "session-2026-06-14"]},
    {"path": "/cross-audit.html", "status": 200, "markers": ["本页锚点", "执行战单"]},
    {"path": "/not-a-real-page", "status": 404, "markers": []}
  ],
  "canonicalRoutes": ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"],
  "acceptedAliases": ["/metrics", "/forensics", "/trends"]
}
```

- [ ] **Step 2: Add a local contract validator**

Create `scripts/validate-release-contract.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

const contract = JSON.parse(fs.readFileSync("config/release-contract.json", "utf8"));
const root = path.resolve("_site");

function htmlPath(routePath) {
  if (routePath === "/") return path.join(root, "index.html");
  const clean = routePath.replace(/^\/+/, "");
  return path.join(root, clean);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const page of contract.pages) {
  if (page.status !== 200) continue;
  const file = htmlPath(page.path);
  if (!fs.existsSync(file)) fail(`${page.path}: missing generated file ${file}`);
  const html = fs.readFileSync(file, "utf8");
  for (const marker of contract.requiredMarkers) {
    if (!html.includes(marker)) fail(`${page.path}: missing required release marker ${marker}`);
  }
  for (const marker of page.markers || []) {
    if (!html.includes(marker)) fail(`${page.path}: missing page marker ${marker}`);
  }
  for (const marker of contract.forbiddenMarkers) {
    if (html.includes(marker)) fail(`${page.path}: forbidden release marker ${marker}`);
  }
}

console.log(`release contract ${contract.edition} passed for ${contract.pages.length} checks`);
```

- [ ] **Step 3: Wire the validator into scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "test:release-contract": "node scripts/validate-release-contract.mjs"
  }
}
```

Add `npm run test:release-contract` after `npm run build` and before safety checks in the main `test` script.

- [ ] **Step 4: Extend E2E to read the contract**

Modify `tests/e2e.spec.mjs` by importing the JSON contract and using it for route identity assertions:

```js
import releaseContract from "../config/release-contract.json" with {type: "json"};

test("generated site matches private-business release contract", async ({page}) => {
  for (const route of releaseContract.pages.filter((item) => item.status === 200)) {
    await page.goto(route.path);
    const html = await page.content();
    for (const marker of releaseContract.requiredMarkers) {
      expect(html).toContain(marker);
    }
    for (const marker of route.markers) {
      expect(html).toContain(marker);
    }
    for (const marker of releaseContract.forbiddenMarkers) {
      expect(html).not.toContain(marker);
    }
  }
});
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
npm run test:release-contract
npm test
```

Expected: release contract passes before the existing test suite.

---

## Phase 2: Fix Documentation Boundary Drift

**Files:**
- Modify: `README.md`
- Modify: `docs/predeploy-cross-audit-acceptance-2026-06-14.md`
- Modify: `docs/legacy-history-migration.md`
- Modify: `docs/optimization-todo.md`
- Modify: `docs/review-workflow.md`
- Create: `docs/release-contract.md`

- [ ] **Step 1: Create current release contract docs**

Create `docs/release-contract.md`:

```md
# Release Contract

The current Momcozy audit site is the private-business edition.

Allowed in generated report pages:
- real operating amount fields
- real KPI labels such as ROI, AOV, monthly revenue, and conversion rate
- historical operating data and current collection evidence

Still forbidden in generated report pages:
- secret keys
- private filesystem paths
- server addresses
- raw data endpoint references
- direct raw structured data file links

Canonical generated routes:
- /
- /metrics.html
- /forensics.html
- /trends.html
- /cross-audit.html
- /404.html

Slashless aliases may work through the static server, but `.html` routes are the source-of-truth routes for tests and documentation.
```

- [ ] **Step 2: Update README identity and route table**

Change the first line from public sanitized language to:

```md
Private-business technical and operating audit of the Momcozy storefront — also a periodic performance monitoring product.
```

Replace the route table with canonical `.html` routes and point readers to `docs/release-contract.md`.

- [ ] **Step 3: Mark old public-boundary docs as historical**

At the top of `docs/predeploy-cross-audit-acceptance-2026-06-14.md` and `docs/legacy-history-migration.md`, add:

```md
> Historical note: this document describes the earlier public-sanitized release boundary. The current release boundary is `docs/release-contract.md`.
```

- [ ] **Step 4: Update review workflow**

Add this checklist item to `docs/review-workflow.md`:

```md
- [ ] Run `npm run test:release-contract` and confirm the edition is `private-business`.
```

- [ ] **Step 5: Verify stale wording no longer controls current docs**

Run:

```bash
rg -n "public sanitized|public-safe|public edition|monetary amounts, business KPIs|private operating conclusions remain outside" README.md docs
```

Expected: hits only in historical notes or explicitly superseded sections.

---

## Phase 3: Make Production Identity Checks Non-Optional

**Files:**
- Modify: `scripts/uptime-monitor.mjs`
- Modify: `.github/workflows/tencent.yml`
- Modify: `ops/uptime-cron.example`
- Modify: `docs/uptime-monitoring.md`
- Test: `tests/uptime-monitor.test.mjs`

- [ ] **Step 1: Add default private-business body markers to uptime monitor**

Modify `scripts/uptime-monitor.mjs` so `EXPECT_BODY_MARKERS` defaults to the release contract markers when unset:

```js
const DEFAULT_EXPECT_BODY_MARKERS = ["路特 AI", "Momcozy", "私密经营"];
const EXPECT_BODY_MARKERS = parseStringList(process.env.UPTIME_EXPECT_BODY_MARKERS || "", DEFAULT_EXPECT_BODY_MARKERS);
```

- [ ] **Step 2: Add a test for default identity markers**

Add a unit test in `tests/uptime-monitor.test.mjs` that imports the monitor helper path used for content checks and asserts missing private-business markers fail.

- [ ] **Step 3: Use the same markers in Tencent post-deploy smoke**

In `.github/workflows/tencent.yml`, extend `expect_chinese_page` to also require the private-business marker. Keep the check in both the remote deploy step and external post-deploy step.

- [ ] **Step 4: Update cron template**

In `ops/uptime-cron.example`, ensure the command exports:

```bash
UPTIME_STRICT=1
UPTIME_REQUIRE_NOINDEX=1
UPTIME_EXPECT_BODY_MARKERS='["路特 AI","Momcozy","私密经营"]'
```

- [ ] **Step 5: Verify production detects stale edition before deploy**

Run before deployment:

```bash
PUBLIC_URL=https://shopify.lute-tlz-dddd.top UPTIME_STRICT=1 UPTIME_REQUIRE_NOINDEX=1 npm run monitor:uptime
```

Expected before deploying the current local release: failure caused by missing private-business marker.

---

## Phase 4: Collapse Source-Of-Truth Ambiguity

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `eleventy.config.mjs`
- Modify or remove: legacy `src/*.njk` and `src/*.html` entry files
- Modify: `scripts/safety-scan-source.mjs`

- [ ] **Step 1: Declare active build source**

Add to `README.md` and `AGENTS.md`:

```md
Active build source: `scripts/build-history-site.mjs` reads `src/_data/public-cross-audit.json` and writes `_site/`.
Legacy Eleventy templates are retained only until the source tree is simplified; they are not the production build path.
```

- [ ] **Step 2: Add an obsolete-template guard**

Create a guard in `scripts/safety-scan-source.mjs` that fails if active release markers appear only in legacy templates but not in `scripts/build-history-site.mjs`.

- [ ] **Step 3: Decide and execute one of two paths**

Path A, minimal: keep legacy templates but move them under `archive/eleventy-legacy/` and exclude them from active docs.

Path B, stronger: remove Eleventy templates and `eleventy.config.mjs` after confirming no workflow calls Eleventy.

Recommended first pass: Path A, because it preserves historical reference while reducing source ambiguity.

- [ ] **Step 4: Verify no workflow uses Eleventy**

Run:

```bash
rg -n "eleventy|\\.njk|src/index\\.njk|src/metrics\\.njk" package.json .github scripts README.md AGENTS.md docs
```

Expected: only archived/historical mentions remain outside `package-lock.json`.

---

## Phase 5: Route Contract Cleanup

**Files:**
- Modify: `scripts/serve.mjs`
- Modify: `scripts/uptime-monitor.mjs`
- Modify: `.github/workflows/tencent.yml`
- Modify: `README.md`
- Modify: `docs/release-contract.md`
- Modify: `tests/e2e.spec.mjs`

- [ ] **Step 1: Make canonical route status explicit**

Add a route test asserting:

```js
const routeExpectations = [
  ["/", 200],
  ["/metrics", 200],
  ["/metrics/", 404],
  ["/metrics.html", 200],
  ["/forensics", 200],
  ["/forensics/", 404],
  ["/forensics.html", 200],
  ["/trends", 200],
  ["/trends/", 404],
  ["/trends.html", 200]
];
```

- [ ] **Step 2: Stop documenting trailing slash routes as primary**

Replace `/metrics/`, `/forensics/`, and `/trends/` in current docs with `.html` routes unless the line is explicitly historical.

- [ ] **Step 3: Update Tencent workflow route checks**

Keep `expect_any_code` for compatibility if needed, but add direct `expect_code 200` checks for `.html` canonical routes and direct `expect_code 404` checks for trailing slash aliases.

- [ ] **Step 4: Verify**

Run:

```bash
npm test
for p in /metrics /metrics/ /metrics.html /forensics /forensics/ /forensics.html /trends /trends/ /trends.html; do
  curl -sS -o /dev/null -w "$p %{http_code}\n" "http://localhost:8080$p"
done
```

Expected: slashless and `.html` routes return 200; trailing slash routes return 404.

---

## Phase 6: Split Large Scripts After Identity Gates

**Files:**
- Split: `scripts/build-history-site.mjs`
- Split: `scripts/uptime-monitor.mjs`
- Test: `tests/e2e.spec.mjs`
- Test: `tests/uptime-monitor.test.mjs`

- [ ] **Step 1: Split build generator by responsibility**

Create:

```text
scripts/history-site/fs.mjs
scripts/history-site/format.mjs
scripts/history-site/layout.mjs
scripts/history-site/sections.mjs
scripts/history-site/pages.mjs
```

Keep `scripts/build-history-site.mjs` as the thin entrypoint.

- [ ] **Step 2: Split uptime monitor by responsibility**

Create:

```text
scripts/uptime/checks.mjs
scripts/uptime/fetch.mjs
scripts/uptime/identity.mjs
scripts/uptime/alerts.mjs
scripts/uptime/webhooks.mjs
scripts/uptime/state.mjs
```

Keep `scripts/uptime-monitor.mjs` as the CLI entrypoint.

- [ ] **Step 3: Move tests to unit-level helpers**

Update `tests/uptime-monitor.test.mjs` to import helpers from the new uptime modules rather than the CLI entrypoint.

- [ ] **Step 4: Verify no behavior changed**

Run:

```bash
npm test
git diff --check
```

Expected: full suite passes with equivalent generated `_site` markers.

---

## Phase 7: Private Data Provenance Manifest

**Files:**
- Create: `docs/private-data-provenance.md`
- Create: `config/private-data-publication-boundary.json`
- Modify: `scripts/validate-release-contract.mjs`

- [ ] **Step 1: Document private-to-site derivation**

Create `docs/private-data-provenance.md` with:

```md
# Private Data Provenance

The generated private-business site includes real KPI values and amount fields approved by the owner.

Publication boundary:
- generated report pages may show summarized operating values and KPI names
- generated report pages must not show raw workbook paths, raw endpoint references, secrets, or server addresses
- source provenance stays in docs and validation notes, not in generated page links
```

- [ ] **Step 2: Add a machine-readable boundary config**

Create `config/private-data-publication-boundary.json`:

```json
{
  "allowed": ["currency amounts", "ROI", "AOV", "monthly revenue", "overall conversion rate", "historical operating data"],
  "forbidden": ["secret keys", "private filesystem paths", "server addresses", "raw endpoint links", "raw structured data file links"]
}
```

- [ ] **Step 3: Validate boundary docs during release contract**

Extend `scripts/validate-release-contract.mjs` to confirm both config files exist and include non-empty `allowed` and `forbidden` sections.

---

## Final Acceptance Gate

- [ ] `npm test` passes.
- [ ] `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- [ ] `git diff --check` passes.
- [ ] Local release contract passes.
- [ ] Production strict monitor fails before deploy when production is still old edition.
- [ ] After deploy, production strict monitor passes with private-business markers.
- [ ] GitHub Actions `Verify and Publish Public Audit` and `Publish Verified Artifact to Tencent` both succeed on the release commit.
- [ ] Manual browser check confirms production has left sidebar, private-business marker, cross-audit current-page anchors, and no old top navigation.
