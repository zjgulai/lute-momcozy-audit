import {escapeHtml, fixed, integer, pct} from "./format.mjs";

const BASE_VISITS = 10000;

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function fmtRatio(value) {
  return pct(value, 2);
}

function fmtSeconds(value) {
  return `${fixed(value, 1)}s`;
}

function metricValue(item) {
  if (Number.isFinite(item.value)) {
    return item.format === "percent" ? fmtRatio(item.value) : fixed(item.value, item.digits ?? 1);
  }
  return escapeHtml(item.value ?? "N/A");
}

function barWidth(value, maxValue) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 0;
  return clamp((value / maxValue) * 100, 0, 100);
}

export function barChart({id, title, subtitle = "", items = [], valueLabel = "数值"}) {
  const maxValue = Math.max(...items.map((item) => finite(item.value)), 1);
  const rows = items.map((item) => `
    <div class="insight-bar-row">
      <div class="insight-bar-row__label">${escapeHtml(item.label)}</div>
      <div class="insight-bar-row__track"><span style="width:${barWidth(item.value, maxValue).toFixed(2)}%;"></span></div>
      <div class="insight-bar-row__value">${metricValue(item)}</div>
    </div>`).join("");

  return `<figure class="insight-chart insight-chart--bar" id="${escapeHtml(id || "chart-bar")}">
    <figcaption>
      <strong>${escapeHtml(title || "指标对照")}</strong>
      ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
    </figcaption>
    <div class="insight-bar" role="img" aria-label="${escapeHtml(title || valueLabel)}">${rows}</div>
  </figure>`;
}

export function coverageChart({id, title, subtitle = "", observed = 0, total = 0, label = "覆盖率"}) {
  const ratio = total > 0 ? observed / total : 0;
  return barChart({
    id: id || "chart-coverage",
    title: title || label,
    subtitle,
    valueLabel: label,
    items: [{label, value: ratio, format: "percent"}]
  });
}

export function pairedMetricChart({id, title, subtitle = "", pairs = []}) {
  const maxValue = Math.max(...pairs.flatMap((pair) => [finite(pair.current), finite(pair.historical)]), 1);
  const rows = pairs.map((pair) => `
    <div class="paired-metric">
      <div class="paired-metric__label">${escapeHtml(pair.label)}</div>
      <div class="paired-metric__bars">
        <span class="paired-metric__bar paired-metric__bar--current" style="width:${barWidth(pair.current, maxValue).toFixed(2)}%;"></span>
        <span class="paired-metric__bar paired-metric__bar--historical" style="width:${barWidth(pair.historical, maxValue).toFixed(2)}%;"></span>
      </div>
      <div class="paired-metric__values">
        <span>当前 ${metricValue({value: pair.current, format: pair.format, digits: pair.digits})}</span>
        <span>历史 ${metricValue({value: pair.historical, format: pair.format, digits: pair.digits})}</span>
      </div>
    </div>`).join("");

  return `<figure class="insight-chart insight-chart--paired" id="${escapeHtml(id || "chart-paired")}">
    <figcaption>
      <strong>${escapeHtml(title || "当前 / 历史对照")}</strong>
      ${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}
    </figcaption>
    <div class="paired-metric-list">${rows}</div>
  </figure>`;
}

function funnelFacts(data) {
  const current = data.currentOperations;
  const historical = data.historicalOperations;
  return {
    current: {
      label: "当前 workbook",
      visits: BASE_VISITS,
      bounceRate: current.traffic.bounceRate,
      staySec: current.traffic.avgStaySec,
      addToCartRate: current.conversion.addToCartRate,
      checkoutRate: current.conversion.checkoutRate,
      conversionRate: current.conversion.conversionRate
    },
    historical: {
      label: "历史 M1 v2.0",
      visits: BASE_VISITS,
      bounceRate: historical.traffic.bounceRate,
      staySec: historical.traffic.avgSessionSec,
      addToCartRate: historical.conversion.addToCartRate,
      checkoutRate: historical.conversion.checkoutRate,
      conversionRate: historical.conversion.overallCvr
    }
  };
}

function funnelCounts(facts) {
  return {
    visits: facts.visits,
    stayed: Math.round(facts.visits * (1 - finite(facts.bounceRate))),
    bounced: Math.round(facts.visits * finite(facts.bounceRate)),
    cart: Math.round(facts.visits * finite(facts.addToCartRate)),
    checkout: Math.round(facts.visits * finite(facts.checkoutRate)),
    converted: Math.round(facts.visits * finite(facts.conversionRate))
  };
}

