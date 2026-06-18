import AxeBuilder from "@axe-core/playwright";
import {expect, test} from "@playwright/test";

for (const pathname of ["/", "/metrics.html", "/forensics.html", "/trends.html", "/cross-audit.html", "/competitors.html", "/404.html"]) {
  test(`${pathname} has no automated accessibility violations`, async ({page}) => {
    await page.goto(pathname);
    const results = await new AxeBuilder({page}).analyze();
    expect(results.violations).toEqual([]);
  });
}
