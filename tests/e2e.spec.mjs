import fs from "node:fs";
import {expect, test} from "@playwright/test";

const releaseContract = JSON.parse(fs.readFileSync(new URL("../config/release-contract.json", import.meta.url), "utf8"));
const pages = [
  "/",
  "/metrics.html",
  "/forensics.html",
  "/trends.html",
  "/cross-audit.html",
  "/404.html",
];
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
  ["/trends.html", 200],
];
for (const pathname of pages) {
  test(`${pathname} is stable on desktop and mobile`, async ({browser}) => {
    for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
      const page = await browser.newPage({viewport});
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      const response = await page.goto(pathname);
      expect(response.status()).toBe(200);
      expect(errors).toEqual([]);
      const result = await page.evaluate(() => {
        const hasChineseText = (text) => /[一-龥]/.test(text || "");
        return {
          docLang: document.documentElement.lang,
          hasChinesePageText: hasChineseText(document.body.innerText || ""),
          hasHistoryBrand: document.body.innerText.includes("路特 AI") && document.body.innerText.includes("Momcozy"),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });
      expect(result.docLang).toBe("zh-CN");
      expect(result.hasChinesePageText).toBe(true);
      expect(result.hasHistoryBrand).toBe(true);
      expect(result.overflow).toBeLessThanOrEqual(0);
      await page.close();
    }
  });
}

test("unknown and private canary paths return real 404 responses", async ({request}) => {
  for (const [pathname, expected] of routeExpectations) {
    expect((await request.get(pathname)).status()).toBe(expected);
  }
  expect((await request.get("/not-a-real-page")).status()).toBe(404);
  expect((await request.get("/private-audit-canary")).status()).toBe(404);
  expect((await request.get("/data/baseline.json")).status()).toBe(404);
  expect((await request.get("/reports/00-Executive-Summary.md")).status()).toBe(404);
});

test("site uses left sidebar navigation on desktop and responsive sidebar on mobile", async ({browser}) => {
  const desktop = await browser.newPage({viewport: {width: 1440, height: 900}});
  await desktop.goto("/");
  const desktopLayout = await desktop.evaluate(() => {
    const sidebar = document.querySelector(".side-nav");
    const shell = document.querySelector(".content-shell");
    const sidebarRect = sidebar.getBoundingClientRect();
    const shellStyle = getComputedStyle(shell);
    return {
      hasOldTopNav: Boolean(document.querySelector(".nav-top")),
      sidebarPosition: getComputedStyle(sidebar).position,
      sidebarLeft: Math.round(sidebarRect.left),
      sidebarWidth: Math.round(sidebarRect.width),
      shellMarginLeft: Math.round(parseFloat(shellStyle.marginLeft)),
      activeLinks: document.querySelectorAll(".side-nav__link--active").length,
      anchorLinks: document.querySelectorAll(".side-nav__anchor").length
    };
  });
  expect(desktopLayout.hasOldTopNav).toBe(false);
  expect(desktopLayout.sidebarPosition).toBe("fixed");
  expect(desktopLayout.sidebarLeft).toBe(0);
  expect(desktopLayout.sidebarWidth).toBeGreaterThanOrEqual(240);
  expect(desktopLayout.shellMarginLeft).toBeGreaterThanOrEqual(240);
  expect(desktopLayout.activeLinks).toBe(1);
  expect(desktopLayout.anchorLinks).toBeGreaterThanOrEqual(12);
  await desktop.close();

  const mobile = await browser.newPage({viewport: {width: 390, height: 844}});
  await mobile.goto("/");
  const mobileLayout = await mobile.evaluate(() => {
    const sidebar = document.querySelector(".side-nav");
    const shell = document.querySelector(".content-shell");
    return {
      sidebarPosition: getComputedStyle(sidebar).position,
      shellMarginLeft: Math.round(parseFloat(getComputedStyle(shell).marginLeft)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(mobileLayout.sidebarPosition).toBe("relative");
  expect(mobileLayout.shellMarginLeft).toBe(0);
  expect(mobileLayout.overflow).toBeLessThanOrEqual(0);
  await mobile.close();
});

test("cross audit sidebar prioritizes current-page anchors", async ({page}) => {
  await page.goto("/cross-audit.html");
  const result = await page.evaluate(() => {
    const anchorHrefs = Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => anchor.getAttribute("href"));
    const anchorLabels = Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => anchor.textContent.trim());
    return {
      groupLabels: Array.from(document.querySelectorAll(".side-nav__label")).map((label) => label.textContent.trim()),
      activeText: document.querySelector(".side-nav__link--active")?.textContent.replace(/\s+/g, " ").trim(),
      anchorHrefs,
      anchorLabels,
      ctaHref: document.querySelector(".side-nav__cta")?.getAttribute("href"),
      ctaText: document.querySelector(".side-nav__cta")?.textContent.trim()
    };
  });
  expect(result.groupLabels).toContain("本页锚点");
  expect(result.activeText).toContain("交叉审计");
  expect(result.anchorHrefs).toContain("cross-audit.html#final-audit");
  expect(result.anchorHrefs).toContain("cross-audit.html#contradictions");
  expect(result.anchorHrefs).toContain("cross-audit.html#execution-orders");
  expect(result.anchorLabels).toContain("矛盾识别");
  expect(result.ctaHref).toBe("cross-audit.html#execution-orders");
  expect(result.ctaText).toBe("查看执行战单");
});

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

test("trends page keeps history report and integrates latest v3 route data", async ({page}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const response = await page.goto("/trends.html");
  expect(response.status()).toBe(200);

  const result = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const tableRows = document.querySelectorAll(".sessions-table tbody tr").length;
    return {
      title: document.querySelector("h1")?.textContent || "",
      hasLatestSession: bodyText.includes("session-2026-06-14"),
      hasRouteAwareLabel: /v3\s+路由感知自动化基线/i.test(bodyText),
      hasPdpFailures: bodyText.includes("PDP 56 / 55"),
      hasLegacyM2: bodyText.includes("旧 M2 首页趋势只作为历史参照"),
      tableRows
    };
  });

  expect(errors).toEqual([]);
  expect(result.title).toContain("5 次采集");
  expect(result.hasLatestSession).toBe(true);
  expect(result.hasRouteAwareLabel).toBe(true);
  expect(result.hasPdpFailures).toBe(true);
  expect(result.hasLegacyM2).toBe(true);
  expect(result.tableRows).toBe(4);
});

