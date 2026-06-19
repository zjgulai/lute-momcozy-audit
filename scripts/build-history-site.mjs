import fs from "node:fs";
import path from "node:path";

import {
  allSessions,
  cleanOutput,
  copyDir,
  copyFile,
  latestSession,
  readJson
} from "./history-site/fs.mjs";
import {mergeSessionDerivedExternal} from "./history-site/session-derived-metrics.mjs";
import {write404, writeHistoryPages} from "./history-site/pages.mjs";

const root = process.cwd();
const outputDir = path.join(root, "_site");
const assetDir = path.join(root, "history_static/assets");
const sessionsDir = path.join(root, "src/_data/sessions");
const competitorsDir = path.join(root, "src/_data/competitors");
const publicCrossAuditPath = path.join(root, "src/_data/public-cross-audit.json");
const botEvidencePath = path.join(root, "src/_data/bot-evidence.json");

cleanOutput(outputDir);
copyDir(assetDir, path.join(outputDir, "assets"));
copyFile(path.join(root, "history_static/.nojekyll"), path.join(outputDir, ".nojekyll"));

const session = latestSession(sessionsDir, readJson);
const rawPublicCrossAudit = readJson(publicCrossAuditPath);
const publicCrossAudit = mergeSessionDerivedExternal(rawPublicCrossAudit, session);
if (fs.existsSync(botEvidencePath)) {
  publicCrossAudit.botEvidence = readJson(botEvidencePath);
}
if (fs.existsSync(competitorsDir)) {
  publicCrossAudit.competitorSnapshot = latestSession(competitorsDir, readJson);
}

// Inject all sessions for collection management page
publicCrossAudit._allSessions = allSessions(sessionsDir, readJson);

writeHistoryPages({outputDir, data: publicCrossAudit, session});
write404(outputDir);
fs.writeFileSync(path.join(outputDir, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
console.log(`built history-primary site with latest trend session ${session.sessionId}`);
