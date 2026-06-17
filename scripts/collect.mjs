import {chromium} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const TARGET_URL = process.env.AUDIT_TARGET_URL;
if (!TARGET_URL) {
  console.error("AUDIT_TARGET_URL environment variable is required");
  process.exit(1);
}

const now = new Date();
const DATE = process.env.AUDIT_SESSION_DATE || [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0")
].join("-");
const SESSION_ID = `session-${DATE}`;
const OUT_DIR = process.env.AUDIT_OUTPUT_DIR || "src/_data/sessions";
const OUT_PATH = path.resolve(OUT_DIR, `${DATE}.json`);
const ROUTE_CONFIG_PATH = process.env.AUDIT_ROUTE_CONFIG || "config/collection-routes.json";
const ROUTE_CONFIG = readRouteConfig(ROUTE_CONFIG_PATH);
const METHODOLOGY_VERSION = ROUTE_CONFIG.methodologyVersion || "collector-v3-route-aggregate";
const REQUESTED_ROUTE_IDS = (process.env.AUDIT_ROUTE_IDS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (fs.existsSync(OUT_PATH)) {
  console.log(`Session ${DATE} already exists at ${OUT_PATH}, skipping.`);
  process.exit(0);
}

const BASE_DOMAIN = new URL(TARGET_URL).hostname.split(".").slice(-2).join(".");

const MAX_ATTEMPTS = 3;
let lastError;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  if (attempt > 1) {
    const delay = (attempt - 1) * 5000;
    console.log(`Retry ${attempt}/${MAX_ATTEMPTS} after ${delay}ms...`);
    await new Promise((r) => setTimeout(r, delay));
  }

  const browser = await chromium.launch();
  try {
    const result = await collect(browser);
    await browser.close();
    writeSession(result);
    process.exit(0);
  } catch (err) {
    lastError = err;
    console.error(`Attempt ${attempt} failed: ${err.message}`);
    await browser.close();
  }
}

console.error(`All ${MAX_ATTEMPTS} attempts failed. Last error:`, lastError?.message);
process.exit(1);

async function collect(browser) {
  const configuredRoutes = selectRoutes(ROUTE_CONFIG.routes, REQUESTED_ROUTE_IDS);
  console.log(`[collect] config=${ROUTE_CONFIG_PATH} methodology=${METHODOLOGY_VERSION} routes=${configuredRoutes.length}`);
  const routes = [];
  for (const [index, route] of configuredRoutes.entries()) {
    console.log(`[collect] route ${index + 1}/${configuredRoutes.length} ${route.id} desktop start`);
    const desktop = await runViewport(browser, route, 1440, 900, "desktop");
    logViewportResult(route, desktop);
    console.log(`[collect] route ${index + 1}/${configuredRoutes.length} ${route.id} mobile start`);
    const mobile  = await runViewport(browser, route, 390,  844, "mobile");
    logViewportResult(route, mobile);
    routes.push({
      routeId: route.id,
      label: route.label,
      path: route.path,
      primary: Boolean(route.primary),
      viewports: [desktop, mobile]
    });
  }
  return {routes};
}

function selectRoutes(routes, requestedIds) {
  if (requestedIds.length === 0) return routes;
  const routeMap = new Map(routes.map((route) => [route.id, route]));
  const missing = requestedIds.filter((id) => !routeMap.has(id));
  if (missing.length > 0) {
    throw new Error(`AUDIT_ROUTE_IDS includes unknown route(s): ${missing.join(", ")}`);
  }
  return requestedIds.map((id) => routeMap.get(id));
}

function logViewportResult(route, viewport) {
  const metrics = viewport.metrics;
  console.log([
    `[collect] route ${route.id} ${viewport.label} done`,
    `lcp=${metrics.lcp ?? "N/A"}`,
    `fcp=${metrics.fcp ?? "N/A"}`,
    `ttfb=${metrics.ttfb ?? "N/A"}`,
    `jsKb=${metrics.jsKb ?? "N/A"}`,
    `3p=${metrics.thirdPartyFailures}`,
    `errors=${metrics.consoleErrors + metrics.pageErrors}`
  ].join(" "));
}

