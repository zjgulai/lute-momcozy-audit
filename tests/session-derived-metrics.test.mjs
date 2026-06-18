import test from "node:test";
import assert from "node:assert/strict";

import {deriveExternalSessionMetrics} from "../scripts/history-site/session-derived-metrics.mjs";

test("deriveExternalSessionMetrics returns route ID strings from session route objects", () => {
  const derived = deriveExternalSessionMetrics({
    sessionId: "session-test",
    routes: [
      {routeId: "homepage", label: "Homepage"},
      {routeId: "pdp-m5-smart", label: "PDP M5"}
    ],
    observations: [
      {
        routeId: "homepage",
        viewport: "desktop",
        metrics: {lcp: null, ttfb: 235, fcp: 0.33, jsKb: 1903, domNodes: 7451, thirdPartyFailures: 45}
      },
      {
        routeId: "homepage",
        viewport: "mobile",
        metrics: {lcp: null, ttfb: 216, fcp: 0.33, domNodes: 8184, thirdPartyFailures: 44}
      }
    ]
  });

  assert.deepEqual(derived.routes, ["homepage", "pdp-m5-smart"]);
  assert.equal(derived.routeCount, 2);
});
