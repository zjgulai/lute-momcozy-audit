export const pageComponentMap = {
  "/": [
    "hero",
    "insight-chain",
    "hard-conclusions",
    "overview-proof",
    "business-kpi",
    "business-kpi-trend",
    "traffic-attribution",
    "bot-attribution",
    "decisions",
  ],
  "/metrics.html": [
    "hero",
    "metric-governance",
    "business-kpi",
    "business-kpi-trend",
    "funnel",
    "traffic-attribution",
    "metric-dictionary",
  ],
  "/forensics.html": [
    "scene",
    "risk-chart",
    "bot-audit",
    "fatal",
    "risk-backlog",
    "pdp",
  ],
  "/trends.html": [
    "hero",
    "trend-charts",
    "latest-v3",
  ],
  "/cross-audit.html": [
    "hero",
    "hard-conclusions",
    "cross-matrix",
    "contradictions",
    "execution-orders",
    "decision-chart",
  ],
  "/competitors.html": [
    "hero",
    "competitor-gap",
    "competitor-benchmark",
    "value-screen",
    "competitor-action",
  ],
};

const nav = (href, label, markers) => ({
  href,
  label,
  targetId: href.split("#")[1],
  markers,
});

export const pageNavigationContract = {
  "/": [
    nav("index.html#insight-chain", "核心洞察", ["核心洞察"]),
    nav("index.html#hard-conclusions", "硬结论", ["预算取舍"]),
    nav("index.html#overview-proof", "证据板", ["机器人占比/爬虫占比为缺失或待复证证据"]),
    nav("index.html#business-kpi", "真实 KPI", ["真实经营 KPI"]),
    nav("index.html#traffic-attribution", "归因质量", ["先修归因可信度"]),
    nav("index.html#bot-attribution", "Bot 缺口", ["归因证据缺口"]),
    nav("index.html#decisions", "执行战单", ["决策建议"]),
  ],
  "/metrics.html": [
    nav("metrics.html#hero", "指标结论", ["先统一口径"]),
    nav("metrics.html#metric-governance", "口径治理", ["可用指标"]),
    nav("metrics.html#business-kpi", "真实 KPI", ["真实经营 KPI"]),
    nav("metrics.html#funnel", "行为漏斗", ["行为漏斗桑基图"]),
    nav("metrics.html#traffic-attribution", "归因质量", ["先修归因可信度"]),
    nav("metrics.html#metric-dictionary", "指标字典", ["指标字典"]),
  ],
  "/forensics.html": [
    nav("forensics.html#scene", "风险结论", ["归属先行"]),
    nav("forensics.html#risk-chart", "风险排序", ["先判归属"]),
    nav("forensics.html#bot-audit", "Bot 缺口", ["机器人占比"]),
    nav("forensics.html#fatal", "第三方失败", ["第三方失败"]),
    nav("forensics.html#risk-backlog", "风险清单", ["风险项按数据强度"]),
    nav("forensics.html#pdp", "PDP 覆盖", ["PDP watchlist 首轮"]),
  ],
  "/trends.html": [
    nav("trends.html#hero", "趋势结论", ["最新 13 路由采集"]),
    nav("trends.html#trend-charts", "趋势证据", ["LCP 覆盖率"]),
    nav("trends.html#latest-v3", "最新采集", ["v3 路由感知"]),
  ],
  "/cross-audit.html": [
    nav("cross-audit.html#hard-conclusions", "硬结论", ["预算取舍"]),
    nav("cross-audit.html#cross-matrix", "策略矩阵", ["洞察 × 资源排序 × 验收"]),
    nav("cross-audit.html#contradictions", "冲突处理", ["决策冲突处理"]),
    nav("cross-audit.html#execution-orders", "执行战单", ["决策建议"]),
    nav("cross-audit.html#decision-chart", "决策图", ["决策矩阵"]),
  ],
  "/competitors.html": [
    nav("competitors.html#competitor-gap", "明显问题", ["竞品对比 · 明显问题标注"]),
    nav("competitors.html#competitor-benchmark", "竞品上限", ["竞品样本够用来设上限"]),
    nav("competitors.html#value-screen", "价值筛查", ["只补回能改变资源排序的方向"]),
    nav("competitors.html#competitor-action", "验收动作", ["把上限写进验收"]),
  ],
};

export const contentMinimumTextLength = 20;
