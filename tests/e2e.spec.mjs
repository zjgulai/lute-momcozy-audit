import {expect, test} from "@playwright/test";

const pages = ["/", "/metrics/", "/forensics/", "/trends/"];
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
        const targets = [...document.querySelectorAll("a,button")].filter((element) => {
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none";
        }).map((element) => {
          const rect = element.getBoundingClientRect();
          return {width: rect.width, height: rect.height, text: element.textContent.trim()};
        });
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          smallTargets: targets.filter((target) => target.width < 44 || target.height < 44)
        };
      });
      expect(result.overflow).toBeLessThanOrEqual(0);
      expect(result.smallTargets).toEqual([]);
      await page.close();
    }
  });
}

test("unknown and private-data paths return real 404 responses", async ({request}) => {
  expect((await request.get("/not-a-real-page")).status()).toBe(404);
  expect((await request.get("/data/private.json")).status()).toBe(404);
});

