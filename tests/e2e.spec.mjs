import fs from "node:fs";
import {expect, test} from "@playwright/test";
import {contentMinimumTextLength, pageComponentMap, pageNavigationContract} from "../scripts/page-structure-contract.mjs";

const releaseContract = JSON.parse(fs.readFileSync(new URL("../config/release-contract.json", import.meta.url), "utf8"));
const insightContract = JSON.parse(fs.readFileSync(new URL("../config/insight-report-contract.json", import.meta.url), "utf8"));
const publicCrossAudit = JSON.parse(fs.readFileSync(new URL("../src/_data/public-cross-audit.json", import.meta.url), "utf8"));

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
      anchorLinks: document.querySelectorAll(".side-nav__anchor").length,
      ctaLinks: document.querySelectorAll(".side-nav__cta").length,
      statusText: document.querySelector(".side-nav__status")?.innerText || ""
    };
  });
  expect(desktopLayout.hasOldTopNav).toBe(false);
  expect(desktopLayout.sidebarPosition).toBe("fixed");
  expect(desktopLayout.sidebarLeft).toBe(0);
  expect(desktopLayout.sidebarWidth).toBeGreaterThanOrEqual(240);
  expect(desktopLayout.shellMarginLeft).toBeGreaterThanOrEqual(240);
  expect(desktopLayout.activeLinks).toBe(1);
  expect(desktopLayout.anchorLinks).toBe(0);
  expect(desktopLayout.ctaLinks).toBe(0);
  expect(desktopLayout.statusText).not.toContain("核心锚点");
  await desktop.close();

  const shortDesktop = await browser.newPage({viewport: {width: 1280, height: 768}});
  await shortDesktop.goto("/cross-audit.html");
  const shortSidebar = await shortDesktop.evaluate(() => {
    const main = document.querySelector(".side-nav__main");
    const foot = document.querySelector(".side-nav__foot");
    const mainRect = main.getBoundingClientRect();
    const footRect = foot.getBoundingClientRect();
    return {
      hasAnchorBlock: Boolean(document.querySelector(".side-nav__group--anchors")),
      hasCta: Boolean(document.querySelector(".side-nav__cta")),
      overlapsFoot: mainRect.bottom > footRect.top
    };
  });
  expect(shortSidebar.hasAnchorBlock).toBe(false);
  expect(shortSidebar.hasCta).toBe(false);
  expect(shortSidebar.overlapsFoot).toBe(false);
  await shortDesktop.close();

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

test("cross audit sidebar only exposes primary report pages", async ({page}) => {
  await page.goto("/cross-audit.html");
  const result = await page.evaluate(() => {
    const anchorHrefs = Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => anchor.getAttribute("href"));
    const anchorLabels = Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => anchor.textContent.trim());
    return {
      groupLabels: Array.from(document.querySelectorAll(".side-nav__label")).map((label) => label.textContent.trim()),
      activeText: document.querySelector(".side-nav__link--active")?.textContent.replace(/\s+/g, " ").trim(),
      anchorHrefs,
      anchorLabels,
      mainLinks: Array.from(document.querySelectorAll(".side-nav__link")).map((anchor) => anchor.textContent.replace(/\s+/g, " ").trim()),
      ctaCount: document.querySelectorAll(".side-nav__cta").length
    };
  });
  expect(result.groupLabels).not.toContain("本页锚点");
  expect(result.activeText).toContain("决策矩阵");
  expect(result.anchorHrefs).toEqual([]);
  expect(result.anchorLabels).toEqual([]);
  expect(result.ctaCount).toBe(0);
  expect(result.mainLinks).toEqual(["I · 总览01", "II · 指标口径02", "III · 风险归因03", "IV · 趋势证据04", "V · 决策矩阵05"]);
});

