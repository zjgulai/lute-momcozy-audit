export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function routeMetric(session, routeId, viewport) {
  return (session.observations || []).find((item) =>
    item.routeId === routeId && item.viewport === viewport
  )?.metrics;
}

export function maxMetric(session, metric) {
  const values = (session.observations || [])
    .map((item) => item.metrics?.[metric])
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}

export function pct(value, digits = 2) {
  if (!Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

export function fixed(value, digits = 2) {
  if (!Number.isFinite(value)) return "N/A";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function integer(value) {
  if (!Number.isFinite(value)) return "N/A";
  return Number(value).toLocaleString("en-US");
}

export function usd(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `$${Number(value).toLocaleString("en-US", {maximumFractionDigits: 0})}`;
}

export function usdMillion(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `$${(value / 1000000).toFixed(2)}M`;
}
