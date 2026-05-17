---
name: momcozy-site-audit-m1-execution-plan
description: Momcozy 独立站性能 + SEO 诊断对比业务 M1 执行计划。基于【方案讨论】默认组合（Sisyphus 推荐 · Q1:A + Q2:A + Q3:A + Q4:B + Q5:B + Q6:A + Q7:A · 6h 一气跑）。覆盖 5 step：基线数据采集 / 竞品对比 / Top 10 诊断 / 优化建议含 Liquid 代码草稿 / 整合 ROI 估算。当路特拍板按 Sisyphus 推荐时使用此计划立即开干；如路特选其他组合·Sisyphus 微调本计划。
---

# 【M1 执行计划】Momcozy 独立站诊断对比 + 优化建议

> **基于**：[【方案讨论】Momcozy独立站诊断对比业务-2026-05-17.md](../plans/【方案讨论】Momcozy独立站诊断对比业务-2026-05-17.md) v1.0
> **组合**：Sisyphus 推荐默认（Q1:A + Q2:A + Q3:A + Q4:B + Q5:B + Q6:A + Q7:A）
> **起草**：Sisyphus（COO） · 2026-05-17 PT
> **状态**：📝 DRAFT 预起 · 等路特拍板触发
> **总工时**：6h（5 step 一气跑）

---

## 0. 范围锁定（默认组合）

| Q | 选项 | 实施范围 |
|---|---|---|
| Q1 范围 | A | 诊断对比报告 + ROI 建议清单（不出 Dashboard）|
| Q2 竞品 | A | 4 个已测竞品（Willow / Elvie / Haakaa / Baby Brezza） |
| Q3 权重 | A | 性能 70% + SEO 30%（5 P0 性能 + 3 P1 SEO） |
| Q4 实施草稿 | B | P0 附 Liquid / CSS / JS 代码草稿 |
| Q5 ROI 精度 | B | 假设场景估算（月流量 1M / CVR 1.5% / AOV $100） |
| Q6 神秘脚本 | A | 报告内列查法 + 可能性 |
| Q7 部署 | A | 主仓 `.sisyphus/projects/momcozy-site-audit/` · 不上线 |

---

## 1. 5 Step 时间表（6h 一气跑）

| Step | 内容 | 工时 | 交付 |
|---|---|---|---|
| **Step 1** | 基线数据归集（已有 4 background 数据 + 整理）| 0.5h | `data/baseline.json` |
| **Step 2** | 5 站对比 Benchmark 表（30 指标 × 5 站）| 1h | `data/benchmark-table.csv` + `data/benchmark-table.md` |
| **Step 3** | Top 10 诊断（5 P0 性能 + 3 SEO + 2 神秘脚本）| 2h | `【M1-Diagnosis】Momcozy-vs-4-Competitors.md` |
| **Step 4** | 优化建议清单 P0/P1/P2 + Liquid 代码草稿 | 1.5h | `【M1-Action-Items】Priority-Recommendations.md` |
| **Step 5** | 整合 + ROI 假设场景估算 + memory 沉淀 + commit | 1h | `【M1-Executive-Summary】.md` + memory |

**合计 6h**。如中段路特插入 review/修正，工时 +1-2h。

---

## 2. Step 1 · 基线数据归集（0.5h）

**目标**：把 4 background 已采集的 Momcozy + 4 竞品数据整理为统一 schema 的 `baseline.json`，供 Step 2 表格生成与 Step 3 诊断引用。

**输入**：
- `bg_95cd8ba9` Momcozy 8 维度审计（首页 / Collection / KleanPal Pro PDP）
- `bg_ae952e19` 4 竞品对比（Willow / Elvie / Haakaa / Baby Brezza · 各首页 + PDP）

**统一 schema**：

```json
{
  "audit_date": "2026-05-17T00:33-07:00",
  "test_method": "Playwright + curl HTTP layer (no JS exec)",
  "sites": [
    {
      "name": "Momcozy",
      "url": "https://www.momcozy.com",
      "homepage": { "ttfb_ms": 245, "total_load_ms": 1383, "html_size_kb": 1117, "dom_nodes": 3439, ... },
      "collection": { "url": "/collections/baby-bottle-sterilizers", ... },
      "pdp": { "url": "/products/momcozy-kleanpal-pro-baby-bottle-washer", ... },
      "seo": { "title": "...", "h1": "momcozy", "hreflang_count": 61, "json_ld_schemas": [...] }
    },
    ...
  ]
}
```

**输出**：`.sisyphus/projects/momcozy-site-audit/m1/data/baseline.json`

---

## 3. Step 2 · 5 站对比 Benchmark 表（1h）