test("overview restores the historical M1 v2 report as the primary site", async ({page}) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).toContain("Momcozy");
  expect(text.toLowerCase()).toContain("m1 v2.0");
  expect(text).toContain("Top 15 病灶");
  expect(text).toContain("决策建议");
  expect(text).toContain("真实经营数据回归");
  expect(text).toContain("流量归因回迁");
  expect(text).toContain("爬虫与数据可信度");
  expect(text).toContain("每个结论必须能回答");
  expect(text).toContain("不批准“后端慢”作为主叙事");
  expect(text).toContain("不做泛泛优化，只批准这 5 个可落地动作");
  expect(text).toContain("建立第三方域名 kill-list");
  expect(text).toContain("最终审计");
  expect(text).toContain("结论 × 策略 × 执行");
  expect(text).toContain("矛盾识别与修复");
  expect(text).toContain("铁证索引");
});

test("cross-audit page exposes latest refreshed conclusions", async ({page}) => {
  await page.goto("/cross-audit.html");
  const text = await page.locator("body").innerText();
  expect(text).toContain("Share with caveats");
  expect(text).toContain("137d / 204d");
  expect(text).toContain("session-2026-06-14");
  expect(text).toContain("SEO 变现结论必须冻结");
  expect(text).toContain("外部自动采集显示第三方失败最高 56");
  expect(text).toContain("不批准 SEO 变现建议");
  expect(text).toContain("批准 10 条 PDP × 双视口 × 多次采样");
  expect(text).toContain("最终审计");
  expect(text).toContain("每条结论都必须能落到策略和执行");
  expect(text).toContain("铁证如山的前提");
});

test("each primary page exposes a final audit check", async ({page}) => {
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const text = await page.locator("body").innerText();
    expect(text).toContain("最终审计");
    expect(text).toContain("验收 gate");
  }
});

test("private business edition exposes business KPIs but no raw secrets", async ({page}) => {
  const secretForbidden = /\/Users\/|\/home\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:\d{1,3}\.){3}\d{1,3}|(?<!\w)\/data\/(?!\w)|公开审计|公开摘要/i;
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const html = await page.content();
    expect(html).not.toMatch(secretForbidden);
  }
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).toContain("$51.78M");
  expect(text).toContain("monthly_revenue");
  expect(text).toContain("overall_cvr");
  expect(text).toContain("AOV");
  expect(text).toContain("72.07万");
});
