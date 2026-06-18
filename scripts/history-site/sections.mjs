import {
  escapeHtml,
  fixed,
  integer,
  maxMetric,
  pct,
  usd,
  usdMillion
} from "./format.mjs";

export function sourcePills(references) {
  return references.map((reference) => `<span class="pill">${escapeHtml(reference)}</span>`).join("");
}

function observedSessionDate(data) {
  return data.external?.latestSession?.replace("session-", "") || "";
}

function statusLabelFromState(state) {
  if (state === "done") return "已完成";
  if (state === "in_progress") return "进行中";
  if (state === "blocked") return "阻塞";
  return "待重采";
}

function collectStatusMeta(status) {
  if (!status || typeof status === "string") return "";
  const parts = [
    status.owner ? `负责人：${status.owner}` : null,
    status.dueBy ? `截止：${status.dueBy}` : null,
    status.state ? `状态：${statusLabelFromState(status.state)}` : null
  ].filter(Boolean);
  return parts.length ? `<div class="evidence-note">${parts.map((item) => escapeHtml(item)).join(" · ")}</div>` : "";
}

function renderRecollectStatus(status) {
  if (!status) return `<span class="badge badge--p2">待重采</span>`;
  if (typeof status === "string") {
    return `<span class="badge badge--p2">待重采</span><div class="evidence-note">${escapeHtml(status)}</div>`;
  }

  const stateLabel = statusLabelFromState(status.state);
  const stateClass = status.state === "done" ? "badge--safe" : (status.state === "in_progress" ? "badge--p1" : "badge--p2");
  const actionItems = Array.isArray(status.actions) ? status.actions : [];
  const evidenceItems = Array.isArray(status.evidence) ? status.evidence : [];

  return `
    <span class="badge ${stateClass}">${escapeHtml(stateLabel)}</span>
    ${status.summary ? `<div>${escapeHtml(status.summary)}</div>` : ""}
    ${collectStatusMeta(status)}
    ${actionItems.length ? `<ul>${actionItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    ${evidenceItems.length ? `<div class="evidence-note">校验项：${evidenceItems.map((item) => escapeHtml(item)).join("，")}</div>` : ""}`;
}

export function conclusionRows(conclusions) {
  return conclusions.map((item) => `<tr>
    <td><strong>${escapeHtml(item.id)}</strong></td>
    <td>${escapeHtml(item.issue)}</td>
    <td>${escapeHtml(item.verdict)}<div class="evidence-note">证据：${escapeHtml(item.evidence)}</div></td>
    <td>${escapeHtml(item.confidence)}</td>
    <td>${sourcePills(item.references)}</td>
  </tr>`).join("");
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

export function selectedConclusions(data, pageName) {
  const update = data.pageUpdates.find((item) => item.page === pageName);
  const ids = new Set(update?.conclusionIds || data.conclusions.map((item) => item.id));
  return data.conclusions.filter((item) => ids.has(item.id));
}

export function pageRoute(data, pageName) {
  return data.pageUpdates.find((item) => item.page === pageName)?.route || "私密经营版已按最新经营诊断刷新。";
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

export function crossAuditSection(data, pageName) {
  const externalDate = data.external?.latestSession?.replace("session-", "") || "";
  return `<section class="section section--gray" id="cross-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">${escapeHtml(externalDate)} · 内外部数据刷新</div>
        <h2 class="section__title">本页结论已按最新经营数据重审</h2>
        <p class="section__sub">${escapeHtml(pageRoute(data, pageName))}</p>
      </div>
      ${crossAuditCards(data)}
      <div class="deprecated"><strong>口径提示：</strong>本版本按私密经营版发布真实金额与 KPI；历史窗口、当前 workbook 与自动采集路径不同，不能直接当作同口径环比。</div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>ID</th><th>问题</th><th>当前结论与证据</th><th>等级</th><th>参考依据</th></tr></thead>
          <tbody>${conclusionRows(selectedConclusions(data, pageName))}</tbody>
        </table>
      </div>
    </div>
  </section>`;
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

function competitorSnapshot(data) {
  return data.competitorSnapshot || null;
}

function statusText(status) {
  if (status >= 200 && status < 400) return `${status} 可达`;
  if (status === 0) return "访问失败";
  return `${status} 不可达`;
}

function maxCompetitorMetric(competitor, metric) {
  let best = null;
  for (const page of competitor.pages || []) {
    for (const viewport of page.viewports || []) {
      const value = viewport.metrics?.[metric];
      if (!Number.isFinite(value)) continue;
      if (!best || value > best.value) {
        best = {value, routeId: page.routeId, viewport: viewport.label};
      }
    }
  }
  return best;
}

function competitorEvidenceTable(snapshot) {
  if (!snapshot?.competitors?.length) return "";
  const rows = snapshot.competitors.map((competitor) => {
    const pdp = (competitor.pages || []).find((page) => page.routeId === "pdp");
    const cart = (competitor.pages || []).find((page) => page.routeId === "cart");
    const maxJs = maxCompetitorMetric(competitor, "jsKb");
    const maxFailures = maxCompetitorMetric(competitor, "thirdPartyFailures");
    const maxDom = maxCompetitorMetric(competitor, "domNodes");
    const botPolicyCount = Object.values(competitor.robots?.botPolicies || {}).filter((value) => value !== "unspecified").length;
    return `<tr>
      <td><strong>${escapeHtml(competitor.label)}</strong><div class="evidence-note">${escapeHtml(competitor.category)}</div></td>
      <td>${escapeHtml(statusText(pdp?.status || 0))}</td>
      <td>${escapeHtml(statusText(cart?.status || 0))}</td>
      <td class="num">${maxJs ? integer(maxJs.value) : "N/A"}<div class="evidence-note">${maxJs ? `${escapeHtml(maxJs.routeId)} / ${escapeHtml(maxJs.viewport)}` : ""}</div></td>
      <td class="num">${maxFailures ? integer(maxFailures.value) : "N/A"}<div class="evidence-note">${maxFailures ? `${escapeHtml(maxFailures.routeId)} / ${escapeHtml(maxFailures.viewport)}` : ""}</div></td>
      <td class="num">${maxDom ? integer(maxDom.value) : "N/A"}<div class="evidence-note">${maxDom ? `${escapeHtml(maxDom.routeId)} / ${escapeHtml(maxDom.viewport)}` : ""}</div></td>
      <td>${escapeHtml(statusText(competitor.robots?.status || 0))}<div class="evidence-note">Sitemap ${integer(competitor.robots?.sitemapCount || 0)} · named bot policy ${integer(botPolicyCount)}</div></td>
    </tr>`;
  }).join("");
  return `<div class="cross-table-wrap" style="margin-top: 16px;" tabindex="0">
    <table class="cross-table">
      <thead><tr><th>竞品</th><th>PDP</th><th>Cart</th><th>最高 JS KB</th><th>最高 3P 失败</th><th>最高 DOM</th><th>Robots 摘要</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function competitorSnapshotCallout(snapshot) {
  if (!snapshot?.summary) return "竞品数据当前为历史观察标注，必须重新采集“主页 / PDP / cart / checkout / 站外来源页”才能进入最终对标。";
  const summary = snapshot.summary;
  const maxFailures = summary.maxThirdPartyFailures;
  const maxJs = summary.maxJsKb;
  const maxDom = summary.maxDomNodes;
  return [
    `竞品复采样本 ${escapeHtml(snapshot.observedAt)} 已归档：${integer(summary.competitorCount)} 站、${integer(summary.sampledPageCount)} 个公开页面、${integer(summary.viewportSampleCount)} 个视口样本。`,
    `PDP 可达 ${integer(summary.reachablePdpCount)}/${integer(summary.competitorCount)}，cart 可达 ${integer(summary.reachableCartCount)}/${integer(summary.competitorCount)}。`,
    `最高第三方失败 ${integer(maxFailures?.value || 0)}（${escapeHtml(maxFailures?.competitorId || "N/A")} ${escapeHtml(maxFailures?.routeId || "")}/${escapeHtml(maxFailures?.viewport || "")}），最高 JS ${integer(maxJs?.value || 0)}KB，最高 DOM ${integer(maxDom?.value || 0)}。`,
    "这能支撑脚本风险排序，但还不能替代多次复采、入口参数和 checkout 实际状态。"
  ].join(" ");
}

export function decisionData(data) {
  return data.decisionArchitecture || {
    logicChain: [],
    hardConclusions: [],
    executionOrders: []
  };
}

export function finalAuditData(data) {
  return data.finalAudit || {
    pageAudits: [],
    crossMatrix: [],
    contradictions: []
  };
}

export function pageAuditItem(data, pageName) {
  return finalAuditData(data).pageAudits.find((item) => item.page === pageName);
}

export function pageAuditSection(data, pageName) {
  const item = pageAuditItem(data, pageName);
  if (!item) return "";
  return `<section class="section section--gray" id="final-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">页面校验 · ${escapeHtml(item.role)}</div>
        <p class="section__sub">本节只回答业务读者关心的三件事：这一页解决什么问题、哪些数据支持、下一步如何验收。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>页面职责</th><th>支撑数据</th><th>限制条件</th><th>下一步优化</th><th>验收门槛</th></tr></thead>
          <tbody><tr>
            <td><strong>${escapeHtml(item.role)}</strong></td>
            <td>${escapeHtml(item.evidencePresent)}</td>
            <td>${escapeHtml(item.conflictCheck)}</td>
            <td>${escapeHtml(item.optimization)}</td>
            <td>${escapeHtml(item.gate)}</td>
          </tr></tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function diagnosticBridgeSection(data, pageName) {
  const update = data.pageUpdates.find((item) => item.page === pageName);
  const auditItem = pageAuditItem(data, pageName);
  const insideNote = `当前 workbook ${fixed(data.currentOperations.sales.totalSalesWan, 2)}万 · 转化率 ${pct(data.currentOperations.conversion.conversionRate)} · AOV ${fixed(data.currentOperations.sales.averageOrderValue, 2)}，但流量窗口 ${data.currentOperations.trafficWindow}、销售窗口 ${data.currentOperations.salesWindow}与历史口径并不一致，读数用于优先级判断，不作为单点收益承诺。`;
  const outsideNote = `外部采集 ${escapeHtml(data.external.latestSession)} 覆盖 ${data.external.routeCount} 条路径，JS ${data.currentOperations ? "约 1.9MB" : "1.9MB+"}、DOM ${data.external.maxDomNodes.toLocaleString("en-US")}、第三方失败 ${data.external.maxThirdPartyFailures}，LCP 可观测率 ${data.external.lcpObservedSamples}/${data.external.lcpTotalSamples}，复采动作以“站点可复核”为边界。`;
  const decisionLine = auditItem?.optimization || "不批准无 owner、无复采、无回滚条件的建议；只保留能落到动作的决策。";
  const bridgeLine = update?.route || "本页按当前经营与外部复采共同写入决策边界。";

  return `<section class="section" id="diagnostic-bridge">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">站内外诊断桥接</div>
        <h2 class="section__title">站内指标解释、站外复采动作、决策落地同页可追踪</h2>
        <p class="section__sub">这段是“可读性优先”的执行摘要：先明确站内指标含义，再定义站外复核动作，最后只保留可落地策略。</p>
      </div>
      <div class="route-grid">
        <div class="route-card">
          <h3>站内指标解释</h3>
          <p>${insideNote}</p>
          <p><strong>不可替代结论：</strong>${escapeHtml(auditItem?.question || "指标不能直接替代实验收益结论。")}</p>
        </div>
        <div class="route-card">
          <h3>站外复采动作</h3>
          <p>${outsideNote}</p>
          <p><strong>站外约束：</strong>${escapeHtml(data.internal.publicBoundary)}</p>
        </div>
        <div class="route-card">
          <h3>决策落地</h3>
          <p>${decisionLine}</p>
          <p><strong>执行口径：</strong>${escapeHtml(bridgeLine)}</p>
        </div>
      </div>
    </div>
  </section>`;
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
        <div class="section__eyebrow">诊断 × 资源排序 × 验收</div>
        <h2 class="section__title">把诊断结果落到资源排序和验收动作</h2>
        <p class="section__sub">这张表直接对应 owner、时间窗和验收指标。没有复采和回滚条件的建议不进入本轮排期。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>诊断结论</th><th>数据依据</th><th>资源方向</th><th>执行动作</th><th>约束</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
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
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>冲突</th><th>业务风险</th><th>处理方式</th><th>验收方式</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function storylineSection(data) {
  const items = legacyData(data).storyline;
  return `<section class="section" id="storyline">
    <div class="container">
      <div class="section__head">
        <div>
          <div class="section__eyebrow">故事线</div>
          <p class="section__sub">按经营优先级、渠道归因、数据可信度、技术病灶和执行路线展开；用最新经营与采集数据补齐结论边界。</p>
        </div>
      </div>
      <div class="story-grid">
        ${items.map((item, index) => `<div class="story-card"><div class="story-card__num">${index + 1}</div><p>${escapeHtml(item)}</p></div>`).join("")}
      </div>
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

export function thirdPartyGovernanceSection(data) {
  const governance = data.thirdPartyGovernance;
  if (!governance?.domains?.length) return "";
  const rules = (governance.budgetRules || []).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  const rows = governance.domains.map((item) => `<tr>
    <td><strong>${escapeHtml(item.category)}</strong><div class="evidence-note">${escapeHtml(item.routeScope)}</div></td>
    <td>${escapeHtml(item.owner)}</td>
    <td>${escapeHtml(item.purpose)}</td>
    <td>${escapeHtml(item.loadPolicy)}</td>
    <td>${escapeHtml(item.failureBudget)}</td>
    <td>${escapeHtml(item.decision)}</td>
  </tr>`).join("");
  return `<section class="section" id="third-party-governance">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">第三方治理 · Owner / 用途 / 预算</div>
        <h2 class="section__title">把 ${integer(data.external.maxThirdPartyFailures)} 次第三方失败拆成可执行的责任表</h2>
        <p class="section__sub">${escapeHtml(governance.summary)}</p>
      </div>
      <div class="deprecated"><strong>证据版本：</strong>${escapeHtml(governance.evidenceVersion)}<ol>${rules}</ol></div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>脚本类别</th><th>Owner</th><th>用途</th><th>加载策略</th><th>失败预算</th><th>处置</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function segmentSamplingSection(data) {
  const plan = data.segmentSamplingPlan;
  if (!plan?.segments?.length) return "";
  const pilot = plan.publicPilot;
  const commands = (plan.commands || []).map((command) => `<li><code>${escapeHtml(command)}</code></li>`).join("");
  const gates = (plan.acceptanceGates || []).map((gate) => `<li>${escapeHtml(gate)}</li>`).join("");
  const pilotReads = (pilot?.decisionRead || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const pilotRows = (pilot?.rows || []).map((item) => `<tr>
    <td><strong>${escapeHtml(item.segment)}</strong><div class="evidence-note">${escapeHtml(item.routeId)}</div></td>
    <td>${escapeHtml(item.maxFcp)}</td>
    <td>${escapeHtml(item.maxTtfb)}</td>
    <td>${escapeHtml(item.maxJsKb)}</td>
    <td>${integer(item.maxThirdPartyFailures)}</td>
    <td>${integer(item.maxRuntimeErrors)}</td>
    <td>${escapeHtml(item.interpretation)}</td>
  </tr>`).join("");
  const pilotBlock = pilot?.rows?.length ? `
      <div class="deprecated">
        <strong>公开匿名 pilot：</strong>${escapeHtml(pilot.sessionId || pilot.observedAt)} · ${escapeHtml(pilot.methodologyVersion)} · confidence ${escapeHtml(pilot.confidence)}。${escapeHtml(pilot.scope)}
        ${pilotReads ? `<ol>${pilotReads}</ol>` : ""}
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>Segment</th><th>Max FCP</th><th>Max TTFB</th><th>Max JS</th><th>Max 3P 失败</th><th>Max 错误</th><th>诊断读取</th></tr></thead>
          <tbody>${pilotRows}</tbody>
        </table>
      </div>` : "";
  const rows = plan.segments.map((item) => `<tr>
    <td><strong>${escapeHtml(item.segment)}</strong><div class="evidence-note">${escapeHtml(item.routePack)}</div></td>
    <td>${escapeHtml(statusLabelFromState(item.state === "ready" ? "done" : "blocked"))}<div class="evidence-note">${escapeHtml(item.state)}</div></td>
    <td>${escapeHtml(item.question)}</td>
    <td>${escapeHtml(item.decisionUse)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="segment-sampling">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">分段复采 · UTM / 状态 / Checkout</div>
        <h2 class="section__title">下一轮采样按入口和交易状态拆开</h2>
        <p class="section__sub">${escapeHtml(plan.summary)}</p>
      </div>
      <div class="deprecated"><strong>方法版本：</strong>${escapeHtml(plan.methodologyVersion)}<ol>${gates}</ol></div>
      ${pilotBlock}
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>Segment</th><th>状态</th><th>要回答的问题</th><th>决策用途</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="code-block" style="margin-top: 16px;"><ul>${commands}</ul></div>
    </div>
  </section>`;
}

export function featureComparisonSection(data) {
  const rows = legacyData(data).featureComparison.map((item) => `<tr>
    <td><strong>${escapeHtml(item.module)}</strong></td>
    <td>${escapeHtml(item.historical)}</td>
    <td>${escapeHtml(item.currentGap)}</td>
    <td>${escapeHtml(item.recoveredAs)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="feature-compare">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">功能对比 · current vs history</div>
        <h2 class="section__title">历史站高价值功能恢复清单</h2>
        <p class="section__sub">对比线上腾讯云当前站与 GitHub 历史站后，最有价值的是分析模块和执行模块如何承接真实经营值与新采集证据。本表把缺口、恢复方式和安全边界一并固化。</p>
      </div>
      <div class="cross-table-wrap" tabindex="0">
        <table class="feature-table">
          <thead><tr><th>历史功能</th><th>历史站价值</th><th>当前缺口</th><th>本次恢复方式</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

export function operatingBridgeSection(data) {
  const signals = legacyData(data).operatingSignals.map((item) => `<div class="signal-card">
    <h3>${escapeHtml(item.label)}</h3>
    <dl>
      <div><dt>历史信号</dt><dd>${escapeHtml(item.historicalSignal)}</dd></div>
      <div><dt>当前读取</dt><dd>${escapeHtml(item.currentRead)}</dd></div>
      <div><dt>经营用途</dt><dd>${escapeHtml(item.publicUse)}</dd></div>
    </dl>
  </div>`).join("");
  return `<section class="section" id="operating-bridge">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">经营数据 × 采集数据</div>
        <h2 class="section__title">经营数据负责判断优先级，采集数据负责证明病灶</h2>
        <p class="section__sub">当前 workbook 的作用是校准“哪些问题值得排队”，外部自动采集的作用是证明“这些问题是否可复现”。两类数据不能互相替代。</p>
      </div>
      <div class="signal-grid">${signals}</div>
      <div class="deprecated"><strong>安全边界：</strong>${escapeHtml(data.internal.publicBoundary)}</div>
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
            <tr><td><strong>销售</strong></td><td>净售出商品数 ${integer(current.sales.quantitySold)}；总销售额 ${fixed(current.sales.totalSalesWan, 6)}万；AOV ${fixed(current.sales.averageOrderValue, 2)}</td><td>总销量 ${integer(history.sales.quantitySold)}；总营收 ${usd(history.sales.totalRevenueUsd)}；AOV ${usd(history.sales.averageOrderValueUsd)}</td><td>历史值恢复完整故事线；当前值用于私密经营看板。</td></tr>
            <tr><td><strong>售后/复购</strong></td><td>退款率 ${pct(current.sales.refundRate)}；复购率 ${pct(current.sales.repurchaseRate)}；连带率 ${pct(current.sales.attachRate)}</td><td>退款率 ${pct(history.sales.refundRate)}；复购率 ${pct(history.sales.repurchaseRate)}；连带率 ${pct(history.sales.attachRate)}</td><td>这些是“不能被修坏”的资产约束。</td></tr>
            <tr><td><strong>预警</strong></td><td>近 7 天预警 ${current.warnings.recentWarningRows} 行；自定义日期预警 ${current.warnings.customRangeWarningRows} 行；自然搜索明细 ${current.warnings.naturalSearchRows} 行</td><td>历史自然搜索 Top 5 有明细</td><td>搜索故事应以当前补源为准，不再仅靠历史导出。</td></tr>
          </tbody>
        </table>
      </div>

      <section class="section" id="business-kpi-trend" style="padding-top:24px;">
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
      </section>
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
        <div class="section__eyebrow">渠道质量诊断</div>
        <h2 class="section__title">先修归因可信度，再决定预算和 SEO 动作</h2>
        <p class="section__sub">历史站拆过流量来源，价值在于提醒团队不要只看总访问量。当前自然搜索明细为空，第三方失败又会污染广告、评论、客服和实验归因；因此本段只保留可执行的渠道诊断动作，不再沿用旧窗口下的收益判断。</p>
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

export function assetAttributionSection(data) {
  const cards = legacyData(data).assetMap.map((item) => `<div class="route-card">
    <h3>${escapeHtml(item.asset)}</h3>
    <p><strong>保护原则：</strong>${escapeHtml(item.protect)}</p>
    <p><strong>安全边界：</strong>${escapeHtml(item.currentBoundary)}</p>
    <p><strong>行动方向：</strong>${escapeHtml(item.action)}</p>
  </div>`).join("");
  return `<section class="section" id="asset-attribution">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">资产保护地图</div>
        <h2 class="section__title">历史“三资产归因”保留为决策约束</h2>
        <p class="section__sub">旧站最有价值的一点是提醒团队：修漏斗不是盲目改价、盲目动结账、盲目砍信任组件。当前私密版保留这些约束，并写入真实经营值。</p>
      </div>
      <div class="route-grid">${cards}</div>
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
  return `<section class="section section--gray" id="bot-audit">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">爬虫与数据可信度</div>
        <h2 class="section__title">爬虫问题纳入归因可信度治理</h2>
        <p class="section__sub">历史站把“爬虫是否拖慢页面”推进到“流量口径是否可信”。当前版本保留这个判断，并把旧流量比例标为历史口径，等待新采集复证。</p>
      </div>
      <div class="route-grid">${cards}</div>
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
  return `<section class="section" id="top15">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">Top 15 病灶</div>
        <h2 class="section__title">15 项问题按数据强度和验收门槛重排</h2>
        <p class="section__sub">旧站的 Top 15 回来了，但排序不再依据旧收益预估，而是依据可复现程度、路径风险和能否复采验收。</p>
      </div>
      <div class="backlog-grid">${rows}</div>
    </div>
  </section>`;
}

export function competitorMatrixSection(data) {
  const snapshot = competitorSnapshot(data);
  const rows = legacyData(data).competitorMatrix.map((item) => `<tr>
    <td><strong>${escapeHtml(item.dimension)}</strong></td>
    <td class="momcozy">${escapeHtml(item.momcozy)}</td>
    <td>${escapeHtml(item.reference)}</td>
    <td>${escapeHtml(item.lesson)}</td>
    <td>${renderRecollectStatus(item.recollectStatus)}</td>
  </tr>`).join("");
  return `<section class="section section--gray" id="matrix">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">竞品矩阵 · 6 站复采样本</div>
        <h2 class="section__title">横向参照保留为策略矩阵，并纳入经营 caveat</h2>
        <p class="section__sub">历史矩阵的价值是让建议不孤立。当前矩阵已经接入竞品复采样本，但仍只用于风险排序和假设收敛，不能直接恢复成最终分值化对标。</p>
      </div>
      <div class="deprecated">${competitorSnapshotCallout(snapshot)}</div>
      <div class="matrix-wrap">
        <table class="matrix-mini">
          <thead><tr><th>维度</th><th class="momcozy">Momcozy 当前状态</th><th>竞品参照</th><th>应学什么</th><th>竞品数据状态</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${competitorEvidenceTable(snapshot)}
    </div>
  </section>`;
}

export function competitorRecollectPlanSection(data) {
  const plan = data.competitorRecollectPlan;
  if (!plan) return "";
  const snapshot = competitorSnapshot(data);

  const routes = (plan.routeExpansion || []).map((item) => `<tr>
    <td>${escapeHtml(item.route)}</td>
    <td>${escapeHtml(item.label)}</td>
    <td>${escapeHtml(item.requirement)}</td>
  </tr>`).join("");

  const tasks = (plan.tasks || []).map((task) => `<tr>
    <td>${escapeHtml(task.taskId || "")}</td>
    <td>${escapeHtml(task.title || "")}</td>
    <td>${escapeHtml(task.owner || "")}</td>
    <td>${escapeHtml(statusLabelFromState(task.state || "todo"))}</td>
    <td>${escapeHtml(task.dueBy || "")}</td>
    <td>${(Array.isArray(task.deliverables) && task.deliverables.length > 0) ? `<ul>${task.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}</td>
  </tr>`).join("");

  const executionContext = [plan.goal, plan.executionWindow ? `执行窗口：${plan.executionWindow}` : ""]
    .filter(Boolean)
    .join("；");

  const commands = (plan.commands || []).map((command) => `<li><code>${escapeHtml(command)}</code></li>`).join("");
  const rules = (plan.executionRules || []).map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");

  return `<section class="section" id="competitor-recollect">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">竞品重采复核计划</div>
        <h2 class="section__title">把‘待重采’改为‘可验收动作’</h2>
        <p class="section__sub">Owner: ${escapeHtml(plan.owner)}。目标：先补齐站内链路口径，再让竞品对照有同口径样本。</p>
      </div>
      <div class="deprecated">${escapeHtml(executionContext)}</div>
      ${snapshot ? `<div class="cross-callout" role="note" aria-label="竞品复采摘要">
        <div class="card-label">竞品复采摘要</div>
        <p>${competitorSnapshotCallout(snapshot)}</p>
      </div>` : ""}
      <div class="cross-table-wrap" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>路由ID</th><th>说明</th><th>复采要求</th></tr></thead>
          <tbody>${routes}</tbody>
        </table>
      </div>
      ${tasks ? `<div class="cross-table-wrap" style="margin-top: 16px;" tabindex="0">
        <table class="cross-table">
          <thead><tr><th>任务ID</th><th>任务</th><th>负责人</th><th>状态</th><th>截止</th><th>交付项</th></tr></thead>
          <tbody>${tasks}</tbody>
        </table>
      </div>` : ""}
      <div class="route-grid" style="margin-top: 16px;">
        <div class="route-card">
          <h3>执行命令（下一步）</h3>
          <ol>${commands}</ol>
        </div>
        <div class="route-card">
          <h3>执行约束</h3>
          <ol>${rules}</ol>
        </div>
      </div>
      <div class="cross-callout" role="note" aria-label="竞品重采验收门槛">
        <div class="card-label">验收门槛</div>
        <p>${escapeHtml(plan.acceptanceGate)}</p>
      </div>
    </div>
  </section>`;
}

export function playbookSection(data) {
  const cards = legacyData(data).playbookCards.map((item) => `<article class="playbook-card">
    <div class="playbook-card__head">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.why)}</p>
    </div>
    <div class="playbook-card__body">
      <ol>${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      <div class="playbook-gate">验收门槛：${escapeHtml(item.gate)}</div>
    </div>
  </article>`).join("");
  return `<section class="section" id="code">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">PR 实验卡</div>
        <h2 class="section__title">把“15 PR 代码”恢复成可执行实验卡</h2>
        <p class="section__sub">旧站的代码片段有执行价值，但直接粘贴旧代码风险高。这里改成 PR 卡：目的、步骤、验收和回滚，适合工程团队逐项落地。</p>
      </div>
      <div class="playbook-grid">${cards}</div>
    </div>
  </section>`;
}

export function roadmapSection(data) {
  const cards = legacyData(data).roadmap.map((item) => `<div class="roadmap-step">
    <div class="roadmap-step__phase">${escapeHtml(item.phase)}</div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.focus)}</p>
    <p><strong>验收：</strong>${escapeHtml(item.gate)}</p>
  </div>`).join("");
  return `<section class="section section--gray" id="roadmap">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">Sprint 路线图</div>
        <h2 class="section__title">路线图恢复为四段式：证据、扩采、修复、验收</h2>
        <p class="section__sub">旧路线图的价值是顺序感。当前版把顺序和验收保留，把旧收益承诺替换成复采与实验门槛。</p>
      </div>
      <div class="roadmap-lite">${cards}</div>
    </div>
  </section>`;
}

export function hero(data) {
  const sessionLabel = observedSessionDate(data);
  return `<section class="hero" id="hero">
    <div class="container">
      <div class="hero__grid">
        <div>
          <span class="hero__badge">M1 v2.0 历史骨架 · 私密经营数据重审版</span>
          <h1 class="hero__title">真实经营数据回归，<br><span class="hl">技术债故事线闭环</span>。</h1>
          <p class="hero__lead"><strong>先把话说透：</strong>本版不再是压缩摘要，而是把当前 workbook、历史经营 JSON 与 ${sessionLabel || "最新"} 自动采集放在同一个经营诊断故事里。旧站的业务体检、渠道归因、爬虫可信度、资产保护、Top 15 和 PR 路线图都要回来。</p>
          <p class="hero__lead">当前经营表显示总销售额 ${fixed(data.currentOperations.sales.totalSalesWan, 2)}万、转化率 ${pct(data.currentOperations.conversion.conversionRate)}、AOV ${fixed(data.currentOperations.sales.averageOrderValue, 2)}；历史 M1 v2.0 显示总营收 ${usdMillion(data.historicalOperations.sales.totalRevenueUsd)}、monthly_revenue ${usdMillion(data.historicalOperations.sales.monthlyRevenueUsd)}、overall_cvr ${pct(data.historicalOperations.conversion.overallCvr)}。自动采集则证明首页与代表性 PDP 仍暴露约 1.9MB JS、最高 ${data.external.maxDomNodes.toLocaleString("en-US")} DOM 节点、最高 ${data.external.maxThirdPartyFailures} 次第三方失败。</p>
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
  ${storylineSection(data)}
  ${logicChainSection(data)}
  ${hardConclusionsSection(data)}
  ${crossMatrixSection(data)}
  ${contradictionsSection(data)}
  ${featureComparisonSection(data)}
  <section class="section" id="health">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">I · 总览重审</div>
        <h2 class="section__title">当前经营数据可用，但不能被过度消费</h2>
        <p class="section__sub">今天更新后的 workbook 通过了核心算术校验，但仍有 3 个 WARN：流量与销售观察窗口不一致、币种需要 owner 确认、自然搜索关键词行为空。</p>
      </div>
      ${crossAuditCards(data)}
      <div class="callout-strong">
        <div class="card-label" style="color:#fbbf24;">尖锐结论</div>
        <p>经营漏斗支持“优化值得做”，但不能证明“某个技术修复直接产生某个收益点估”。P0/P1 应以可复现技术债和实验验收指标排序，而不是用旧版月化收益承诺排序。</p>
      </div>
    </div>
  </section>
  ${operatingBridgeSection(data)}
  ${businessKpiSection(data)}
  ${trafficAttributionSection(data)}
  ${assetAttributionSection(data)}
  ${botGovernanceSection(data)}
  ${crossAuditSection(data, "index.html")}
  ${diagnosticBacklogSection(data)}
  ${competitorMatrixSection(data)}
  ${executionOrdersSection(data)}
  ${playbookSection(data)}
  ${roadmapSection(data)}`;
}

export function metricsBody(data) {
  return `<section class="hero" id="hero">
    <div class="container">
      <span class="hero__badge">II · 指标口径 · 最新治理版</span>
      <h1 class="hero__title">先统一口径，<br><span class="hl">再讨论增长。</span></h1>
      <p class="hero__lead">这页不再把旧 25 指标当作全部当前事实。最新经营数据只能支持三类表达：可复算漏斗、需要 caveat 的经营口径、暂时冻结的 SEO 变现故事。</p>
      <p class="hero__lead">强证据来自外部自动采集：TTFB 不是主问题，JS、DOM、第三方失败和 LCP 不可观测才是工程优先级。</p>
  ${crossAuditCards(data)}
    </div>
  </section>
  ${operatingBridgeSection(data)}
  ${businessKpiSection(data)}
  <section class="section section--gray" id="funnel">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">口径治理</div>
        <h2 class="section__title">旧漏斗图回归，但必须和当前 workbook 分开读</h2>
        <p class="section__sub">内部漏斗校验通过，说明业务摩擦真实存在；但 traffic/sales 窗口不一致、币种待确认、SEO keyword rows = ${data.internal.naturalSearchRows}，所以当前页面并列展示真实值，同时保留口径 caveat。</p>
      </div>
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
  ${crossAuditSection(data, "metrics.html")}
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
  </section>`;
}

export function forensicsBody(data) {
  return `<section class="hero" id="scene">
    <div class="container">
      <span class="hero__badge">III · 证据链重审 · ${escapeHtml(observedSessionDate(data) || "最新")}</span>
      <h1 class="hero__title">病灶很明确，<br><span class="hl">因果必须收紧。</span></h1>
      <p class="hero__lead">本页保留现场化表达，但把旧版“修复即收益”的表达改成复采边界：第三方失败、JS/DOM 膨胀、LCP 不可观测可以复采验证；收入影响只能在私有实验中验证。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${botGovernanceSection(data)}
  ${crossAuditSection(data, "forensics.html")}
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
  </section>`;
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
      <span class="hero__badge">IV · 性能趋势 · M1 → M3</span>
      <h1 class="hero__title">最新 13 路由采集，<br><span class="hl">趋势必须和经营 caveat 一起读。</span></h1>
      <p class="hero__lead">趋势页已经追加 ${escapeHtml(data.external.latestSession)}。外部采集证明技术债持续存在；内部经营刷新证明收益点估必须实验化。两者合在一起，结论更尖锐：先修可复现技术债，但不要用旧收益承诺包装它。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${crossAuditSection(data, "trends.html")}
  <section class="section" id="latest-v3">
    <div class="container">
      <div class="section__head">
        <div class="section__eyebrow">最新融合 · v3 路由感知自动化基线</div>
        <h2 class="section__title">${escapeHtml(session.observedAt)}：趋势页已并入最新外部采集</h2>
        <p class="section__sub">v3 采集已扩展为 homepage / PDP watchlist / cart / checkout × 桌面/移动双视口；旧 M2 首页趋势只作为历史参照，不再被当作最新结论。</p>
      </div>
      <div class="metric-grid">
        <div class="metric-card metric-card--success"><div class="card-label">最新 session</div><div class="card-value">${escapeHtml(session.observedAt)}</div><div class="card-meta">${escapeHtml(session.methodologyVersion)}</div></div>
        <div class="metric-card metric-card--success"><div class="card-label">TTFB 仍非主因</div><div class="card-value">${data.external.homepageTtfbDesktopMs} / ${data.external.homepageTtfbMobileMs}ms</div><div class="card-meta">首页桌面 / 移动</div></div>
        <div class="metric-card metric-card--danger"><div class="card-label">3P 失败最大值</div><div class="card-value">${maxFailures}</div><div class="card-meta">PDP ${escapeHtml(data.external.pdpThirdPartyFailures)}</div></div>
        <div class="metric-card metric-card--warn"><div class="card-label">LCP 可观测</div><div class="card-value">${data.external.lcpObservedSamples} / ${data.external.lcpTotalSamples}</div><div class="card-meta">全部路由-视口样本未观测</div></div>
      </div>
      <div class="sessions-wrap">
        <table class="sessions-table">
          <thead><tr><th>路线</th><th>视口</th><th>FCP (s)</th><th>TTFB (ms)</th><th>CLS</th><th>JS (KB)</th><th>DOM</th><th>请求</th><th>3P 失败</th></tr></thead>
          <tbody>${latestRows(session)}</tbody>
        </table>
      </div>
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
      <span class="hero__badge">V · ${escapeHtml(sessionLabel || "latest")} · 内外部数据重审</span>
      <h1 class="hero__title">历史报告为骨架，<br><span class="hl">最新数据改结论。</span></h1>
      <p class="hero__lead">本页集中呈现私密经营版的决策总表。它来自私有经营数据刷新和外部自动采集的交叉验证，但不发布原始经营表、原始数据端点或不可复核的收益模型输入。</p>
      ${crossAuditCards(data)}
    </div>
  </section>
  ${storylineSection(data)}
  ${logicChainSection(data)}
  ${hardConclusionsSection(data)}
  ${crossMatrixSection(data)}
  ${contradictionsSection(data)}
  ${featureComparisonSection(data)}
  ${operatingBridgeSection(data)}
  ${businessKpiSection(data)}
  ${crossAuditSection(data, "cross-audit.html")}
  ${competitorMatrixSection(data)}
  ${competitorRecollectPlanSection(data)}
  ${segmentSamplingSection(data)}
  ${thirdPartyGovernanceSection(data)}
  ${executionOrdersSection(data, "execution-orders")}
  ${playbookSection(data)}
  ${roadmapSection(data)}`;
}