async function runViewport(browser, route, width, height, label) {
  const context = await browser.newContext({
    viewport: {width, height},
    userAgent: "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"
  });
  const page = await context.newPage();

  let thirdPartyFailures = 0;
  let consoleErrors = 0;
  let pageErrors = 0;
  let lcpTimedOut = false;

  page.on("requestfailed", (req) => {
    const reqHost = (() => { try { return new URL(req.url()).hostname; } catch { return ""; } })();
    if (!reqHost.endsWith(BASE_DOMAIN)) thirdPartyFailures++;
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

  const routeUrl = new URL(route.path, TARGET_URL).toString();
  const response = await page.goto(routeUrl, {waitUntil: "load", timeout: 90_000});

  if (!response || response.status() >= 400) {
    await context.close();
    throw new Error(`HTTP ${response?.status()} from ${route.id}`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  await page.waitForFunction(
    () => performance.getEntriesByType("largest-contentful-paint").length > 0,
    {timeout: 25_000}
  ).catch(() => {
    lcpTimedOut = true;
  });

  await page.waitForTimeout(2000);

  const raw = await page.evaluate((timedOut) => {
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((e) => e.name === "first-contentful-paint")?.startTime ?? null;

    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length > 0 ? lcpEntries.at(-1).startTime : null;
    const lcpNullReason = lcp === null
      ? (timedOut ? "lcp_unobserved_in_timeout" : "lcp_not_observable_in_session")
      : null;

    let cls = 0;
    for (const entry of performance.getEntriesByType("layout-shift")) {
      if (!entry.hadRecentInput) cls += entry.value;
    }

    const nav = performance.getEntriesByType("navigation")[0];
    const ttfb = nav ? Math.round(nav.responseStart - nav.fetchStart) : null;

    let tbt = 0;
    for (const entry of performance.getEntriesByType("longtask")) {
      tbt += Math.max(0, entry.duration - 50);
    }

    const loadEventMs = nav ? Math.round(nav.loadEventEnd - nav.fetchStart) : null;

    const images = [...document.images];
    const aboveFold = images.filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const isWebp = (img) => {
      const source = [img.currentSrc, img.src, img.srcset].filter(Boolean).join(" ").toLowerCase();
      return source.includes(".webp") || source.includes("format=webp");
    };

    return {
      fcp:      fcp  !== null ? Math.round(fcp  / 10) / 100 : null,
      lcp:      lcp  !== null ? Math.round(lcp  / 10) / 100 : null,
      lcpNullReason,
      ttfb,
      cls:      Math.round(cls * 10000) / 10000,
      tbt:      Math.round(tbt),
      domNodes: document.querySelectorAll("*").length,
      longTaskCount: window.__longTaskCount ?? 0,
      loadEventMs,
      scriptTags: document.scripts.length,
      iframeCount: document.querySelectorAll("iframe").length,
      imagesTotal: images.length,
      imagesWebp: images.filter(isWebp).length,
      missingAlt: images.filter((img) => !img.hasAttribute("alt") || img.getAttribute("alt").trim() === "").length,
      missingSrcset: images.filter((img) => !img.hasAttribute("srcset") || img.getAttribute("srcset").trim() === "").length,
      aboveFoldImages: aboveFold.length,
      aboveFoldLazyImages: aboveFold.filter((img) => img.loading === "lazy" || img.classList.contains("lazyload")).length
    };
  }, lcpTimedOut);

  const resourceSummary = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const transferKb = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const jsKb = resources
      .filter((r) => r.initiatorType === "script")
      .reduce((sum, r) => sum + (r.transferSize || 0), 0);
    return {
      totalRequests: resources.length,
      transferKb: Math.round(transferKb / 1024),
      jsKb: Math.round(jsKb / 1024)
    };
  });

  await context.close();

  return {
    label,
    width,
    height,
    metrics: {
      lcp:                 raw.lcp,
      lcpNullReason:       raw.lcpNullReason,
      fcp:                 raw.fcp,
      ttfb:                raw.ttfb,
      cls:                 raw.cls,
      tbt:                 raw.tbt,
      domNodes:            raw.domNodes,
      longTasks:           raw.longTaskCount,
      totalRequests:       resourceSummary.totalRequests,
      transferKb:          resourceSummary.transferKb,
      jsKb:                resourceSummary.jsKb,
      thirdPartyFailures,
      consoleErrors,
      pageErrors,
      loadEventMs:         raw.loadEventMs,
      scriptTags:          raw.scriptTags,
      iframeCount:         raw.iframeCount,
      imagesTotal:         raw.imagesTotal,
      imagesWebp:          raw.imagesWebp,
      imagesWebpPct:       raw.imagesTotal > 0 ? Math.round((raw.imagesWebp / raw.imagesTotal) * 10000) / 100 : 0,
      missingAlt:          raw.missingAlt,
      missingSrcset:       raw.missingSrcset,
      aboveFoldImages:     raw.aboveFoldImages,
      aboveFoldLazyImages: raw.aboveFoldLazyImages
    }
  };
}

function computeConfidence(desktop, mobile) {
  if (!desktop || !mobile) return "low";
  const nullCount = [desktop.lcp, desktop.fcp, desktop.ttfb, mobile.lcp, mobile.fcp, mobile.ttfb]
    .filter((v) => v === null).length;
  if (nullCount === 0) return "high";
  if (nullCount <= 1) return "medium";
  return "low";
}

function writeSession({routes}) {
  const primaryRoute = routes.find((route) => route.primary) || routes[0];
  const desktopMetrics = primaryRoute.viewports.find((viewport) => viewport.label === "desktop")?.metrics || null;
  const mobileMetrics = primaryRoute.viewports.find((viewport) => viewport.label === "mobile")?.metrics || null;
  if (!desktopMetrics || !mobileMetrics) {
    throw new Error(`Primary route ${primaryRoute.routeId} missing viewport metrics for ${SESSION_ID}`);
  }
  const routeIds = routes.map((route) => route.routeId);
  const session = {
    sessionId:   SESSION_ID,
    observedAt:  DATE,
    methodologyVersion: METHODOLOGY_VERSION,
    collectedBy: "collect.mjs Playwright automated observation",
    targetUrl:   TARGET_URL,
    metrics: {
      lcp:                desktopMetrics.lcp,
      lcpNullReason:      desktopMetrics.lcpNullReason || null,
      fcp:                desktopMetrics.fcp,
      ttfb:               desktopMetrics.ttfb,
      cls:                desktopMetrics.cls,
      tbt:                desktopMetrics.tbt,
      domNodes:           desktopMetrics.domNodes,
      longTasks:          desktopMetrics.longTasks,
      totalRequests:      desktopMetrics.totalRequests,
      jsKb:               desktopMetrics.jsKb,
      thirdPartyFailures: desktopMetrics.thirdPartyFailures
    },
    mobile: {
      lcp:                mobileMetrics.lcp,
      lcpNullReason:      mobileMetrics.lcpNullReason || null,
      fcp:                mobileMetrics.fcp,
      ttfb:               mobileMetrics.ttfb,
      cls:                mobileMetrics.cls,
      tbt:                mobileMetrics.tbt,
      thirdPartyFailures: mobileMetrics.thirdPartyFailures
    },
    observations: routes.flatMap((route) =>
      route.viewports.map((viewport) => ({
        routeId: route.routeId,
        routeLabel: route.label,
        routePath: route.path,
        viewport: viewport.label,
        metrics: viewport.metrics
      }))
    ),
    routes,
    confidence: computeConfidence(desktopMetrics, mobileMetrics),
    notes: [
      `Automated collection.`,
      `Routes: ${routes.map((route) => route.routeId).join(", ")}.`,
      `Desktop: LCP ${desktopMetrics.lcp ?? "N/A"}s, FCP ${desktopMetrics.fcp ?? "N/A"}s, TTFB ${desktopMetrics.ttfb ?? "N/A"}ms, 3P failures ${desktopMetrics.thirdPartyFailures}.`,
      `Mobile: LCP ${mobileMetrics.lcp ?? "N/A"}s, FCP ${mobileMetrics.fcp ?? "N/A"}s, 3P failures ${mobileMetrics.thirdPartyFailures}.`
    ].join(" ")
  };

  const schema = JSON.parse(fs.readFileSync("config/session.schema.json", "utf8"));
  const validate = new Ajv2020({strict: false}).compile(schema);
  if (!validate(session)) {
    console.error("Schema validation failed:", validate.errors);
    throw new Error("Session data failed schema validation");
  }

  fs.mkdirSync(path.dirname(OUT_PATH), {recursive: true});
  fs.writeFileSync(OUT_PATH, JSON.stringify(session, null, 2) + "\n");
  console.log(`Session written: ${OUT_PATH}`);
  console.log(`  Desktop — LCP ${session.metrics.lcp ?? "N/A"}s | FCP ${session.metrics.fcp ?? "N/A"}s | TTFB ${session.metrics.ttfb ?? "N/A"}ms | CLS ${session.metrics.cls} | TBT ${session.metrics.tbt}ms | 3P fail ${session.metrics.thirdPartyFailures}`);
  console.log(`  Mobile  — LCP ${session.mobile.lcp ?? "N/A"}s | FCP ${session.mobile.fcp ?? "N/A"}s | 3P fail ${session.mobile.thirdPartyFailures}`);
  console.log(`  Routes  — ${session.routes.map((route) => `${route.routeId} (${route.viewports.length} viewports)`).join(", ")}`);
  console.log(`  Confidence: ${session.confidence}`);
}

function readRouteConfig(file) {
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(config.routes) || config.routes.length === 0) {
    throw new Error(`${file}: routes must be a non-empty array`);
  }
  const ids = new Set();
  for (const route of config.routes) {
    if (!route.id || !/^[a-z0-9-]+$/.test(route.id)) {
      throw new Error(`${file}: route id must use lowercase letters, numbers, and hyphens`);
    }
    if (ids.has(route.id)) throw new Error(`${file}: duplicate route id ${route.id}`);
    ids.add(route.id);
    const firstSegment = route.path.split("/").filter(Boolean)[0] || "";
    if (!route.path || !route.path.startsWith("/") || route.path.includes(".json") || firstSegment === "data") {
      throw new Error(`${file}: route ${route.id} must use a public non-data path`);
    }
  }
  return config;
}
