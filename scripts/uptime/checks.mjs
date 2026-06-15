import crypto from "node:crypto";

import {DEFAULT_EXPECT_BODY_MARKERS} from "./identity.mjs";

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function parseStringList(raw, fallback = []) {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    return raw
      .map((value) => String(value).trim())
      .filter(Boolean);
  }
  if (typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter(Boolean);
      }
    } catch (error) {
      throw new Error(`UPTIME_EXPECT_BODY_MARKERS must be JSON array or comma-separated list. ${error.message}`);
    }
  }

  return trimmed
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const BASE_DEFAULT_CHECKS = [
  {
    name: "home",
    paths: ["/"],
    expectedStatus: [200],
    requireSecurityHeaders: true,
    requireNoindex: true,
    contentContains: [],
    expectedBodySha256: ""
  },
  {
    name: "metrics",
    paths: ["/metrics", "/metrics.html"],
    expectedStatus: [200]
  },
  {
    name: "metrics-trailing-slash",
    paths: ["/metrics/"],
    expectedStatus: [404]
  },
  {
    name: "forensics",
    paths: ["/forensics", "/forensics.html"],
    expectedStatus: [200]
  },
  {
    name: "forensics-trailing-slash",
    paths: ["/forensics/"],
    expectedStatus: [404]
  },
  {
    name: "trends",
    paths: ["/trends", "/trends.html"],
    expectedStatus: [200]
  },
  {
    name: "trends-trailing-slash",
    paths: ["/trends/"],
    expectedStatus: [404]
  },
  {
    name: "cross-audit",
    paths: ["/cross-audit.html"],
    expectedStatus: [200],
    contentContains: ["执行战单"]
  },
  {
    name: "cross-audit-trailing-slash",
    paths: ["/cross-audit/"],
    expectedStatus: [404]
  },
  {
    name: "not-found",
    paths: ["/not-a-real-page"],
    expectedStatus: [404]
  },
  {
    name: "private-route-block",
    paths: ["/private-audit-canary", "/private-audit-canary/"],
    expectedStatus: [403, 404]
  }
];

export function makeDefaultChecks(homeBodyMarkers = DEFAULT_EXPECT_BODY_MARKERS, expectedHomeSha256 = "") {
  const checks = BASE_DEFAULT_CHECKS.map((item) => ({...item}));
  const normalizedMarkers = parseStringList(homeBodyMarkers, DEFAULT_EXPECT_BODY_MARKERS);
  checks[0] = {...checks[0], contentContains: normalizedMarkers, expectedBodySha256: expectedHomeSha256 || ""};
  return checks;
}

export const DEFAULT_CHECKS = makeDefaultChecks(DEFAULT_EXPECT_BODY_MARKERS, "");

export function parseOptionalChecks(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("UPTIME_CHECKS_JSON must be an array");
  return parsed.map((check) => ({
    name: check.name || "custom",
    paths: Array.isArray(check.paths) && check.paths.length > 0 ? check.paths : ["/"],
    expectedStatus: Array.isArray(check.expectedStatus) ? check.expectedStatus : [200],
    requireSecurityHeaders: Boolean(check.requireSecurityHeaders),
    requireNoindex: Boolean(check.requireNoindex),
    contentContains: parseStringList(check.contentContains || [], []),
    expectedBodySha256: typeof check.expectedBodySha256 === "string" ? check.expectedBodySha256.trim().toLowerCase() : ""
  }));
}

export function checkContentSignals(body, def) {
  const messages = [];
  const markers = Array.isArray(def.contentContains) ? def.contentContains : [];
  const text = String(body || "");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      messages.push(`content marker "${marker}" not found`);
    }
  }

  if (def.expectedBodySha256) {
    const digest = sha256Hex(text);
    if (digest !== def.expectedBodySha256) {
      messages.push(`body sha256 mismatch: expected ${def.expectedBodySha256}, got ${digest}`);
    }
  }

  return {ok: messages.length === 0, messages};
}
