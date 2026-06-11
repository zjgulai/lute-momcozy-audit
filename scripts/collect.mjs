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
const DATE = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0")
].join("-");
const SESSION_ID = `session-${DATE}`;
const OUT_PATH = path.resolve(`src/_data/sessions/${DATE}.json`);

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
  const desktopMetrics = await runViewport(browser, 1440, 900, "desktop");
  const mobileMetrics  = await runViewport(browser, 390,  844, "mobile");
  return {desktopMetrics, mobileMetrics};
}

async function runViewport(browser, width, height, label) {
  const context = await browser.newContext({
    viewport: {width, height},
    userAgent: "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"
  });
  const page = await context.newPage();

  const failures = [];
  const requestUrls = new Set();

  page.on("requestfailed", (req) => {
    const reqHost = (() => { try { return new URL(req.url()).hostname; } catch { return ""; } })();
    if (!reqHost.endsWith(BASE_DOMAIN)) failures.push(req.url());
  });
  page.on("request", (req) => requestUrls.add(req.url()));

  await page.addInitScript(() => {
    window.__longTaskCount = 0;
    const observer = new PerformanceObserver((list) => {
      window.__longTaskCount += list.getEntries().length;
    });
    observer.observe({type: "longtask", buffered: true});
  });

  const response = await page.goto(TARGET_URL, {waitUntil: "load", timeout: 90_000});

  if (!response || response.status() >= 400) {
    await context.close();
    throw new Error(`HTTP ${response?.status()} from ${TARGET_URL}`);
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  await page.waitForFunction(
    () => performance.getEntriesByType("largest-contentful-paint").length > 0,
    {timeout: 25_000}
  ).catch(() => {});

  await page.waitForTimeout(2000);

  const raw = await page.evaluate(() => {
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find((e) => e.name === "first-contentful-paint")?.startTime ?? null;

    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length > 0 ? lcpEntries.at(-1).startTime : null;

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

    return {
      fcp:      fcp  !== null ? Math.round(fcp  / 10) / 100 : null,
      lcp:      lcp  !== null ? Math.round(lcp  / 10) / 100 : null,
      ttfb,
      cls:      Math.round(cls * 10000) / 10000,
      tbt:      Math.round(tbt),
      domNodes: document.querySelectorAll("*").length,
      longTaskCount: window.__longTaskCount ?? 0
    };
  });

  const resourceSummary = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const jsKb = resources
      .filter((r) => r.initiatorType === "script")
      .reduce((sum, r) => sum + (r.transferSize || 0), 0);
    return {
      totalRequests: resources.length,
      jsKb: Math.round(jsKb / 1024)
    };
  });

  await context.close();

  return {
    label,
    lcp:                raw.lcp,
    fcp:                raw.fcp,
    ttfb:               raw.ttfb,
    cls:                raw.cls,
    tbt:                raw.tbt,
    domNodes:           raw.domNodes,
    longTasks:          raw.longTaskCount,
    totalRequests:      resourceSummary.totalRequests,
    jsKb:               resourceSummary.jsKb,
    thirdPartyFailures: failures.length
  };
}

function computeConfidence(desktop, mobile) {
  const nullCount = [desktop.lcp, desktop.fcp, desktop.ttfb, mobile.lcp, mobile.fcp, mobile.ttfb]
    .filter((v) => v === null).length;
  if (nullCount === 0) return "high";
  if (nullCount <= 2) return "medium";
  return "low";
}

function writeSession({desktopMetrics, mobileMetrics}) {
  const session = {
    sessionId:   SESSION_ID,
    observedAt:  DATE,
    collectedBy: "collect.mjs Playwright automated observation",
    targetUrl:   TARGET_URL,
    metrics: {
      lcp:                desktopMetrics.lcp,
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
      fcp:                mobileMetrics.fcp,
      ttfb:               mobileMetrics.ttfb,
      cls:                mobileMetrics.cls,
      tbt:                mobileMetrics.tbt,
      thirdPartyFailures: mobileMetrics.thirdPartyFailures
    },
    confidence: computeConfidence(desktopMetrics, mobileMetrics),
    notes: [
      `Automated collection.`,
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
  console.log(`  Confidence: ${session.confidence}`);
}
