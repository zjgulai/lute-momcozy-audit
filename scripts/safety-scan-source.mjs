import fs from "node:fs";
import path from "node:path";

const scanRoots = [
  "src",
  "docs",
  "history_static",
  "config",
  "scripts",
  "README.md"
];
const legacyRoot = path.resolve("archive/eleventy-legacy");
const buildSourceFile = path.resolve("scripts/build-history-site.mjs");
const releaseContractFile = path.resolve("config/release-contract.json");

const legacySourceMarkTargets = ["路特 AI", "Momcozy", "私密经营", "真实金额", "真实 KPI"];
const forbidden = [
  [/\/Users\//i, "private filesystem path"],
  [/(?:\d{1,3}\.){3}\d{1,3}/, "server address"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/(?<!\w)\/data\/(?!\w)/, "data endpoint path"]
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".njk",
  ".svg",
  ".txt",
  ".xml",
  ".yml",
  ".yaml"
]);
const scriptExtensions = new Set([".js", ".mjs"]);
const localImportPattern = /import\s+(?:[^;"']+?\s+from\s+)?["'](\.[^"']+)["']/g;

function collectSourceModuleText(entryFile) {
  const seen = new Set();
  const queue = [path.resolve(entryFile)];
  const modules = [];

  while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const content = readText(file);
    if (!content) continue;
    modules.push(file);

    for (const match of content.matchAll(localImportPattern)) {
      const importPath = match[1];
      if (!importPath.startsWith(".")) continue;

      const base = path.resolve(path.dirname(file), importPath);
      let candidate = base;
      if (!path.extname(candidate)) {
        const jsCandidate = `${candidate}.js`;
        const mjsCandidate = `${candidate}.mjs`;
        if (fs.existsSync(mjsCandidate)) candidate = mjsCandidate;
        else if (fs.existsSync(jsCandidate)) candidate = jsCandidate;
        else if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          const possible = [".mjs", ".js"].map((ext) => `${candidate}/index${ext}`).find((entry) => fs.existsSync(entry));
          if (possible) candidate = possible;
        }
      }

      if (fs.existsSync(candidate) && scriptExtensions.has(path.extname(candidate))) {
        queue.push(candidate);
      }
    }
  }

  return modules;
}

function normalizePaths(items) {
  return items
    .map((item) => String(item))
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

function collectTargets(entries) {
  const normalized = normalizePaths(entries);
  const targets = [];
  for (const entry of normalized) {
    if (!fs.existsSync(entry)) continue;
    const stat = fs.statSync(entry);
    if (stat.isDirectory()) {
      targets.push(...walkDirectory(entry));
    } else if (stat.isFile()) {
      targets.push(entry);
    }
  }
  return targets;
}

function walkDirectory(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? walkDirectory(candidate) : [candidate];
  });
}

function readText(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function guardLegacyDrift(markers, buildText) {
  const legacyFiles = collectTargets([legacyRoot]);
  if (!legacyFiles.length || !buildText) return;
  for (const marker of markers) {
    const inLegacy = legacyFiles.some((file) => {
      if (!textExtensions.has(path.extname(file))) return false;
      const content = readText(file);
      return content ? content.includes(marker) : false;
    });

    if (inLegacy && !buildText.includes(marker)) {
      throw new Error(
        `release marker "${marker}" appears in archive legacy templates only; ` +
        `ensure "scripts/build-history-site.mjs" remains the active release source for these markers.`
      );
    }
  }
}

function scanForForbiddenPatterns(targets) {
  for (const file of targets) {
    const ext = path.extname(file);
    if (!textExtensions.has(ext)) continue;
    const content = readText(file);
    if (content === null) continue;
    for (const [pattern, label] of forbidden) {
      if (pattern.test(content)) {
        throw new Error(`${file}: forbidden ${label}`);
      }
    }
  }
}

function getReleaseMarkers() {
  const content = readText(releaseContractFile);
  if (!content) {
    return legacySourceMarkTargets;
  }

  const contract = JSON.parse(content);
  if (!Array.isArray(contract.requiredMarkers) || contract.requiredMarkers.length === 0) {
    return legacySourceMarkTargets;
  }

  return contract.requiredMarkers;
}

const sources = collectTargets(scanRoots);
const buildSource = readText(buildSourceFile);
if (!buildSource) {
  throw new Error(`${buildSourceFile}: missing build source file`);
}
const activeReleaseMarkers = getReleaseMarkers();
const activeSources = collectSourceModuleText(buildSourceFile);
const activeSourceText = activeSources.map((file) => readText(file)).filter(Boolean).join("\n");

scanForForbiddenPatterns(sources);
guardLegacyDrift(activeReleaseMarkers, activeSourceText);

console.log("public source inputs passed safety scan");