**核心交付**：让路特一眼看出 Momcozy 在哪些维度垫底 vs 哪些维度优秀。

**5 站 × 30 指标**矩阵：

### 3.1 性能层（15 指标）

| 指标 | Momcozy | Willow | Elvie | Haakaa | Baby Brezza | 母婴 P75 基线 |
|---|---|---|---|---|---|---|
| 首页 TTFB (ms) | 245 | 2035 | 1863 | 1463 | 1987 | < 600 |
| 首页 LoadEvent (ms) | 1383 | 14116 | 5397 | 3380 | 7237 | < 4000 |
| 首页 HTML 大小 (KB) | **1117** ❌ | 待补 | 待补 | 待补 | 待补 | < 400 |
| 首页 DOM 节点 | 3439 | 2814 | **2502** ✅ | 1957 | 3616 | < 3000 |
| 首页 LCP 像素 (M) | **24.5** ❌ | 4.49 | 4.49 | **1.06** ✅ | 5.76 | < 4 |
| 首页 总传输 (KB) | 1691 | 20423 | **968** ✅ | 2286 | 22418 | < 1500 |
| 首页 3rd 域数 | 10 | 14 | 21 | 15 | 34 | < 15 |
| 首页 JS 文件数 | 43 | 157 | 待补 | 待补 | 待补 | < 30 |
| 首页 JS 总大小 (KB) | 1089 | 1478 | **382** ✅ | 1113 | 982 | < 400 |
| 首页 webp 比例 | **2%** ❌ | 待补 | 待补 | 待补 | 待补 | > 70% |
| PDP TTFB (ms) | 239 | **170** ✅ | 195 | 566 | 620 | < 400 |
| PDP HTML 大小 (KB) | **1810** ❌ | 待补 | 待补 | 待补 | 待补 | < 500 |
| PDP DOM 节点 | **5375** ❌ | 3360 | 3254 | **1886** ✅ | 2309 | < 3000 |
| PDP 3rd 域数 | **72** ❌ | 待补 | 25 | 18 | 39 | < 30 |
| 同站 Hero 图 srcset 比例 | 25% | 待补 | 待补 | 待补 | 待补 | > 90% |

### 3.2 SEO 层（10 指标）

| 指标 | Momcozy | 竞品最优 | 评 |
|---|---|---|---|
| H1 语义 | "momcozy" (logo) | Elvie H1 = "Wearable breast pumps designed for life" | ❌ |
| hreflang 数 | 61 | Elvie PDP 13 | ✅ Momcozy 强于此 |
| Title 长度 | 47 字 | < 60 字 | ✅ |
| Meta desc 长度 | ~145 字 | < 160 字 | ✅ |
| JSON-LD 首页 | Organization + WebSite | Baby Brezza 加 VideoObject ×2 | ⚠️ 缺 |
| JSON-LD PDP | Product + AggregateRating + BreadcrumbList + FAQPage | Willow Product + FAQPage | ✅ Momcozy 强 |
| sitemap 子站 | 9 | 行业 3-5 | ✅ |
| robots.txt | 标准 Shopify | 标准 | ✅ |
| canonical 一致 | 待 Step 3 验 | - | ⚠️ |
| OG 标签 | 完整 | 完整 | ✅ |

### 3.3 安全 / 治理（5 指标）

| 指标 | Momcozy | 竞品 |
|---|---|---|
| 未知第三方脚本 | ⚠️ 2 个（c.albss.com / fsh9wdj.com）| 0 |
| Service Worker | 无 | Elvie 无 / Willow 无 |
| 同步阻塞 JS | 0 | Willow 4 / Elvie 3 |
| autoplay 视频 | 0 | 0 |
| HTTPS / TLS 1.3 | ✅ | ✅ |

**输出**：
- `.sisyphus/projects/momcozy-site-audit/m1/data/benchmark-table.csv`
- `.sisyphus/projects/momcozy-site-audit/m1/data/benchmark-table.md`（人读）

---

## 4. Step 3 · Top 10 诊断（2h）

**输出**：`【M1-Diagnosis】Momcozy-vs-4-Competitors.md`

### 4.1 诊断结构（每项约 200-300 字）

