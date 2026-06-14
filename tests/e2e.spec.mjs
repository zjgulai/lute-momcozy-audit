import {expect, test} from "@playwright/test";

const pages = [
  "/",
  "/metrics.html",
  "/forensics.html",
  "/trends.html",
  "/cross-audit.html",
  "/404.html",
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
  expect((await request.get("/not-a-real-page")).status()).toBe(404);
  expect((await request.get("/private-audit-canary")).status()).toBe(404);
  expect((await request.get("/data/baseline.json")).status()).toBe(404);
  expect((await request.get("/reports/00-Executive-Summary.md")).status()).toBe(404);
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
  expect(text).toContain("旧收益叙事失效");
});

test("cross-audit page exposes latest refreshed conclusions", async ({page}) => {
  await page.goto("/cross-audit.html");
  const text = await page.locator("body").innerText();
  expect(text).toContain("Share with caveats");
  expect(text).toContain("137d / 204d");
  expect(text).toContain("session-2026-06-14");
  expect(text).toContain("SEO 变现结论必须冻结");
  expect(text).toContain("公开自动采集显示第三方失败最高 56");
});

test("public pages do not expose deprecated private business values", async ({page}) => {
  const forbidden = /(?:\$|¥|€|£)\s?\d|\b(?:ROI|AOV|monthly_revenue|overall_cvr|real[-_ ]?kpi)\b|207\.9M|51\.78M|11\.7M|135d/i;
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const html = await page.content();
    expect(html).not.toMatch(forbidden);
  }
});
