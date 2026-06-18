const visibleReportReplacements = [
  [/外部采集 · session-2026-06-17 ·/g, "外部采集 ·"],
  [/外部 session-2026-06-17\s*/g, "外部最新采集"],
  [/外部自动采集 session-2026-06-17/g, "外部自动采集"],
  [/外部采集 session-2026-06-17/g, "外部采集"],
  [/session-2026-06-17/g, "最新外部采集"],
  [/2026-06-17 watchlist session/g, "watchlist 双视口样本"],
  [/PDP watchlist route pack 2026-06-17/g, "PDP watchlist 双视口样本"],
  [/watchlist route pack/g, "watchlist 采集包"],
  [/竞品复采二轮 competitor-recollect-2026-06-18/g, "竞品复采二轮样本"],
  [/competitor-recollect-2026-06-18/g, "竞品复采二轮样本"],
  [/competitor-recollect-v1-2026-06/g, "竞品复采方法"],
  [/内部经营数据校验摘要 2026-06-14/g, "内部经营数据摘要"],
  [/收益模型治理记录 2026-06-14/g, "收益模型治理记录"],
  [/校验项：/g, "证据来源："]
];

function visibleReportText(value) {
  return visibleReportReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value)
  );
}

export function escapeHtml(value) {
  return visibleReportText(value)
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