function sankeyStroke(count) {
  return clamp((count / BASE_VISITS) * 72, 4, 72).toFixed(1);
}

function behaviorLane(facts, y, color, mutedColor) {
  const counts = funnelCounts(facts);
  const stayedY = y - 34;
  const bouncedY = y + 46;
  const cartY = y - 30;
  const checkoutY = y - 22;
  const convertedY = y - 14;
  return `
    <text class="sankey-label sankey-label--strong" x="24" y="${y - 58}">${escapeHtml(facts.label)}</text>
    <text class="sankey-label" x="24" y="${y - 40}">基数 ${integer(facts.visits)} 访问 · 转化率 ${fmtRatio(facts.conversionRate)}</text>
    <path d="M 72 ${y} C 170 ${y} 178 ${stayedY} 270 ${stayedY}" stroke="${color}" stroke-width="${sankeyStroke(counts.stayed)}" />
    <path d="M 72 ${y} C 170 ${y} 178 ${bouncedY} 270 ${bouncedY}" stroke="${mutedColor}" stroke-width="${sankeyStroke(counts.bounced)}" />
    <path d="M 360 ${stayedY} C 446 ${stayedY} 462 ${cartY} 548 ${cartY}" stroke="${color}" stroke-width="${sankeyStroke(counts.cart)}" />
    <path d="M 638 ${cartY} C 714 ${cartY} 732 ${checkoutY} 804 ${checkoutY}" stroke="${color}" stroke-width="${sankeyStroke(counts.checkout)}" />
    <path d="M 894 ${checkoutY} C 956 ${checkoutY} 974 ${convertedY} 1038 ${convertedY}" stroke="${color}" stroke-width="${sankeyStroke(counts.converted)}" />
    <g class="sankey-node"><rect x="24" y="${y - 18}" width="96" height="36" rx="8" /><text x="72" y="${y + 5}">访问</text></g>
    <g class="sankey-node"><rect x="270" y="${stayedY - 18}" width="90" height="36" rx="8" /><text x="315" y="${stayedY + 5}">未跳出</text></g>
    <g class="sankey-node sankey-node--muted"><rect x="270" y="${bouncedY - 18}" width="90" height="36" rx="8" /><text x="315" y="${bouncedY + 5}">跳出</text></g>
    <g class="sankey-node"><rect x="548" y="${cartY - 18}" width="90" height="36" rx="8" /><text x="593" y="${cartY + 5}">加购</text></g>
    <g class="sankey-node"><rect x="804" y="${checkoutY - 18}" width="90" height="36" rx="8" /><text x="849" y="${checkoutY + 5}">结账</text></g>
    <g class="sankey-node"><rect x="1038" y="${convertedY - 18}" width="98" height="36" rx="8" /><text x="1087" y="${convertedY + 5}">转化</text></g>
    <text class="sankey-small" x="270" y="${bouncedY + 38}">跳出率 ${fmtRatio(facts.bounceRate)}</text>
    <text class="sankey-small" x="548" y="${cartY - 34}">加购率 ${fmtRatio(facts.addToCartRate)}</text>
    <text class="sankey-small" x="804" y="${checkoutY - 34}">结账率 ${fmtRatio(facts.checkoutRate)}</text>
    <text class="sankey-small" x="1038" y="${convertedY - 34}">停留 ${fmtSeconds(facts.staySec)}</text>`;
}

function behaviorTable(facts) {
  return `<div class="insight-chart__facts">
    ${["current", "historical"].map((key) => {
      const item = facts[key];
      return `<div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>转化率 ${fmtRatio(item.conversionRate)}</span>
        <span>平均停留 ${fmtSeconds(item.staySec)}</span>
        <span>跳出率 ${fmtRatio(item.bounceRate)}</span>
      </div>`;
    }).join("")}
  </div>`;
}

