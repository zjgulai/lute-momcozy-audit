import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  behaviorSankeyChart,
  botAttributionSankeyChart
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
