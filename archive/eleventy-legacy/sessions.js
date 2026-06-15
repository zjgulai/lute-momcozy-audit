import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsDir = path.join(__dirname, "sessions");

const METHODS = {
  automated: ["collect.mjs", "collect.mjs Playwright automated observation"]
};

function toStringValue(value) {
  return String(value ?? "").toLowerCase();
}

function hasMethod(s, needle) {
  const name = toStringValue(s.collectedBy);
  if (Array.isArray(METHODS[needle])) {
    return METHODS[needle].some((entry) => name.includes(entry.toLowerCase()));
  }
  return false;
}

function metricFromRoute(route, viewport) {
  if (!route || !Array.isArray(route.viewports)) return null;
  const match = route.viewports.find((item) => item.label === viewport);
  return match?.metrics ?? null;
}

function isAutomatedSession(session) {
  return hasMethod(session, "automated");
}

function isRouteLike(session) {
  return Array.isArray(session.routes) && session.routes.length > 0;
}

function primaryRoute(session) {
  const routes = Array.isArray(session.routes) ? session.routes : [];
  return routes.find((route) => route.primary) || routes[0] || null;
}

function summarizeRoutes(session) {
  if (!isRouteLike(session)) return [];

  return session.routes.map((route) => {
    const desktop = metricFromRoute(route, "desktop");
    const mobile = metricFromRoute(route, "mobile");

    return {
      routeId: route.routeId,
      label: route.label,
      path: route.path,
      primary: Boolean(route.primary),
      desktop,
      mobile
    };
  });
}

function computeFromMetrics(desktop, mobile) {
  if (!desktop || !mobile) return "low";

  const nullCount = [
    desktop.lcp,
    desktop.fcp,
    desktop.ttfb,
    mobile.lcp,
    mobile.fcp,
    mobile.ttfb
  ].filter((value) => value === null).length;

  if (nullCount === 0) return "high";
  if (nullCount === 1) return "medium";
  return "low";
}

function confidenceForSession(session, routeMetrics, routeMobileMetrics) {
  if (["high", "medium", "low"].includes(session.confidence)) {
    return session.confidence;
  }

  const hasRouteData = isRouteLike(session);
  if (hasRouteData) {
    return computeFromMetrics(routeMetrics, routeMobileMetrics);
  }

  const desktop = session.metrics || {};
  const mobile = session.mobile || {};

  return computeFromMetrics(desktop, mobile);
}

function routeAwareMetrics(session) {
  const route = primaryRoute(session);
  if (!route) {
    return {
      metrics: session.metrics || {
        lcp: null,
        fcp: null,
        ttfb: null,
        cls: null,
        tbt: null,
        domNodes: null,
        longTasks: 0,
        totalRequests: null,
        jsKb: null,
        thirdPartyFailures: 0
      },
      mobile: session.mobile || {
        lcp: null,
        fcp: null,
        ttfb: null,
        cls: null,
        tbt: null,
        thirdPartyFailures: 0
      }
    };
  }

  return {
    metrics: metricFromRoute(route, "desktop") || session.metrics,
    mobile: metricFromRoute(route, "mobile") || session.mobile
  };
}

function routeIdsFromSummaries(routeSummaries) {
  return routeSummaries.map((entry) => entry.routeId);
}

export default function () {
  const files = fs.readdirSync(sessionsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const sessions = files.map((file) =>
    JSON.parse(fs.readFileSync(path.join(sessionsDir, file), "utf8"))
  );

  return sessions.map((session, index, allSessions) => {
    const isAutomated = isAutomatedSession(session);
    const routeSummaries = summarizeRoutes(session);
    const routeSummary = primaryRoute(session);
    const normalizedRouteMetrics = routeAwareMetrics(session);
    const routeMetrics = normalizedRouteMetrics.metrics;
    const routeMobileMetrics = normalizedRouteMetrics.mobile;
    const hasRouteData = isRouteLike(session);
    const prevSession = index > 0 ? allSessions[index - 1] : null;
    const prevAutomated = Boolean(prevSession && isAutomatedSession(prevSession));
    const methodologyBreak = Boolean(
      index > 0 &&
      isAutomated !== prevAutomated
    );

    return {
      ...session,
      isAutomated,
      routeSummaries,
      hasRouteData,
      routeIds: routeIdsFromSummaries(routeSummaries),
      primaryRouteId: routeSummary ? routeSummary.routeId : null,
      methodologyBreak,
      metrics: routeMetrics,
      mobile: routeMobileMetrics,
      confidence: confidenceForSession(session, routeMetrics, routeMobileMetrics)
    };
  });
}
