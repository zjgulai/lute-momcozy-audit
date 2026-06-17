import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildOwnerSegmentCollectCommand,
  loadOwnerStorageState,
  validateOwnerRouteConfig,
  validateOwnerStorageStatePath
} from "../scripts/owner-storage-state-lib.mjs";

const repoRoot = process.cwd();

test("validateOwnerStorageStatePath rejects repo-local storage state paths", () => {
  assert.throws(
    () => validateOwnerStorageStatePath(path.join(repoRoot, ".owner-state", "state.json"), {repoRoot}),
    /outside the repository/i
  );
});

test("loadOwnerStorageState validates Playwright storage state shape without leaking values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "momcozy-owner-state-"));
  const statePath = path.join(dir, "state.json");
  fs.writeFileSync(statePath, JSON.stringify({
    cookies: [{name: "session", value: "private", domain: ".momcozy.com", path: "/", expires: -1, httpOnly: true, secure: true, sameSite: "Lax"}],
    origins: [{origin: "https://momcozy.com", localStorage: [{name: "cart", value: "private"}]}]
  }));

  const summary = loadOwnerStorageState(statePath, {repoRoot});

  assert.deepEqual(summary, {
    cookieCount: 1,
    originCount: 1,
    localStorageEntryCount: 1,
    hasCookies: true,
    hasOriginStorage: true
  });
  assert.equal(JSON.stringify(summary).includes("private"), false);
});

test("validateOwnerRouteConfig requires every owner route to use storage state", () => {
  const summary = validateOwnerRouteConfig("config/collection-routes-segmented-auth-template.json");

  assert.deepEqual(summary, {
    methodologyVersion: "collector-v3-segmented-owner-auth-2026-06",
    routeCount: 4,
    primaryRouteId: "homepage-owner-state",
    routeIds: [
      "homepage-owner-state",
      "pdp-m5-owner-state",
      "cart-owner-state",
      "checkout-owner-state"
    ]
  });
});

test("buildOwnerSegmentCollectCommand returns a redacted owner collection command", () => {
  const command = buildOwnerSegmentCollectCommand({
    date: "2026-06-17",
    runLabel: "r1",
    targetUrl: "https://momcozy.com"
  });

  assert.equal(command.includes("AUDIT_STORAGE_STATE=<owner-state-file-outside-repo>"), true);
  assert.equal(command.includes("segmented-owner-r1"), true);
  assert.equal(command.includes("config/collection-routes-segmented-auth-template.json"), true);
  assert.equal(command.includes("src/_data/segment-sessions"), true);
  assert.equal(command.includes(os.tmpdir()), false);
});
