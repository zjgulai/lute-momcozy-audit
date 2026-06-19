import {chromium} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import {
  computeCompetitorSnapshotSummary,
  summarizeRobots,
  validateCompetitorSnapshot
} from "./competitor-recollect-lib.mjs";

const CONFIG_PATH = process.env.COMPETITOR_CONFIG || "config/competitor-recollect.json";
const OUT_DIR = process.env.COMPETITOR_OUTPUT_DIR || "src/_data/competitors";
const now = new Date();
const DATE = process.env.COMPETITOR_SNAPSHOT_DATE || [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0")
].join("-");
const OUT_PATH = path.resolve(OUT_DIR, `${DATE}.json`);
const FORCE = process.env.COMPETITOR_FORCE === "1";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

if (fs.existsSync(OUT_PATH) && !FORCE) {
  console.log(`Competitor snapshot ${DATE} already exists at ${OUT_PATH}, skipping.`);
  process.exit(0);
}

if (!Array.isArray(config.competitors) || config.competitors.length === 0) {
  throw new Error(`${CONFIG_PATH}: competitors must be a non-empty array`);
}

console.log(`[competitors] config=${CONFIG_PATH} methodology=${config.methodologyVersion} competitors=${config.competitors.length}`);

const competitors = [];
for (const [index, competitor] of config.competitors.entries()) {
  console.log(`[competitors] ${index + 1}/${config.competitors.length} ${competitor.id} start`);
  competitors.push(await collectCompetitor(competitor));
}
const snapshot = {
  sessionId: `competitor-recollect-${DATE}`,
  observedAt: DATE,
  collectedBy: "Playwright public competitor sampler",
  methodologyVersion: config.methodologyVersion || "competitor-recollect-v1",
  samplePolicy: config.samplePolicy || "",
  competitors
};
snapshot.summary = computeCompetitorSnapshotSummary(snapshot);
validateCompetitorSnapshot(snapshot);
fs.mkdirSync(OUT_DIR, {recursive: true});
fs.writeFileSync(OUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`[competitors] wrote ${OUT_PATH}`);
console.log(`[competitors] summary=${JSON.stringify(snapshot.summary)}`);

async function collectCompetitor(competitor) {
  const robots = await collectRobots(competitor.homepageUrl);
  const pageSpecs = [
    ["homepage", competitor.homepageUrl, true],
    ["pdp", competitor.pdpUrl, true],
    ["cart", competitor.cartUrl, false]
  ];
  const pages = [];
  for (const [routeId, url, collectViewports] of pageSpecs) {
    const statusProbe = await probeStatus(url);
    const pageResult = {
      routeId,
      status: statusProbe.status,
      finalUrlHost: statusProbe.finalUrlHost,
      viewports: [],
      signals: statusProbe.signals
    };
    if (collectViewports && statusProbe.status >= 200 && statusProbe.status < 400) {
      console.log(`[competitors] ${competitor.id}/${routeId} desktop start`);
      pageResult.viewports.push(await runViewport(competitor, routeId, url, 1440, 900, "desktop"));
      console.log(`[competitors] ${competitor.id}/${routeId} mobile start`);
      pageResult.viewports.push(await runViewport(competitor, routeId, url, 390, 844, "mobile"));
    } else if (!collectViewports) {
      console.log(`[competitors] ${competitor.id}/${routeId} status=${statusProbe.status}`);
    } else {
      console.log(`[competitors] ${competitor.id}/${routeId} skipped viewports status=${statusProbe.status}`);
    }
    pages.push(pageResult);
  }
  return {
    id: competitor.id,
    label: competitor.label,
    category: competitor.category,
    homepageUrl: competitor.homepageUrl,
    pdpUrl: competitor.pdpUrl,
    cartUrl: competitor.cartUrl,
    robots,
    pages
  };
}

async function collectRobots(homepageUrl) {
  const robotsUrl = new URL("/robots.txt", homepageUrl).toString();
  try {
    const response = await fetch(robotsUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {"user-agent": "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"}
    });
    const text = await response.text();
    return {
      status: response.status,
      finalUrlHost: safeHost(response.url),
      ...summarizeRobots(text)
    };
  } catch (error) {
    return {
      status: 0,
      finalUrlHost: safeHost(robotsUrl),
      errorType: error.name === "TimeoutError" ? "timeout" : "fetch_failed",
      disallowCount: 0,
      sitemapCount: 0,
      blocksAllGenericBots: false,
      botPolicies: {
        gptbot: "unspecified",
        googlebot: "unspecified",
        adsbotGoogle: "unspecified",
        ahrefsbot: "unspecified",
        semrushbot: "unspecified"
      }
    };
  }
}

async function probeStatus(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {"user-agent": "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"}
    });
    const html = await response.text().catch(() => "");
    return {
      status: response.status,
      finalUrlHost: safeHost(response.url),
      signals: extractCommerceSignals(html)
    };
  } catch (error) {
    return {
      status: 0,
      finalUrlHost: safeHost(url),
      signals: {addToCartText: false, checkoutText: false, reviewText: false},
      errorType: error.name === "TimeoutError" ? "timeout" : "fetch_failed"
    };
  }
}

