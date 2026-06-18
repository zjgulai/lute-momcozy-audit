import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { contentMinimumTextLength, pageComponentMap } from "./page-structure-contract.mjs";

const localSiteRoot = path.resolve("_site");
const publicUrl = process.env.PROD_BASE_URL || "https://shopify.lute-tlz-dddd.top";
const reportPath = process.env.RELEASE_PARITY_REPORT_PATH || "";
const includeComponentStates = process.env.RELEASE_PARITY_SECTIONS === "0" ? false : true;
const productionMissingSectionAllowlist = parseProductionMissingSectionAllowlist(process.env.RELEASE_PARITY_ALLOW_PROD_MISSING_SECTIONS || "");

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

function parseProductionMissingSectionAllowlist(value) {
  const allowlist = new Map();
  for (const token of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    const [routePath, id] = token.split(":");
    if (!routePath) continue;
    const normalizedRoute = routePath.startsWith("/") ? routePath : `/${routePath}`;
    if (!allowlist.has(normalizedRoute)) allowlist.set(normalizedRoute, new Set());
    if (!id) {
      allowlist.get(normalizedRoute).add("*");
      continue;
    }
    allowlist.get(normalizedRoute).add(id);
  }
  return allowlist;
}

function allowsProductionMissingRoute(routePath) {
  const ids = productionMissingSectionAllowlist.get(routePath);
  return !!ids?.has("*");
}

function allowsProductionMissingSection(routePath, id) {
  return productionMissingSectionAllowlist.get(routePath)?.has(id) || false;
}

async function inspectPage(routePath, context, url, options = {}) {
  const {allowMissingRoute = false} = options;
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
    if (allowMissingRoute) {
      await page.close();
      return {
        routePath,
        url,
        sectionStates: {},
        sectionCount: 0,
        sideNavAnchorLinks: 0,
        sideNavMainLinks: 0,
        misses: [],
        rawStatus: response.status(),
      };
    }
    await page.close();
    fail(`${routePath}: production status ${response.status()}`);
  }

  const required = pageComponentMap[routePath];
  const sectionStates = {};
  const misses = [];
  let sideNavAnchorLinks = 0;
  let sideNavMainLinks = 0;
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

  sideNavAnchorLinks = await page.locator(".side-nav__anchor").count();
  sideNavMainLinks = await page.locator(".side-nav__link").count();
  sectionCount = await page.locator(".section").count();

  await page.close();
  return {
    routePath,
    url,
    sectionStates,
    sectionCount,
    sideNavAnchorLinks,
    sideNavMainLinks,
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

function compare(localInspection, remoteInspection, routeAllowedMissing = false) {
  const localStates = localInspection.sectionStates;
  const remoteStates = remoteInspection.sectionStates;
  const route = localInspection.routePath;
  const required = pageComponentMap[route];
  const routeIssues = [];

  if (remoteInspection.rawStatus !== 200 && routeAllowedMissing) {
    return routeIssues;
  }

  for (const id of required) {
    const localSection = localStates[id];
    const remoteSection = remoteStates[id];
    if (!localSection?.present) routeIssues.push(`${id} missing locally`);
    if (!remoteSection?.present && !allowsProductionMissingSection(route, id)) {
      routeIssues.push(`${id} missing in production`);
    }
    if (
      localSection?.present &&
      remoteSection?.present &&
      localSection.textLength <= 0 &&
      remoteSection.textLength <= 0
    ) {
      routeIssues.push(`${id} empty on both environments`);
    }
  }

  if (localInspection.sideNavMainLinks < 5) {
    routeIssues.push(`local main navigation links only ${localInspection.sideNavMainLinks}`);
  }
  if (remoteInspection.sideNavMainLinks < 5) {
    routeIssues.push(`production main navigation links only ${remoteInspection.sideNavMainLinks}`);
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
    const allowMissingRoute = allowsProductionMissingRoute(routePath);
    const remote = await inspectPage(routePath, context, remoteUrl, {allowMissingRoute});
    const required = pageComponentMap[routePath];

    const routeIssues = compare(local, remote, allowMissingRoute);
    for (const id of local.misses) {
      routeIssues.push(`local quality issue ${id}`);
    }
    for (const id of remote.misses) {
      const sectionId = id.split(":")[0];
      if (allowsProductionMissingSection(routePath, sectionId)) continue;
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
        sideNavAnchorLinks: local.sideNavAnchorLinks,
        sideNavMainLinks: local.sideNavMainLinks,
        sections: includeComponentStates ? pickRequiredSections(local.sectionStates, required) : undefined,
      },
      prod: {
        url: remote.url,
        status: remote.rawStatus,
        sectionCount: remote.sectionCount,
        sideNavAnchorLinks: remote.sideNavAnchorLinks,
        sideNavMainLinks: remote.sideNavMainLinks,
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
    console.log(
      `  local: status=${local.rawStatus}, sections=${local.sectionCount}, mainNav=${local.sideNavMainLinks}, anchors=${local.sideNavAnchorLinks}`,
    );
    console.log(
      `  prod:  status=${remote.rawStatus}, sections=${remote.sectionCount}, mainNav=${remote.sideNavMainLinks}, anchors=${remote.sideNavAnchorLinks}`,
    );
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
