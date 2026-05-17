# Momcozy 独立站诊断 M1 v1.2 · 法医验尸报告

> **路特 AI 公司外接咨询单** · Sisyphus(COO) + Growth Hacker + Software Architect + Reality Checker + Legal Compliance 5 角色协作 · 2026-05-17

## 🌐 在线演示

**https://zjgulai.github.io/lute-momcozy-audit/**

## 📁 三页结构

| 页 | URL | 内容 |
|---|---|---|
| 主报告 | [`/`](https://zjgulai.github.io/lute-momcozy-audit/) | 8 区诊断 + ROI · 月入基线 $11.5M · Top 5 P0 35h = $10-16M/月 · 4 周 Sprint + 路特 4 决策点 |
| 指标字典 | [`/metrics.html`](https://zjgulai.github.io/lute-momcozy-audit/metrics.html) | 25 KPI（流量 7 + 转化 6 + 销售 5 + 性能 7）· 6 差异化图表（双轴漏斗 / 行业差距 / 依赖网络 / AOV×CVR 象限 / 4 PDP 漏斗 / Lighthouse 表）· 7 关键洞察 |
| 法医报告 v1.2 | [`/forensics.html`](https://zjgulai.github.io/lute-momcozy-audit/forensics.html) | 13 项铁证 · 三段式「现场 / 物证 / 鉴定」· 5 大取证区 · 14 fix block + 8 verify command |

## 🩻 13 项铁证（v1.2 不留客气话）

P0 致命错误 8 项：
1. FastBundle FBT 主接口在 KleanPal Pro PDP 上 HTTP 404 · product_id 8137262497990
2. Amazon Buy with Prime SDK 等 selling_plan input 5 秒超时
3. Pinterest Pixel 3 个连接全 ERR_CONNECTION_RESET · 转化数据 100% 丢失
4. api.seel.com 阻塞 10.7 秒
5. Meta Pixel 装了 3 个不同 config ID（838745568077400 / 1845894755472645 / 1207445154305002）
6. bigsur.ai 已死域名仍在 theme（首页 + PDP 双重浪费）
7. cifnews CAPI 死端点 404
8. Amazon Product Rating null pointer

P1 5 项：86% above-fold 图片用 lazy / 7 alt 缺失 / 160 srcset 缺失 / ?ref= canonical 风险 / 264 链接 HEAD 未扫

## 📊 数据基线（2026-01-01 → 2026-05-15 · 137 天累计）

- 月 PV: 45.6M · 月 UV: 43.2M
- 月营收: **$11.5M** · 月订单: 122K · AOV: $119
- CVR: 0.88%（行业 1.5-2.5% 的 35-58%）
- 跳出率: 75.8% · 加购率: 3.67%

## 🛠 取证方法

Playwright 实地驱动 10 次 evaluate calls：
- `browser_navigate` → 首页 + KleanPal Pro PDP
- `browser_console_messages` → 抓 9 + 15 errors 含完整 stack
- `browser_network_requests` → 471 + 506 资源
- `browser_evaluate` → 实测 340 img · 392 anchors · 7 long tasks

## 📦 仓库结构

```
.
├── index.html              主报告（8 区 · 1827 行）
├── metrics.html            指标字典（25 KPI · 6 图表 · 2050 行）
├── forensics.html          法医报告（13 铁证 · 1142 行）
├── data/                   原始取证 JSON
│   ├── forensics-raw.json     法医级取证原始数据
│   ├── momcozy-real-kpis.json 业务 KPI 基线
│   ├── momcozy-resource-deep-dive.json 资源深度数据
│   ├── baseline.json          5 站对比基线
│   ├── benchmark-table.csv    8 站矩阵
│   └── competitors_batch2.json 竞品 batch 2 数据
└── reports/                Markdown 报告 4 份
    ├── 00-Executive-Summary.md   一页纸（路特先看）
    ├── 01-Diagnosis-Top15.md     Top 15 诊断 vs 7 竞品
    ├── 02-Action-Items.md        15 项完整 Liquid PR 代码
    └── 03-M1-Execution-Plan.md   M1 执行计划
```

## 🚧 v1.3 路线（v1.2 不留面子明列）

7 项未做 · 见 forensics.html 末尾 dark section：
- JS Coverage % 逐文件
- CSS Coverage % 逐文件
- 264 链接 HEAD 死链扫
- @axe-core/playwright WCAG 全规则扫
- Lighthouse CI 完整 LHR
- 移动端 4G simulate
- Liquid section DOM 节点溯源（5375 → 7538 增长源头）

---

© 2026 路特 AI 公司 · v1.2 · Sisyphus(COO) signed out
