import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PRODUCTION_LAYOUT_BASE_URL || process.env.PUBLIC_URL || "https://shopify.lute-tlz-dddd.top";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = process.env.PRODUCTION_LAYOUT_OUTPUT_DIR || path.join("artifacts", `production-layout-audit-${stamp}`);

const pages = [
  {path: "/", key: "index"},
  {path: "/metrics.html", key: "metrics"},
  {path: "/forensics.html", key: "forensics"},
  {path: "/trends.html", key: "trends"},
  {path: "/cross-audit.html", key: "cross-audit"},
];

const viewports = [
  {label: "desktop", width: 1440, height: 900},
  {label: "tablet", width: 820, height: 1180},
  {label: "mobile", width: 390, height: 844},
];

function screenshotName(pageKey, viewportLabel, suffix = "") {
  return `${pageKey}-${viewportLabel}${suffix ? `-${suffix}` : ""}.png`;
}

function issueText(issues) {
  return issues.length ? issues.join("; ") : "PASS";
}

function markdownReport({generatedAt, checks}) {
  return [
    "# Production layout audit",
    "",
    `- Generated at: ${generatedAt}`,
    `- Base URL: ${baseUrl}`,
    `- Checks: ${checks.length}`,
    `- Failed checks: ${checks.filter((item) => item.issues.length).length}`,
    "",
    "| Page | Viewport | Status | Sections | Anchors | Overflow | Issues |",
    "|---|---|---:|---:|---:|---:|---|",
    ...checks.map((item) => `| ${item.page} | ${item.viewport.label} ${item.viewport.width}x${item.viewport.height} | ${item.status} | ${item.state.sectionCount} | ${item.state.sideNavAnchors} | ${item.state.docOverflow}px | ${issueText(item.issues)} |`),
    "",
    "## Screenshots",
    "",
    ...checks.flatMap((item) => {
      const rows = [`- ${item.page} ${item.viewport.label}: ${item.screenshot}`];
      if (item.competitorScreenshot) rows.push(`- ${item.page} ${item.viewport.label} competitor-recollect: ${item.competitorScreenshot}`);
      return rows;
    }),
  ].join("\n");
}

function buildIssues({responseStatus, consoleErrors, pageErrors, state, pageKey, viewportLabel}) {
  const issues = [];
  if (responseStatus !== 200) issues.push(`status ${responseStatus}`);
  if (consoleErrors.length) issues.push(`console errors: ${consoleErrors.length}`);
  if (pageErrors.length) issues.push(`page errors: ${pageErrors.length}`);
  if (state.lang !== "zh-CN") issues.push(`lang ${state.lang}`);
  if (!state.hasChinese) issues.push("missing Chinese text");
  if (!state.hasBrand) issues.push("missing brand text");
  if (state.docOverflow > 0) issues.push(`document overflow ${state.docOverflow}px`);
  if (state.activeLinks !== 1) issues.push(`active nav links ${state.activeLinks}`);
  if (viewportLabel === "desktop" && state.navPosition !== "fixed") issues.push(`desktop nav position ${state.navPosition}`);
  if (viewportLabel !== "desktop" && state.navPosition !== "relative") issues.push(`${viewportLabel} nav position ${state.navPosition}`);
  if (state.sideNavOverlap) issues.push("sidebar overlaps content");
  if (state.missingAnchorTargets.length) issues.push(`missing anchor targets ${state.missingAnchorTargets.map((item) => item.href).join(", ")}`);
  if (state.tableIssues.length) issues.push(`table scroller issues ${state.tableIssues.length}`);
  if (state.textOverflowIssues.length) issues.push(`text overflow issues ${state.textOverflowIssues.length}`);
  if (pageKey === "cross-audit") {
    if (!state.competitor) issues.push("missing competitor recollect section");
    else {
      if (state.competitor.routeRows < 4) issues.push(`competitor route rows ${state.competitor.routeRows}`);
      if (state.competitor.taskRows < 4) issues.push(`competitor task rows ${state.competitor.taskRows}`);
      if (!state.competitor.containsC01) issues.push("competitor task C-01 missing");
      if (!state.competitor.containsDeliverables) issues.push("competitor deliverables missing");
    }
  }
  return issues;
}