test("report sections match the page structure contract without sidebar attachments", async ({page}) => {
  for (const [pathname, expectedAnchors] of Object.entries(pageNavigationContract)) {
    await page.goto(pathname);
    const actualAnchors = await page.evaluate(() => Array.from(document.querySelectorAll(".side-nav__anchor")).map((anchor) => ({
      href: anchor.getAttribute("href"),
      label: anchor.textContent.trim(),
    })));
    expect(actualAnchors, `${pathname} should not expose sidebar attachment anchors`).toEqual([]);
    for (const {href, label, targetId, markers} of expectedAnchors) {
      const sectionState = await page.locator(`#${targetId}`).evaluate((section, expectedMarkers) => {
        const eyebrow = section.querySelector(".section__eyebrow")?.textContent?.trim() || "";
        const title = section.querySelector(".section__title, h1")?.textContent?.replace(/\s+/g, " ").trim() || "";
        const text = section.textContent?.replace(/\s+/g, " ").trim() || "";
        return {
          eyebrow,
          title,
          markersPresent: expectedMarkers.map((marker) => text.includes(marker)),
        };
      }, markers);
      expect(sectionState.markersPresent, `${pathname} ${href} ${label} target text`).toEqual(markers.map(() => true));
      expect(`${sectionState.eyebrow} ${sectionState.title}`.trim().length, `${pathname} ${href} ${label} target heading`).toBeGreaterThan(0);
    }
  }
});

test("all key pages omit appendix-style audit bridge sections", async ({page}) => {
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    await expect(page.locator("#diagnostic-bridge")).toHaveCount(0);
    await expect(page.locator("#final-audit")).toHaveCount(0);
  }
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

  const expected = {
    latestSessionLabel: publicCrossAudit.external?.latestSession ? "外部采集" : "",
    pdpFailures: `${publicCrossAudit.external?.pdpThirdPartyFailures || ""}`,
    routeCount: Number(publicCrossAudit.external?.routeCount || 0)
  };
  const result = await page.evaluate((snapshot) => {
    const bodyText = document.body.innerText;
    const tableRows = document.querySelectorAll(".sessions-table tbody tr").length;
    return {
      title: document.querySelector("h1")?.textContent || "",
      hasLatestSession: snapshot.latestSessionLabel ? bodyText.includes(snapshot.latestSessionLabel) : false,
      hasRouteAwareLabel: /v3\s+路由感知/i.test(bodyText),
      hasPdpFailures: snapshot.pdpFailures ? bodyText.includes(`PDP ${snapshot.pdpFailures}`) : false,
      tableRows,
      expectedRouteCount: snapshot.routeCount
    };
  }, expected);

  expect(errors).toEqual([]);
  expect(result.title).toContain("最新 13 路由采集");
  expect(result.hasLatestSession).toBe(true);
  expect(result.hasRouteAwareLabel).toBe(true);
  expect(result.hasPdpFailures).toBe(true);
  expect(result.tableRows).toBe((result.expectedRouteCount || 4) * 2);
});

test("overview reads as an insight report with proof and action", async ({page}) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).toContain("Momcozy");
  expect(text).toContain("洞察报告");
  expect(text).toContain("真实经营数据回归，关键风险收敛。");
  expect(text).toContain("决策建议");
  expect(text).toContain("机器人占比/爬虫占比为缺失或待复证证据");
  expect(text).toContain("owner analytics / bot log / human-bot 维度复证");
  expect(text).toContain("先修归因可信度，再决定预算和 SEO 动作");
  expect(text).toContain("归因证据缺口");
  expect(text).toContain("归因可信度与 PDP 负担是本轮最高优先级");
  expect(text).toContain("不批准“后端慢”作为主叙事");
  expect(text).toContain("不做泛泛优化，只批准这 5 个可落地动作");
  expect(text).toContain("建立第三方域名 kill-list");
  await expect(page.locator("#chart-overview-proof")).toHaveCount(1);
  await expect(page.locator("#chart-bot-attribution-sankey")).toHaveCount(1);
  expect(text).toContain("经营趋势对照");
  expect(text).not.toContain("回迁");
  expect(text).not.toContain("铁证索引");
  expect(text).not.toContain("证据台账");
});

