import {
  barChart,
  behaviorSankeyChart,
  botAttributionSankeyChart,
  coverageChart,
  pairedMetricChart
} from "./charts.mjs";
import {
  escapeHtml,
  fixed,
  integer,
  maxMetric,
  pct,
  usd,
  usdMillion
} from "./format.mjs";

function observedSessionDate(data) {
  return data.external?.latestSession?.replace("session-", "") || "";
}

function evidenceEyebrow(data) {
  return `最新外部采集 · <span class="evidence-session">${escapeHtml(data.external?.latestSession || "")}</span>`;
}

function formatTrendDelta(current, historical) {
  if (!Number.isFinite(current) || !Number.isFinite(historical) || historical === 0) return "口径/单位待统一后比较";
  const pctDelta = ((current - historical) / historical) * 100;
  if (!Number.isFinite(pctDelta)) return "口径/单位待统一后比较";
  const abs = Math.abs(pctDelta).toFixed(1);
  if (pctDelta > 0) return `上升 +${abs}%`;
  if (pctDelta < 0) return `下降 -${abs}%`;
  return "持平 0.0%";
}

export function crossAuditCards(data) {
  return `<div class="cross-grid">
    <div class="cross-card cross-card--warn">
      <div class="cross-label">内部数据状态</div>
      <div class="cross-value">${escapeHtml(data.internal.assessment)}</div>
      <div class="cross-meta">${data.internal.statusCounts.PASS} PASS / ${data.internal.statusCounts.WARN} WARN / ${data.internal.statusCounts.FAIL} FAIL</div>
    </div>
    <div class="cross-card cross-card--warn">
      <div class="cross-label">观察窗口</div>
      <div class="cross-value">${data.internal.trafficObservedDays}d / ${data.internal.salesObservedDays}d</div>
      <div class="cross-meta">流量观察天数 / 销售观察天数，不可强行合并</div>
    </div>
    <div class="cross-card cross-card--danger">
      <div class="cross-label">外部技术债最大值</div>
      <div class="cross-value">${data.external.maxThirdPartyFailures} 次</div>
      <div class="cross-meta">第三方失败；PDP ${escapeHtml(data.external.pdpThirdPartyFailures)}</div>
    </div>
    <div class="cross-card">
      <div class="cross-label">PDP 下一轮队列</div>
      <div class="cross-value">${data.internal.pdpWatchlistCount} 个</div>
      <div class="cross-meta">内部 watchlist；外部自动采集目前覆盖 ${data.external.routeCount} 条路径</div>
    </div>
  </div>`;
}

export function legacyData(data) {
  return data.legacyRecovery || {
    storyline: [],
    featureComparison: [],
    operatingSignals: [],
    trafficAttribution: [],
    assetMap: [],
    botGovernance: [],
    diagnosticBacklog: [],
    competitorMatrix: [],
    playbookCards: [],
    roadmap: []
  };
}

export function decisionData(data) {
  return data.decisionArchitecture || {
    logicChain: [],
    hardConclusions: [],
    executionOrders: []
  };
}

function botEvidence(data) {
  return data.botEvidence || {status: "missing", requiredSources: [], metrics: null};
}

function botEvidenceStatusLabel(data) {
  const status = botEvidence(data).status;
  if (status === "measured") return "已量化";
  if (status === "blocked") return "证据阻塞";
  return "证据缺口";
}

function botAttributionEyebrow(data) {
  const status = botEvidence(data).status;
  if (status === "measured") return "机器人占比 / 爬虫占比 · 归因已量化";
  if (status === "blocked") return "机器人占比 / 爬虫占比 · 归因证据阻塞";
  return "机器人占比 / 爬虫占比 · 归因证据缺口";
}

function hasMeasuredBotEvidence(data) {
  const evidence = botEvidence(data);
  return evidence.status === "measured" && Boolean(evidence.metrics);
}

function botEvidenceSummary(data) {
  if (hasMeasuredBotEvidence(data)) {
    return "human/bot 分段已有脱敏聚合证据，转化率、停留、跳出率可以按 segment 对比，但仍不能直接写成收益因果。";
  }
  return "机器人占比/爬虫占比为缺失或待复证证据；现有页面只列转化率、停留、跳出率和采集风险事实，不能写成 bot 百分比，也不能把低转化直接归因给 bot。";
}

