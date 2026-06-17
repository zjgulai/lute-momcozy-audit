import fs from "node:fs";
import path from "node:path";

const DEFAULT_OWNER_ROUTE_CONFIG = "config/collection-routes-segmented-auth-template.json";

export function validateOwnerStorageStatePath(storageStatePath, {repoRoot = process.cwd(), mustExist = false} = {}) {
  if (!storageStatePath || typeof storageStatePath !== "string") {
    throw new Error("AUDIT_STORAGE_STATE is required");
  }
  if (!path.isAbsolute(storageStatePath)) {
    throw new Error("AUDIT_STORAGE_STATE must be an absolute path outside the repository");
  }

  const resolvedRepo = path.resolve(repoRoot);
  const resolvedState = path.resolve(storageStatePath);
  const relative = path.relative(resolvedRepo, resolvedState);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("AUDIT_STORAGE_STATE must point outside the repository");
  }

  if (mustExist && !fs.existsSync(resolvedState)) {
    throw new Error("AUDIT_STORAGE_STATE file does not exist");
  }

  return resolvedState;
}

export function loadOwnerStorageState(storageStatePath, {repoRoot = process.cwd()} = {}) {
  const resolvedState = validateOwnerStorageStatePath(storageStatePath, {repoRoot, mustExist: true});
  const data = JSON.parse(fs.readFileSync(resolvedState, "utf8"));
  if (!Array.isArray(data.cookies) || !Array.isArray(data.origins)) {
    throw new Error("Playwright storage state must include cookies and origins arrays");
  }

  const localStorageEntryCount = data.origins.reduce((sum, origin) => {
    if (!Array.isArray(origin.localStorage)) return sum;
    return sum + origin.localStorage.length;
  }, 0);

  const summary = {
    cookieCount: data.cookies.length,
    originCount: data.origins.length,
    localStorageEntryCount,
    hasCookies: data.cookies.length > 0,
    hasOriginStorage: localStorageEntryCount > 0
  };

  if (!summary.hasCookies && !summary.hasOriginStorage) {
    throw new Error("Owner storage state is empty; complete login or cart setup before saving it");
  }

  return summary;
}

export function validateOwnerRouteConfig(routeConfigPath = DEFAULT_OWNER_ROUTE_CONFIG) {
  const config = JSON.parse(fs.readFileSync(routeConfigPath, "utf8"));
  if (!String(config.methodologyVersion || "").includes("segmented-owner")) {
    throw new Error(`${routeConfigPath}: methodologyVersion must identify owner-state collection`);
  }
  if (!Array.isArray(config.routes) || config.routes.length === 0) {
    throw new Error(`${routeConfigPath}: routes must be a non-empty array`);
  }

  const primaryRoutes = config.routes.filter((route) => route.primary === true);
  if (primaryRoutes.length !== 1) {
    throw new Error(`${routeConfigPath}: exactly one owner route must be primary`);
  }

  for (const route of config.routes) {
    if (!route.segment?.requiresStorageState) {
      throw new Error(`${routeConfigPath}: route ${route.id || "(unknown)"} must require storage state`);
    }
    const firstSegment = String(route.path || "").split("/").filter(Boolean)[0] || "";
    if (!route.path || !route.path.startsWith("/") || route.path.includes(".json") || firstSegment === "data") {
      throw new Error(`${routeConfigPath}: route ${route.id || "(unknown)"} must use a public non-data path`);
    }
  }

  return {
    methodologyVersion: config.methodologyVersion,
    routeCount: config.routes.length,
    primaryRouteId: primaryRoutes[0].id,
    routeIds: config.routes.map((route) => route.id)
  };
}

export function buildOwnerSegmentCollectCommand({
  date,
  runLabel,
  targetUrl = "https://momcozy.com",
  routeConfig = DEFAULT_OWNER_ROUTE_CONFIG,
  outputDir = "src/_data/segment-sessions"
} = {}) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must use YYYY-MM-DD");
  }
  if (!runLabel || !/^r\d+$/.test(runLabel)) {
    throw new Error("runLabel must use rN, for example r1");
  }

  return [
    `AUDIT_TARGET_URL=${targetUrl}`,
    `AUDIT_ROUTE_CONFIG=${routeConfig}`,
    `AUDIT_OUTPUT_DIR=${outputDir}`,
    "AUDIT_STORAGE_STATE=<owner-state-file-outside-repo>",
    `AUDIT_SESSION_DATE=${date}`,
    `AUDIT_SESSION_LABEL=segmented-owner-${runLabel}`,
    "npm run collect"
  ].join(" ");
}