export function behaviorSankeyChart({data}) {
  const facts = funnelFacts(data);
  return `<figure class="insight-chart insight-chart--sankey" id="chart-behavior-sankey">
    <figcaption>
      <strong>行为漏斗桑基图：当前 vs 历史</strong>
      <span>访问基数归一化到 ${integer(BASE_VISITS)}；只展示转化率、停留和跳出率事实，不写成收益因果。</span>
    </figcaption>
    <div class="sankey-scroll" tabindex="0">
      <svg class="sankey-svg" viewBox="0 0 1160 430" role="img" aria-labelledby="behavior-sankey-title behavior-sankey-desc">
        <title id="behavior-sankey-title">当前与历史行为漏斗桑基图</title>
        <desc id="behavior-sankey-desc">当前和历史访问基数归一化为 10000，比较跳出率、平均停留、加购率、结账率和转化率。</desc>
        <g fill="none" stroke-linecap="round" opacity="0.88">
          ${behaviorLane(facts.current, 132, "#2563eb", "#d97706")}
          ${behaviorLane(facts.historical, 324, "#0f766e", "#a16207")}
        </g>
      </svg>
    </div>
    ${behaviorTable(facts)}
    <p class="insight-chart__note">诊断读取：当前转化率、停留和跳出率可以并列对比，但 traffic/sales 窗口不同，human/bot 维度未复证前不能推导收益因果。</p>
  </figure>`;
}

export function botAttributionSankeyChart({data}) {
  const session = data.external?.latestSession || "latest session";
  return `<figure class="insight-chart insight-chart--sankey insight-chart--missing" id="chart-bot-attribution-sankey">
    <figcaption>
      <strong>机器人 / 人类流量归因桑基图：证据缺口版</strong>
      <span>机器人占比、爬虫占比为缺失或待复证证据；本图不生成任何 bot 百分比。</span>
    </figcaption>
    <div class="sankey-scroll" tabindex="0">
      <svg class="sankey-svg" viewBox="0 0 1000 320" role="img" aria-labelledby="bot-sankey-title bot-sankey-desc">
        <title id="bot-sankey-title">bot 归因证据缺口桑基图</title>
        <desc id="bot-sankey-desc">human 和 bot 维度缺失会污染渠道、转化和停留归因，需要 owner analytics、bot log 和 human-bot 维度复证。</desc>
        <g fill="none" stroke-linecap="round" opacity="0.88">
          <path d="M 86 156 C 226 156 250 102 390 102" stroke="#2563eb" stroke-width="46" />
          <path d="M 86 156 C 226 156 250 210 390 210" stroke="#d97706" stroke-width="46" />
          <path d="M 500 102 C 636 102 660 142 792 142" stroke="#94a3b8" stroke-width="28" stroke-dasharray="10 10" />
          <path d="M 500 210 C 636 210 660 178 792 178" stroke="#94a3b8" stroke-width="28" stroke-dasharray="10 10" />
        </g>
        <g class="sankey-node"><rect x="28" y="130" width="116" height="52" rx="8" /><text x="86" y="161">全部访问</text></g>
        <g class="sankey-node sankey-node--unknown"><rect x="390" y="76" width="112" height="52" rx="8" /><text x="446" y="106">human</text></g>
        <g class="sankey-node sankey-node--unknown"><rect x="390" y="184" width="112" height="52" rx="8" /><text x="446" y="214">bot/crawler</text></g>
        <g class="sankey-node sankey-node--muted"><rect x="792" y="124" width="156" height="72" rx="8" /><text x="870" y="155">归因污染</text><text x="870" y="176">待复证</text></g>
        <text class="sankey-small" x="380" y="62">维度缺失：不能判断人类流量</text>
        <text class="sankey-small" x="380" y="256">维度缺失：不能量化机器人占比/爬虫占比</text>
        <text class="sankey-small" x="714" y="108">渠道、停留、跳出、转化读数均受影响</text>
      </svg>
    </div>
    <div class="insight-chart__facts">
      <div><strong>证据状态</strong><span>机器人占比缺失</span><span>爬虫占比待复证</span><span>${escapeHtml(session)} 不含 human/bot 维度</span></div>
      <div><strong>污染风险</strong><span>human/bot 维度缺失会污染归因</span><span>停留短、跳出高、转化低不能直接归因给 bot</span></div>
      <div><strong>复证要求</strong><span>owner analytics</span><span>bot log</span><span>human-bot 维度复证</span></div>
    </div>
    <p class="insight-chart__note">诊断读取：当前只能把 bot 作为归因质量风险，不得生成任何 bot share 数值；下一步必须用 owner analytics / bot log / human-bot 维度复证。</p>
  </figure>`;
}
