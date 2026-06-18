import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  barChart,
  behaviorSankeyChart,
  botAttributionSankeyChart,
  coverageChart,
  pairedMetricChart
} from "../scripts/history-site/charts.mjs";

const data = JSON.parse(fs.readFileSync(new URL("../src/_data/public-cross-audit.json", import.meta.url), "utf8"));

test("behaviorSankeyChart renders current and historical funnel evidence", () => {
  const html = behaviorSankeyChart({data});

  assert.match(html, /id="chart-behavior-sankey"/);
  assert.match(html, /当前/);
  assert.match(html, /历史/);
  assert.match(html, /转化率/);
  assert.match(html, /停留/);
  assert.match(html, /跳出率/);
  assert.doesNotMatch(html, /直接产生收益|收益承诺/);
});

test("botAttributionSankeyChart marks bot share as missing without inventing percentages", () => {
  const html = botAttributionSankeyChart({data});

  assert.match(html, /id="chart-bot-attribution-sankey"/);
  assert.match(html, /机器人占比/);
  assert.match(html, /爬虫占比/);
  assert.match(html, /缺失|待复证/);
  assert.match(html, /owner analytics/);
  assert.match(html, /bot log/);
  assert.match(html, /human-bot/);
  assert.doesNotMatch(html, /bot[^<]{0,40}\d+(?:\.\d+)?%/i);
});

test("barChart supports planned rows API with valueFormat", () => {
  const html = barChart({
    id: "chart-row-api",
    title: "Rows API",
    rows: [{label: "第三方失败", value: 92}],
    valueFormat: (value) => `${value}次`
  });

  assert.match(html, /id="chart-row-api"/);
  assert.match(html, /第三方失败/);
  assert.match(html, /92次/);
});

test("coverageChart renders observed coverage", () => {
  const html = coverageChart({
    id: "chart-coverage-api",
    title: "LCP 覆盖率",
    observed: 0,
    total: 26
  });

  assert.match(html, /id="chart-coverage-api"/);
  assert.match(html, /LCP 覆盖率/);
  assert.match(html, /0\.00%/);
});

test("pairedMetricChart supports planned left and right value API", () => {
  const html = pairedMetricChart({
    id: "chart-paired-api",
    title: "窗口对比",
    leftLabel: "流量窗口天数",
    rightLabel: "销售窗口天数",
    leftValue: 137,
    rightValue: 205,
    unit: "d"
  });

  assert.match(html, /id="chart-paired-api"/);
  assert.match(html, /流量窗口天数/);
  assert.match(html, /销售窗口天数/);
  assert.match(html, /137d/);
  assert.match(html, /205d/);
});
