export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHeaders(headers) {
  return Object.fromEntries(Array.from(headers.entries(), ([key, value]) => [key.toLowerCase(), value]));
}

export async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "LuteMomcozyAuditMonitor/1.0"
      }
    });
    const rttMs = Date.now() - start;
    const body = await response.text();
    return {
      ok: true,
      status: response.status,
      headers: normalizeHeaders(response.headers),
      body,
      rttMs
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function postWithTimeout(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "user-agent": "LuteMomcozyAuditMonitor/1.0"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      body
    };
  } finally {
    clearTimeout(timer);
  }
}

export function isRetryableStatus(status) {
  if (status >= 500 && status <= 599) {
    return true;
  }
  return false;
}

export function computeRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent) {
  if (retryMultiplier <= 1 || baseDelayMs <= 0) {
    return baseDelayMs;
  }

  const exponent = attempt - 1;
  let delay = baseDelayMs * retryMultiplier ** exponent;
  if (maxDelayMs > 0) {
    delay = Math.min(delay, maxDelayMs);
  }

  if (jitterPercent <= 0) {
    return delay;
  }

  const jitterRatio = jitterPercent / 100;
  const boundedJitter = Math.min(1, Math.max(0, jitterRatio));
  const offset = (Math.random() * 2 - 1) * boundedJitter;
  return Math.max(0, Math.round(delay + delay * offset));
}

export function computeWebhookRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent) {
  return computeRetryDelayMs(attempt, baseDelayMs, retryMultiplier, maxDelayMs, jitterPercent);
}

export async function fetchWithRetry(url, timeoutMs, attempts = 1, retryDelayMs = 0, retryFn = fetchWithTimeout) {
  const parsedAttempts = Math.max(1, attempts);
  let lastError;

  for (let attempt = 1; attempt <= parsedAttempts; attempt++) {
    try {
      return await retryFn(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= parsedAttempts) {
        throw error;
      }
      if (retryDelayMs > 0) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw lastError;
}

export async function postWithRetry(url, payload, timeoutMs, attempts = 1, retryDelayMs = 0, retryOptions = {
  retryMultiplier: 1,
  maxDelayMs: 0,
  jitterPercent: 0
}) {
  const parsedAttempts = Math.max(1, attempts);
  let lastError;
  let attemptsDone = 0;

  for (let attempt = 1; attempt <= parsedAttempts; attempt++) {
    attemptsDone = attempt;
    try {
      const response = await postWithTimeout(url, payload, timeoutMs);
      if (response.ok) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: false
        };
      }

      if (!isRetryableStatus(response.status)) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: false
        };
      }

      if (attempt >= parsedAttempts) {
        return {
          ...response,
          attempts: attempt,
          retried: attempt > 1,
          exhausted: true
        };
      }

      const sleepMs = computeWebhookRetryDelayMs(attempt, retryDelayMs, retryOptions.retryMultiplier || 1, retryOptions.maxDelayMs || 0, retryOptions.jitterPercent || 0);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    } catch (error) {
      lastError = error;
      if (attempt >= parsedAttempts) {
        if (typeof error === "object") {
          error.webhookAttempts = attempt;
          error.webhookRetriesExhausted = true;
        }
        throw error;
      }
      const sleepMs = computeWebhookRetryDelayMs(attempt, retryDelayMs, retryOptions.retryMultiplier || 1, retryOptions.maxDelayMs || 0, retryOptions.jitterPercent || 0);
      if (sleepMs > 0) {
        await sleep(sleepMs);
      }
    }
  }

  if (lastError) {
    if (typeof lastError === "object") {
      lastError.webhookAttempts = attemptsDone;
      lastError.webhookRetriesExhausted = true;
    }
    throw lastError;
  }

  return {
    ok: false,
    status: 0,
    body: ""
  };
}
