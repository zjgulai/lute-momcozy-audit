function observationsOf(session) {
  return Array.isArray(session?.observations) ? session.observations : [];
}

function routeMetric(session, routeId, viewport) {
  return observationsOf(session).find((item) =>
    item.routeId === routeId && item.viewport === viewport
  )?.metrics || null;
}

function maxMetric(session, metric) {
  const values = observationsOf(session)
    .map((item) => item.metrics?.[metric])
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function routeIds(session) {
  return [...new Set(observationsOf(session).map((item) => item.routeId).filter(Boolean))];
}

export function deriveExternalSessionMetrics(session) {
  const observations = observationsOf(session);
  const homepageDesktop = routeMetric(session, "homepage", "desktop");
  const homepageMobile = routeMetric(session, "homepage", "mobile");
  const lcpObservedSamples = observations.filter((item) => Number.isFinite(item.metrics?.lcp)).length;
  const routes = Array.isArray(session?.routes) && session.routes.length ? session.routes : routeIds(session);
  return {
    latestSession: session?.sessionId || "",
    routeCount: routes.length,
    routes,
    homepageTtfbDesktopMs: homepageDesktop?.ttfb ?? null,
    homepageTtfbMobileMs: homepageMobile?.ttfb ?? null,
    homepageFcpDesktopSec: homepageDesktop?.fcp ?? null,
    homepageFcpMobileSec: homepageMobile?.fcp ?? null,
    homepageJsKb: homepageDesktop?.jsKb ?? null,
    maxDomNodes: maxMetric(session, "domNodes"),
    maxThirdPartyFailures: maxMetric(session, "thirdPartyFailures"),
    lcpObservedSamples,
    lcpTotalSamples: observations.length
  };
}

export function mergeSessionDerivedExternal(data, session) {
  const derived = deriveExternalSessionMetrics(session);
  return {
    ...data,
    external: {
      ...data.external,
      ...derived
    }
  };
}
