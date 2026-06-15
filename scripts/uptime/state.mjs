import fs from "node:fs";
import crypto from "node:crypto";

function parsePositiveInt(raw, fallback, minimum = 0) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (!Number.isFinite(rounded) || rounded < minimum) return fallback;
  return rounded;
}

function parsePositiveNumber(raw, fallback, minimum = 0) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < minimum) return fallback;
  return parsed;
}

function isIssueState(value) {
  return typeof value === "object" && value !== null;
}

function pruneTsList(items, minAgeMs, nowMs) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.filter((item) => Number.isFinite(item) && item >= minAgeMs && item <= nowMs);
}

export function readAlertState(filePath) {
  if (!filePath) return {};
  try {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (isIssueState(parsed) && isIssueState(parsed.issues)) {
      return parsed;
    }
  } catch {
    return {};
  }
  return {};
}

export async function writeAlertState(filePath, state, options = {}) {
  if (!filePath) return false;

  const maxAttempts = Math.max(1, parsePositiveInt(options.attempts, 3, 1));
  const retryDelayMs = parsePositiveInt(options.retryDelayMs, 100, 0);
  const retryMultiplier = parsePositiveNumber(options.retryMultiplier, 2, 1);
  const retryMaxDelayMs = parsePositiveInt(options.retryMaxDelayMs, 0, 0);
  const retryJitterPct = parsePositiveNumber(options.retryJitterPct, 0, 0);
  const payload = JSON.stringify(state, null, 2);
  const payloadWithEol = `${payload}\n`;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const tempFilePath = `${filePath}.${Date.now()}.${process.pid || "0"}.${Math.floor(Math.random() * 1e6)}.${attempt}.tmp`;

    try {
      fs.writeFileSync(tempFilePath, payloadWithEol, "utf8");
      fs.renameSync(tempFilePath, filePath);
      return true;
    } catch (error) {
      lastError = error;
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error(`uptime monitor cannot clean temporary state file ${tempFilePath}: ${cleanupError.message || String(cleanupError)}`);
        }
      }

      if (attempt >= maxAttempts) {
        break;
      }

      const baseDelay = retryDelayMs;
      if (baseDelay > 0) {
        const delay = (() => {
          if (retryMultiplier <= 1 || baseDelay <= 0) {
            return baseDelay;
          }

          const exponent = attempt - 1;
          let computed = baseDelay * retryMultiplier ** exponent;
          if (retryMaxDelayMs > 0) {
            computed = Math.min(computed, retryMaxDelayMs);
          }

          if (retryJitterPct <= 0) return computed;

          const jitterRatio = retryJitterPct / 100;
          const boundedJitter = Math.min(1, Math.max(0, jitterRatio));
          const offset = (Math.random() * 2 - 1) * boundedJitter;
          return Math.max(0, Math.round(computed + computed * offset));
        })();
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`uptime monitor cannot write state file ${filePath}: ${lastError ? lastError.message || String(lastError) : "unknown error"}`);
  return false;
}

export function pruneAlertState(state, nowMs, ttlMs, maxEntries = 300) {
  const cutOff = nowMs - ttlMs;
  const stateKeys = Object.keys(state || {})
    .map((signature) => ({
      signature,
      issue: state[signature]
    }))
    .filter(({issue}) => {
      const lastSeen = issue?.lastSeenAt || issue?.lastNotifiedAt || issue?.lastEscalationAt || 0;
      return lastSeen >= cutOff;
    })
    .sort((left, right) => (right.issue.lastSeenAt || 0) - (left.issue.lastSeenAt || 0))
    .slice(0, maxEntries)
    .map(({signature}) => signature);

  const pruned = {};
  for (const signature of stateKeys) {
    const issue = state[signature] || {};
    pruned[signature] = Object.assign({}, issue, {
      occurrences: pruneTsList(issue.occurrences || [], cutOff, nowMs),
      notifications: pruneTsList(issue.notifications || [], cutOff, nowMs),
      escalations: pruneTsList(issue.escalations || [], cutOff, nowMs)
    });
  }
  return pruned;
}

export function hashSignals(messages) {
  return crypto.createHash("sha256").update(String(messages.join("||"))).digest("hex");
}

export {isIssueState, pruneTsList};
