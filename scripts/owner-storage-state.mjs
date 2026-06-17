import {chromium} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import {stdin as input, stdout as output} from "node:process";

import {
  buildOwnerSegmentCollectCommand,
  loadOwnerStorageState,
  validateOwnerRouteConfig,
  validateOwnerStorageStatePath
} from "./owner-storage-state-lib.mjs";

const args = new Set(process.argv.slice(2));
const targetUrl = process.env.AUDIT_TARGET_URL || "https://momcozy.com";
const storageStatePath = process.env.AUDIT_STORAGE_STATE || "";
const routeConfig = process.env.AUDIT_ROUTE_CONFIG || "config/collection-routes-segmented-auth-template.json";
const date = process.env.AUDIT_SESSION_DATE || currentDate();
const runLabel = process.env.OWNER_SEGMENT_RUN_LABEL || "r1";

if (args.has("--check")) {
  const stateSummary = loadOwnerStorageState(storageStatePath);
  const routeSummary = validateOwnerRouteConfig(routeConfig);
  console.log(JSON.stringify({ok: true, state: stateSummary, routes: routeSummary}, null, 2));
} else if (args.has("--print-command")) {
  validateOwnerRouteConfig(routeConfig);
  console.log(buildOwnerSegmentCollectCommand({date, runLabel, targetUrl, routeConfig}));
} else if (args.has("--capture")) {
  await captureOwnerStorageState();
} else {
  console.error([
    "Usage:",
    "  AUDIT_STORAGE_STATE=<absolute-path-outside-repo> npm run owner-state:capture",
    "  AUDIT_STORAGE_STATE=<absolute-path-outside-repo> npm run owner-state:check",
    "  OWNER_SEGMENT_RUN_LABEL=r1 npm run owner-state:command"
  ].join("\n"));
  process.exit(1);
}

async function captureOwnerStorageState() {
  const resolvedState = validateOwnerStorageStatePath(storageStatePath);
  fs.mkdirSync(path.dirname(resolvedState), {recursive: true});

  const browser = await chromium.launch({headless: false});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(targetUrl, {waitUntil: "domcontentloaded"});

    const rl = readline.createInterface({input, output});
    await rl.question("Complete owner login/cart setup in the browser, then press Enter to save storage state. ");
    rl.close();

    await context.storageState({path: resolvedState});
  } finally {
    await browser.close();
  }

  const summary = loadOwnerStorageState(resolvedState);
  console.log(JSON.stringify({ok: true, state: summary}, null, 2));
}

function currentDate() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}
