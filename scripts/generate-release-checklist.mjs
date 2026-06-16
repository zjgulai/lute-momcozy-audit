import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const quickMode = args.has("--quick") || process.env.RELEASE_CHECKLIST_QUICK === "1";
const skipParity = args.has("--skip-parity") || process.env.RELEASE_CHECKLIST_SKIP_PARITY === "1";
const skipMonitor = args.has("--skip-monitor") || process.env.RELEASE_CHECKLIST_SKIP_MONITOR === "1";
const publicUrl = process.env.RELEASE_CHECKLIST_PUBLIC_URL || process.env.PUBLIC_URL || "https://shopify.lute-tlz-dddd.top";
const outputPath = process.env.RELEASE_CHECKLIST_OUTPUT || path.join("artifacts", `release-checklist-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function git(argsList, fallback = "") {
  try {
    return execFileSync("git", argsList, {encoding: "utf8"}).trim();
  } catch {
    return fallback;
  }
}

function latestSession() {
  const dir = "src/_data/sessions";
  if (!fs.existsSync(dir)) return null;
  const sessions = fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(path.join(dir, file)))
    .filter((session) => typeof session.observedAt === "string")
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  return sessions.at(-1) || null;
}

function sanitize(text) {
  return String(text || "")
    .replaceAll(process.cwd(), ".")
    .replace(/\/Users\/[^/\s]+\/[^\s)]+/g, "[local-path]")
    .replace(/\/home\/[^/\s]+\/[^\s)]+/g, "[local-path]");
}

function summarizeOutput(stdout, stderr, status) {
  const source = status === "PASS" && String(stdout || "").trim().length > 0
    ? stdout
    : `${stdout || ""}\n${stderr || ""}`;
  const lines = source
    .split(/\r?\n/)
    .map((line) => sanitize(line).trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("> lute-momcozy-audit@"))
    .slice(-8);
  return lines.length ? lines.join("<br>") : "(no output)";
}

function commandText(check) {
  const prefix = check.displayEnv ? `${check.displayEnv} ` : "";
  return `${prefix}${[check.command, ...check.args].join(" ")}`;
}

function runCheck(check) {
  const startedAt = Date.now();
  console.log(`[release-checklist] ${check.name}`);
  const result = spawnSync(check.command, check.args, {
    cwd: process.cwd(),
    env: {...process.env, ...check.env},
    encoding: "utf8",
    timeout: check.timeoutMs || 180_000,
  });
  const durationMs = Date.now() - startedAt;
  const status = result.error || result.status !== 0 ? "FAIL" : "PASS";
  return {
    name: check.name,
    command: commandText(check),
    status,
    exitCode: result.status,
    durationMs,
    summary: summarizeOutput(result.stdout, result.stderr, status),
    error: result.error ? sanitize(result.error.message) : "",
  };
}

function checksForMode() {
  const localGate = quickMode
    ? [
        {name: "Build", command: "npm", args: ["run", "build"]},
        {name: "Release contract", command: "npm", args: ["run", "test:release-contract"]},
        {name: "Public data allowlist", command: "npm", args: ["run", "test:allowlist"]},
        {name: "Competitor recollect plan", command: "npm", args: ["run", "test:competitor-plan"]},
        {name: "Source safety", command: "npm", args: ["run", "test:source-safety"]},
        {name: "Build safety", command: "npm", args: ["run", "test:safety"]},
        {name: "Link contract", command: "npm", args: ["run", "test:links"]},
      ]
    : [
        {name: "Full local suite", command: "npm", args: ["test"], timeoutMs: 420_000},
      ];

  const checks = [...localGate];
  if (!skipParity) {
    checks.push({
      name: "Local-production release parity",
      command: "npm",
      args: ["run", "test:release-parity"],
      env: {PROD_BASE_URL: publicUrl},
      displayEnv: `PROD_BASE_URL=${publicUrl}`,
      timeoutMs: 240_000,
    });
  }
  if (!skipMonitor) {
    checks.push({
      name: "Production uptime and route contract",
      command: "npm",
      args: ["run", "monitor:uptime"],
      env: {PUBLIC_URL: publicUrl},
      displayEnv: `PUBLIC_URL=${publicUrl}`,
      timeoutMs: 120_000,
    });
  }
  return checks;
}

function statusLine(failed, dirty) {
  if (failed.length) return "Blocked";
  if (dirty) return "Review required before release";
  return "Ready for release";
}

function formatMs(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function releaseNoteDraft({audit, session, contract, taskCount}) {
  const routes = Array.isArray(audit.external?.routes) ? audit.external.routes.join(", ") : "unknown";
  const localGateLabel = quickMode ? "quick local gates" : "full local suite";
  return [
    "## Release note draft",
    "",
    `- Edition: ${contract.edition || "unknown"} / ${audit.classification || "unknown"}`,
    `- Report label: ${audit.label || "unknown"}`,
    `- Latest session: ${audit.external?.latestSession || session?.sessionId || "unknown"}; route count: ${audit.external?.routeCount ?? session?.routes?.length ?? "unknown"}; routes: ${routes}`,
    `- Competitor recollect plan: ${taskCount} tracked task(s), with status, owner, deadline, and deliverables validated before release.`,
    `- Release gates: ${localGateLabel}, local-production structure parity, and production uptime route contract are captured in this checklist.`,
    "",
  ].join("\n");
}

function renderMarkdown({results, audit, session, contract, branch, commit, status, dirty, generatedAt}) {
  const failed = results.filter((result) => result.status !== "PASS");
  const taskCount = Array.isArray(audit.competitorRecollectPlan?.tasks) ? audit.competitorRecollectPlan.tasks.length : 0;
  const routeCount = Array.isArray(session?.routes) ? session.routes.length : 0;
  const rows = results.map((result) => `| ${result.name} | \`${result.command}\` | ${result.status} | ${formatMs(result.durationMs)} | ${result.error || result.summary} |`).join("\n");

  return [
    "# Momcozy release checklist",
    "",
    `- Generated at: ${generatedAt}`,
    `- Status: ${statusLine(failed, dirty)}`,
    `- Branch: ${branch || "unknown"}`,
    `- Commit: ${commit || "unknown"}`,
    `- Workspace: ${dirty ? "dirty before release; review local changes before push" : "clean"}`,
    `- Public URL: ${publicUrl}`,
    `- Checklist mode: ${quickMode ? "quick" : "full"}`,
    "",
    "## Data and route context",
    "",
    `- Release contract: ${contract.edition || "unknown"} (${contract.pages?.length || 0} page checks)`,
    `- Report source generatedAt: ${audit.generatedAt || "unknown"}`,
    `- Report classification: ${audit.classification || "unknown"}`,
    `- Latest session: ${session?.sessionId || audit.external?.latestSession || "unknown"} / ${session?.observedAt || "unknown"}`,
    `- Session methodology: ${session?.methodologyVersion || "legacy"}`,
    `- Session route count: ${routeCount || audit.external?.routeCount || 0}`,
    `- Competitor recollect tasks: ${taskCount}`,
    "",
    "## Gate results",
    "",
    "| Gate | Command | Status | Duration | Last output |",
    "|---|---|---:|---:|---|",
    rows,
    "",
    releaseNoteDraft({audit, session, contract, taskCount}),
    "## Manual release checklist",
    "",
    "- [ ] Confirm the workspace is clean after committing release changes.",
    "- [ ] Push to `main` only after local gates pass.",
    "- [ ] Confirm GitHub Pages and Tencent workflows both finish successfully.",
    "- [ ] Re-run `npm run test:release-parity` after production deploy if content changed.",
    "- [ ] Re-run `PUBLIC_URL=https://shopify.lute-tlz-dddd.top npm run monitor:uptime` after production deploy.",
    "",
    failed.length ? `## Blocking issues\n\n${failed.map((item) => `- ${item.name}: ${item.error || item.summary}`).join("\n")}\n` : "## Blocking issues\n\n- None captured by this checklist.\n",
  ].join("\n");
}

const generatedAt = new Date().toISOString();
const audit = readJson("src/_data/public-cross-audit.json");
const contract = readJson("config/release-contract.json");
const session = latestSession();
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], "unknown");
const commit = git(["rev-parse", "--short", "HEAD"], "unknown");
const status = git(["status", "--short"], "");
const dirty = status.trim().length > 0;
const results = checksForMode().map(runCheck);
const markdown = renderMarkdown({results, audit, session, contract, branch, commit, status, dirty, generatedAt});

fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, markdown);

const failed = results.filter((result) => result.status !== "PASS");
console.log(`[release-checklist] wrote ${outputPath}`);
if (failed.length) {
  console.error(`[release-checklist] ${failed.length} gate(s) failed`);
  process.exit(1);
}
