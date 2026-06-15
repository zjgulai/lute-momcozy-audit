import fs from "node:fs";
import path from "node:path";

const contract = JSON.parse(fs.readFileSync("config/release-contract.json", "utf8"));
const root = path.resolve("_site");
const boundaryPath = path.resolve("config/private-data-publication-boundary.json");
const provenanceDoc = path.resolve("docs/private-data-provenance.md");

function htmlPath(routePath) {
  if (routePath === "/") return path.join(root, "index.html");
  const clean = routePath.replace(/^\/+/, "");
  return path.join(root, clean);
}

function validateBoundary() {
  if (!fs.existsSync(boundaryPath)) {
    fail(`missing private-data publication boundary config: ${boundaryPath}`);
  }
  const boundary = JSON.parse(fs.readFileSync(boundaryPath, "utf8"));
  if (!Array.isArray(boundary.allowed) || boundary.allowed.length === 0) {
    fail("private-data boundary config missing non-empty allowed array");
  }
  if (!Array.isArray(boundary.forbidden) || boundary.forbidden.length === 0) {
    fail("private-data boundary config missing non-empty forbidden array");
  }
  if (!fs.existsSync(provenanceDoc)) {
    fail(`missing private-data provenance doc: ${provenanceDoc}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

validateBoundary();
for (const page of contract.pages) {
  if (page.status !== 200) continue;
  const file = htmlPath(page.path);
  if (!fs.existsSync(file)) fail(`${page.path}: missing generated file ${file}`);
  const html = fs.readFileSync(file, "utf8");
  for (const marker of contract.requiredMarkers) {
    if (!html.includes(marker)) fail(`${page.path}: missing required release marker ${marker}`);
  }
  for (const marker of page.markers || []) {
    if (!html.includes(marker)) fail(`${page.path}: missing page marker ${marker}`);
  }
  for (const marker of contract.forbiddenMarkers) {
    if (html.includes(marker)) fail(`${page.path}: forbidden release marker ${marker}`);
  }
}

console.log(`release contract ${contract.edition} passed for ${contract.pages.length} checks`);
