import {expect, test} from "@playwright/test";

const pages = [
  "/",
  "/metrics/",
  "/metrics.html",
  "/forensics/",
  "/forensics.html",
  "/trends/",
  "/trends.html",
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
        const targets = [...document.querySelectorAll("a,button")].filter((element) => {
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        }).map((element) => {
          const rect = element.getBoundingClientRect();
          return {width: rect.width, height: rect.height, text: element.textContent.trim()};
        });
        return {
          docLang: document.documentElement.lang,
          hasChinesePageText: hasChineseText(document.body.innerText || ""),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          smallTargets: targets.filter((target) => target.width < 44 || target.height < 44)
        };
      });
      expect(result.docLang).toBe("zh-CN");
      expect(result.hasChinesePageText).toBe(true);
      expect(result.overflow).toBeLessThanOrEqual(0);
      expect(result.smallTargets).toEqual([]);
      await page.close();
    }
  });
}

test("unknown and private canary paths return real 404 responses", async ({request}) => {
  expect((await request.get("/not-a-real-page")).status()).toBe(404);
  expect((await request.get("/private-audit-canary")).status()).toBe(404);
});

test("trends charts render session data", async ({page}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/trends/");

  const result = await page.evaluate(() => {
    const sessionPayload = JSON.parse(document.getElementById("sessions-data").textContent);
    const charts = [...document.querySelectorAll(".chart-wrap")].map((chart) => {
      const rect = chart.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        hasPlot: chart.querySelectorAll(".u-wrap, canvas").length > 0
      };
    });
    return {
      sessions: sessionPayload.length,
      confidenceByDate: Object.fromEntries(sessionPayload.map((session) => [session.observedAt, session.confidence])),
      charts,
      plotCount: document.querySelectorAll(".u-wrap").length
    };
  });

  expect(errors).toEqual([]);
  expect(result.sessions).toBeGreaterThanOrEqual(1);
  expect(result.confidenceByDate).toMatchObject({
    "2026-03-12": "low",
    "2026-04-15": "low",
    "2026-05-17": "low",
    "2026-06-10": "medium"
  });
  expect(result.plotCount).toBe(8);
  expect(result.charts).toHaveLength(8);
  for (const chart of result.charts) {
    expect(chart.hasPlot).toBe(true);
    expect(chart.width).toBeGreaterThan(100);
    expect(chart.height).toBeGreaterThan(100);
  }
});

test("trends latest scope status cards render", async ({page}) => {
  await page.goto("/trends/");

  const result = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".status-card")].map((card) => {
      const label = card.querySelector(".status-label")?.textContent?.trim() || "";
      const value = card.querySelector(".status-value")?.textContent?.trim() || "";
      const meta = card.querySelector(".status-meta")?.textContent?.trim() || "";
      return {label, value, meta};
    });
    return {
      count: cards.length,
      cards,
      empty: document.querySelector(".status-empty")?.textContent?.trim() || "",
      filterRoute: document.getElementById("route-filter")?.value || "all"
    };
  });

  expect(result.count).toBeGreaterThan(0);
  expect(result.cards.every((card) => card.label && card.value && card.meta)).toBe(true);
  if (result.filterRoute !== "all") {
    expect(result.empty).toBe("");
  }
});
