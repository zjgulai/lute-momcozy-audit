import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { contentMinimumTextLength, pageComponentMap } from "./page-structure-contract.mjs";

const localSiteRoot = path.resolve("_site");
const publicUrl = process.env.PROD_BASE_URL || "https://shopify.lute-tlz-dddd.top";
const reportPath = process.env.RELEASE_PARITY_REPORT_PATH || "";
const includeComponentStates = process.env.RELEASE_PARITY_SECTIONS === "0" ? false : true;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function htmlPath(routePath) {
  if (routePath === "/") return path.join(localSiteRoot, "index.html");
  return path.join(localSiteRoot, routePath.replace(/^\//, ""));
}

function localUrl(routePath) {
  return pathToFileURL(htmlPath(routePath)).href;
}

async function inspectPage(routePath, context, url) {
  const page = await context.newPage();
  let response;
  try {
    response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
  } catch (error) {
    await page.close();
    fail(`failed to open ${url}: ${error.message}`);
  }

  if (!url.startsWith("file://") && response.status() !== 200) {
    await page.close();
    fail(`${routePath}: production status ${response.status()}`);
  }

  const required = pageComponentMap[routePath];
  const sectionStates = {};
  const misses = [];
  let sideNavLinks = 0;
  let sectionCount = 0;

  for (const id of required) {
    const locator = page.locator(`#${id}`);
    const count = await locator.count();
    if (count !== 1) {
      misses.push(`${id}:${count}`);
      // still collect partial state so comparison can surface missing in both sides consistently
      sectionStates[id] = {
        present: false,
        count,
      };
      continue;
    }

    const state = await locator.evaluate((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const tables = Array.from(el.querySelectorAll("table"));
      const rows = tables.map((table) => table.querySelectorAll("tbody tr").length);
      const firstTableRows = rows.length ? Math.max(...rows) : 0;
      return {
        textLength: text.length,
        tableCount: tables.length,
        maxTableRows: firstTableRows,
      };
    });
    if (state.textLength <= contentMinimumTextLength) {
      misses.push(`${id}:low-text`);
    }
    if (state.tableCount > 0 && state.maxTableRows === 0) {
      misses.push(`${id}:empty-table`);
    }
    sectionStates[id] = {
      present: true,
      ...state,
    };
  }

  sideNavLinks = await page.locator(".side-nav__anchor").count();
  sectionCount = await page.locator(".section").count();

  await page.close();
  return {
    routePath,
    url,
    sectionStates,
    sectionCount,
    sideNavLinks,
    misses,
    rawStatus: url.startsWith("file://") ? 200 : response.status(),
  };
}

function pickRequiredSections(sectionStates, required) {
  const rows = [];
  for (const id of required) {
    const section = sectionStates[id];
    rows.push({
      id,
      present: !!section?.present,
      textLength: section?.textLength ?? 0,
      tableCount: section?.tableCount ?? 0,
      maxTableRows: section?.maxTableRows ?? 0,
      count: section?.count ?? 0,
    });
  }
  return rows;
}

function compare(localInspection, remoteInspection) {
  const localStates = localInspection.sectionStates;
  const remoteStates = remoteInspection.sectionStates;
  const route = localInspection.routePath;
  const required = pageComponentMap[route];
  const routeIssues = [];

  for (const id of required) {
    const localSection = localStates[id];
    const remoteSection = remoteStates[id];
    if (!localSection?.present) routeIssues.push(`${id} missing locally`);
    if (!remoteSection?.present) routeIssues.push(`${id} missing in production`);
    if (
      localSection?.present &&
      remoteSection?.present &&
      localSection.textLength <= 0 &&
      remoteSection.textLength <= 0
    ) {
      routeIssues.push(`${id} empty on both environments`);
    }
  }

  if (localInspection.sideNavLinks < 3) routeIssues.push(`local side-nav anchors only ${localInspection.sideNavLinks}`);
  if (remoteInspection.sideNavLinks < 3) routeIssues.push(`production side-nav anchors only ${remoteInspection.sideNavLinks}`);
  if (Math.abs(localInspection.sectionCount - remoteInspection.sectionCount) > 3) {
    routeIssues.push(`section count drift local=${localInspection.sectionCount}, prod=${remoteInspection.sectionCount}`);
  }

  return routeIssues;
}

async function main() {
  for (const htmlFile of ["index.html", "metrics.html", "forensics.html", "trends.html", "cross-audit.html"]) {
    if (!fs.existsSync(path.join(localSiteRoot, htmlFile))) {
      fail(`missing local build artifact: ${htmlFile}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const hasErrors = [];
  const routeReports = [];
  let localSectionTotal = 0;
  let remoteSectionTotal = 0;

  for (const routePath of Object.keys(pageComponentMap)) {
    const local = await inspectPage(routePath, context, localUrl(routePath));
    const remoteUrl = new URL(routePath === "/" ? "/" : routePath, publicUrl).toString();
    const remote = await inspectPage(routePath, context, remoteUrl);
    const required = pageComponentMap[routePath];

    const routeIssues = compare(local, remote);
    for (const id of local.misses) {
      routeIssues.push(`local quality issue ${id}`);
    }
    for (const id of remote.misses) {
      routeIssues.push(`prod quality issue ${id}`);
    }
    localSectionTotal += local.sectionCount;
    remoteSectionTotal += remote.sectionCount;

    routeReports.push({
      routePath,
      local: {
        url: local.url,
        status: local.rawStatus,
        sectionCount: local.sectionCount,
        sideNavLinks: local.sideNavLinks,
        sections: includeComponentStates ? pickRequiredSections(local.sectionStates, required) : undefined,
      },
      prod: {
        url: remote.url,
        status: remote.rawStatus,
        sectionCount: remote.sectionCount,
        sideNavLinks: remote.sideNavLinks,
        sections: includeComponentStates ? pickRequiredSections(remote.sectionStates, required) : undefined,
      },
      issues: routeIssues,
    });

    if (routeIssues.length) {
      hasErrors.push({
        route: routePath,
        local: local.url,
        remote: remote.url,
        issues: routeIssues,
      });
    }

    console.log(`[parity] ${routePath}`);
    console.log(`  local: status=${local.rawStatus}, sections=${local.sectionCount}, anchors=${local.sideNavLinks}`);
    console.log(`  prod:  status=${remote.rawStatus}, sections=${remote.sectionCount}, anchors=${remote.sideNavLinks}`);
  }

  await context.close();
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    publicUrl,
    localSiteRoot,
    routeCount: Object.keys(pageComponentMap).length,
    totalSections: {
      local: localSectionTotal,
      prod: remoteSectionTotal,
    },
    routes: routeReports,
    summary: {
      ok: hasErrors.length === 0,
      issueCount: hasErrors.length,
    },
  };

  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), {recursive: true});
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[parity] report written to ${reportPath}`);
  }

  if (hasErrors.length > 0) {
    for (const item of hasErrors) {
      console.error(`${item.route} parity issues:`);
      for (const issue of item.issues) {
        console.error(`  - ${issue}`);
      }
    }
    fail("release parity validation failed");
  }

  console.log("release parity validation passed for structure and quality checks");
}

await main();
