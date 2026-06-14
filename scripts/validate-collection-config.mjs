import fs from "node:fs";

const file = "config/collection-routes.json";
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
  if (route.primary === true) primaryCount++;
}

if (primaryCount !== 1) {
  throw new Error(`${file}: exactly one route must be primary`);
}

console.log(`validated ${config.routes.length} collection route(s)`);
