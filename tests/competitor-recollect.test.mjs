import test from "node:test";
import assert from "node:assert/strict";

import {
  computeCompetitorSnapshotSummary,
  summarizeRobots,
  validateCompetitorSnapshot
} from "../scripts/competitor-recollect-lib.mjs";

test("summarizeRobots counts policy signals without storing raw robots text", () => {
  const summary = summarizeRobots(`
User-agent: *
Disallow: /cart
Disallow: /checkout
Sitemap: https://example.com/sitemap.xml

User-agent: GPTBot
Disallow: /

User-agent: AhrefsBot
Disallow: /
`);

  assert.equal(summary.disallowCount, 4);
  assert.equal(summary.sitemapCount, 1);
  assert.equal(summary.blocksAllGenericBots, false);
  assert.deepEqual(summary.botPolicies, {
    gptbot: "blocked",
    googlebot: "unspecified",
    adsbotGoogle: "unspecified",
    ahrefsbot: "blocked",
    semrushbot: "unspecified"
  });
});

test("computeCompetitorSnapshotSummary exposes comparable route and script-risk evidence", () => {
  const snapshot = {
    observedAt: "2026-06-17",
    methodologyVersion: "competitor-recollect-v1-2026-06",
    competitors: [
      {
        id: "alpha",
        label: "Alpha",
        category: "wearable breast pump",
        homepageUrl: "https://alpha.example/",
        pdpUrl: "https://alpha.example/products/pump",
        cartUrl: "https://alpha.example/cart",
        robots: {status: 200, disallowCount: 2, sitemapCount: 1, botPolicies: {gptbot: "blocked"}},
        pages: [
          {routeId: "homepage", status: 200, finalUrlHost: "alpha.example", viewports: [{label: "desktop", metrics: {thirdPartyFailures: 4, jsKb: 500, domNodes: 1200}}, {label: "mobile", metrics: {thirdPartyFailures: 5, jsKb: 530, domNodes: 1300}}]},
          {routeId: "pdp", status: 200, finalUrlHost: "alpha.example", viewports: [{label: "desktop", metrics: {thirdPartyFailures: 8, jsKb: 700, domNodes: 1800}}, {label: "mobile", metrics: {thirdPartyFailures: 10, jsKb: 720, domNodes: 1900}}]},
          {routeId: "cart", status: 200, finalUrlHost: "alpha.example", viewports: []}
        ]
      },
      {
        id: "beta",
        label: "Beta",
        category: "bottle washer",
        homepageUrl: "https://beta.example/",
        pdpUrl: "https://beta.example/products/washer",
        cartUrl: "https://beta.example/cart",
        robots: {status: 200, disallowCount: 0, sitemapCount: 0, botPolicies: {}},
        pages: [
          {routeId: "homepage", status: 200, finalUrlHost: "beta.example", viewports: [{label: "desktop", metrics: {thirdPartyFailures: 1, jsKb: 300, domNodes: 900}}, {label: "mobile", metrics: {thirdPartyFailures: 2, jsKb: 310, domNodes: 930}}]},
          {routeId: "pdp", status: 404, finalUrlHost: "beta.example", viewports: []},
          {routeId: "cart", status: 200, finalUrlHost: "beta.example", viewports: []}
        ]
      }
    ]
  };

  assert.deepEqual(computeCompetitorSnapshotSummary(snapshot), {
    competitorCount: 2,
    sampledPageCount: 6,
    reachablePdpCount: 1,
    reachableCartCount: 2,
    viewportSampleCount: 6,
    robotsOkCount: 2,
    robotsWithSitemapCount: 1,
    robotsWithNamedBotPolicyCount: 1,
    maxThirdPartyFailures: {competitorId: "alpha", routeId: "pdp", viewport: "mobile", value: 10},
    maxJsKb: {competitorId: "alpha", routeId: "pdp", viewport: "mobile", value: 720},
    maxDomNodes: {competitorId: "alpha", routeId: "pdp", viewport: "mobile", value: 1900}
  });
});

test("validateCompetitorSnapshot rejects raw request URLs and missing comparable samples", () => {
  assert.throws(() => validateCompetitorSnapshot({
    observedAt: "2026-06-17",
    methodologyVersion: "competitor-recollect-v1-2026-06",
    competitors: [
      {
        id: "bad",
        label: "Bad",
        category: "wearable breast pump",
        homepageUrl: "https://bad.example/",
        pdpUrl: "https://bad.example/products/pump",
        cartUrl: "https://bad.example/cart",
        robots: {status: 200, rawText: "User-agent: *"},
        pages: []
      }
    ]
  }), /raw/i);

  assert.throws(() => validateCompetitorSnapshot({
    observedAt: "2026-06-17",
    methodologyVersion: "competitor-recollect-v1-2026-06",
    competitors: []
  }), /competitors/i);
});