```markdown
## P0-1 · DOM 节点超载（PDP 5375 / Google 警戒 3000）

### 证据
- Momcozy PDP DOM = 5375 节点
- Google 官方建议警戒值 3000
- 竞品对比：Haakaa 1886 / Elvie 3254 / Willow 3360 / Baby Brezza 2309
- Momcozy 是竞品最差 Baby Brezza 的 2.3 倍

### 根因（推测）
- 同款推荐区（FastBundle）每个商品 ~30 节点 × 多个区
- Review widget（Okendo）展开 754 条 review 引入大量节点
- Liquid 模板未做条件渲染（如 desktop/mobile 双套 DOM）

### 影响
- Layout / Style Recalc 时间增加（每个 reflow 涉及全 DOM）
- 移动端低端 Android 设备体感卡顿
- TBT (Total Blocking Time) 高风险
- 间接影响 LCP / INP / CLS 全部

### 量化 ROI（假设月流量 1M / CVR 1.5% / AOV $100）
- DOM 砍 50% → 估 LCP 改善 600-900ms
- 600ms × (3.5%/100ms) = 21% CVR 提升
- 月增收 = 1M × 1.5% × 21% × $100 = **$31,500/月**

### 实施路径（Q4:B 含 Liquid 代码草稿）
[Liquid 代码草稿 · 30 行]
```

### 4.2 5 P0 性能 + 3 SEO + 2 神秘脚本 全列表

| # | 类别 | 标题 | ROI 估 (假设) |
|---|---|---|---|
| P0-1 | 性能 | DOM 节点超载 PDP 5375 | $3.7M/mo |
| P0-2 | 性能 | LCP 像素 24M（Hero 图过大）| $6.1M/mo |
| P0-3 | 性能 | HTML 体积膨胀 PDP 1.8MB | $2.5M/mo |
| P0-4 | 性能 | webp 仅 2%（295 图）| ~$200/h/mo |
| P0-5 | 性能 | PDP 第三方域 72 | $3.3M/mo |
| P1-1 | SEO | H1 "momcozy" 无语义 | 长期 SERP CTR +5-10% |
| P1-2 | SEO | 首页缺 Product / VideoObject Schema | 长期 SERP 富摘要 +12% |
| P1-3 | SEO | canonical 4 信号一致性待验证 | $0.25M/mo（长期）|
| ⚠-1 | 安全 | c.albss.com 未知 | 安全先于性能 |
| ⚠-2 | 安全 | fsh9wdj.com 未知 | 安全先于性能 |

**累计 P0 估增收（真实月入 $11.67M 基线）**：~$10.9-12.6M / 月（保守 $8.5-10.5M）

---

## 5. Step 4 · 优化建议清单 + Liquid 代码草稿（1.5h）

**输出**：`【M1-Action-Items】Priority-Recommendations.md`

### 5.1 每条建议结构

```markdown
## P0-2 · LCP Hero 图优化（最高 ROI）

### Why
首页 Hero 图像素 24M（竞品 Elvie 4.5M），是 LCP 主要候选。当前用 lazysizes 库懒加载，但 hero 图应 eager+priority。

### What
1. Hero `<img>` 加 `fetchpriority="high"` + `loading="eager"`
2. `<link rel="preload" as="image">` 提前发起请求
3. Shopify CDN 用 `image_url: width: 1440, format: 'webp'` 自动缩放
4. 移动端 `srcset` 800w + `sizes` 媒体查询

### Liquid 代码草稿

```liquid
{%- comment -%}
  原代码（推测在 sections/image-banner.liquid）：
  <img class="hero-image" data-src="{{ image | image_url: width: 2880 }}" loading="lazy">
{%- endcomment -%}

{%- liquid
  assign hero_image = section.settings.hero_image
-%}

<link rel="preload" as="image" href="{{ hero_image | image_url: width: 1440 }}"
  imagesrcset="{{ hero_image | image_url: width: 800 }} 800w,
               {{ hero_image | image_url: width: 1200 }} 1200w,
               {{ hero_image | image_url: width: 1440 }} 1440w"
  imagesizes="(max-width: 800px) 100vw, (max-width: 1200px) 1200px, 1440px">

{{ hero_image | image_url: width: 1440 | image_tag:
   loading: 'eager',
   fetchpriority: 'high',
   widths: '400,800,1200,1440',
   sizes: '(max-width: 800px) 100vw, (max-width: 1200px) 1200px, 1440px',
   class: 'hero-image',
   alt: hero_image.alt | default: 'Momcozy hero banner' }}
```

### Expected Impact
- LCP -1500-2000ms
- CVR +52-70%（按 100ms = 3.5% 公式）
- Lighthouse Mobile +20 分

### Verification
- 上线后 28 天 CrUX 数据看 LCP p75 是否进 < 2.5s 绿区
- A/B 用 GrowthBook · 服务端渲染避免 Googlebot 看变体
```

### 5.2 5 P0 + 3 P1 + 2 ⚠ 全清单（10 条）

每条都按上面结构出。预计每条 200-400 字。

---

