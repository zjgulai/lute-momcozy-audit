import fs from "node:fs";
import path from "node:path";

import {
  computeCompetitorSnapshotSummary,
  validateCompetitorSnapshot
} from "./competitor-recollect-lib.mjs";

const SNAPSHOT_DIR = "src/_data/competitors";

if (!fs.existsSync(SNAPSHOT_DIR)) {
  throw new Error(`${SNAPSHOT_DIR}: competitor snapshot directory is required`);
}

const files = fs.readdirSync(SNAPSHOT_DIR)
  .filter((file) => file.endsWith(".json"))
  .sort();

if (files.length === 0) {
  throw new Error(`${SNAPSHOT_DIR}: at least one competitor snapshot is required`);
}

let errors = 0;
for (const file of files) {
  const fullPath = path.join(SNAPSHOT_DIR, file);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  try {
    validateCompetitorSnapshot(data);
    const summary = computeCompetitorSnapshotSummary(data);
    if (summary.competitorCount < 4) throw new Error("at least 4 competitors are required");
    if (summary.reachablePdpCount < 4) throw new Error("at least 4 reachable PDP samples are required");
    if (summary.viewportSampleCount < 12) throw new Error("at least 12 viewport samples are required");
    if (!summary.maxThirdPartyFailures || !summary.maxJsKb || !summary.maxDomNodes) {
      throw new Error("summary must include max third-party, JS, and DOM evidence");
    }
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    errors++;
  }
}

if (errors > 0) process.exit(1);
console.log(`validated ${files.length} competitor snapshot file(s)`);
