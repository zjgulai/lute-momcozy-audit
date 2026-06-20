# Momcozy 电商诊断监控平台 · 项目总结摘要

**整理日期**：2026-06-20  
**对话轮次**：从 2026-06-18 开始，历经约 2 天的深度开发  
**生产地址**：https://shopify.lute-tlz-dddd.top

---

## 一、项目交付物

### 产品层
| 产品 | 状态 | 说明 |
|---|---|---|
| **Next.js 诊断平台（主站）** | ✅ 生产运行 | shopify.lute-tlz-dddd.top，9页，自动 CI 部署 |
| **静态报告站（辅）** | ✅ 生产运行 | GitHub Pages，旧站保留参考 |

### 数据层
| 字段 | 内容 |
|---|---|
| `diagnosticNarrative` | 8个问题 SCQA+MECE 完整叙事 |
| `financialEvidence` | Shopify 7个月 P&L（87,475条SKU明细）|
| `metricDictionary` | 30个指标定义（5分类）|
| `geoBaseline` | Perplexity 5问实测基线 |
| `competitorEvidence` | 10个竞品技术+GEO对标 |
| `roiMatrix` | 11条战单ROI评分 |
| `problemCausalChain` | 根因层次图 |
| `bs03LtvDiagnosis` | BS03剃刀+刀片分析 |
| `skuAnomalyAlerts` | M5 Smart 5月异常告警 |
| `lossSkuAnalysis` | 5个亏损SKU清单（-$576K）|
| `competitorCommercialBenchmark` | 竞品定价+评论+折扣商业对比 |
| `geoTestingMethodology` | 20题×3引擎GEO测试框架 |
| `homepageDiagnosis` | 首页跳出率三假说 |
| `financialArguments` | P3/P5/P6/P7财务论据量化 |

---

## 二、核心诊断发现（8个问题，MECE+SCQA）

| # | 问题 | 损失估算（全周期） | 对应战单 |
|---|---|---|---|
| P2 | 结账→购买 38.2%（行业均值60%） | **+$49万** 机会 | ✅ CTA修复+Shop Pay |
| P1 | 加购率 8.6%（行业均值12-15%） | **+$15.5万** 机会 | ✅ 信任信号首屏化 |
| P3 | 弃单追回率0%、Klaviyo未运作 | **$1.4-2.7万/月** 可追回 | ✅ Klaviyo序列配置 |
| P4 | PDP信任信号/CTA/认证全部非首屏 | P1+P2的直接根因 | ✅ TuckGo meta title |
| P5 | 5个归因缺陷，数字不可信 | 月均广告费$53万被误用 | ✅ FB Pixel去重 |
| P6 | JS/DOM/3P失败全面超出竞品上限4× | P1+P2的技术放大器 | ✅ Kill-list建立 |
| P7 | SEO架构缺陷+GEO 0场景叙事主权 | 年化$1,568万广告节省潜力 | ✅ GEO内容战略 |
| P8 | 359脚本无SRI，CSP为零，防线归零 | 尾部风险，触发即灾难性 | ✅ 脚本清理 |

---

## 三、财务实证（Shopify 2025-11~2026-05）

- **总销售额**：$6,036万（7个月）
- **净利率**：37.7%（月均$862万销售）
- **广告/销售比**：123%（月均$1,061万广告费）
- **折扣率**：99%订单含>30%折扣（折扣是隐性CAC）
- **月度规律**：广告率降10pp ≈ 净利提升25pp（2月实证）
- **欧洲优势**：UK/FR/DE广告率101%，美国135.6%，差距34pp
- **亏损SKU**：5个SKU合计-$576K（瑜伽球/婴儿车风扇等非核品类）
- **BS03复购**：单机月均$4.24耗材，83.5%存量用户未在当期复购

---

## 四、360框架覆盖

| 状态 | 维度 | 说明 |
|---|---|---|
| ✅ 已采集（5/11） | G5/G6/G7/G9/G11 | Playwright自动采集完成 |
| ⏳ 待接入（6/11） | G1/G2/G3/G4/G8/G10 | 需owner后台数据（步骤已在页面）|
| ✅ 已覆盖（9/9） | D1-D9 | 原有维度全部覆盖 |

---

## 五、竞品对标（10品牌）

**已采集**：Willow / Elvie / eufy / Lansinoh / Freemie / Medela / BabyBuddha / Spectra  
**503 bot防护**：BEABA / BabyBreeza

**关键发现**：
- Medela JS仅176KB（Momcozy的1/12.6），重脚本不是行业宿命
- Freemie DOM 1,090（Momcozy的1/10），预算替代品体验反超
- 3P失败超竞品上限4.0×（原2.2×，10竞品数据更严峻）

---

## 六、执行战单状态（11条，全部待执行）

**Sprint Now（48h-1周）**：kill-list建立、PDP复采、FB Pixel去重、CTA修复、Klaviyo弃单序列、脚本清理  
**Sprint Next（2周）**：LCP可观测性、GEO内容战略  
**Sprint Later（30天）**：归因与搜索源补齐、经营实验账本

---

## 七、技术架构

```
lute-momcozy-audit（数据源）
  └── src/_data/public-cross-audit.json（209KB，主数据）
  └── src/_data/sessions/（7个session）
  └── src/_data/competitors/（10竞品快照）
  └── scripts/collect*.mjs（采集脚本）
  └── tests/（26 e2e + 10 data integrity）

lute-momcozy-platform（Next.js 主站）
  └── 9页：I总览/II指标/III风险/IV趋势/V决策/VI竞品/VII框架/VIII采集/IX战单
  └── CI: tencent.yml（自动 build → deploy → smoke test）
  └── 数据: CI 时 checkout audit → cp → build（数据不提交）
```

---

## 八、待完成事项（Owner 操作）

| 优先级 | 任务 | 时间 |
|---|---|---|
| P0 | FB Pixel去重 | 5分钟 |
| P0 | G2分渠道CVR导出（Shopify Analytics） | 30分钟 |
| P1 | G1 Microsoft Clarity接入 | 15分钟+14天 |
| P1 | P2 CTA sticky修复 + Shop Pay确认 | 4小时（开发）|
| P1 | P3 Klaviyo弃单序列激活 | 8小时 |

---

## 九、工程质量

| 指标 | 状态 |
|---|---|
| 测试覆盖 | 36/36（26 e2e + 10 data integrity）|
| 生产地址 | shopify.lute-tlz-dddd.top 10/10路由200 |
| 数据校验 | JSON schema + allowlist 全通过 |
| 分支管理 | main only（已清理42个历史分支）|
| 文档完整性 | PRD 2.0 + AGENTS.md + README 已更新 |

---

## 十、下一步规划

**本月（AI可做）**：
- B4 JSON分拆（209KB→5文件，按需加载）
- C2 GEO首次实测（20题×3引擎，已有SOP）
- 移动端 vs 桌面端漏斗分层（待G2数据）

**待Owner确认**：
- TBD-5：保险/职场内容由谁创作？
- TBD-6：browser-harness何时启动？
- TBD-7：LCP主题CSS改造权限？
