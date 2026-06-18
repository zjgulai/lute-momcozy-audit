import fs from "node:fs";
import path from "node:path";

const contract = JSON.parse(fs.readFileSync("config/insight-report-contract.json", "utf8"));
const siteRoot = "_site";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function fileForRoute(route) {
  if (route === "/") return path.join(siteRoot, "index.html");
  return path.join(siteRoot, route.replace(/^\/+/, ""));
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function requiredMarkers(page, field) {
  return Array.isArray(page[field]) ? page[field] : [];
}

function checkTextMarkers({page, text, field, label}) {
  for (const marker of requiredMarkers(page, field)) {
    if (!text.includes(marker)) failures.push(`${page.path}: missing ${label} marker "${marker}"`);
  }
}

const failures = [];
for (const page of contract.pages) {
  const file = fileForRoute(page.path);
  if (!fs.existsSync(file)) {
    failures.push(`${page.path}: missing generated file ${file}`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const text = stripHtml(html);
  if (!text.includes(page.decision)) failures.push(`${page.path}: missing page decision "${page.decision}"`);
  for (const proof of page.requiredProofs) {
    if (!text.includes(proof)) failures.push(`${page.path}: missing proof marker "${proof}"`);
  }
  checkTextMarkers({page, text, field: "requiredFacts", label: "fact"});
  checkTextMarkers({page, text, field: "requiredComparisons", label: "comparison"});
  checkTextMarkers({page, text, field: "requiredAttributionMarkers", label: "attribution"});
  for (const action of page.requiredActions) {
    if (!text.includes(action)) failures.push(`${page.path}: missing action marker "${action}"`);
  }
  for (const chartId of page.requiredCharts) {
    if (!html.includes(`id="${chartId}"`)) failures.push(`${page.path}: missing required chart #${chartId}`);
  }
  for (const forbidden of contract.forbiddenNarrativeTerms) {
    if (text.includes(forbidden)) failures.push(`${page.path}: forbidden audit narrative term "${forbidden}"`);
  }
  const sectionCount = countMatches(html, /<section\b/g);
  const maxSections = contract.maxVisibleSections[page.path];
  if (sectionCount > maxSections) failures.push(`${page.path}: section count ${sectionCount} exceeds ${maxSections}`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  fail(`insight report contract failed with ${failures.length} issue(s)`);
}

console.log(`insight report contract passed for ${contract.pages.length} pages`);
