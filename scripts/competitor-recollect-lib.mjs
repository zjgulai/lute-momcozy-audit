const BOT_KEYS = [
  ["gptbot", "GPTBot"],
  ["googlebot", "Googlebot"],
  ["adsbotGoogle", "AdsBot-Google"],
  ["ahrefsbot", "AhrefsBot"],
  ["semrushbot", "SemrushBot"]
];

export function summarizeRobots(text) {
  const lines = String(text || "").split(/\r?\n/);
  const sections = [];
  let currentAgents = [];
  let currentRules = [];
  let disallowCount = 0;
  let sitemapCount = 0;

  const flush = () => {
    if (currentAgents.length > 0 || currentRules.length > 0) {
      sections.push({agents: currentAgents, rules: currentRules});
    }
    currentAgents = [];
    currentRules = [];
  };

  for (const line of lines) {
    const clean = line.split("#")[0].trim();
    if (!clean) continue;
    const separator = clean.indexOf(":");
    if (separator === -1) continue;
    const key = clean.slice(0, separator).trim().toLowerCase();
    const value = clean.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (currentRules.length > 0) flush();
      currentAgents.push(value.toLowerCase());
    } else if (key === "disallow") {
      disallowCount++;
      currentRules.push({type: "disallow", value});
    } else if (key === "allow") {
      currentRules.push({type: "allow", value});
    } else if (key === "sitemap") {
      sitemapCount++;
    }
  }
  flush();

  const botPolicies = Object.fromEntries(BOT_KEYS.map(([key, agent]) => [key, policyForAgent(sections, agent.toLowerCase())]));

  return {
    disallowCount,
    sitemapCount,
    blocksAllGenericBots: sections.some((section) =>
      section.agents.includes("*") && section.rules.some((rule) => rule.type === "disallow" && rule.value === "/")
    ),
    botPolicies
  };
}

function policyForAgent(sections, agentName) {
  const section = sections.find((item) => item.agents.includes(agentName));
  if (!section) return "unspecified";
  if (section.rules.some((rule) => rule.type === "disallow" && rule.value === "/")) return "blocked";
  if (section.rules.some((rule) => rule.type === "allow" && rule.value === "/")) return "allowed";
  if (section.rules.some((rule) => rule.type === "disallow" && rule.value)) return "limited";
  return "allowed";
}

export function computeCompetitorSnapshotSummary(snapshot) {
  const competitors = Array.isArray(snapshot?.competitors) ? snapshot.competitors : [];
  const allPages = competitors.flatMap((competitor) => (competitor.pages || []).map((page) => ({competitor, page})));
  const allViewports = allPages.flatMap(({competitor, page}) =>
    (page.viewports || []).map((viewport) => ({competitor, page, viewport}))
  );
  const maxMetric = (metric) => {
    let best = null;
    for (const item of allViewports) {
      const value = item.viewport.metrics?.[metric];
      if (!Number.isFinite(value)) continue;
      if (!best || value > best.value) {
        best = {
          competitorId: item.competitor.id,
          routeId: item.page.routeId,
          viewport: item.viewport.label,
          value
        };
      }
    }
    return best;
  };
  const hasNamedBotPolicy = (robots) => Object.values(robots?.botPolicies || {}).some((value) => value !== "unspecified");

  return {
    competitorCount: competitors.length,
    sampledPageCount: allPages.length,
    reachablePdpCount: allPages.filter((item) => item.page.routeId === "pdp" && item.page.status >= 200 && item.page.status < 400).length,
    reachableCartCount: allPages.filter((item) => item.page.routeId === "cart" && item.page.status >= 200 && item.page.status < 400).length,
    viewportSampleCount: allViewports.length,
    robotsOkCount: competitors.filter((item) => item.robots?.status >= 200 && item.robots?.status < 400).length,
    robotsWithSitemapCount: competitors.filter((item) => item.robots?.sitemapCount > 0).length,
    robotsWithNamedBotPolicyCount: competitors.filter((item) => hasNamedBotPolicy(item.robots)).length,
    maxThirdPartyFailures: maxMetric("thirdPartyFailures"),
    maxJsKb: maxMetric("jsKb"),
    maxDomNodes: maxMetric("domNodes")
  };
}

export function validateCompetitorSnapshot(snapshot) {
  assertNoRawFields(snapshot);
  if (!snapshot || typeof snapshot !== "object") throw new Error("competitor snapshot must be an object");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.observedAt || "")) throw new Error("observedAt must be YYYY-MM-DD");
  if (typeof snapshot.methodologyVersion !== "string" || !snapshot.methodologyVersion.trim()) {
    throw new Error("methodologyVersion is required");
  }
  if (!Array.isArray(snapshot.competitors) || snapshot.competitors.length === 0) {
    throw new Error("competitors must be a non-empty array");
  }
  const ids = new Set();
  for (const competitor of snapshot.competitors) {
    if (!competitor || typeof competitor !== "object") throw new Error("competitor item must be an object");
    if (!/^[a-z0-9-]+$/.test(competitor.id || "")) throw new Error(`invalid competitor id: ${competitor.id}`);
    if (ids.has(competitor.id)) throw new Error(`duplicate competitor id: ${competitor.id}`);
    ids.add(competitor.id);
    for (const key of ["label", "category", "homepageUrl", "pdpUrl", "cartUrl"]) {
      if (typeof competitor[key] !== "string" || !competitor[key].trim()) throw new Error(`${competitor.id}: ${key} is required`);
    }
    if (!competitor.robots || typeof competitor.robots !== "object") throw new Error(`${competitor.id}: robots summary is required`);
    if (!Array.isArray(competitor.pages) || competitor.pages.length < 2) throw new Error(`${competitor.id}: comparable pages are required`);
    const routeIds = new Set(competitor.pages.map((page) => page.routeId));
    if (!routeIds.has("homepage") || !routeIds.has("pdp")) throw new Error(`${competitor.id}: homepage and pdp samples are required`);
    for (const page of competitor.pages) validatePage(competitor.id, page);
  }
}

function validatePage(competitorId, page) {
  if (!["homepage", "pdp", "cart"].includes(page.routeId)) throw new Error(`${competitorId}: invalid routeId ${page.routeId}`);
  if (!Number.isInteger(page.status)) throw new Error(`${competitorId}/${page.routeId}: status is required`);
  if (typeof page.finalUrlHost !== "string" || !page.finalUrlHost.trim()) throw new Error(`${competitorId}/${page.routeId}: finalUrlHost is required`);
  if (!Array.isArray(page.viewports)) throw new Error(`${competitorId}/${page.routeId}: viewports must be an array`);
  for (const viewport of page.viewports) {
    if (!["desktop", "mobile"].includes(viewport.label)) throw new Error(`${competitorId}/${page.routeId}: invalid viewport`);
    if (!viewport.metrics || typeof viewport.metrics !== "object") throw new Error(`${competitorId}/${page.routeId}: metrics are required`);
  }
}

function assertNoRawFields(value, path = "") {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (/raw|requestUrl|requestUrls|resourceUrl|resourceUrls/i.test(key)) {
      throw new Error(`raw request data is not allowed in competitor snapshot: ${nextPath}`);
    }
    assertNoRawFields(child, nextPath);
  }
}