test("cross-audit page exposes latest refreshed conclusions", async ({page}) => {
  await page.goto("/cross-audit.html");
  const text = await page.locator("body").innerText();
  const latestSessionLabel = publicCrossAudit.external?.latestSession ? "外部采集" : "";
  const maxThirdPartyFailures = publicCrossAudit.external?.maxThirdPartyFailures;
  expect(text).toContain("历史报告为基线，当前数据只保留可执行结论。");
  expect(text).toContain("137d / 204d");
  if (latestSessionLabel) {
    expect(text).toContain(latestSessionLabel);
  }
  expect(text).toContain("SEO 变现必须冻结");
  if (typeof maxThirdPartyFailures === "number") {
    expect(text).toContain(`${maxThirdPartyFailures} 次`);
  } else {
    expect(text).toContain("第三方失败");
  }
  expect(text).toContain("不批准 SEO 变现建议");
  expect(text).toContain("批准高风险 PDP 优先复跑");
  expect(text).toContain("把洞察结果落到资源排序和验收动作");
  expect(text).toContain("执行战单");
  await expect(page.locator("#chart-decision-matrix")).toHaveCount(1);
  await expect(page.locator("#chart-bot-attribution-sankey")).toHaveCount(1);
  expect(text).not.toContain("回迁");
  expect(text).not.toContain("铁证如山的前提");
  expect(text).not.toContain("铁证索引");
  expect(text).not.toContain("证据台账");
});

test("key report pages show readable evidence labels without hiding the source session", async ({page}) => {
  const expectedSession = publicCrossAudit.external.latestSession;
  const evidenceLabelPattern = new RegExp(`最新外部采集\\s*·\\s*${escapeRegExp(expectedSession)}`);

  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const text = await page.locator("body").innerText();
    expect(text).toContain("最新外部采集");
    expect(text).toContain(expectedSession);

    const visibleEvidenceLabels = await page.locator(".section__eyebrow:visible").evaluateAll((labels) =>
      labels.map((label) => label.innerText)
    );
    expect(
      visibleEvidenceLabels.some((label) => evidenceLabelPattern.test(label.replace(/\s+/g, " ").trim())),
      `${pathname} evidence label`,
    ).toBe(true);

    const visibleSessionIds = text.match(/session-\d{4}-\d{2}-\d{2}/g) || [];
    const uniqueSessionIds = [...new Set(visibleSessionIds)];
    expect(visibleSessionIds.length, `${pathname} visible session IDs`).toBeGreaterThan(0);
    expect(uniqueSessionIds, `${pathname} visible session IDs`).toEqual([expectedSession]);
  }
});

test("primary pages do not expose internal evidence-index wording", async ({page}) => {
  const bannedTerms = [
    "回迁",
    "铁证索引",
    "证据台账",
    "铁证如山",
    "旧口径下结论",
    "待补证据的归因路线图",
    "证据索引层",
    "索引层",
    "每个结论必须能回答",
    "洞察链路",
    "最终审计",
    "交叉审计",
    "私密经营审计",
    "审计故事",
    "真正有用的审计",
    "站内外审计",
    "不可审计",
    "验收 gate",
    "页面校验",
    "站内外诊断桥接",
    "为什么先修",
    "每个指标是否说明",
    "技术病灶是否被证明",
    "趋势是否讲清",
    "结论、策略、执行是否形成闭环",
    "本节只回答",
    "不可替代结论",
    "competitor-recollect",
    "watchlist route pack",
    "校验项"
  ];
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const text = await page.locator("body").innerText();
    for (const term of bannedTerms) {
      expect(text, `${pathname} should not expose ${term}`).not.toContain(term);
    }
  }
});

