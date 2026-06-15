# Final Predeploy Audit Implementation Plan

> Historical note: this plan implements the earlier public-sanitized release boundary. The current release boundary is `docs/release-contract.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete a five-round launch-readiness audit before Tencent Cloud deployment.

**Architecture:** Keep the public site strictly sanitized and use local source files, schema checks, built HTML, and browser-level tests as the evidence path. Private operating conclusions remain outside the public site; public pages only state technical evidence and validation boundaries.

**Tech Stack:** Eleventy, Nunjucks, JSON Schema, Node.js test scripts, Playwright e2e, axe accessibility tests.

---

### Task 1: Public Page Boundary Audit

**Files:**
- Read: `src/index.njk`
- Read: `src/metrics.njk`
- Read: `src/forensics.njk`
- Read: `src/trends.njk`
- Read: `src/404.njk`
- Read: `src/assets/site.css`

- [ ] **Step 1: Confirm every page has a public boundary statement**

Run:

```bash
rg -n "Cross-audit|public edition|private operating|revenue claims|business attribution|commercial conclusions" src
```

Expected: hits on Overview, Metrics, Forensics, Trends, and 404.

- [ ] **Step 2: Confirm no public page publishes private operating values**

Run:

```bash
npm run test:source-safety
```

Expected: `public source inputs passed safety scan`.

### Task 2: Narrative And Conclusion Audit

**Files:**
- Read: `src/_data/audit.json`
- Read: `src/index.njk`
- Read: `src/metrics.njk`
- Read: `src/forensics.njk`
- Read: `src/trends.njk`

- [ ] **Step 1: Confirm each public conclusion is tied to a source-backed data block**

Run:

```bash
node -e 'const a=require("./src/_data/audit.json"); console.log(a.metrics.length,a.forensics.length,a.recommendations.length)'
```

Expected: non-zero metric, forensic, and recommendation counts.

- [ ] **Step 2: Confirm every metric and forensic item has source and confidence**

Run:

```bash
node -e 'const a=require("./src/_data/audit.json"); for (const k of ["metrics","forensics"]) for (const [i,x] of a[k].entries()) if (!x.source || !x.confidence || !x.interpretation) throw new Error(`${k} ${i} missing evidence fields`); console.log("evidence fields ok")'
```

Expected: `evidence fields ok`.

### Task 3: Field, Schema, And Link Audit

**Files:**
- Read: `config/public-data.schema.json`
- Read: `config/session.schema.json`
- Read: `src/_data/audit.json`
- Read: `src/_data/sessions/*.json`

- [ ] **Step 1: Validate public data allowlist**

Run:

```bash
npm run test:allowlist
```

Expected: `public data matches the field allowlist`.

- [ ] **Step 2: Validate session schema and links**

Run:

```bash
npm run test:sessions && npm run test:links
```

Expected: session files and built links are checked without failures.

### Task 4: Decision And Recommendation Audit

**Files:**
- Read: `src/_data/audit.json`
- Read: `src/index.njk`

- [ ] **Step 1: Confirm recommendations have validation gates**

Run:

```bash
node -e 'const a=require("./src/_data/audit.json"); for (const [i,x] of a.recommendations.entries()) if (!x.priority || !x.title || !x.action || !x.validation) throw new Error(`recommendation ${i} incomplete`); console.log("recommendations ok")'
```

Expected: `recommendations ok`.

- [ ] **Step 2: Confirm priorities are deploy-allowed**

Run:

```bash
node -e 'const a=require("./src/_data/audit.json"); const ok=new Set(["P0","P1","P2"]); for (const x of a.recommendations) if (!ok.has(x.priority)) throw new Error(x.priority); console.log("priorities ok")'
```

Expected: `priorities ok`.

### Task 5: Full Predeploy Verification

**Files:**
- Read: `package.json`
- Read: `.github/workflows/tencent.yml`
- Read: `ops/README.md`

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: build, safety, link, e2e, and a11y checks pass.

- [ ] **Step 2: Check deployment diff hygiene**

Run:

```bash
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 3: Review Tencent deployment path**

Run:

```bash
sed -n '1,220p' .github/workflows/tencent.yml && sed -n '1,220p' ops/README.md
```

Expected: deploy job uses built artifact and documented server path without exposing internal data.

---

## Five-Round Audit Findings And Optimization Plan

### Round 1: Public Boundary And Sanitization

- [x] Verified every public page carries an explicit public/private boundary.
- [x] Removed legacy private canary route wording from docs, tests, local server checks, uptime monitor, and reference nginx config.
- [x] Current public probe is `/private-audit-canary`; raw structured files are blocked generically instead of publishing private endpoint patterns.
- [x] Added ignore coverage for local raw input workbooks and macOS metadata so they cannot be accidentally staged as release content.
- [x] `npm run test:source-safety` passed after the cleanup.

### Round 2: Narrative And Evidence Discipline

- [x] Verified metrics, forensics, and recommendations all include source/confidence or validation fields.
- [x] Tightened the overview verdict from business-adjacent certainty to a technical-risk statement requiring real-user validation.
- [x] Public conclusion remains: client-side weight, third-party resilience, and LCP observability are engineering risks; business impact is not published here.

### Round 3: Field, Schema, Session, And Page Consistency

- [x] Verified public data schema, session schema, collection config, built links, and generated pages.
- [x] Fixed `sessions.js` so explicit session `confidence` values are preserved instead of being recomputed incorrectly.
- [x] Added an e2e regression asserting the rendered Trends payload keeps legacy manual sessions as `low` and the Jun 10 automated baseline as `medium`.
- [x] Updated `test:e2e` and `test:a11y` so browser checks always build fresh pages before serving `_site`.

### Round 4: Decisions, Recommendations, Deployment, And Monitoring

- [x] Verified every recommendation has `priority`, `title`, `action`, and `validation`.
- [x] Reconciled Tencent deploy smoke tests with the new private canary probe.
- [x] Corrected the Trends methodology-break copy so it matches the newest-first table order.
- [x] Deployment smoke remains artifact-based: build, hash manifest, staging upload, live hash check, HTTP route checks, private canary block, rollback on failure.

### Round 5: Final Verification Gate

- [x] Run full `npm test`.
- [x] Run `git diff --check`.
- [x] Run local static-server smoke for homepage, Metrics, Forensics, Trends, 404, and private canary behavior.
- [x] Review final diff and publish only after all checks pass.

### Remaining Boundaries

- [ ] This public artifact must not claim private business performance, commercial payoff, forbidden private metric names, or product-level commercial causality.
- [ ] Product-detail evidence remains low-confidence until recurring route collection is available and reviewed.
- [ ] External uptime cron still needs to be installed on the target host after deployment; this repository validates the template but does not install production cron.