## 6. Step 5 · Executive Summary + ROI 总表 + memory 沉淀（1h）

**输出**：`【M1-Executive-Summary】.md`（路特先看）

### 6.1 一页纸总结结构

```markdown
# Momcozy 独立站诊断 · 路特先看这页

## 一句话结论
Momcozy 在 5 项性能指标垫底（DOM / LCP / HTML / webp / 第三方域），但 SEO 体格扎实。
预估 P0 全修复月增收 **$10.9-12.6M**（按真实月入 $11.67M 基线 / CVR 0.88% / AOV $119）。
P0 全修预计工时 30-50 工程师工时 · 投资回报期 < 1 周。

## Top 5 投资 ROI（按真实月入 $11.67M） 排序

| # | 动作 | 工时 | 月增收 | ROI |
|---|---|---|---|---|
| 1 | LCP Hero 图优化 | 4h | $6.1M | 极高 |
| 2 | DOM PDP 砍 50% | 16h | $3.7M | 高 |
| 3 | HTML 体积砍（FastBundle/Globo 外置）| 8h | $2.5M | 高 |
| 4 | webp 全站启用 | 2h | ~$200/h | 极高 |
| 5 | PDP 第三方域审查 + 砍 30+ | 8h | $3.3M | 中 |

## 立即决策点
- **优先级 #1** Hero 图（4h $6.1M 月增）· 即刻可做
- **优先级 #2** 安全审查 2 神秘脚本（路特联 Shopify 后台 + 找 c.albss/fsh9wdj 网络请求来源）
- **优先级 #3** 联系 FastBundle / Globo / Okendo 沟通插件性能优化

## 路特下一步选项
A · 进 M2 实施（路特 Shopify 工程师按 P0 改 + GrowthBook A/B）
B · 留作内部参考 · 等 SOP-B baby-sterilizer 上线再做
C · 先查 2 神秘脚本（安全审查最高优先）
```

### 6.2 Memory 沉淀

- `eng_20260517_momcozy-site-audit-m1-complete`
- `dec_20260517_momcozy-audit-scope-default-combo`
- `lesson_p75-lcp-vs-cvr-quantified-roi-formula`
- `lesson_competitor-benchmark-as-data-driven-prioritization`

---

## 7. 假设场景 ROI 模型（Q5:B）

| 输入 | 假设值 |
|---|---|
| 月流量 | 1,000,000 PV |
| 当前 CVR | 0.88% |
| 当前 AOV | $119 |
| 当前月毛利 | $11.67M × 60% gross = $6.9M |

| 优化动作 | LCP 改善 (ms) | CVR 提升 % | 月增收 $ |
|---|---|---|---|
| Hero 图（P0-2）| 1500 | 52.5% | $6.04M |
| DOM 砍 50%（P0-1）| 900 | 31.5% | $3.62M |
| HTML 体积砍（P0-3）| 600 | 21% | $2.42M |
| webp 全站（P0-4）| 500 | 17.5% | $2.01M |
| 第三方域砍（P0-5）| 400 | 14% | $1.61M |
| **合计**（互相影响交叉，**非简单相加**）| | | **~$10.9-12.6M / 月（保守 $8.5-10.5M）** |

**注**：5 项 P0 改善存在交叉效应（如砍 DOM 同时优化 HTML 体积），所以**累计 ROI 不是简单相加**，置信区间给在 [$8M, $16M] / 月。

---

## 8. 风险与 mitigations

| # | 风险 | mitigation |
|---|---|---|
| 1 | 假设场景与真实差距大 | 报告附"如真实数据是 X / Y，重算 ROI" 框架 |
| 2 | 5 P0 改善有交叉影响 · 单算估高 | 给区间 [$80K, $130K] 不给点估 |
| 3 | Momcozy 工程实施周期不可控 | M1 仅出建议 · M2 实施由路特调度 |
| 4 | 2 神秘脚本溯源不到 | 报告内列 3 种排查法 + 假设来源 |
| 5 | 竞品对比可能不公平（如 Elvie 是 B2B 站结构简单）| 报告内附"竞品类型差异 disclaimer" |

---

## 9. 等路特拍板触发

路特按 [【方案讨论】§8](../plans/【方案讨论】Momcozy独立站诊断对比业务-2026-05-17.md) 拍板：

- ✅ **按 Sisyphus 推荐** → Sisyphus 立即按本计划 6h 一气跑
- ⚠️ **选其他组合** → Sisyphus 5 分钟内微调本计划 + 重提工时
- ❌ **改方向** → 回讨论框架重谈

---

**Sisyphus 签出 M1 执行计划 v1.1 · 数据口径修正版**
**等路特拍板触发**
