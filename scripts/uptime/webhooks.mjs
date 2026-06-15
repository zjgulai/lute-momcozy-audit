function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function webhookSummaryText(payload, publicUrl = "", strictMode = false) {
  const lines = [
    `Momcozy uptime check at ${payload.timestamp}`,
    `URL: ${publicUrl}`,
    `Mode: strict=${strictMode ? "on" : "off"}`,
    `Checks: ${payload.totalChecks}, failures: ${payload.failures}, warnings: ${payload.warnings}`
  ];

  for (const check of payload.checks) {
    const state = check.ok ? "OK" : "FAIL";
    const message = (check.messages || []).length ? `; ${(check.messages || []).join("; ")}` : "";
    lines.push(`${state} ${check.name} ${check.url} => ${check.status}${message}`);
  }

  return lines.join("\n");
}

export function validateWebhookPayload(payload, webhookKind = "json") {
  const normalizedKind = String(webhookKind || "json").toLowerCase();
  const issues = [];

  if (normalizedKind === "json") {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      issues.push("json webhook payload must be an object");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "feishu") {
    const content = payload?.content;
    if (payload?.msg_type !== "text") {
      issues.push('feishu payload must set msg_type to "text"');
    }
    if (!content || !isNonEmptyString(content?.text)) {
      issues.push("feishu payload must include content.text string");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "dingtalk") {
    const text = payload?.text;
    if (payload?.msgtype !== "text") {
      issues.push('dingtalk payload must set msgtype to "text"');
    }
    if (!text || !isNonEmptyString(text?.content)) {
      issues.push("dingtalk payload must include text.content string");
    }
    return {ok: issues.length === 0, issues};
  }

  if (normalizedKind === "slack") {
    if (!isNonEmptyString(payload?.text)) {
      issues.push("slack payload must include text string");
    }
    return {ok: issues.length === 0, issues};
  }

  return {ok: true, issues: []};
}

export function makeWebhookPayload(payload, webhookKind = "json") {
  const normalizedKind = String(webhookKind || "json").toLowerCase();
  const text = webhookSummaryText(payload, payload.publicUrl, payload.strictMode);

  if (normalizedKind === "feishu") {
    return {
      msg_type: "text",
      content: {text}
    };
  }
  if (normalizedKind === "dingtalk") {
    return {
      msgtype: "text",
      text: {content: text}
    };
  }
  if (normalizedKind === "slack") {
    return {
      text
    };
  }

  return payload;
}

export function buildWebhookPayload(payload, webhookKind = "json") {
  return makeWebhookPayload(payload, webhookKind);
}