async function runViewport(competitor, routeId, url, width, height, label) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: {width, height},
    userAgent: "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"
  });
  const page = await context.newPage();
  const baseDomain = baseDomainFromUrl(url);
  let thirdPartyFailures = 0;
  let consoleErrors = 0;
  let pageErrors = 0;
  let lcpTimedOut = false;

  page.on("requestfailed", (req) => {
    const reqHost = safeHost(req.url());
    if (reqHost && !reqHost.endsWith(baseDomain)) thirdPartyFailures++;
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors++;
  });
  page.on("pageerror", () => {
    pageErrors++;
  });

  await page.addInitScript(() => {
    window.__longTaskCount = 0;
    const observer = new PerformanceObserver((list) => {
      window.__longTaskCount += list.getEntries().length;
    });
    observer.observe({type: "longtask", buffered: true});
  });

  const response = await page.goto(url, {waitUntil: "load", timeout: 90_000});
  const status = response?.status() || 0;
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  // Wait for networkidle to let CDN images register as LCP candidates.
  await page.waitForLoadState("networkidle", {timeout: 12_000}).catch(() => {});

  await page.waitForFunction(
    () => performance.getEntriesByType("largest-contentful-paint").length > 0,
    {timeout: 35_000}
  ).catch(() => {
    lcpTimedOut = true;
  });
  await page.waitForTimeout(1500).catch(() => {});

  const raw = await page.evaluate((timedOut) => {
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((e) => e.name === "first-contentful-paint")?.startTime ?? null;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length > 0 ? lcpEntries.at(-1).startTime : null;
    let cls = 0;
    for (const entry of performance.getEntriesByType("layout-shift")) {
      if (!entry.hadRecentInput) cls += entry.value;
    }
    let tbt = 0;
    for (const entry of performance.getEntriesByType("longtask")) {
      tbt += Math.max(0, entry.duration - 50);
    }
    const nav = performance.getEntriesByType("navigation")[0];
    const images = [...document.images];
    const isWebp = (img) => {
      const source = [img.currentSrc, img.src, img.srcset].filter(Boolean).join(" ").toLowerCase();
      return source.includes(".webp") || source.includes("format=webp");
    };
    const text = document.body?.innerText || "";
    return {
      fcp: fcp !== null ? Math.round(fcp / 10) / 100 : null,
      lcp: lcp !== null ? Math.round(lcp / 10) / 100 : null,
      lcpNullReason: lcp === null ? (timedOut ? "lcp_unobserved_in_timeout" : "lcp_not_observable_in_session") : null,
      ttfb: nav ? Math.round(nav.responseStart - nav.fetchStart) : null,
      cls: Math.round(cls * 10000) / 10000,
      tbt: Math.round(tbt),
      domNodes: document.querySelectorAll("*").length,
      longTasks: window.__longTaskCount ?? 0,
      loadEventMs: nav ? Math.round(nav.loadEventEnd - nav.fetchStart) : null,
      scriptTags: document.scripts.length,
      iframeCount: document.querySelectorAll("iframe").length,
      imagesTotal: images.length,
      imagesWebp: images.filter(isWebp).length,
      missingAlt: images.filter((img) => !img.hasAttribute("alt") || img.getAttribute("alt").trim() === "").length,
      addToCartText: /add\\s+to\\s+cart|add\\s+to\\s+bag/i.test(text),
      checkoutText: /checkout/i.test(text),
      reviewText: /reviews?|rating/i.test(text)
    };
  }, lcpTimedOut).catch(() => ({
    fcp: null, lcp: null, lcpNullReason: "context_closed", ttfb: null,
    cls: 0, tbt: 0, domNodes: 0, longTasks: 0, loadEventMs: null,
    scriptTags: 0, iframeCount: 0, imagesTotal: 0, imagesWebp: 0, missingAlt: 0,
    addToCartText: false, checkoutText: false, reviewText: false
  }));

  const resourceSummary = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    return {
      totalRequests: resources.length,
      transferKb: Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024),
      jsKb: Math.round(resources.filter((r) => r.initiatorType === "script").reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024)
    };
  }).catch(() => ({totalRequests: 0, transferKb: 0, jsKb: 0}));

  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  const metrics = {
    status,
    lcp: raw.lcp,
    lcpNullReason: raw.lcpNullReason,
    fcp: raw.fcp,
    ttfb: raw.ttfb,
    cls: raw.cls,
    tbt: raw.tbt,
    domNodes: raw.domNodes,
    longTasks: raw.longTasks,
    totalRequests: resourceSummary.totalRequests,
    transferKb: resourceSummary.transferKb,
    jsKb: resourceSummary.jsKb,
    thirdPartyFailures,
    consoleErrors,
    pageErrors,
    loadEventMs: raw.loadEventMs,
    scriptTags: raw.scriptTags,
    iframeCount: raw.iframeCount,
    imagesTotal: raw.imagesTotal,
    imagesWebp: raw.imagesWebp,
    imagesWebpPct: raw.imagesTotal > 0 ? Math.round((raw.imagesWebp / raw.imagesTotal) * 10000) / 100 : 0,
    missingAlt: raw.missingAlt
  };
  console.log(`[competitors] ${competitor.id}/${routeId} ${label} done status=${status} jsKb=${metrics.jsKb} 3p=${metrics.thirdPartyFailures} errors=${metrics.consoleErrors + metrics.pageErrors}`);
  return {
    label,
    width,
    height,
    metrics,
    signals: {
      addToCartText: raw.addToCartText,
      checkoutText: raw.checkoutText,
      reviewText: raw.reviewText
    }
  };
}

function extractCommerceSignals(html) {
  const text = String(html || "");
  return {
    addToCartText: /add\s+to\s+cart|add\s+to\s+bag/i.test(text),
    checkoutText: /checkout/i.test(text),
    reviewText: /reviews?|rating/i.test(text)
  };
}

function baseDomainFromUrl(url) {
  const host = safeHost(url);
  const parts = host.split(".");
  return parts.slice(-2).join(".");
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