async function inspectPage(page, {pageInfo, viewport}) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const url = new URL(pageInfo.path, baseUrl).toString();
  const response = await page.goto(url, {waitUntil: "networkidle", timeout: 45_000});
  const screenshot = screenshotName(pageInfo.key, viewport.label);
  await page.screenshot({path: path.join(outputDir, screenshot), fullPage: false});

  let competitorScreenshot = "";
  if (pageInfo.key === "cross-audit") {
    await page.locator("#competitor-recollect").scrollIntoViewIfNeeded();
    competitorScreenshot = screenshotName(pageInfo.key, viewport.label, "competitor-recollect");
    await page.screenshot({path: path.join(outputDir, competitorScreenshot), fullPage: false});
  }

  const state = await page.evaluate((viewportLabel) => {
    const rect = (el) => {
      if (!el) return null;
      const bounds = el.getBoundingClientRect();
      return {
        left: Math.round(bounds.left),
        top: Math.round(bounds.top),
        right: Math.round(bounds.right),
        bottom: Math.round(bounds.bottom),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      };
    };
    const sideNav = document.querySelector(".side-nav");
    const shell = document.querySelector(".content-shell");
    const sidebarRect = sideNav?.getBoundingClientRect();
    const shellRect = shell?.getBoundingClientRect();
    const tableIssues = Array.from(document.querySelectorAll(".cross-table-wrap, .matrix-wrap, .sessions-wrap"))
      .map((el, index) => {
        const style = getComputedStyle(el);
        return {
          index,
          className: el.className,
          overflowX: style.overflowX,
          clientWidth: Math.round(el.clientWidth),
          scrollWidth: Math.round(el.scrollWidth),
          hasScroller: el.scrollWidth > el.clientWidth,
        };
      })
      .filter((item) => item.hasScroller && !["auto", "scroll"].includes(item.overflowX));
    const textOverflowIssues = Array.from(document.querySelectorAll("a, button, .badge, .side-stat span, .card-value, .side-nav__link span, .side-nav__anchor, h1, h2, h3"))
      .map((el) => {
        const style = getComputedStyle(el);
        const overflowAllowed = ["auto", "scroll", "hidden"].includes(style.overflowX) || style.whiteSpace === "normal";
        return {
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          tag: el.tagName.toLowerCase(),
          className: typeof el.className === "string" ? el.className : "",
          scrollWidth: Math.round(el.scrollWidth),
          clientWidth: Math.round(el.clientWidth),
          overflowX: style.overflowX,
          whiteSpace: style.whiteSpace,
          overflowAllowed,
        };
      })
      .filter((item) => item.scrollWidth > item.clientWidth + 2 && !item.overflowAllowed);
    const sideNavAnchors = Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => ({
      text: anchor.textContent.trim(),
      href: anchor.getAttribute("href"),
    }));
    const missingAnchorTargets = sideNavAnchors
      .map((anchor) => ({...anchor, hash: anchor.href?.split("#")[1] || ""}))
      .filter((anchor) => anchor.hash && !document.getElementById(anchor.hash));
    const doc = document.documentElement;
    const competitorTables = Array.from(document.querySelectorAll("#competitor-recollect table"));
    return {
      title: document.title,
      lang: document.documentElement.lang,
      hasChinese: /[一-龥]/.test(document.body.innerText || ""),
      hasBrand: document.body.innerText.includes("路特 AI") && document.body.innerText.includes("Momcozy"),
      docOverflow: doc.scrollWidth - doc.clientWidth,
      navPosition: sideNav ? getComputedStyle(sideNav).position : "",
      activeLinks: document.querySelectorAll(".side-nav__link--active").length,
      sideNav: rect(sideNav),
      shell: rect(shell),
      sideNavOverlap: viewportLabel === "desktop" && sidebarRect && shellRect ? sidebarRect.right > shellRect.left + 2 : false,
      sideNavAnchors: sideNavAnchors.length,
      sectionCount: document.querySelectorAll(".section").length,
      missingAnchorTargets,
      tableIssues,
      textOverflowIssues,
      competitor: document.querySelector("#competitor-recollect") ? {
        routeRows: competitorTables[0]?.querySelectorAll("tbody tr").length || 0,
        taskRows: competitorTables[1]?.querySelectorAll("tbody tr").length || 0,
        containsC01: document.querySelector("#competitor-recollect")?.textContent.includes("C-01") || false,
        containsDeliverables: document.querySelector("#competitor-recollect")?.textContent.includes("交付项") || false,
      } : null,
    };
  }, viewport.label);

  const status = response?.status() || 0;
  return {
    page: pageInfo.path,
    viewport,
    url,
    status,
    screenshot,
    competitorScreenshot,
    consoleErrors,
    pageErrors,
    state,
    issues: buildIssues({responseStatus: status, consoleErrors, pageErrors, state, pageKey: pageInfo.key, viewportLabel: viewport.label}),
  };
}

fs.mkdirSync(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
const checks = [];

try {
  for (const pageInfo of pages) {
    for (const viewport of viewports) {
      const page = await browser.newPage({viewport});
      try {
        checks.push(await inspectPage(page, {pageInfo, viewport}));
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

const generatedAt = new Date().toISOString();
const report = {
  generatedAt,
  baseUrl,
  outputDir,
  totalChecks: checks.length,
  failedChecks: checks.filter((item) => item.issues.length).length,
  checks,
};
fs.writeFileSync(path.join(outputDir, "production-layout-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outputDir, "production-layout-audit.md"), markdownReport({generatedAt, checks}));

console.log(JSON.stringify({
  outputDir,
  totalChecks: report.totalChecks,
  failedChecks: report.failedChecks,
}, null, 2));

if (report.failedChecks) {
  process.exit(1);
}