test("cross-audit omits appendix-style execution plans but keeps insight tables", async ({page}) => {
  await page.goto("/cross-audit.html");
  await expect(page.locator("#competitor-recollect")).toHaveCount(0);
  await expect(page.locator("#segment-sampling")).toHaveCount(0);
  await expect(page.locator("#third-party-governance")).toHaveCount(0);
  await expect(page.locator("#code")).toHaveCount(0);
  await expect(page.locator("#roadmap")).toHaveCount(0);

  const matrixSection = await page.locator("#cross-matrix").textContent();
  expect(matrixSection).toContain("洞察 × 资源排序 × 验收");
  expect(matrixSection).toContain("资源排序");
  expect(matrixSection).toContain("验收");
  const contradictionSection = await page.locator("#contradictions").textContent();
  expect(contradictionSection).toContain("冲突");

  const executionSection = await page.locator("#execution-orders").textContent();
  expect(executionSection).toContain("建立第三方域名 kill-list");
  expect(executionSection).toContain("完成 PDP watchlist 复采闭环");
});

test("mobile strategy matrix wraps and allows horizontal scroll", async ({browser}) => {
  const mobile = await browser.newPage({viewport: {width: 390, height: 844}});
  await mobile.goto("/cross-audit.html");
  const matrix = mobile.locator("#cross-matrix .cross-table-wrap").first();
  await expect(matrix).toBeVisible();
  const metrics = await matrix.evaluate((el) => {
    return {
      overflowX: getComputedStyle(el).overflowX,
      hasScroller: el.scrollWidth > el.clientWidth
    };
  });
  expect(metrics.overflowX).toBe("auto");
  expect(metrics.hasScroller).toBe(true);
  await mobile.close();
});

test("primary pages read as an insight report without appendix-style audit checks", async ({page}) => {
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    await expect(page.locator("#final-audit")).toHaveCount(0);
    await expect(page.locator("#diagnostic-bridge")).toHaveCount(0);
  }
});

test("primary pages do not render oversized section titles", async ({page}) => {
  for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html"]) {
    await page.goto(pathname);
    const oversized = await page.evaluate(() => Array.from(document.querySelectorAll(".section__head .section__title"))
      .map((el) => {
        const bounds = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          text: el.textContent.replace(/\s+/g, " ").trim(),
          fontSize: Number.parseFloat(style.fontSize),
          visible: bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden",
        };
      })
      .filter((item) => item.visible && item.fontSize > 24));
    expect(oversized, `${pathname} oversized section titles`).toEqual([]);
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

test("key report pages expose their documented structural components", async ({page}) => {
  for (const [path, ids] of Object.entries(pageComponentMap)) {
    await page.goto(path);
    for (const id of ids) {
      const section = page.locator(`#${id}`);
      const count = await section.count();
      expect(count, `Missing section #${id} on ${path}`).toBe(1);
      const sectionState = await section.evaluate((el) => {
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const tableCount = el.querySelectorAll("table").length;
        return {
          hasText: text.length,
          tableCount
        };
      });
      expect(sectionState.hasText, `Section #${id} on ${path} has no visible text`).toBeGreaterThan(contentMinimumTextLength);
      if (sectionState.tableCount > 0) {
        const rowCount = await page.locator(`#${id} table tbody tr`).count();
        expect(rowCount, `Section #${id} table is empty on ${path}`).toBeGreaterThan(0);
      }
    }
    const sectionCount = await page.locator(".section").count();
    expect(sectionCount, `No section components on ${path}`).toBeGreaterThanOrEqual(ids.length - 2);
    expect(
      await page.locator(".side-nav__link").count(),
      `Missing side nav links on ${path}`,
    ).toBeGreaterThanOrEqual(3);
  }
});

test("insight report pages render required charts and decisions", async ({page}) => {
  for (const contractPage of insightContract.pages) {
    await page.goto(contractPage.path);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain(contractPage.decision);
    for (const chartId of contractPage.requiredCharts) {
      await expect(page.locator(`#${chartId}`)).toHaveCount(1);
      await expect(page.locator(`#${chartId}`)).toBeVisible();
    }
  }
});