function firstInteger(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

function pdpThirdPartyFailureValue(data) {
  const parsed = firstInteger(data.external?.pdpThirdPartyFailures);
  return Number.isFinite(parsed) ? parsed : data.external?.maxThirdPartyFailures;
}

function decisionMatrixRows(data) {
  const decision = decisionData(data);
  const hardConclusions = decision.hardConclusions || [];
  const freezeCount = hardConclusions.filter((item) => String(item.title || "").startsWith("不批准")).length;
  const approveCount = Math.max(hardConclusions.length - freezeCount, 0);
  const proceedCount = (decision.executionOrders || []).length;
  return [
    {label: "批准：硬结论", value: approveCount, digits: 0},
    {label: "冻结：不批准结论", value: freezeCount, digits: 0},
    {label: "推进：执行战单", value: proceedCount, digits: 0}
  ];
}

function competitorEvidence(data) {
  return data.competitorEvidence || {};
}

function competitorRows(data) {
  return (data.competitorSnapshot?.competitors || []).flatMap((competitor) =>
    (competitor.pages || []).flatMap((page) =>
      (page.viewports || []).map((viewport) => ({
        competitorId: competitor.id,
        competitorLabel: competitor.label || competitor.id,
        routeId: page.routeId,
        viewport: viewport.label,
        status: page.status,
        metrics: viewport.metrics || {}
      }))
    )
  );
}

function competitorMaxMetric(data, metric) {
  return competitorRows(data)
    .filter((row) => Number.isFinite(row.metrics?.[metric]))
    .sort((left, right) => right.metrics[metric] - left.metrics[metric])[0] || null;
}

function competitorMetricFallback(data, field) {
  const parsed = firstInteger(competitorEvidence(data)?.[field]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function competitorMetricValue(data, metric, fallbackField) {
  return competitorMaxMetric(data, metric)?.metrics?.[metric] ?? competitorMetricFallback(data, fallbackField);
}

function ratioLabel(current, reference) {
  if (!Number.isFinite(current) || !Number.isFinite(reference) || reference <= 0) return "需补样本";
  return `${fixed(current / reference, 1)}x`;
}

function competitorMaxDescriptor(row, fallback) {
  if (!row) return fallback || "竞品样本";
  const route = row.routeId === "homepage" ? "首页" : row.routeId === "pdp" ? "PDP" : "cart";
  const viewport = row.viewport === "mobile" ? "移动" : "桌面";
  return `${row.competitorLabel} ${route}/${viewport}`;
}

function competitorPressureRows(data) {
  const thirdParty = competitorMaxMetric(data, "thirdPartyFailures");
  const js = competitorMaxMetric(data, "jsKb");
  const dom = competitorMaxMetric(data, "domNodes");
  const pairs = [
    {
      metric: "第三方失败",
      current: data.external.maxThirdPartyFailures,
      reference: thirdParty?.metrics?.thirdPartyFailures ?? competitorMetricFallback(data, "maxThirdPartyFailures"),
      unit: "次",
      source: competitorMaxDescriptor(thirdParty, "竞品二轮最高"),
      verdict: "明显超出竞品上限，不能再用行业普遍重脚本稀释风险。"
    },
    {
      metric: "JS 体积",
      current: data.external.pdpJsKb || data.external.homepageJsKb,
      reference: js?.metrics?.jsKb ?? competitorMetricFallback(data, "maxJsKb"),
      unit: "KB",
      source: competitorMaxDescriptor(js, "竞品二轮最高"),
      verdict: "前端运行时负担已经高到足以解释 PDP 体验和采集噪音。"
    },
    {
      metric: "DOM 节点",
      current: data.external.maxDomNodes,
      reference: dom?.metrics?.domNodes ?? competitorMetricFallback(data, "maxDomNodes"),
      unit: "节点",
      source: competitorMaxDescriptor(dom, "竞品二轮最高"),
      verdict: "模板复杂度不是普通优化项，而是 PDP 队列治理项。"
    }
  ];
  return pairs.filter((row) => Number.isFinite(row.current) && Number.isFinite(row.reference));
}

function competitorRiskRankingRows(data) {
  const competitorFailureRows = competitorRows(data)
    .filter((row) => Number.isFinite(row.metrics.thirdPartyFailures))
    .sort((left, right) => right.metrics.thirdPartyFailures - left.metrics.thirdPartyFailures)
    .slice(0, 5)
    .map((row) => ({
      label: `${row.competitorLabel} ${row.routeId === "pdp" ? "PDP" : row.routeId} ${row.viewport}`,
      value: row.metrics.thirdPartyFailures,
      digits: 0,
      unit: "次"
    }));
  return [
    {label: "Momcozy watchlist 最高", value: data.external.maxThirdPartyFailures, digits: 0, unit: "次"},
    ...competitorFailureRows
  ];
}

function valueScreenRows(data) {
  const matrix = legacyData(data).competitorMatrix || [];
  const verdictByDimension = {
    "第三方脚本治理": {
      decision: "补回主线",
      reason: "Momcozy 第三方失败 92 vs 竞品上限 42，差距足以改变 P0 排序。",
      action: "进入 kill-list、owner、加载时机和失败预算。"
    },
    "PDP 行动路径": {
      decision: "补回主线",
      reason: "6/6 竞品 PDP 可达，Momcozy 已有 10 条 PDP watchlist，下一步应该按模板/入口分组排序。",
      action: "高风险 PDP 复跑，并补 KOL/UTM landing。"
    },
    "爬虫分级": {
      decision: "条件补回",
      reason: "5/6 竞品有命名 bot policy，但 Momcozy bot share 仍缺 owner 聚合证据。",
      action: "只作为归因证据缺口，不输出机器人占比。"
    },
    "内容入口变现": {
      decision: "继续冻结",
      reason: "当前自然搜索明细为空，不能恢复 SEO 收益或内容预算结论。",
      action: "先补搜索源、落地页和订单/加购映射。"
    }
  };
  return matrix.map((item) => ({
    dimension: item.dimension,
    evidence: item.reference,
    lesson: item.lesson,
    ...(verdictByDimension[item.dimension] || {
      decision: "暂不恢复",
      reason: "证据不足以改变当前资源排序。",
      action: "等待下一轮复采。"
    })
  }));
}

export function finalAuditData(data) {
  return data.finalAudit || {
    pageAudits: [],
    crossMatrix: [],
    contradictions: []
  };
}

export function crossMatrixSection(data) {
  const rows = finalAuditData(data).crossMatrix.map((item) => `<tr>
    <td><strong>${escapeHtml(item.conclusion)}</strong></td>
    <td>${escapeHtml(item.evidence)}</td>
    <td>${escapeHtml(item.strategy)}</td>
    <td>${escapeHtml(item.execution)}</td>
    <td>${escapeHtml(item.contradiction)}<div class="evidence-note">状态：${escapeHtml(item.status)}</div></td>
  </tr>`).join("");
  return `<section class="section" id="cross-matrix">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">洞察 × 资源排序 × 验收</div>
        <h2 class="section__title">把洞察结果落到资源排序和验收动作</h2>
        <p class="section__sub">这张表直接对应 owner、时间窗和验收指标。没有复采和回滚条件的建议不进入本轮排期。</p>
      </div>
      <details class="evidence-drilldown" open>
        <summary>查看本页证据明细</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>诊断结论</th><th>数据依据</th><th>资源方向</th><th>执行动作</th><th>约束</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

export function contradictionsSection(data) {
  const rows = finalAuditData(data).contradictions.map((item) => `<tr>
    <td><strong>${escapeHtml(item.issue)}</strong></td>
    <td>${escapeHtml(item.diagnosis)}</td>
    <td>${escapeHtml(item.fix)}</td>
    <td>${escapeHtml(item.proof)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="contradictions">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">决策冲突处理</div>
        <h2 class="section__title">把会误导预算的冲突直接处理掉</h2>
        <p class="section__sub">当前最容易误导团队的是三类冲突：把旧收益当承诺、把单次采集当全站结论、把第三方失败当普通前端问题。</p>
      </div>
      <details class="evidence-drilldown">
        <summary>查看冲突处理明细</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>冲突</th><th>业务风险</th><th>处理方式</th><th>验收方式</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

export function logicChainSection(data) {
  const rows = decisionData(data).logicChain.map((item) => `<tr>
    <td><strong>${escapeHtml(item.step)}</strong></td>
    <td>${escapeHtml(item.claim)}</td>
    <td>${escapeHtml(item.evidence)}</td>
    <td>${escapeHtml(item.counterEvidence)}</td>
    <td><strong>${escapeHtml(item.decision)}</strong><div class="evidence-note">执行：${escapeHtml(item.action)}</div></td>
  </tr>`).join("");
  return `<section class="section section--gray" id="insight-chain">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">核心洞察 · 业务影响 / 证据 / 动作</div>
        <h2 class="section__title">归因可信度与 PDP 负担是本轮最高优先级</h2>
        <p class="section__sub">经营数据给出优先级，外部采集给出风险位置：预算应集中到归因可信度、PDP 运行时负担、第三方失败治理和可复采实验。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>诊断段</th><th>业务判断</th><th>现场数据</th><th>限制 / 风险</th><th>下一步动作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function hardConclusionsSection(data) {
  const cards = decisionData(data).hardConclusions.map((item) => `<article class="playbook-card">
    <div class="playbook-card__head">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.why)}</p>
    </div>
    <div class="playbook-card__body">
      <p><strong>暂缓：</strong>${escapeHtml(item.reject)}</p>
      <p><strong>推进：</strong>${escapeHtml(item.approve)}</p>
      <div class="playbook-gate">验收门槛：${escapeHtml(item.gate)}</div>
    </div>
  </article>`).join("");
  return `<section class="section" id="hard-conclusions">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">预算取舍</div>
        <h2 class="section__title">先冻结错误预算，再推进高确定性修复</h2>
        <p class="section__sub">这部分不是通用建议，而是把资源从后端重构、SEO 收益承诺和单 PDP 外推中拉回来，集中到归因可信度、PDP 性能和可验收实验。</p>
      </div>
      <div class="playbook-grid">${cards}</div>
    </div>
  </section>`;
}

export function executionOrdersSection(data, id = "decisions") {
  const rows = decisionData(data).executionOrders.map((item) => `<tr>
    <td><strong>${escapeHtml(item.window)}</strong></td>
    <td>${escapeHtml(item.owner)}</td>
    <td><strong>${escapeHtml(item.action)}</strong><ol>${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol></td>
    <td>${escapeHtml(item.gate)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="${escapeHtml(id)}">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">决策建议 · 执行战单</div>
        <h2 class="section__title">不做泛泛优化，只批准这 5 个可落地动作</h2>
        <p class="section__sub">每个动作都有 owner、时间窗、步骤和验收门槛。没有 owner、没有复采、没有回滚条件的事项，不进入执行队列。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>时间窗</th><th>Owner</th><th>推进动作</th><th>验收门槛</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function businessKpiSection(data) {
  const current = data.currentOperations;
  const history = data.historicalOperations;

  const trendRows = [
    {
      label: "核心转化",
      current: pct(current.conversion.conversionRate),
      historical: pct(history.conversion.overallCvr),
      trend: formatTrendDelta(current.conversion.conversionRate, history.conversion.overallCvr),
      trendClass: "",
      note: "当前与历史都是比例口径，可直接用于方向比较。"
    },
    {
      label: "加购率",
      current: pct(current.conversion.addToCartRate),
      historical: pct(history.conversion.addToCartRate),
      trend: formatTrendDelta(current.conversion.addToCartRate, history.conversion.addToCartRate),
      trendClass: "",
      note: "当前明显放大，但仍需确认流量来源/人群口径是否一致。"
    },
    {
      label: "发起结账率",
      current: pct(current.conversion.checkoutRate),
      historical: pct(history.conversion.checkoutRate),
      trend: formatTrendDelta(current.conversion.checkoutRate, history.conversion.checkoutRate),
      trendClass: "",
      note: "可参考；同一口径成立时才承诺改善。"
    },
    {
      label: "跳出率",
      current: pct(current.traffic.bounceRate),
      historical: pct(history.traffic.bounceRate),
      trend: formatTrendDelta(current.traffic.bounceRate, history.traffic.bounceRate),
      trendClass: "",
      note: "方向是有效信号，建议与会话深度和页面性能联动判断。"
    },
    {
      label: "平均停留时长",
      current: `${fixed(current.traffic.avgStaySec, 1)}s`,
      historical: `${fixed(history.traffic.avgSessionSec, 1)}s`,
      trend: formatTrendDelta(current.traffic.avgStaySec, history.traffic.avgSessionSec),
      trendClass: "",
      note: "与停留质量结合 console/page error 复采验证。"
    },
    {
      label: "退款率",
      current: pct(current.sales.refundRate),
      historical: pct(history.sales.refundRate),
      trend: formatTrendDelta(current.sales.refundRate, history.sales.refundRate),
      trendClass: "",
      note: "不能拿短窗波动做策略终局，需跨窗口复核。"
    },
    {
      label: "AOV（金额）",
      current: fixed(current.sales.averageOrderValue, 2),
      historical: fixed(history.sales.averageOrderValueUsd, 2),
      trend: "口径/币种待统一后比较",
      note: "当前/历史币种与口径不同，不做同比结论。"
    },
    {
      label: "销售规模（金额）",
      current: `${fixed(current.sales.totalSalesWan, 2)}万`,
      historical: `${fixed(history.sales.totalRevenueUsd, 0)} USD`,
      trend: "口径/币种待统一后比较",
      note: "当前销售快照与历史 M1 v2.0 的量纲不同，仅用于上下文，不作为收益因果依据。"
    }
  ];

  return `<section class="section section--gray" id="business-kpi">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">真实经营 KPI · 私密版</div>
        <h2 class="section__title">当前经营表与历史经营 JSON 的最新版本回写</h2>
        <p class="section__sub">以下指标按 owner 最新指令写入页面。当前 workbook 与历史 M1 v2.0 不是同口径，不做假同比；每个洞察都绑定“站内外复核动作”。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">当前总销售额</div><div class="card-value">${fixed(current.sales.totalSalesWan, 2)}万</div><div class="card-meta">源表原单位；币种状态：${escapeHtml(current.warnings.currencyStatus)}</div></div>
        <div class="metric-card metric-card--success"><div class="card-label">当前转化率</div><div class="card-value">${pct(current.conversion.conversionRate)}</div><div class="card-meta">加购 ${pct(current.conversion.addToCartRate)} · 发起结账 ${pct(current.conversion.checkoutRate)}</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">历史总营收</div><div class="card-value">${usdMillion(history.sales.totalRevenueUsd)}</div><div class="card-meta">历史窗口 ${escapeHtml(history.window)} · ${history.periodDays}d</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">历史月营收</div><div class="card-value">${usdMillion(history.sales.monthlyRevenueUsd)}</div><div class="card-meta">历史月化口径 · ${fixed(history.months, 4)} months</div></div>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>模块</th><th>当前 workbook</th><th>历史 M1 v2.0</th><th>解读</th></tr></thead>
          <tbody>
            <tr><td><strong>窗口</strong></td><td>流量 ${escapeHtml(current.trafficWindow)}（${current.trafficNonzeroDays} 非零日）<br>销售 ${escapeHtml(current.salesWindow)}（${current.salesNonzeroDays} 非零日）</td><td>${escapeHtml(history.window)}（${history.periodDays} 天）</td><td>不是同一时间窗，不能直接当作环比。</td></tr>
            <tr><td><strong>流量</strong></td><td>总访问量 ${fixed(current.traffic.totalVisitsWan, 4)}万；总访客 ${fixed(current.traffic.totalVisitorsWan, 4)}万；人均 PV ${fixed(current.traffic.avgPv, 2)}</td><td>PV ${fixed(history.traffic.totalPvMillion, 1)}M；UV ${fixed(history.traffic.totalUvMillion, 1)}M；人均 PV ${fixed(history.traffic.avgPvPerVisitor, 2)}</td><td>当前表更像近窗运营监控，历史表是大窗口诊断基线。</td></tr>
            <tr><td><strong>参与度</strong></td><td>平均停留 ${fixed(current.traffic.avgStaySec, 1)}s；跳出率 ${pct(current.traffic.bounceRate)}</td><td>平均停留 ${fixed(history.traffic.avgSessionSec, 1)}s；跳出率 ${pct(history.traffic.bounceRate)}</td><td>参与度改善信号存在，但需用同口径趋势确认。</td></tr>
            <tr><td><strong>转化漏斗</strong></td><td>浏览率 ${fixed(current.conversion.browseRate, 2)}；加购率 ${pct(current.conversion.addToCartRate)}；发起结账率 ${pct(current.conversion.checkoutRate)}；转化率 ${pct(current.conversion.conversionRate)}</td><td>加购率 ${pct(history.conversion.addToCartRate)}；发起结账率 ${pct(history.conversion.checkoutRate)}；overall_cvr ${pct(history.conversion.overallCvr)}</td><td>当前漏斗数值更好，但需先确认采集口径和 bot 过滤口径。</td></tr>
            <tr><td><strong>销售</strong></td><td>净售出商品数 ${integer(current.sales.quantitySold)}；总销售额 ${fixed(current.sales.totalSalesWan, 6)}万；AOV ${fixed(current.sales.averageOrderValue, 2)}</td><td>总销量 ${integer(history.sales.quantitySold)}；总营收 ${usd(history.sales.totalRevenueUsd)}；AOV ${usd(history.sales.averageOrderValueUsd)}</td><td>历史值补齐长期参照；当前值用于私密经营看板。</td></tr>
            <tr><td><strong>售后/复购</strong></td><td>退款率 ${pct(current.sales.refundRate)}；复购率 ${pct(current.sales.repurchaseRate)}；连带率 ${pct(current.sales.attachRate)}</td><td>退款率 ${pct(history.sales.refundRate)}；复购率 ${pct(history.sales.repurchaseRate)}；连带率 ${pct(history.sales.attachRate)}</td><td>这些是“不能被修坏”的资产约束。</td></tr>
            <tr><td><strong>预警</strong></td><td>近 7 天预警 ${current.warnings.recentWarningRows} 行；自定义日期预警 ${current.warnings.customRangeWarningRows} 行；自然搜索明细 ${current.warnings.naturalSearchRows} 行</td><td>历史自然搜索 Top 5 有明细</td><td>搜索故事应以当前补源为准，不再仅靠历史导出。</td></tr>
          </tbody>
        </table>
      </div>

      <div id="business-kpi-trend" style="padding-top:24px;">
        <div class="section__head">
          <div class="section__eyebrow">经营趋势对照</div>
          <h2 class="section__title">指标趋势先做方向判定，再谈预算承诺</h2>
          <p class="section__sub">站内外数据先证明“趋势方向”，再通过实验账本证明“是否带来收益”。下面只保留可对齐口径的指标方向。</p>
        </div>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>指标</th><th>当前值</th><th>历史值</th><th>方向</th><th>说明</th></tr></thead>
            <tbody>${trendRows.map((item) => `<tr><td><strong>${escapeHtml(item.label)}</strong></td><td>${item.current}</td><td>${item.historical}</td><td>${escapeHtml(item.trend)}</td><td>${escapeHtml(item.note)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    </div>
  </section>`;
}

export function trafficAttributionSection(data) {
  const rows = legacyData(data).trafficAttribution.map((item) => `<tr>
    <td><strong>${escapeHtml(item.driver)}</strong></td>
    <td>${escapeHtml(item.historicalSignal)}</td>
    <td>${escapeHtml(item.currentCheck)}</td>
    <td>${escapeHtml(item.nextProof)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="traffic-attribution">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">归因质量判断</div>
        <h2 class="section__title">先修归因可信度，再决定预算和 SEO 动作</h2>
        <p class="section__sub">历史站拆过流量来源，价值在于提醒团队不要只看总访问量。当前自然搜索明细为空，第三方失败又会污染广告、评论、客服和实验归因；因此本段只保留可执行的归因治理动作，不再沿用旧窗口下的收益判断。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>归因驱动</th><th>历史信号</th><th>当前校验</th><th>可执行校验动作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function botGovernanceSection(data) {
  const cards = legacyData(data).botGovernance.map((item) => `<div class="route-card">
    <h3>${escapeHtml(item.area)}</h3>
    <p><strong>风险：</strong>${escapeHtml(item.risk)}</p>
    <p><strong>证据状态：</strong>${escapeHtml(item.publicEvidence)}</p>
    <p><strong>下一步：</strong>${escapeHtml(item.nextAction)}</p>
  </div>`).join("");
  const measured = hasMeasuredBotEvidence(data);
  return `<section class="section section--gray" id="bot-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">爬虫与数据可信度 · ${escapeHtml(botEvidenceStatusLabel(data))}</div>
        <h2 class="section__title">${measured ? "机器人占比进入分段归因，不再按假设处理" : "机器人占比只能作为待复证归因风险"}</h2>
        <p class="section__sub">${escapeHtml(botEvidenceSummary(data))}</p>
      </div>
      <div class="route-grid">${cards}</div>
      <div class="deprecated"><strong>${measured ? "使用边界" : "复证要求"}：</strong>${measured ? "只有当 bot/crawler 分段显著偏离 human，才把机器人占比写入转化、停留、跳出归因。" : "owner analytics / bot log / human-bot 维度复证后，才能判断 www.momcozy.com 是否存在机器人占比高并污染渠道、停留、跳出和转化归因。"}</div>
    </div>
  </section>`;
}

export function funnelInsightSection(data) {
  return behaviorSankeyChart({data});
}

export function botAttributionInsightSection(data) {
  const measured = hasMeasuredBotEvidence(data);
  return `<section class="section section--gray" id="bot-attribution">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${escapeHtml(botAttributionEyebrow(data))}</div>
        <h2 class="section__title">${measured ? "按 human/bot 分段解释转化率、停留和跳出" : "先把 human/bot 维度补齐，再解释转化率、停留和跳出"}</h2>
        <p class="section__sub">${measured ? "当前页面只使用脱敏聚合分段，比较 human、bot、crawler、unknown 的转化率、停留和跳出；归因结论必须以分段差异为前提。" : "当前数据能列事实：转化率、停留、跳出率可与历史并排比较；但机器人占比/爬虫占比为缺失或待复证证据，不能把低转化、短停留或高跳出归因给 bot。"}</p>
      </div>
      ${botAttributionSankeyChart({data})}
    </div>
  </section>`;
}

export function diagnosticBacklogSection(data) {
  const rows = legacyData(data).diagnosticBacklog.map((item) => `<div class="backlog-card">
    <span class="badge badge--${item.priority.toLowerCase()}">${escapeHtml(item.priority)}</span>
    <h3>${escapeHtml(item.item)}</h3>
    <p><strong>证据：</strong>${escapeHtml(item.evidence)}</p>
    <p><strong>验收：</strong>${escapeHtml(item.acceptance)}</p>
  </div>`).join("");
  return `<section class="section" id="risk-backlog">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">风险清单</div>
        <h2 class="section__title">风险项按数据强度和验收门槛重排</h2>
        <p class="section__sub">本轮只保留能被复采、归属和验收的风险项；排序依据是可复现程度、路径风险和能否进入执行战单。</p>
      </div>
      <div class="backlog-grid">${rows}</div>
    </div>
  </section>`;
}

export function overviewProofSection(data) {
  const current = data.currentOperations;
  const historical = data.historicalOperations;
  const measured = hasMeasuredBotEvidence(data);
  return `<section class="section section--gray" id="overview-proof">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${evidenceEyebrow(data)}</div>
        <h2 class="section__title">结论、事实、归因、行动放在同一张证据板</h2>
        <p class="section__sub">真实经营数据回归，关键风险收敛。当前与历史对比显示转化率、停留、跳出率可读；${measured ? "机器人占比/爬虫占比已纳入脱敏聚合分段，只能按 human/bot 差异解释归因。" : "机器人占比/爬虫占比为缺失或待复证证据，必须由 owner analytics / bot log / human-bot 维度复证。"}</p>
      </div>
      ${pairedMetricChart({
        id: "chart-overview-proof",
        title: "总览证据：当前 workbook vs 历史经营",
        subtitle: "只比较同类指标方向；金额与不同窗口不写成收益因果。",
        pairs: [
          {label: "转化率", currentLabel: "当前", historicalLabel: "历史", current: current.conversion.conversionRate, historical: historical.conversion.overallCvr, format: "percent"},
          {label: "平均停留", currentLabel: "当前", historicalLabel: "历史", current: current.traffic.avgStaySec, historical: historical.traffic.avgSessionSec, unit: "s", digits: 1},
          {label: "跳出率", currentLabel: "当前", historicalLabel: "历史", current: current.traffic.bounceRate, historical: historical.traffic.bounceRate, format: "percent"}
        ]
      })}
      <div class="route-grid">
        <div class="route-card"><h3>结论</h3><p>归因可信度、PDP 负担和第三方失败比单点 SEO 收益故事更值得预算优先级。</p></div>
        <div class="route-card"><h3>事实</h3><p>www.momcozy.com 当前转化率、停留、跳出率已有当前/历史对照；${measured ? "机器人占比已由脱敏聚合 human/bot 证据承接，不能脱离分段指标解读。" : "机器人占比没有实测 bot share，不能编造百分比。"}</p></div>
        <div class="route-card"><h3>行动</h3><p>冻结错误预算，建立第三方域名 kill-list，用复采和验收门槛决定推进顺序。</p></div>
      </div>
    </div>
  </section>`;
}

export function metricGovernanceSection(data) {
  const current = data.currentOperations;
  const historical = data.historicalOperations;
  const measured = hasMeasuredBotEvidence(data);
  return `<section class="section section--gray" id="metric-governance">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${evidenceEyebrow(data)}</div>
        <h2 class="section__title">可用指标负责方向，不可用指标先冻结</h2>
        <p class="section__sub">先统一口径，再讨论增长。当前 workbook 与历史经营都可用于转化率、停留和跳出率方向判断；${measured ? "bot share 只在脱敏聚合 human/bot 分段内可用。" : "不可用的是不同窗口金额同比、未实测 bot share、缺 human/bot 维度的渠道归因。"}</p>
      </div>
      ${pairedMetricChart({
        id: "chart-kpi-direction",
        title: "KPI 方向图：当前 workbook / 历史经营",
        subtitle: "可用：比例和参与度方向；不可用：跨币种金额同比、未复证 bot share。",
        pairs: [
          {label: "核心转化率", currentLabel: "当前 workbook", historicalLabel: "历史经营", current: current.conversion.conversionRate, historical: historical.conversion.overallCvr, format: "percent"},
          {label: "平均停留", currentLabel: "当前 workbook", historicalLabel: "历史经营", current: current.traffic.avgStaySec, historical: historical.traffic.avgSessionSec, unit: "s", digits: 1},
          {label: "跳出率", currentLabel: "当前 workbook", historicalLabel: "历史经营", current: current.traffic.bounceRate, historical: historical.traffic.bounceRate, format: "percent"}
        ]
      })}
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>口径</th><th>状态</th><th>用途</th><th>下一步 / 验收</th></tr></thead>
          <tbody>
            <tr><td>当前 workbook</td><td>可用</td><td>经营优先级、实验 baseline、漏斗方向</td><td>统一流量/销售窗口后再承诺增长</td></tr>
            <tr><td>历史经营</td><td>可用</td><td>长期基线、趋势方向、资产约束</td><td>保留 caveat，不能替代当前 owner 数据</td></tr>
            <tr><td>机器人占比</td><td>${measured ? "分段可用" : "不可用"}</td><td>${measured ? "按 human/bot/crawler/unknown 解释归因质量" : "只能作为归因风险假设"}</td><td>${measured ? "继续复采，确认分段差异是否稳定" : "owner analytics / bot log / human-bot 维度复证"}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function riskRankingSection(data) {
  return `<section class="section section--gray" id="risk-chart">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${evidenceEyebrow(data)}</div>
        <h2 class="section__title">先判归属和必要性，再处理脚本与 PDP 负担。</h2>
        <p class="section__sub">第三方失败、DOM 膨胀和 PDP watchlist 都需要 owner、用途、归属、kill-list、复采窗口和验收门槛；没有归属的脚本不进入优化叙事。</p>
      </div>
      ${barChart({
        id: "chart-risk-ranking",
        title: "风险排序：失败 / DOM / PDP 负担",
        subtitle: "数值来自最新外部采集和内部 watchlist；用于排序，不写成收入因果。",
        rows: [
          {label: "第三方失败最大值", value: data.external.maxThirdPartyFailures, digits: 0},
          {label: "PDP 第三方失败", value: pdpThirdPartyFailureValue(data), digits: 0},
          {label: "DOM 最大节点", value: data.external.maxDomNodes, digits: 0},
          {label: "PDP watchlist", value: data.internal.pdpWatchlistCount, digits: 0}
        ]
      })}
      <div class="deprecated"><strong>kill-list 门槛：</strong>每个域名必须写清 owner、用途、归属、失败预算、回滚条件和复采验收；PDP 负担按 cart / checkout / 10 PDP 首轮继续扩采。</div>
    </div>
  </section>`;
}

export function trendChartsSection(data, session) {
  const maxJs = maxMetric(session, "jsKb");
  const maxDom = maxMetric(session, "domNodes");
  const maxFailures = maxMetric(session, "thirdPartyFailures");
  return `<section class="section section--gray" id="trend-charts">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${evidenceEyebrow(data)}</div>
        <h2 class="section__title">趋势证据先看覆盖率，再看 JS、DOM 和第三方失败</h2>
        <p class="section__sub">趋势必须和经营 caveat 一起读。LCP 覆盖率、JS、DOM、第三方失败都需要复采和验收；最新外部采集只证明风险位置，不证明收益因果。</p>
      </div>
      ${coverageChart({
        id: "chart-lcp-coverage",
        title: "LCP 覆盖率",
        subtitle: "PerformanceObserver 未稳定捕获 LCP，验收前必须补充可观测率。",
        observed: data.external.lcpObservedSamples,
        total: data.external.lcpTotalSamples,
        label: "LCP 覆盖率"
      })}
      ${pairedMetricChart({
        id: "chart-js-dom",
        title: "JS / DOM 当前压力",
        subtitle: "首页 JS 与全路由最大 DOM 并列看，避免只盯单页。",
        pairs: [
          {label: "JS KB", currentLabel: "首页", historicalLabel: "全路由最大", current: data.external.homepageJsKb, historical: maxJs, unit: "KB", digits: 0},
          {label: "DOM nodes", currentLabel: "首页", historicalLabel: "全路由最大", current: data.external.homepageDomNodes || data.external.maxDomNodes, historical: maxDom, digits: 0}
        ]
      })}
      ${barChart({
        id: "chart-third-party-failures",
        title: "第三方失败",
        subtitle: "PDP、cart、checkout 都要进入复采验收。",
        rows: [
          {label: "最新最大失败", value: maxFailures, digits: 0},
          {label: "发布数据最大失败", value: data.external.maxThirdPartyFailures, digits: 0}
        ]
      })}
      <div class="deprecated"><strong>验收：</strong>复采必须同时报告 LCP 覆盖率、JS、DOM、第三方失败、路由状态和经营 caveat。</div>
    </div>
  </section>`;
}

export function decisionChartSection(data) {
  const measured = hasMeasuredBotEvidence(data);
  return `<section class="section section--gray" id="decision-chart">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${evidenceEyebrow(data)}</div>
        <h2 class="section__title">决策矩阵只保留可执行结论</h2>
        <p class="section__sub">历史报告为基线，当前数据只保留可执行结论。资源排序、验收、冲突和执行战单同时出现；批准、冻结、推进都必须绑定 owner 和复采。${measured ? "bot/crawler 指标必须和 human 分段对照后进入归因。" : "机器人占比/爬虫占比为缺失或待复证证据，不能生成任何 bot share 数值。"}</p>
      </div>
      ${barChart({
        id: "chart-decision-matrix",
        title: "决策矩阵：批准 / 冻结 / 推进",
        subtitle: "矩阵只保留执行排序和验收边界。",
        rows: decisionMatrixRows(data)
      })}
      ${botAttributionSankeyChart({data})}
    </div>
  </section>`;
}

export function competitorHero(data) {
  const evidence = competitorEvidence(data);
  const pressureRows = competitorPressureRows(data);
  const worstGap = pressureRows
    .map((row) => ({...row, ratio: row.reference > 0 ? row.current / row.reference : 0}))
    .sort((left, right) => right.ratio - left.ratio)[0];
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">VI · 竞品对比 · 洞察报告</span>
      <h1 class="hero__title">竞品不是借口，<br><span class="hl">是预算上限。</span></h1>
      <p class="hero__lead">竞品不是借口，是预算上限。竞品二轮公开样本覆盖 ${evidence.competitorCount || 6} 个品牌、${evidence.sampledPageCount || 18} 个公开页面、${evidence.viewportSampleCount || 24} 个视口。结论很直接：行业脚本都重，但 Momcozy 的 PDP watchlist 更重，第三方失败、JS 和 DOM 都超过竞品上限。</p>
      <p class="hero__lead">最尖锐的问题是 ${escapeHtml(worstGap?.metric || "第三方失败")}：Momcozy ${integer(worstGap?.current || data.external.maxThirdPartyFailures)}${escapeHtml(worstGap?.unit || "次")} vs 竞品最高 ${integer(worstGap?.reference || 42)}${escapeHtml(worstGap?.unit || "次")}，约 ${escapeHtml(ratioLabel(worstGap?.current, worstGap?.reference))}。这不是审美问题，而是归因可信度、PDP 体验和实验噪音问题。</p>
      <div class="hero__meta">
        <span>竞品样本 · ${evidence.observedAt || "2026-06-18"} · ${evidence.viewportSampleCount || 24} 视口</span>
        <span>自站样本 · ${escapeHtml(data.external.latestSession)} · ${data.external.routeCount} 路径</span>
        <span>用途 · 资源排序 / 失败预算 / 复采门槛</span>
      </div>
    </div>
  </section>`;
}

export function competitorProblemSection(data) {
  const rows = competitorPressureRows(data);
  const cards = rows.map((row) => `<article class="metric-card metric-card--danger">
    <div class="card-label">${escapeHtml(row.metric)}</div>
    <div class="card-value">${escapeHtml(ratioLabel(row.current, row.reference))}</div>
    <div class="card-meta">Momcozy ${integer(row.current)}${escapeHtml(row.unit)} / 竞品最高 ${integer(row.reference)}${escapeHtml(row.unit)} · ${escapeHtml(row.source)}</div>
  </article>`).join("");
  const tableRows = rows.map((row) => `<tr>
    <td><strong>${escapeHtml(row.metric)}</strong></td>
    <td>${integer(row.current)}${escapeHtml(row.unit)}</td>
    <td>${integer(row.reference)}${escapeHtml(row.unit)}<div class="evidence-note">${escapeHtml(row.source)}</div></td>
    <td><strong>${escapeHtml(ratioLabel(row.current, row.reference))}</strong></td>
    <td>${escapeHtml(row.verdict)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="competitor-gap">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">竞品对比 · 明显问题标注</div>
        <h2 class="section__title">Momcozy 的负担高过竞品上限，不是行业常态</h2>
        <p class="section__sub">这里不做分值化排名，只做可复核的上限对比。超过竞品二轮最高值的指标，直接进入资源排序和失败预算。</p>
      </div>
      <div class="metric-grid">${cards}</div>
      ${pairedMetricChart({
        id: "chart-competitor-gap",
        title: "自站 vs 竞品二轮上限",
        subtitle: "同口径公开样本；Momcozy 使用 PDP watchlist / 最新外部采集最大值，竞品使用二轮采样最大值。",
        pairs: rows.map((row) => ({
          label: row.metric,
          currentLabel: "Momcozy",
          historicalLabel: "竞品上限",
          current: row.current,
          historical: row.reference,
          unit: row.unit,
          digits: 0
        }))
      })}
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>问题</th><th>Momcozy</th><th>竞品上限</th><th>差距</th><th>洞察结论</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function competitorBenchmarkSection(data) {
  const evidence = competitorEvidence(data);
  return `<section class="section" id="competitor-benchmark">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">竞品样本 · 覆盖与排序</div>
        <h2 class="section__title">竞品样本够用来设上限，不够用来宣布终局</h2>
        <p class="section__sub">竞品数据的正确用途是设失败预算、判断 Momcozy 是否异常、决定下一轮复采队列；不是做品牌胜负榜，也不是替代 owner 经营数据。</p>
      </div>
      <div class="cross-grid">
        <div class="cross-card"><div class="cross-label">竞品品牌</div><div class="cross-value">${evidence.competitorCount || 6}</div><div class="cross-meta">公开样本品牌数</div></div>
        <div class="cross-card"><div class="cross-label">视口样本</div><div class="cross-value">${evidence.viewportSampleCount || 24}</div><div class="cross-meta">首页 / PDP / cart 双视口</div></div>
        <div class="cross-card cross-card--warn"><div class="cross-label">PDP 可达</div><div class="cross-value">${evidence.reachablePdpCount || 6}/6</div><div class="cross-meta">竞品 PDP 样本公开可达</div></div>
        <div class="cross-card cross-card--warn"><div class="cross-label">Cart 可达</div><div class="cross-value">${evidence.reachableCartCount || 5}/6</div><div class="cross-meta">公开 cart 样本，不代表真实 checkout</div></div>
      </div>
      ${barChart({
        id: "chart-competitor-risk-ranking",
        title: "第三方失败排名：Momcozy vs 竞品最高样本",
        subtitle: "数值越高，归因污染和运行时噪音越需要 owner/预算治理。",
        rows: competitorRiskRankingRows(data)
      })}
    </div>
  </section>`;
}

export function competitorValueScreenSection(data) {
  const rows = valueScreenRows(data).map((item) => `<tr>
    <td><strong>${escapeHtml(item.dimension)}</strong></td>
    <td><strong>${escapeHtml(item.decision)}</strong><div class="evidence-note">${escapeHtml(item.reason)}</div></td>
    <td>${escapeHtml(item.evidence)}</td>
    <td>${escapeHtml(item.lesson)}</td>
    <td>${escapeHtml(item.action)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="value-screen">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">价值筛查 · 旧洞察方向是否补回</div>
        <h2 class="section__title">只补回能改变资源排序的方向</h2>
        <p class="section__sub">旧方向不是全量恢复。第三方治理和 PDP 行动路径直接补回；爬虫分级只作为归因证据缺口；内容入口变现继续冻结，直到搜索源和落地页数据补齐。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>旧方向</th><th>筛查结论</th><th>当前证据</th><th>保留价值</th><th>进入故事线的方式</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function competitorDecisionSection(data) {
  return `<section class="section" id="competitor-action">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">竞品对比 · 决策动作</div>
        <h2 class="section__title">下一轮不是再证明有问题，而是把上限写进验收</h2>
        <p class="section__sub">Momcozy 已经高过竞品上限。继续讨论“是否有问题”会浪费时间；下一步要把竞品上限变成脚本预算、PDP 复采队列和回滚条件。</p>
      </div>
      <div class="route-grid">
        <div class="route-card"><h3>第三方失败预算</h3><p>总第三方失败不得继续高于竞品上限 42；保留超过上限的脚本必须有 owner、用途和不可替代理由。</p></div>
        <div class="route-card"><h3>PDP 模板队列</h3><p>M5、Mobile Flow、S12 Pro 等高风险 PDP 先复跑，不再用单 PDP 或首页数据代表商品详情页。</p></div>
        <div class="route-card"><h3>竞品对比边界</h3><p>当前样本只支持公开页面技术上限，不支持收入、SEO、真实 checkout 或品牌胜负结论。</p></div>
      </div>
    </div>
  </section>`;
}

export function competitorGeoLandscapeSection(data) {
  const geo = data.geoCompetitorLandscape;
  if (!geo) return "";
  const freqIcon = (f) => f === "very_high" ? "★★★★★" : f === "high" ? "★★★★" : "★★★";
  const segBadge = (s) => {
    const map = {"premium": "badge--p0", "mid_to_premium": "badge--p0", "mid": "badge--p1", "budget_to_mid": "badge--p2", "budget": "badge--p2"};
    const label = {"premium": "高端", "mid_to_premium": "中高", "mid": "中端", "budget_to_mid": "中低", "budget": "预算"}[s] || s;
    return `<span class="badge ${map[s] || "badge--p2"}">${escapeHtml(label)}</span>`;
  };
  const rows = (geo.competitors || []).map(c => `<tr>
    <td><strong>${escapeHtml(c.label)}</strong><div class="evidence-note">${escapeHtml(c.domain || "")}</div></td>
    <td style="font-size:12px;">${escapeHtml(c.category || "")}</td>
    <td>${freqIcon(c.geoFrequency)}</td>
    <td>${segBadge(c.priceSegment)}</td>
    <td style="font-size:12px;color:var(--text-secondary);">${escapeHtml(c.geoRole || "")}</td>
  </tr>`).join("");
  const mp = geo.momcozyPositioning || {};
  return `<section class="section" id="geo-competitor-landscape">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">GEO 竞品格局 · ${escapeHtml(geo.updatedAt || "2026-06-19")} · 10 品牌</div>
        <h2 class="section__title">AI 推荐中与 Momcozy 共同出现的 10 个品牌</h2>
        <p class="section__sub">基于 Forbes、BabyCenter、Consumer Reports、The Bump、Amazon Best Sellers 2026 年 6 月最新排名，识别在生成式搜索引擎推荐中与 Momcozy 高频共框的竞品。当前采集覆盖 6 个品牌；下一轮扩充至全部 10 个。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--danger">
          <div class="card-label">Momcozy GEO 当前地位</div>
          <div class="card-value">5/5 · 0/5</div>
          <div class="card-meta">5 个问题均被提及 · 0 个问题获得 best overall</div>
        </div>
        <div class="metric-card metric-card--warn">
          <div class="card-label">AI 引用主权</div>
          <div class="card-value">第三方依赖</div>
          <div class="card-meta">主要依赖 Forbes/NYMag 引用，品牌自有页面几乎不被直接引用</div>
        </div>
        <div class="metric-card">
          <div class="card-label">新增竞品追踪</div>
          <div class="card-value">4 个</div>
          <div class="card-meta">eufy / Freemie / Medela / BEABA 已加入下一轮采集队列</div>
        </div>
      </div>
      <div class="cross-table-wrap" tabindex="0" style="margin-top:22px;">
        <table class="cross-table">
          <thead><tr><th>品牌</th><th>类别</th><th>GEO 频次</th><th>价格段</th><th>在 AI 推荐中的角色</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="callout-strong" style="margin-top:22px;">
        <div class="card-label" style="color:#fbbf24;">Momcozy GEO 突破方向</div>
        <p>${(mp.targetScenarios || []).map(s => `<strong>${escapeHtml(s)}</strong>`).join(" · ")}。当前品牌定位被固化为 budget/value——突破需要在保险、职场和轻量旅行三个具体场景建立专题内容，推动 AI 从「被提及」升级到「被推荐最佳」。</p>
      </div>
    </div>
  </section>`;
}

export function competitorsBody(data) {
  return `${competitorHero(data)}
  ${competitorProblemSection(data)}
  ${competitorGeoLandscapeSection(data)}
  ${competitorBenchmarkSection(data)}
  ${competitorValueScreenSection(data)}
  ${competitorDecisionSection(data)}`;
}

export function hero(data) {
  const sessionLabel = observedSessionDate(data);
  return `<section class="hero" id="hero">
    <div class="container">
      <div class="hero__grid">
        <div>
          <span class="hero__badge">洞察报告 · 私密经营数据版</span>
          <h1 class="hero__title">真实经营数据回归，<br><span class="hl">关键风险收敛</span>。</h1>
          <p class="hero__lead">真实经营数据回归，关键风险收敛。本版把当前 workbook、历史经营 JSON 与 ${sessionLabel || "最新"} 自动采集收敛为同一份经营洞察：结论 -> 事实 -> 归因 -> 行动。</p>
          <p class="hero__lead">当前经营表显示总销售额 ${fixed(data.currentOperations.sales.totalSalesWan, 2)}万、转化率 ${pct(data.currentOperations.conversion.conversionRate)}、AOV ${fixed(data.currentOperations.sales.averageOrderValue, 2)}；历史 M1 v2.0 显示总营收 ${usdMillion(data.historicalOperations.sales.totalRevenueUsd)}、monthly_revenue ${usdMillion(data.historicalOperations.sales.monthlyRevenueUsd)}、overall_cvr ${pct(data.historicalOperations.conversion.overallCvr)}。自动采集则证明首页与代表性 PDP 仍暴露约 1.9MB JS、最高 ${data.external.maxDomNodes.toLocaleString("en-US")} DOM 节点、最高 ${data.external.maxThirdPartyFailures} 次第三方失败；竞品二轮上限只有 ${competitorMetricValue(data, "thirdPartyFailures", "maxThirdPartyFailures") || 42} 次，Momcozy 不能再把脚本负担解释成行业常态。</p>
          <div class="hero__meta">
            <span>经营刷新 · ${data.internal.statusCounts.PASS} PASS / ${data.internal.statusCounts.WARN} WARN / ${data.internal.statusCounts.FAIL} FAIL</span>
            <span>外部采集 · ${escapeHtml(data.external.latestSession)} · ${data.external.routeCount} 路径</span>
            <span>私密经营版 · 真实金额/KPI 已写入</span>
          </div>
        </div>
        <div class="panel">
          <div class="card-label">当前决策状态</div>
          <div class="card-value" style="font-size:42px;color:var(--accent);">私密版重审</div>
          <p class="card-meta">真实经营 KPI、历史数据和自动采集证据并列展示；历史窗口与当前 workbook 不同口径，需按 caveat 解读。</p>
          ${crossAuditCards(data)}
        </div>
      </div>
    </div>
  </section>`;
}

export function overviewBody(data) {
  return `${hero(data)}
  ${logicChainSection(data)}
  ${hardConclusionsSection(data)}
  ${overviewProofSection(data)}
  ${businessKpiSection(data)}
  ${trafficAttributionSection(data)}
  ${botAttributionInsightSection(data)}
  ${executionOrdersSection(data)}`;
}

export function metricsBody(data) {
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">II · 指标口径 · 洞察报告</span>
      <h1 class="hero__title">先统一口径，<br><span class="hl">再讨论增长。</span></h1>
      <p class="hero__lead">先统一口径，再讨论增长。这页不再把旧 25 指标当作全部当前事实。最新经营数据只能支持三类表达：可复算漏斗、需要 caveat 的经营口径、暂时冻结的 SEO 变现故事。</p>
      <p class="hero__lead">强证据来自外部自动采集：TTFB 不是主问题，JS、DOM、第三方失败和 LCP 不可观测才是工程优先级。</p>
  ${crossAuditCards(data)}
    </div>
  </section>
  ${metricGovernanceSection(data)}
  ${businessKpiSection(data)}
  <section class="section section--gray" id="funnel">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">口径治理</div>
        <h2 class="section__title">旧漏斗图回归，但必须和当前 workbook 分开读</h2>
        <p class="section__sub">内部漏斗校验通过，说明业务摩擦真实存在；但 traffic/sales 窗口不一致、币种待确认、SEO keyword rows = ${data.internal.naturalSearchRows}，所以当前页面并列展示真实值，同时保留口径 caveat。</p>
      </div>
      ${funnelInsightSection(data)}
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>口径</th><th>当前判定</th><th>可以怎么用</th><th>不能怎么用</th><th>依据</th></tr></thead>
          <tbody>
            <tr><td>内部经营漏斗</td><td>可复算，但需 caveat</td><td>作为实验 baseline 与优先级方向</td><td>直接承诺收益</td><td>内部经营数据校验摘要</td></tr>
            <tr><td>外部性能采集</td><td>可复采验证</td><td>定位 JS、DOM、第三方失败、LCP 风险</td><td>单独证明收入因果</td><td>${escapeHtml(data.external.latestSession)}</td></tr>
            <tr><td>PDP watchlist</td><td>私有执行队列</td><td>扩展 recurring collector 与页面级排查</td><td>代表全站 PDP</td><td>内部 watchlist ${data.internal.pdpWatchlistCount} 个</td></tr>
            <tr><td>SEO 变现</td><td>冻结</td><td>等待独立搜索源补齐</td><td>继续沿用旧 SEO 收益故事</td><td>keyword rows = ${data.internal.naturalSearchRows}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
  ${trafficAttributionSection(data)}
  <section class="section" id="metric-dictionary">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">指标字典 · 私密经营版</div>
        <h2 class="section__title">真实经营 KPI 与自动采集指标一起读</h2>
        <p class="section__sub">本页同时发布经营金额、转化漏斗、售后/复购指标与自动化技术观测；密钥、私有路径、服务器地址和原始数据端点仍不进入站点。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">TTFB</div><div class="card-value">${data.external.homepageTtfbDesktopMs} / ${data.external.homepageTtfbMobileMs}ms</div><div class="card-meta">首页桌面 / 移动；不是当前主因</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">JS</div><div class="card-value">约 ${(Math.round(data.external.homepageJsKb / 1024 * 10) / 10).toFixed(1)}MB</div><div class="card-meta">首页与 PDP 均处高位</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">DOM</div><div class="card-value">${data.external.maxDomNodes.toLocaleString("en-US")}</div><div class="card-meta">最大观测节点数</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">LCP</div><div class="card-value">${data.external.lcpObservedSamples}/${data.external.lcpTotalSamples}</div><div class="card-meta">样本未可观测，需补采</div></div>
      </div>
    </div>
  </section>
  ${operatingHealth360Section(data)}`;
}

export function forensicsBody(data) {
  return `<section class="hero" id="scene">
    <div class="container">
      <span class="hero__badge">III · 风险归因 · ${escapeHtml(observedSessionDate(data) || "最新")}</span>
      <h1 class="hero__title">归属先行，<br><span class="hl">再处理脚本与 PDP。</span></h1>
      <p class="hero__lead">先判归属和必要性，再处理脚本与 PDP 负担。本页把第三方失败、DOM、PDP、owner、归属、kill-list、复采和验收放进同一条风险归因线。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${riskRankingSection(data)}
  ${botGovernanceSection(data)}
  <section class="section" id="fatal">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">证据 1 · 第三方失败</div>
        <h2 class="section__title">不是“删脚本”，而是先判归属和必要性</h2>
        <p class="section__sub">外部采集显示 PDP 第三方失败达到 ${escapeHtml(data.external.pdpThirdPartyFailures)}。这些失败可能同时影响性能、归因和实验数据，因此不能简单当作纯前端问题。</p>
      </div>
      <div class="route-grid">
        <div class="route-card"><h3>归因盲区</h3><p>失败组件可能让广告、再营销或实验记录出现偏差。治理顺序是 owner、用途、失败率、加载策略、回滚窗口。</p></div>
        <div class="route-card"><h3>性能压力</h3><p>第三方失败通常伴随重试、长任务和额外请求。验收要看失败数、请求数、脚本数和页面错误是否同步下降。</p></div>
        <div class="route-card"><h3>决策边界</h3><p>页面会展示真实经营结果，但技术风险与经营结果仍不能自动建立因果。后续收益判断必须走灰度或实验。</p></div>
      </div>
    </div>
  </section>
  ${diagnosticBacklogSection(data)}
  <section class="section section--gray" id="pdp">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">证据 2 · PDP watchlist 首轮</div>
        <h2 class="section__title">首轮 watchlist 已证明跨商品复现，但仍不能外推</h2>
        <p class="section__sub">内部 watchlist 有 ${data.internal.pdpWatchlistCount} 个 PDP，外部采集已覆盖 ${data.external.routeCount} 条路径。现在的问题不再是“有没有 PDP 证据”，而是必须用多次复采、入口分段和竞品同口径样本排序风险。</p>
      </div>
      <div class="callout callout--danger">
        <div class="callout__label">当前边界</div>
        <div class="callout__title">已有 cart / checkout / 10 PDP 首轮，但还不能写成全站 PDP 终局。</div>
        <div class="callout__body">首轮采集证明风险跨商品复现；多次复采、KOL/UTM 入口参数、登录/未登录和竞品同口径对照仍是下一步 gate。</div>
      </div>
    </div>
  </section>
  ${securityAuditSection(data)}
  ${seoTechnicalSection(data)}
  ${content360Section(data)}`;
}

export function latestRows(session) {
  const rows = (session.routes || []).flatMap((route) =>
    (route.viewports || []).map((viewport) => [
      routeLabelForTable(route),
      viewport.label,
      viewport.metrics
    ])
  );
  if (rows.length === 0) throw new Error("Latest route-aware session is missing route rows");
  for (const [, , metrics] of rows) {
    if (!metrics) throw new Error("Latest route-aware session is missing required route metrics");
  }
  return rows.map(([route, viewport, metrics]) => `<tr>
    <td>${escapeHtml(route)}</td>
    <td>${escapeHtml(viewport)}</td>
    <td class="num good">${metrics.fcp}</td>
    <td class="num good">${metrics.ttfb}</td>
    <td class="num good">${metrics.cls}</td>
    <td class="num bad">${metrics.jsKb}</td>
    <td class="num bad">${metrics.domNodes}</td>
    <td class="num bad">${metrics.totalRequests}</td>
    <td class="num bad">${metrics.thirdPartyFailures}</td>
  </tr>`).join("");
}

function routeLabelForTable(route) {
  if (route.routeId === "homepage") return "首页";
  if (route.routeId === "product-detail") return "代表性 PDP";
  if (route.routeId?.startsWith("pdp-")) return `PDP watchlist · ${route.routeId}`;
  if (route.routeId === "cart") return "购物车";
  if (route.routeId === "checkout") return "结账";
  return route.label || route.routeId;
}

export function trendsBody(data, session) {
  const maxJs = maxMetric(session, "jsKb");
  const maxDom = maxMetric(session, "domNodes");
  const maxFailures = maxMetric(session, "thirdPartyFailures");
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">IV · 趋势证据 · 最新采集</span>
      <h1 class="hero__title">最新 13 路由采集，<br><span class="hl">趋势必须和经营 caveat 一起读。</span></h1>
      <p class="hero__lead">趋势页已经追加 ${escapeHtml(data.external.latestSession)}。外部采集证明技术债持续存在；内部经营刷新证明收益点估必须实验化。两者合在一起，结论更尖锐：先修可复现技术债，但不要用旧收益承诺包装它。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${trendChartsSection(data, session)}
  <section class="section" id="latest-v3">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">最新外部采集 · <span class="evidence-session">${escapeHtml(session.sessionId)}</span> · v3 路由感知</div>
        <h2 class="section__title">${escapeHtml(session.observedAt)}：趋势页已并入最新外部采集</h2>
        <p class="section__sub">v3 采集已扩展为 homepage / PDP watchlist / cart / checkout × 桌面/移动双视口；旧 M2 首页趋势只作为历史参照，不再被当作最新结论。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">最新 session</div><div class="card-value">${escapeHtml(session.observedAt)}</div><div class="card-meta">${escapeHtml(session.methodologyVersion)}</div></div>
        <div class="metric-card metric-card--success"><div class="card-label">TTFB 仍非主因</div><div class="card-value">${data.external.homepageTtfbDesktopMs} / ${data.external.homepageTtfbMobileMs}ms</div><div class="card-meta">首页桌面 / 移动</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">3P 失败最大值</div><div class="card-value">${maxFailures}</div><div class="card-meta">PDP ${escapeHtml(data.external.pdpThirdPartyFailures)}</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">LCP 可观测</div><div class="card-value">${data.external.lcpObservedSamples} / ${data.external.lcpTotalSamples}</div><div class="card-meta">全部路由-视口样本未观测</div></div>
      </div>
      <details class="evidence-drilldown" open>
        <summary>查看 13 路由双视口原始表</summary>
        <div class="sessions-wrap" tabindex="0">
          <table class="sessions-table">
            <thead><tr><th>路线</th><th>视口</th><th>FCP (s)</th><th>TTFB (ms)</th><th>CLS</th><th>JS (KB)</th><th>DOM</th><th>请求</th><th>3P 失败</th></tr></thead>
            <tbody>${latestRows(session)}</tbody>
          </table>
        </div>
      </details>
      <div class="callout-strong">
        <div class="card-label" style="color:#fbbf24;">融合结论</div>
        <p>最新数据没有推翻历史站的主判断，只是把问题从首页推进到“homepage/PDP watchlist/cart/checkout 路径均复现”：客户端体积最大 ${Math.round(maxJs / 1024 * 10) / 10}MB、DOM 最大 ${maxDom.toLocaleString("en-US")} 节点、第三方失败最大 ${maxFailures}，仍是核心技术债。</p>
      </div>
    </div>
  </section>`;
}

export function crossAuditBody(data) {
  const sessionLabel = observedSessionDate(data);
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">V · ${escapeHtml(sessionLabel || "latest")} · 决策矩阵</span>
      <h1 class="hero__title">历史报告为基线，<br><span class="hl">当前只留行动。</span></h1>
      <p class="hero__lead">历史报告为基线，当前数据只保留可执行结论。本页集中呈现资源排序、验收、冲突、执行战单、批准、冻结和推进，不发布原始经营表、原始数据端点或不可复核收益模型输入。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${hardConclusionsSection(data)}
  ${crossMatrixSection(data)}
  ${contradictionsSection(data)}
  ${executionOrdersSection(data, "execution-orders")}
  ${geoBaselineSection(data)}
  ${diagnostic360OverviewSection(data)}
  ${decisionChartSection(data)}`;
}

export function securityAuditSection(data) {
  const sec = data.securityAudit;
  if (!sec) return "";
  const priority = (p) => {
    if (p === "P0") return "badge--p0";
    if (p === "P1") return "badge--p1";
    return "badge--p2";
  };
  const attackRows = (sec.attackSurfacePriority || []).map((item) => `<tr>
    <td><span class="badge ${priority(item.rank)}">${escapeHtml(item.rank)}</span></td>
    <td><strong>${escapeHtml(item.vector)}</strong></td>
    <td class="evidence-note">${escapeHtml(item.evidence)}</td>
    <td>${escapeHtml(item.recommendation)}</td>
  </tr>`).join("");
  const headerScore = sec.securityHeaders?.momcozy?.score || "未评分";
  const cspStatus = sec.securityHeaders?.momcozy?.assessment || "未采集";
  const myshopify = sec.myshopifyProbe || {};
  return `<section class="section section--gray" id="security-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">安全被动扫描 · ${escapeHtml(sec.scannedAt || "")}</div>
        <h2 class="section__title">安全攻击面：CSP 缺 script-src、双 FB Pixel、SRI 全缺</h2>
        <p class="section__sub">被动只读 Playwright 采集（无登录、无攻击）。发现三类可量化风险：CSP 无脚本来源限制、Facebook 双 Pixel 归因污染、359+ 外部脚本均无 SRI integrity。myshopify.com 子域名 WAF 绕过漏洞不适用（返回 404）。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--warn"><div class="card-label">安全头评分</div><div class="card-value">${escapeHtml(headerScore)}</div><div class="card-meta">${escapeHtml(cspStatus.substring(0, 60))}</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">内联脚本数（首页）</div><div class="card-value">${escapeHtml(String(sec.tokenLeaks?.inlineScriptCount || 149))}</div><div class="card-meta">无 SRI 外部脚本：10+</div></div>
        <div class="metric-card metric-card--success"><div class="card-label">myshopify 子域名</div><div class="card-value">${myshopify.accessible ? "可达" : "404 不可达"}</div><div class="card-meta">WAF 绕过漏洞不适用</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">FB Pixel 重复加载</div><div class="card-value">2次</div><div class="card-meta">两个不同 Pixel ID，归因虚高风险</div></div>
      </div>
      <details class="evidence-drilldown">
        <summary>查看攻击面优先级明细</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>优先级</th><th>攻击向量</th><th>证据</th><th>建议行动</th></tr></thead>
            <tbody>${attackRows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

export function seoTechnicalSection(data) {
  const seo = data.seoTechnical;
  if (!seo) return "";
  const statusBadge = (ok) => ok
    ? `<span class="badge badge--safe">PASS</span>`
    : `<span class="badge badge--p1">WARN</span>`;
  const pdpRows = (seo.momcozyResults || []).map((r) => `<tr>
    <td><strong>${escapeHtml(r.routeId)}</strong></td>
    <td>${statusBadge(r.hasProductSchema)}</td>
    <td>${statusBadge(r.hasReviewSchema || r.reviewSchemaNote?.includes('已在 JSON-LD'))}</td>
    <td>${statusBadge(r.hasFaqSchema)}</td>
    <td>${escapeHtml(String(r.metaTitleLength || "—"))}</td>
    <td class="evidence-note">${escapeHtml(r.metaTitleAssessment || r.seoGap || "—")}</td>
  </tr>`).join("");
  const gapRows = (seo.keyGaps || []).map((g) => `<tr>
    <td><strong>${escapeHtml(g.gap)}</strong></td>
    <td>${escapeHtml(g.status || (g.impact || ""))}</td>
    <td class="evidence-note">${escapeHtml(g.fix || g.note || "—")}</td>
  </tr>`).join("");
  return `<section class="section" id="seo-technical">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">SEO 技术底座 · ${escapeHtml(seo.scannedAt || "")}</div>
        <h2 class="section__title">SEO 技术层：Product Schema 已有，AggregateRating 确认，TuckGo meta title 过短</h2>
        <p class="section__sub">被动 Playwright 采集：JSON-LD 结构化数据、canonical URL、meta title/description 质量、robots indexability。3 个 PDP + 首页，6 个竞品 PDP。</p>
      </div>
      <details class="evidence-drilldown" open>
        <summary>PDP SEO 技术指标明细</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>页面</th><th>Product Schema</th><th>Review Markup</th><th>FAQ Schema</th><th>Title 长度</th><th>评估</th></tr></thead>
            <tbody>${pdpRows}</tbody>
          </table>
        </div>
      </details>
      <details class="evidence-drilldown">
        <summary>关键缺口与修复行动</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>缺口</th><th>状态</th><th>修复方式</th></tr></thead>
            <tbody>${gapRows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

export function geoBaselineSection(data) {
  const geo = data.geoBaseline;
  if (!geo) return "";
  const questionRows = (geo.questions || []).map((q) => `<tr>
    <td><strong>${escapeHtml(q.id)}</strong><div class="evidence-note">${escapeHtml(q.question)}</div></td>
    <td>${q.momcozyMentioned ? `<span class="badge badge--safe">出现</span>` : `<span class="badge badge--p1">未出现</span>`}</td>
    <td class="evidence-note">${escapeHtml(q.momcozyPosition || "—")}</td>
    <td><strong>${escapeHtml(q.topRecommendation || "—")}</strong></td>
    <td class="evidence-note">${escapeHtml(q.geoSignal || "—")}</td>
  </tr>`).join("");
  const actionRows = (geo.actionItems || []).map((a) => `<tr>
    <td><span class="badge badge--${a.priority === "P0" ? "p0" : a.priority === "P1" ? "p1" : "p2"}">${escapeHtml(a.priority)}</span></td>
    <td><strong>${escapeHtml(a.action)}</strong></td>
    <td class="evidence-note">${escapeHtml(a.rationale)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="geo-baseline">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">GEO 可见度基线 · Perplexity 实测 · ${escapeHtml(geo.testedAt || "")}</div>
        <h2 class="section__title">GEO 基线：5/5 问题出现，0/5 是 Best Overall，品牌被固化为 budget 定位</h2>
        <p class="section__sub">Perplexity AI 5 个母婴高意图问题实测。Momcozy 在所有问题中均被提及，但没有任何一个问题获得 best overall 推荐。AI 可见度依赖外部评测媒体（Forbes、NYMag），品牌自有页面几乎不被直接引用。</p>
      </div>
      ${barChart({
        id: "chart-geo-baseline",
        title: "GEO 可见度：出现次数 vs Best Overall",
        subtitle: "Momcozy 5/5 出现，0/5 best overall；Willow 主导综合推荐，Elvie 主导职场场景，Spectra 主导保险场景",
        rows: [
          {label: "Momcozy 出现次数", value: (geo.questions || []).filter((q) => q.momcozyMentioned).length, digits: 0},
          {label: "Best Overall 次数", value: 0, digits: 0},
          {label: "测试问题总数", value: (geo.questions || []).length, digits: 0}
        ]
      })}
      <details class="evidence-drilldown" open>
        <summary>5 个问题实测结果</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>问题</th><th>Momcozy 出现</th><th>定位</th><th>Best Overall</th><th>GEO 信号</th></tr></thead>
            <tbody>${questionRows}</tbody>
          </table>
        </div>
      </details>
      <details class="evidence-drilldown">
        <summary>GEO 行动计划</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>优先级</th><th>行动</th><th>理由</th></tr></thead>
            <tbody>${actionRows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// 360 诊断框架维度覆盖总览 section — cross-audit.html
// ─────────────────────────────────────────────────────────────
export function diagnostic360OverviewSection(data) {
  const g360 = data.diagnosticGaps360;
  if (!g360) return "";
  const gaps = g360.gaps || {};
  const statusLabel = (s) => {
    if (s === "collected") return '<span class="badge badge--safe">已采集</span>';
    if (s === "partial") return '<span class="badge badge--p2">部分</span>';
    return '<span class="badge badge--p1">待采集</span>';
  };
  const priorityBadge = (p) => {
    if (p === "P0") return '<span class="badge badge--p0">P0</span>';
    if (p === "P1") return '<span class="badge badge--p1">P1</span>';
    return '<span class="badge badge--p2">P2</span>';
  };
  const gapRows = Object.entries(gaps).map(([key, gap]) => `<tr>
    <td><strong>${escapeHtml(key.split("_")[0])}</strong><div class="evidence-note">${escapeHtml(gap.layerDesc || "")}</div></td>
    <td>${escapeHtml(gap.label)}</td>
    <td>${statusLabel(gap.status)}</td>
    <td>${priorityBadge(gap.priority)}</td>
    <td class="evidence-note">${escapeHtml((gap.keyFindings || [gap.impactEstimate || "待补充"])[0] || "")}</td>
  </tr>`).join("");
  const covered = g360.coveredDimensions || 9;
  const newDims = g360.newDimensions || 11;
  const total = g360.totalDimensions || 20;
  const collectedCount = Object.values(gaps).filter(g => g.status === "collected" || g.status === "partial").length;
  return `<section class="section section--gray" id="diagnostic-360-overview">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">360 无死角诊断框架 · ${escapeHtml(g360.lastUpdated || "")} · 新维度已采集 ${collectedCount}/${newDims}</div>
        <h2 class="section__title">从 ${covered} 维度扩展到 ${total} 维度：新增 ${newDims} 个诊断缺口</h2>
        <p class="section__sub">现有框架深度覆盖前端性能、脚本治理、SEO技术、GEO可见度、安全扫描；本轮新增行为数据层（G1/G2）、经营健康层（G3/G4/G10）、技术可采集层（G5/G6/G7/G9/G11）和社交商务层（G8），实现真正无死角覆盖。</p>
      </div>
      ${barChart({
        id: "chart-360-coverage",
        title: "11 个新增维度首轮采集进度",
        subtitle: "Layer C 技术可采集层 5 个已完成首轮；Layer A/B/D 待接入后台数据",
        rows: [
          {label: "Layer C 技术可采集（G5/G6/G7/G9/G11）", value: 5, digits: 0},
          {label: "Layer B 经营健康（G3/G4/G10）", value: 0, digits: 0},
          {label: "Layer A 行为数据（G1/G2）", value: 0, digits: 0},
          {label: "Layer D 社交商务（G8）", value: 0, digits: 0}
        ]
      })}
      <details class="evidence-drilldown" open>
        <summary>11 个新增维度完整清单</summary>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>维度</th><th>描述</th><th>状态</th><th>优先级</th><th>首要发现 / 预期影响</th></tr></thead>
            <tbody>${gapRows}</tbody>
          </table>
        </div>
      </details>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// 360 内容层采集结果 section — forensics.html
// ─────────────────────────────────────────────────────────────
export function content360Section(data) {
  const g360 = data.diagnosticGaps360;
  if (!g360) return "";
  const gaps = g360.gaps || {};
  const g9 = gaps.G9_pdp_content_depth || {};
  const g11 = gaps.G11_seo_architecture || {};
  const g5 = gaps.G5_inventory || {};
  const g6 = gaps.G6_review_ecosystem || {};
  const g7 = gaps.G7_checkout_business || {};

  const g9Findings = (g9.keyFindings || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
  const g9Routes = Object.entries(g9.collectedByRoute || {}).map(([routeId, r]) => `<tr>
    <td><strong>${escapeHtml(routeId)}</strong></td>
    <td>${r.hasVideo ? "✅" : "❌"}</td>
    <td>${r.hasSizingGuide ? "✅" : "❌"}</td>
    <td>${r.hasSafetyCerts ? "✅" : "❌"}</td>
    <td>${r.faqCount ?? "—"}</td>
    <td class="${r.ctaAboveFold ? "good" : "bad"}">${r.ctaAboveFold ? "✅首屏" : "❌非首屏"}</td>
    <td class="${r.trustSignalsAboveFold ? "good" : "bad"}">${r.trustSignalsAboveFold ? "✅首屏" : "❌非首屏"}</td>
  </tr>`).join("");

  const g11Findings = (g11.keyFindings || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
  const g11Routes = Object.entries(g11.collectedByRoute || {}).map(([routeId, r]) => `<tr>
    <td><strong>${escapeHtml(routeId)}</strong></td>
    <td>${r.hasFacetedNavUrls != null ? (r.hasFacetedNavUrls ? `<span class="bad">⚠️ ${r.facetedNavUrlCount || "?"} 个</span>` : "✅ 无") : "—"}</td>
    <td>${r.categoryPageWordCount != null ? (r.categoryPageWordCount < 50 ? `<span class="bad">${r.categoryPageWordCount} 字 ⚠️</span>` : `${r.categoryPageWordCount} 字`) : "—"}</td>
    <td>${r.hasBreadcrumbSchema != null ? (r.hasBreadcrumbSchema ? "✅" : "❌") : "—"}</td>
    <td>${r.internalLinksCount ?? "—"}</td>
  </tr>`).join("");

  const g6Findings = (g6.keyFindings || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
  const g5Findings = (g5.keyFindings || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");
  const g7Findings = (g7.keyFindings || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");

  // G7 checkout payment methods summary
  const g7cs = g7.collectedSignals || {};
  const g7PayRows = [
    {label: "Shop Pay", key: "hasShopPay", impact: "可提升转化 1.72x"},
    {label: "Apple Pay", key: "hasApplePay", impact: "iOS 用户一键结账"},
    {label: "Google Pay", key: "hasGooglePay", impact: "Android 用户一键结账"},
    {label: "Klarna", key: "hasKlarna", impact: "先买后付，高 AOV 促成"},
    {label: "Afterpay", key: "hasAfterpay", impact: "先买后付，高 AOV 促成"},
    {label: "HSA/FSA", key: "hasHsaFsa", impact: "母婴品类核心渠道"},
    {label: "保险支付", key: "hasInsurance", impact: "母婴品类差异化"},
  ].map(({label, key, impact}) => {
    const present = g7cs[key];
    const cls = present === true ? "good" : present === false ? "bad" : "";
    return `<tr>
      <td><strong>${escapeHtml(label)}</strong></td>
      <td class="${cls}">${present === true ? "✅ 已集成" : present === false ? "❌ 未检测" : "—"}</td>
      <td style="color:var(--text-secondary);font-size:12px;">${escapeHtml(impact)}</td>
    </tr>`;
  }).join("");

  return `<section class="section" id="content-360-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">360 内容层首轮采集 · ${escapeHtml(g360.firstCollectionDate || "2026-06-18")} · G5/G6/G7/G9/G11</div>
        <h2 class="section__title">PDP 内容、评论生态、结账链路、SEO 架构与库存：五个维度首轮证据</h2>
        <p class="section__sub">collect-360-content.mjs 首轮采集（15条路由，2条被限流）。关键发现：信任信号和 CTA 均不在首屏；分面导航浪费爬虫预算；S12 Pro 是评论最多 SKU（1828条）；Shop Pay / Apple Pay / Google Pay 在匿名状态未检测到。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--danger">
          <div class="card-label">信任信号首屏可见</div>
          <div class="card-value">0 / 5</div>
          <div class="card-meta">全部 PDP 退货/保修信息不在首屏</div>
        </div>
        <div class="metric-card metric-card--warn">
          <div class="card-label">CTA 首屏可见</div>
          <div class="card-value">2 / 5</div>
          <div class="card-meta">旗舰泵款 M5/S12/Flow 均非首屏</div>
        </div>
        <div class="metric-card metric-card--danger">
          <div class="card-label">品类页内容深度</div>
          <div class="card-value">4 字</div>
          <div class="card-meta">electric-breast-pump 品类页极薄（目标400字+）</div>
        </div>
        <div class="metric-card metric-card--warn">
          <div class="card-label">快捷支付覆盖</div>
          <div class="card-value">0 / 3</div>
          <div class="card-meta">Shop Pay / Apple Pay / Google Pay 匿名态未检测到</div>
        </div>
        <div class="metric-card metric-card--success">
          <div class="card-label">最高评论数 SKU</div>
          <div class="card-value">1828 条</div>
          <div class="card-meta">S12 Pro 4.5★，均有图片评论且首屏可见</div>
        </div>
      </div>
      <details class="evidence-drilldown" open>
        <summary>G9 PDP 内容深度明细（${Object.keys(g9.collectedByRoute || {}).length} 个 PDP）</summary>
        <ul style="margin:0 0 12px;padding-left:20px;color:var(--text-secondary);font-size:13px;line-height:1.8;">${g9Findings}</ul>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>PDP</th><th>视频</th><th>尺寸指南</th><th>安全认证</th><th>FAQ数</th><th>CTA首屏</th><th>信任信号首屏</th></tr></thead>
            <tbody>${g9Routes}</tbody>
          </table>
        </div>
      </details>
      <details class="evidence-drilldown">
        <summary>G7 结账链路业务指标（支付方式、字段数量、运费可见性）</summary>
        <ul style="margin:0 0 12px;padding-left:20px;color:var(--text-secondary);font-size:13px;line-height:1.8;">${g7Findings}</ul>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>支付方式</th><th>状态</th><th>业务影响</th></tr></thead>
            <tbody>${g7PayRows}</tbody>
          </table>
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:var(--text-secondary);">⚠️ 采集为匿名空购物车状态；Shop Pay / Apple Pay / Google Pay 可能仅在有商品的真实结账页出现，需要 owner storage state 复采确认。结账表单字段数：${g7cs.formFieldCount ?? "—"} 个；运费早期可见：${g7cs.shippingCostEarlyVisible ? "✅ 是" : "❌ 否"}；访客结账可用：${g7cs.guestCheckoutAvailable ? "✅ 是" : "❌ 否"}。</p>
      </details>
      <details class="evidence-drilldown">
        <summary>G11 SEO 架构明细（分面导航/品类页/内链）</summary>
        <ul style="margin:0 0 12px;padding-left:20px;color:var(--text-secondary);font-size:13px;line-height:1.8;">${g11Findings}</ul>
        <div class="cross-table-wrap" tabindex="0">
          <table class="cross-table">
            <thead><tr><th>路由</th><th>分面导航URL</th><th>品类页字数</th><th>面包屑Schema</th><th>内链数</th></tr></thead>
            <tbody>${g11Routes}</tbody>
          </table>
        </div>
      </details>
      <details class="evidence-drilldown">
        <summary>G6 评论生态首轮采集结果</summary>
        <ul style="margin:0;padding-left:20px;color:var(--text-secondary);font-size:13px;line-height:1.8;">${g6Findings}</ul>
      </details>
      <details class="evidence-drilldown">
        <summary>G5 库存信号首轮采集结果</summary>
        <ul style="margin:0;padding-left:20px;color:var(--text-secondary);font-size:13px;line-height:1.8;">${g5Findings}</ul>
      </details>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// 360 经营健康层 section — metrics.html
// ─────────────────────────────────────────────────────────────
export function operatingHealth360Section(data) {
  const g360 = data.diagnosticGaps360;
  if (!g360) return "";
  const gaps = g360.gaps || {};
  const pendingCard = (gap) => {
    if (!gap) return "";
    const isCollected = gap.status === "collected" || gap.status === "partial";
    const statusBadge = isCollected
      ? '<span class="badge badge--safe">已采集</span>'
      : '<span class="badge badge--p1">待采集</span>';
    const priClass = gap.priority === "P0" ? "p0" : gap.priority === "P1" ? "p1" : "p2";
    const steps = (gap.actionItems || []).slice(0, 3).map(s => `<li>${escapeHtml(s)}</li>`).join("");
    return `<div class="backlog-card">
      <div>${statusBadge} <span class="badge badge--${priClass}">${escapeHtml(gap.priority || "")}</span></div>
      <h3>${escapeHtml(gap.label)}</h3>
      <p>${escapeHtml(gap.impactEstimate || "")}</p>
      ${steps ? `<ol style="padding-left:16px;font-size:12px;color:var(--text-secondary);line-height:1.7;margin:8px 0 0;">${steps}</ol>` : ""}
    </div>`;
  };
   return `<section class="section section--gray" id="operating-health-360">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">360 经营健康层 · G1/G2/G3/G4/G8/G10 · 待接入后台数据</div>
        <h2 class="section__title">6 个经营健康维度：操作指引已就绪，等待数据接入</h2>
        <p class="section__sub">这些维度需要 Shopify Analytics、Klaviyo、TikTok Seller Center 或 Zendesk 数据，无法通过 Playwright 被动采集。每个卡片已提供具体操作步骤和基准目标。</p>
      </div>
      <div class="backlog-grid">
        ${pendingCard(gaps.G1_behavior)}
        ${pendingCard(gaps.G2_funnel_segmented)}
        ${pendingCard(gaps.G3_ltv_cohort)}
        ${pendingCard(gaps.G4_email_sms)}
        ${pendingCard(gaps.G8_social_commerce)}
        ${pendingCard(gaps.G10_support_quality)}
      </div>
      <div class="callout-strong" style="margin-top:22px;">
        <div class="card-label" style="color:#fbbf24;">执行优先级</div>
        <p><strong>P0 先行（G1/G2/G3）</strong>：这三项决定了当前 CVR 数字能不能被信任——完成前，所有转化率结论都带 C7 口径风险。<br><strong>P1 同步推进（G4/G8）</strong>：邮件/SMS ROI $36-40/$1，TikTok Shop 年化 GMV $30-50B，机会窗口正在关闭。</p>
      </div>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// Phase R3-1: 360 框架全景页 body — framework.html
// ─────────────────────────────────────────────────────────────
export function frameworkBody(data) {
  const g360 = data.diagnosticGaps360 || {};
  const gaps = g360.gaps || {};
  const total = g360.totalDimensions || 20;
  const covered = g360.coveredDimensions || 9;
  const version = g360.frameworkVersion || "v2.0";

  const layerDefs = [
    {key: "A", label: "后台数据层", desc: "需 Shopify Analytics / Klaviyo / 第三方工具授权"},
    {key: "B", label: "社交商务层", desc: "TikTok Shop / Instagram Shop 数据"},
    {key: "C", label: "技术可采集层", desc: "Playwright 自动采集，无需账号授权"},
  ];

  const statusIcon = (status) => {
    if (status === "collected") return "✅";
    if (status === "partial") return "⚠️";
    return "⏳";
  };
  const statusLabel = (status) => {
    if (status === "collected") return "已采集";
    if (status === "partial") return "部分";
    return "待采集";
  };

  const gapRows = Object.entries(gaps).map(([key, gap]) => {
    const priClass = gap.priority === "P0" ? "badge--p0" : gap.priority === "P1" ? "badge--p1" : "badge--p2";
    return `<tr>
      <td><strong>${escapeHtml(key.replace("_", " "))}</strong></td>
      <td>${escapeHtml(gap.label || "")}</td>
      <td><span class="badge ${priClass}">${escapeHtml(gap.priority || "")}</span></td>
      <td>${statusIcon(gap.status)} <span style="font-size:12px;color:var(--text-secondary);">${escapeHtml(statusLabel(gap.status))}</span></td>
      <td style="font-size:12px;color:var(--text-secondary);">${escapeHtml(gap.dataSource || "")}</td>
      <td style="font-size:12px;color:var(--text-secondary);">${escapeHtml(gap.impactEstimate || "").substring(0, 60)}${(gap.impactEstimate || "").length > 60 ? "…" : ""}</td>
    </tr>`;
  }).join("");

  const layerCards = layerDefs.map(({key, label, desc}) => {
    const layerGaps = Object.values(gaps).filter(g => g.layer === key);
    const collectedCount = layerGaps.filter(g => g.status === "collected" || g.status === "partial").length;
    return `<div class="metric-card">
      <div class="card-label">${escapeHtml(label)}</div>
      <div class="card-value">${collectedCount} / ${layerGaps.length}</div>
      <div class="card-meta">${escapeHtml(desc)}</div>
    </div>`;
  }).join("");

  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">VII · 360 框架全景 · ${escapeHtml(version)}</span>
      <h1 class="hero__title">诊断框架全景：<br><span class="hl">20 维度，${covered} 已覆盖。</span></h1>
      <p class="hero__lead">从前端性能、内部经营到安全攻击面、GEO 可见度——完整的 360° 诊断框架覆盖状态。当前版本已覆盖 ${covered}/${total} 维度，${total - covered} 个维度进入待采集队列。</p>
    </div>
  </section>
  <section class="section" id="framework-overview">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">框架版本 ${escapeHtml(version)} · 更新于 ${escapeHtml(g360.lastUpdated || "2026-06-19")}</div>
        <h2 class="section__title">覆盖率总览：${covered} 维度已建立证据，${total - covered} 维度等待数据接入</h2>
        <p class="section__sub">框架分三个数据层：技术可采集层（Playwright 直采，无需授权）、后台数据层（需账号）、社交商务层（需平台授权）。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card">
          <div class="card-label">框架总维度</div>
          <div class="card-value">${total}</div>
          <div class="card-meta">D1-D9 原有 + G1-G11 新增</div>
        </div>
        <div class="metric-card metric-card--success">
          <div class="card-label">已建立证据</div>
          <div class="card-value">${covered}</div>
          <div class="card-meta">含性能/安全/GEO/SEO/内容五层</div>
        </div>
        <div class="metric-card metric-card--warn">
          <div class="card-label">待接入后台数据</div>
          <div class="card-value">${total - covered}</div>
          <div class="card-meta">G1/G2/G3/G4/G8/G10 需账号授权</div>
        </div>
        ${layerCards}
      </div>
      <div class="cross-table-wrap" tabindex="0" style="margin-top:22px;">
        <table class="cross-table">
          <thead><tr><th>维度 ID</th><th>名称</th><th>优先级</th><th>状态</th><th>数据来源</th><th>业务影响（摘要）</th></tr></thead>
          <tbody>${gapRows}</tbody>
        </table>
      </div>
    </div>
  </section>
  <section class="section section--gray" id="framework-next">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">下一步接入路径</div>
        <h2 class="section__title">待采集维度的接入优先级与操作路径</h2>
        <p class="section__sub">P0 维度（G1/G2/G3）直接影响当前 CVR 结论的可信度，应最先接入；P1 维度（G4/G8）对应最大增量机会窗口。</p>
      </div>
      <div class="backlog-grid">
        ${Object.values(gaps).filter(g => g.status === "not_started" && g.priority === "P0").map(g => {
          const priClass = "badge--p0";
          const steps = (g.actionItems || []).slice(0, 3).map(s => `<li>${escapeHtml(s)}</li>`).join("");
          return `<div class="backlog-card">
            <div><span class="badge badge--p1">待采集</span> <span class="badge ${priClass}">${escapeHtml(g.priority || "")}</span></div>
            <h3>${escapeHtml(g.label)}</h3>
            <p>${escapeHtml(g.impactEstimate || "")}</p>
            ${steps ? `<ol style="padding-left:16px;font-size:12px;color:var(--text-secondary);line-height:1.7;margin:8px 0 0;">${steps}</ol>` : ""}
          </div>`;
        }).join("")}
        ${Object.values(gaps).filter(g => g.status === "not_started" && g.priority !== "P0").map(g => {
          const priClass = g.priority === "P1" ? "badge--p1" : "badge--p2";
          const steps = (g.actionItems || []).slice(0, 2).map(s => `<li>${escapeHtml(s)}</li>`).join("");
          return `<div class="backlog-card">
            <div><span class="badge badge--p1">待采集</span> <span class="badge ${priClass}">${escapeHtml(g.priority || "")}</span></div>
            <h3>${escapeHtml(g.label)}</h3>
            <p>${escapeHtml(g.impactEstimate || "")}</p>
            ${steps ? `<ol style="padding-left:16px;font-size:12px;color:var(--text-secondary);line-height:1.7;margin:8px 0 0;">${steps}</ol>` : ""}
          </div>`;
        }).join("")}
      </div>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// Phase R3-2: 采集管理页 body — collection.html
// ─────────────────────────────────────────────────────────────
export function collectionBody(data, session) {
  const sessions = data._sessionList || [];
  const latestSession = data.external?.latestSession || "";
  const confidence = data.external?.confidence || "unknown";
  const routeCount = data.external?.routeCount || 0;
  const g360 = data.diagnosticGaps360 || {};

  const confidenceClass = confidence === "high" ? "metric-card--success" : confidence === "medium" ? "metric-card--warn" : "metric-card--danger";

  const sessionRows = (data._allSessions || []).map(s => {
    const conf = s.confidence || "low";
    const confClass = conf === "high" ? "good" : conf === "medium" ? "warn" : "bad";
    return `<tr>
      <td><strong>${escapeHtml(s.sessionId || "")}</strong></td>
      <td>${escapeHtml(s.observedAt || "")}</td>
      <td class="${confClass}">${escapeHtml(conf)}</td>
      <td>${(s.routes || []).length || "—"}</td>
      <td>${(s.metrics?.lcp != null) ? `${s.metrics.lcp} ms` : "—"}</td>
      <td style="font-size:12px;color:var(--text-secondary);">${escapeHtml(s.methodologyVersion || "v1")}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" style="color:var(--text-secondary);text-align:center;padding:24px;">session 历史从 build 时注入；当前 build 无 _allSessions 字段</td></tr>`;

  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">VIII · 采集管理 · 最新 ${escapeHtml(latestSession)}</span>
      <h1 class="hero__title">采集管理：<br><span class="hl">历史 + 触发 + 状态。</span></h1>
      <p class="hero__lead">每次 Playwright 自动采集的历史记录、置信度状态、路由覆盖和下一次触发说明。月度定时采集由 collect.yml 自动触发；手动采集命令在本页列出。</p>
    </div>
  </section>
  <section class="section" id="collection-status">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">当前采集状态</div>
        <h2 class="section__title">最新采集：${escapeHtml(latestSession)}，置信度 ${escapeHtml(confidence)}</h2>
        <p class="section__sub">v2 格式（2026-06-10 起）支持双视口、LCP、TBT、DOM 节点、JS 体积等新指标；v1 为手工采集，置信度 low，不可与 v2 直接比较。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card ${confidenceClass}">
          <div class="card-label">置信度</div>
          <div class="card-value">${escapeHtml(confidence)}</div>
          <div class="card-meta">基于 null 指标数量自动计算</div>
        </div>
        <div class="metric-card">
          <div class="card-label">路由覆盖</div>
          <div class="card-value">${routeCount}</div>
          <div class="card-meta">最新 session 路由数量</div>
        </div>
        <div class="metric-card">
          <div class="card-label">360 框架覆盖</div>
          <div class="card-value">${g360.coveredDimensions || 0} / ${g360.totalDimensions || 20}</div>
          <div class="card-meta">当前已建立证据维度</div>
        </div>
      </div>
    </div>
  </section>
  <section class="section section--gray" id="collection-history">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">采集历史</div>
        <h2 class="section__title">所有历史 Session 一览</h2>
        <p class="section__sub">v1 session（2026-05-17 及之前）为手工采集，置信度 low，不含 mobile block；v2 session 自动化双视口。</p>
      </div>
      <div class="sessions-wrap">
        <table class="sessions-table">
          <thead><tr><th>Session ID</th><th>采集时间</th><th>置信度</th><th>路由数</th><th>LCP (desktop)</th><th>格式版本</th></tr></thead>
          <tbody>${sessionRows}</tbody>
        </table>
      </div>
    </div>
  </section>
  <section class="section" id="collection-commands">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">采集命令</div>
        <h2 class="section__title">手动触发 / 定时 CI 说明</h2>
        <p class="section__sub">每月 1 日 UTC 02:00 由 collect.yml 自动触发；需配置 GitHub Secret AUDIT_TARGET_URL。</p>
      </div>
      <div class="route-grid">
        <div class="route-card">
          <h3>标准主趋势采集</h3>
          <p>采集首页 + 代表性 PDP + cart + checkout，写入 src/_data/sessions/YYYY-MM-DD.json。</p>
          <p><code style="font-size:12px;background:#f4f4f6;padding:4px 8px;border-radius:4px;">AUDIT_TARGET_URL=https://momcozy.com npm run collect</code></p>
        </div>
        <div class="route-card">
          <h3>PDP Watchlist 采集</h3>
          <p>使用扩展路由配置采集 10 个 PDP + 首页 + cart + checkout，用于 watchlist 深度分析。</p>
          <p><code style="font-size:12px;background:#f4f4f6;padding:4px 8px;border-radius:4px;">AUDIT_ROUTE_CONFIG=config/collection-routes-pdp-watchlist.json AUDIT_TARGET_URL=https://momcozy.com npm run collect</code></p>
        </div>
        <div class="route-card">
          <h3>分段复采（公开匿名段）</h3>
          <p>写入 src/_data/segment-sessions/，不污染主趋势 latest session。需指定 AUDIT_SESSION_DATE 和 AUDIT_SESSION_LABEL。</p>
          <p><code style="font-size:12px;background:#f4f4f6;padding:4px 8px;border-radius:4px;">AUDIT_OUTPUT_DIR=src/_data/segment-sessions AUDIT_SESSION_LABEL=r1 npm run collect</code></p>
        </div>
        <div class="route-card">
          <h3>360 内容维度采集</h3>
          <p>专用脚本采集 G5-G11 内容层维度（PDP 内容深度、评论生态、SEO 架构等）。</p>
          <p><code style="font-size:12px;background:#f4f4f6;padding:4px 8px;border-radius:4px;">AUDIT_TARGET_URL=https://momcozy.com node scripts/collect-360-content.mjs</code></p>
        </div>
      </div>
    </div>
  </section>`;
}

// ─────────────────────────────────────────────────────────────
// Phase R3-3: 执行战单页 body — execution.html
// ─────────────────────────────────────────────────────────────
export function executionBody(data) {
  const decision = decisionData(data);
  const orders = decision.executionOrders || [];
  const hardConclusions = decision.hardConclusions || [];
  const approvedCount = hardConclusions.filter(c => !String(c.title || "").startsWith("不批准")).length;
  const frozenCount = hardConclusions.length - approvedCount;

  const orderCards = orders.map((o, i) => {
    const steps = (o.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("");
    return `<div class="playbook-card">
      <div class="playbook-card__head">
        <h3>${escapeHtml(o.action || `执行战单 ${i + 1}`)}</h3>
        <p>时间窗口：${escapeHtml(o.window || "—")} · 负责人：${escapeHtml(o.owner || "—")}</p>
      </div>
      <div class="playbook-card__body">
        ${steps ? `<ol>${steps}</ol>` : ""}
        ${o.gate ? `<div class="playbook-gate">验收门槛：${escapeHtml(o.gate)}</div>` : ""}
      </div>
    </div>`;
  }).join("");

  const conclusionRows = hardConclusions.map(c => {
    const isFreeze = String(c.title || "").startsWith("不批准");
    const statusClass = isFreeze ? "bad" : "good";
    const statusLabel = isFreeze ? "❄️ 冻结" : "✅ 批准";
    return `<tr>
      <td class="${statusClass}"><strong>${statusLabel}</strong></td>
      <td>${escapeHtml(c.title || "")}</td>
      <td style="font-size:12px;color:var(--text-secondary);">${escapeHtml(c.reason || c.evidence || "")}</td>
    </tr>`;
  }).join("");

  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">IX · 执行战单 · ${orders.length} 条</span>
      <h1 class="hero__title">执行战单：<br><span class="hl">批准 ${approvedCount}，冻结 ${frozenCount}，推进 ${orders.length}。</span></h1>
      <p class="hero__lead">硬结论 → 执行战单 → 验收门槛。本页集中展示所有已批准的执行项、冻结项和对应的验收标准。每条战单绑定负责人和时间窗口。</p>
    </div>
  </section>
  <section class="section" id="execution-summary">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">战单总览</div>
        <h2 class="section__title">已批准 ${approvedCount} 条硬结论，${orders.length} 条执行战单待推进</h2>
        <p class="section__sub">冻结项（不批准）需要先解决数据口径或补充证据，才能进入执行。执行战单必须绑定 owner 和复采验收。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success">
          <div class="card-label">批准结论</div>
          <div class="card-value">${approvedCount}</div>
          <div class="card-meta">可立即进入执行流程</div>
        </div>
        <div class="metric-card metric-card--warn">
          <div class="card-label">冻结结论</div>
          <div class="card-value">${frozenCount}</div>
          <div class="card-meta">等待数据口径确认</div>
        </div>
        <div class="metric-card">
          <div class="card-label">执行战单</div>
          <div class="card-value">${orders.length}</div>
          <div class="card-meta">含时间窗口和验收门槛</div>
        </div>
      </div>
    </div>
  </section>
  <section class="section" id="hard-conclusions-detail">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">硬结论明细</div>
        <h2 class="section__title">批准 / 冻结决策一览</h2>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>状态</th><th>结论</th><th>依据摘要</th></tr></thead>
          <tbody>${conclusionRows}</tbody>
        </table>
      </div>
    </div>
  </section>
  <section class="section section--gray" id="execution-orders-detail">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">执行战单明细</div>
        <h2 class="section__title">${orders.length} 条战单：步骤 + 验收门槛</h2>
        <p class="section__sub">每条战单完成后必须通过复采验收——不能只靠主观判断，需要数据证明指标变化方向符合预期。</p>
      </div>
      <div class="playbook-grid">${orderCards}</div>
    </div>
  </section>`;
}
