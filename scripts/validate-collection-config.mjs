import fs from "node:fs";
import path from "node:path";

const CONFIG_DIR = "config";
const routeConfigFiles = fs.readdirSync(CONFIG_DIR)
  .filter((file) => /^collection-routes.*\.json$/.test(file))
  .sort()
  .map((file) => path.join(CONFIG_DIR, file));

if (routeConfigFiles.length === 0) {
  throw new Error(`${CONFIG_DIR}: no collection route config files found`);
}

const validated = [];

for (const file of routeConfigFiles) {
  const config = JSON.parse(fs.readFileSync(file, "utf8"));

  if (!config.methodologyVersion || typeof config.methodologyVersion !== "string") {
    throw new Error(`${file}: methodologyVersion is required`);
  }
  if (!Array.isArray(config.routes) || config.routes.length === 0) {
    throw new Error(`${file}: routes must be a non-empty array`);
  }

  const ids = new Set();
  let primaryCount = 0;
  for (const route of config.routes) {
    if (!route.id || !/^[a-z0-9-]+$/.test(route.id)) {
      throw new Error(`${file}: route id must use lowercase letters, numbers, and hyphens`);
    }
    if (ids.has(route.id)) throw new Error(`${file}: duplicate route id ${route.id}`);
    ids.add(route.id);
    if (!route.label || typeof route.label !== "string") {
      throw new Error(`${file}: route ${route.id} label is required`);
    }
    const firstSegment = route.path.split("/").filter(Boolean)[0] || "";
    if (!route.path || !route.path.startsWith("/") || route.path.includes(".json") || firstSegment === "data") {
      throw new Error(`${file}: route ${route.id} must use a public non-data path`);
    }
    validateSegment(file, route);
    if (route.primary === true) primaryCount++;
  }

  if (primaryCount !== 1) {
    throw new Error(`${file}: exactly one route must be primary`);
  }

  validated.push(`${file} (${config.routes.length} routes)`);
}

console.log(`validated ${validated.join(", ")}`);

function validateSegment(file, route) {
  if (!route.segment) return;
  const allowed = new Set([
    "id",
    "sourceType",
    "visitorState",
    "authState",
    "cartState",
    "checkoutState",
    "samplingMode",
    "riskQuestion",
    "requiresStorageState"
  ]);
  for (const key of Object.keys(route.segment)) {
    if (!allowed.has(key)) {
      throw new Error(`${file}: route ${route.id} segment.${key} is not allowed`);
    }
  }
  const serialized = JSON.stringify(route.segment).toLowerCase();
  const rawDataEndpointMarker = `/${"data"}/`;
  for (const forbidden of ["token", "secret", "password", ".json", rawDataEndpointMarker]) {
    if (serialized.includes(forbidden)) {
      throw new Error(`${file}: route ${route.id} segment contains forbidden sensitive marker ${forbidden}`);
    }
  }
}
