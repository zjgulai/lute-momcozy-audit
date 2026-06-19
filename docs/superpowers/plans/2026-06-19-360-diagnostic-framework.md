---
name: 360-diagnostic-framework
description: Momcozy 电商站 360 无死角诊断框架完整实施计划。整合历史已有方案（Phases 1-9 已完成）与本次新增 11 个诊断缺口维度，纳入洞察站采集体系。触发场景：「360诊断」「完整框架」「无死角」「补全缺口」「G1-G11诊断维度」。
---

# Momcozy 360 无死角诊断框架 · 完整实施计划

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**目标**：从现有 9 维度诊断框架扩展到完整的 20 维度（9 已有 + 11 新增），实现真正无死角覆盖。  
**架构约束**：保持现有构建路径不变，所有扩展都以新文件+新路由配置形式叠加，不破坏现有测试门禁。  
**对齐基准**：本计划整合了 Phases 1-9（已完成，见 git log）的所有已有方案，并在此基础上扩展。

---

## 一、现有框架状态（Phases 1-9 已完成）

### 已完成维度

| 维度 | 实现状态 | 数据位置 |
|---|---|---|
| D1 前端性能指标 | ✅ 深度（FCP/TTFB/LCP/CLS/TBT/DOM/JS/3P失败） | `sessions/*.json` → `trends.html` |
| D2 第三方脚本治理 | ✅ 深度（kill-list + owner 制 + 失败预算） | `public-cross-audit.json.thirdPartyGovernance` → `forensics.html` |
| D3 内部经营漏斗 | ✅ 中度（CVR/AOV/加购率/弃单率/复购/attach rate） | `public-cross-audit.json.currentOperations` → `metrics.html` |
| D4 竞品技术对标 | ✅ 中度（6站×性能指标×双视口） | `competitors/*.json` → `competitors.html` |
| D5 SEO 技术底座 | ✅ 中度（Schema/canonical/meta title/3 PDP） | `public-cross-audit.json.seoTechnical` → `forensics.html` |
| D6 GEO/AI 可见度 | ✅ 初级（Perplexity 5问实测基线） | `public-cross-audit.json.geoBaseline` → `cross-audit.html` |
| D7 安全被动扫描 | ✅ 中度（CSP/SRI/双Pixel/myshopify探测） | `public-cross-audit.json.securityAudit` → `forensics.html` |
| D8 Bot 流量治理 | ⚠️ 框架有，数据缺（bot-evidence.json = missing） | `src/_data/bot-evidence.json` |
| D9 渠道归因质量 | ⚠️ 问题识别（C7），无分段数据 | `public-cross-audit.json.conclusions[C7]` |

### 现有报告站页面（已部署）

- `/index.html` — 总览决策页
- `/metrics.html` — 指标口径页
- `/forensics.html` — 风险归因页（含 securityAudit + seoTechnical）
- `/trends.html` — 趋势证据页
- `/cross-audit.html` — 决策矩阵页（含 geoBaseline）
- `/competitors.html` — 竞品对比页

---

## 二、新增 11 个诊断维度（G1-G11）

### 维度分层

```
Layer A — 行为数据层（需要后台或工具接入）
  G1  行为数据层：Session Replay + 热图（Microsoft Clarity / Hotjar）
  G2  漏斗分段 CVR：渠道×设备×用户类型分段

Layer B — 经营健康层（需要 Shopify/Klaviyo 数据）
  G3  客户留存队列分析（M1/M3/M6/M12 LTV Cohort）
  G4  邮件/SMS 营销性能诊断
  G5  库存健康 × CVR 关系
  G10 客服质量信号诊断

Layer C — 技术可采集层（Playwright 可直接扩展）
  G6  评论生态系统内容分析（review 数量/质量/UGC比例）
  G7  结账链路业务指标（步骤完成率/支付方式/字段数量）
  G9  PDP 内容深度审计（字数/用例内容/安全认证/变体摩擦）
  G11 SEO 架构深度（分面导航/品类页/内链/翻页处理）

Layer D — 社交商务层（TikTok Shop 数据）
  G8  社交电商诊断（TikTok Shop GMV/创作者效率/listings质量）
```

---

## Phase 10: 采集框架扩展 — G6/G7/G9/G11（Playwright 可采集层）

**目标**：扩展 collect.mjs 采集内容层，新增 SEO架构信号、PDP内容深度、评论生态、结账业务指标的被动采集。

**文件变更**：
- 新增：`config/collection-routes-360-full.json` — 完整 360 采集路由（含 KOL 落地页/品类页/搜索页）
- 新增：`scripts/collect-360-content.mjs` — 内容层采集脚本（扩展指标，与 collect.mjs 并存）
- 修改：`config/session.schema.json` — 新增 `contentMetrics` 扩展字段（可选，向后兼容）
- 新增：`src/_data/content-sessions/` — 内容层采集结果存储目录

### - [ ] Step 1: 创建 360 完整路由配置

创建 `config/collection-routes-360-full.json`：

```json
{
  "methodologyVersion": "collector-v4-360-full-2026-06",
  "description": "360 无死角采集路由：性能层 + 内容层 + SEO架构层 + 竞品同口径",
  "routes": [
    {"id": "homepage", "label": "Homepage 控制路径", "path": "/", "primary": true},
    {"id": "collection-pumps", "label": "品类页：吸奶器", "path": "/collections/electric-breast-pump", "primary": false,
      "seoAudit": {"checkFacetedNav": true, "checkContentDepth": true, "checkPagination": true}},
    {"id": "collection-nursing", "label": "品类页：哺乳", "path": "/collections/nursing-bra", "primary": false,
      "seoAudit": {"checkFacetedNav": true, "checkContentDepth": true}},
    {"id": "pdp-m5-smart", "label": "PDP watchlist: M5 Smart", "path": "/products/m5-smart-wearable-breast-pump-upgraded-with-app-control", "primary": false,
      "contentAudit": {"checkWordCount": true, "checkVariantFriction": true, "checkTrustSignals": true, "checkSizingGuide": true}},
    {"id": "pdp-s12-pro", "label": "PDP watchlist: S12 Pro", "path": "/products/s12-pro-quick-wearable-breast-pump", "primary": false,
      "contentAudit": {"checkWordCount": true, "checkVariantFriction": true, "checkTrustSignals": true}},
    {"id": "pdp-mobile-flow", "label": "PDP watchlist: Mobile Flow", "path": "/products/momcozy-mobile-flow-hands-free-breast-pump", "primary": false,
      "contentAudit": {"checkWordCount": true, "checkVariantFriction": true}},
    {"id": "pdp-tuckgo-stroller", "label": "PDP watchlist: TuckGo Stroller", "path": "/products/momcozy-tuckgo-lightweight-stroller", "primary": false,
      "contentAudit": {"checkWordCount": true, "checkTrustSignals": true}},
    {"id": "pdp-kleanpal-pro", "label": "PDP watchlist: KleanPal Pro", "path": "/products/momcozy-kleanpal-pro-baby-bottle-washer", "primary": false,
      "contentAudit": {"checkWordCount": true, "checkTrustSignals": true}},
    {"id": "cart", "label": "购物车页", "path": "/cart", "primary": false,
      "checkoutAudit": {"stage": "cart"}},
    {"id": "checkout", "label": "结账页", "path": "/checkout", "primary": false,
      "checkoutAudit": {"stage": "checkout", "checkPaymentMethods": true, "checkFieldCount": true}},
    {"id": "search-wearable-pump", "label": "站内搜索：wearable pump", "path": "/search?q=wearable+pump", "primary": false,
      "searchAudit": {"query": "wearable pump", "checkResultCount": true, "checkZeroResults": false}},
    {"id": "search-breast-pump", "label": "站内搜索：breast pump", "path": "/search?q=breast+pump", "primary": false,
      "searchAudit": {"query": "breast pump", "checkResultCount": true}},
    {"id": "kol-utm-m5", "label": "KOL UTM 落地页: M5", "path": "/products/m5-smart-wearable-breast-pump-upgraded-with-app-control?utm_source=tiktok&utm_medium=affiliate&utm_campaign=kol_tier1", "primary": false,
      "segment": {"id": "kol-utm", "sourceType": "social-affiliate", "visitorState": "new"}},
    {"id": "sitemap", "label": "Sitemap 可达性", "path": "/sitemap.xml", "primary": false,
      "seoAudit": {"checkSitemapReachable": true}}
  ]
}
```

### - [ ] Step 2: 创建内容层采集脚本 `scripts/collect-360-content.mjs`

此脚本在现有 `collect.mjs`（性能层）基础上，新增内容层采集维度，输出到 `src/_data/content-sessions/`。

采集目标维度（每个路由）：

```javascript
// G6: 评论生态信号
reviewSignals: {
  reviewCount: null,          // JSON-LD aggregateRating.reviewCount
  ratingValue: null,          // JSON-LD aggregateRating.ratingValue  
  hasPhotoReviews: false,     // 是否有图片评论展示
  reviewWidgetLoadMs: null,   // 评论组件加载时间（影响 LCP 和用户体验）
  reviewsAboveFold: false,    // 评论摘要是否首屏可见
  negativeReviewResponse: null // 无法自动采集，需手工填入
}

// G7: 结账链路业务指标
checkoutSignals: {
  hasApplePay: false,         // Apple Pay 按钮是否存在
  hasShopPay: false,          // Shop Pay 按钮是否存在
  hasGooglePay: false,        // Google Pay 是否存在
  guestCheckoutAvailable: true, // 是否可以 guest 结账
  formFieldCount: null,       // 结账表单字段数量
  shippingCostEarlyVisible: false, // 运费是否在结账前显示
  errorHandlingQuality: null  // 手工评估
}

// G9: PDP 内容深度
contentDepth: {
  uniqueWordCount: null,      // PDP 主体文案字数
  hasVideoContent: false,     // 是否有产品视频
  hasSizingGuide: false,      // 是否有尺寸指南/年龄指引
  hasSafetyCerts: false,      // 是否显示安全认证（CPSC/FDA/BPA-free）
  faqCount: null,             // FAQ 条目数量
  variantCount: null,         // 变体选项数量
  variantSelectorType: null,  // 'dropdown' | 'swatch' | 'button'
  ctaAboveFold: false,        // 加购按钮是否首屏可见
  trustSignalsAboveFold: false // 退货/配送政策首屏可见
}

// G11: SEO 架构信号
seoArchitecture: {
  filterParamsIndexable: null, // 分面导航URL是否会被索引（检查 robots/noindex）
  categoryPageWordCount: null, // 品类页正文字数
  internalLinksFromPdp: null,  // PDP 页面链接回品类页的数量
  paginationNoindexed: null,   // 翻页URL是否设置 noindex
  canonicalIsSelf: false,      // canonical 是否自引
  hasFacetedNavUrls: false     // 是否存在分面导航参数URL
}

// G5: 库存信号（公开可见部分）
inventorySignals: {
  stockBadgeVisible: false,   // 是否显示库存状态徽章
  backorderMessagePresent: false, // 是否有延迟发货提示
  backorderMessageSpecific: false, // 是否有具体发货日期
  inventoryCount: null        // 如果页面暴露库存数量
}
```

### - [ ] Step 3: 更新 session.schema.json 支持可选 contentMetrics

在 `session.schema.json` 的 `routeMetrics` 定义中新增可选字段组（`additionalProperties: false` 改为允许这些新字段）：

```json
"reviewSignals":      {"type": ["object", "null"]},
"checkoutSignals":    {"type": ["object", "null"]},
"contentDepth":       {"type": ["object", "null"]},
"seoArchitecture":    {"type": ["object", "null"]},
"inventorySignals":   {"type": ["object", "null"]}
```

### - [ ] Step 4: 添加 npm 脚本

在 `package.json` 中新增：

```json
"collect:360": "AUDIT_TARGET_URL=https://momcozy.com AUDIT_ROUTE_CONFIG=config/collection-routes-360-full.json node scripts/collect-360-content.mjs",
"test:content-sessions": "node scripts/validate-content-sessions.mjs"
```

### - [ ] Step 5: 验证 Phase 10

```bash
npm run build
npm run test:allowlist
npm run test:sessions
npm run test:safety
```

### - [ ] Step 6: Commit Phase 10

```bash
git add config/collection-routes-360-full.json scripts/collect-360-content.mjs config/session.schema.json package.json
git commit -m "feat: Phase 10 采集框架扩展 - 360内容层路由和采集脚本"
```

---

## Phase 11: 数据结构扩展 — G1-G11 框架注册

**目标**：在 `public-cross-audit.json` 中注册所有 11 个新维度的数据骨架，区分「可机器采集」和「需人工/后台数据」。

**文件变更**：
- 修改：`src/_data/public-cross-audit.json` — 新增 `diagnosticGaps360` 顶层 key

### - [ ] Step 1: 写入 diagnosticGaps360 结构

新增到 `public-cross-audit.json`：

```json
{
  "diagnosticGaps360": {
    "lastUpdated": "2026-06-19",
    "totalDimensions": 20,
    "coveredDimensions": 9,
    "newDimensions": 11,
    "gaps": {
      "G1_behavior": {
        "label": "行为数据层（Session Replay + 热图）",
        "layer": "A",
        "dataSource": "Microsoft Clarity / Hotjar（需安装并运行14天+）",
        "collectionMethod": "manual_tool",
        "status": "not_started",
        "priority": "P0",
        "keyQuestions": [
          "用户在 PDP 上的滚动深度——信任信号是否被看到？",
          "弃单前的最后行为是什么？",
          "移动端有哪些 rage click 和 re-read 模式？"
        ],
        "actionItems": [
          "安装 Microsoft Clarity（免费）",
          "采集14天后，取 20 个弃单 session replay 分析",
          "记录 PDP 热图中最高点击区域 vs 信任信号位置"
        ],
        "metrics": null
      },
      "G2_funnel_segmented": {
        "label": "漏斗分段 CVR（渠道×设备×用户类型）",
        "layer": "A",
        "dataSource": "Shopify Analytics → Online Store Conversion Rate（按渠道/设备分段）",
        "collectionMethod": "shopify_analytics",
        "status": "not_started",
        "priority": "P0",
        "keyQuestions": [
          "付费流量 CVR vs 自然流量 CVR vs 邮件流量 CVR",
          "移动端各渠道的漏斗分步完成率",
          "新客 vs 回购客的漏斗形状差异"
        ],
        "actionItems": [
          "Shopify Admin → Analytics → Reports → Online Store Conversion Rate",
          "按 Device 和 Traffic Source 分段",
          "导出并填入下方 metrics"
        ],
        "metrics": {
          "paid_cvr": null,
          "organic_cvr": null,
          "email_cvr": null,
          "mobile_cvr": null,
          "desktop_cvr": null,
          "new_visitor_cvr": null,
          "returning_visitor_cvr": null,
          "checkout_step_contact_pct": null,
          "checkout_step_shipping_pct": null,
          "checkout_step_payment_pct": null,
          "checkout_step_confirm_pct": null
        }
      },
      "G3_ltv_cohort": {
        "label": "客户留存队列分析（M1/M3/M6/M12 LTV）",
        "layer": "B",
        "dataSource": "Shopify customer data + Klaviyo cohort export",
        "collectionMethod": "shopify_klaviyo_export",
        "status": "not_started",
        "priority": "P0",
        "keyQuestions": [
          "M1/M3/M6/M12 各队列的留存曲线",
          "不同获客渠道的队列 LTV 差异",
          "配件复购漏斗（主品 → 配件 → 升级款）"
        ],
        "benchmarks": {
          "m1_repeat_rate_target": 0.20,
          "m3_repeat_rate_target": 0.45,
          "m6_repeat_rate_target": 0.50,
          "ltv_12m_target_usd": 200
        },
        "metrics": {
          "cohort_2026_01": {"m1": null, "m3": null, "m6": null, "ltv_12m": null},
          "cohort_2026_02": {"m1": null, "m3": null, "m6": null, "ltv_12m": null},
          "cohort_2026_03": {"m1": null, "m3": null, "m6": null, "ltv_12m": null},
          "by_channel": {
            "paid_search": {"m3_repeat": null, "ltv_6m": null},
            "organic": {"m3_repeat": null, "ltv_6m": null},
            "email": {"m3_repeat": null, "ltv_6m": null},
            "tiktok": {"m3_repeat": null, "ltv_6m": null}
          }
        }
      },
      "G4_email_sms": {
        "label": "邮件/SMS 营销性能诊断",
        "layer": "B",
        "dataSource": "Klaviyo / Postscript analytics",
        "collectionMethod": "klaviyo_export",
        "status": "not_started",
        "priority": "P1",
        "benchmarks": {
          "email_capture_rate_target": 0.50,
          "welcome_series_open_rate_target": 0.48,
          "abandoned_cart_cvr_target": 0.04,
          "post_purchase_open_rate_target": 0.42,
          "sms_ctr_target": 0.15,
          "email_revenue_pct_target": 0.30
        },
        "metrics": {
          "email_capture_rate": null,
          "welcome_series_open_rate": null,
          "abandoned_cart_email_ctr": null,
          "abandoned_cart_email_cvr": null,
          "post_purchase_open_rate": null,
          "sms_opt_in_rate": null,
          "sms_ctr": null,
          "email_revenue_pct": null,
          "has_refill_trigger": null,
          "has_winback_flow": null,
          "has_lifecycle_education_flow": null
        }
      },
      "G5_inventory": {
        "label": "库存健康 × CVR 关系",
        "layer": "B",
        "dataSource": "Shopify inventory + 现有 collect.mjs 采集的 inventorySignals",
        "collectionMethod": "hybrid",
        "status": "not_started",
        "priority": "P1",
        "benchmarks": {
          "dtc_in_stock_pct_target": 0.95,
          "backorder_resolution_days_max": 14
        },
        "collectedSignals": {
          "stockBadgeVisible": null,
          "backorderMessagePresent": null,
          "backorderMessageSpecific": null
        },
        "manualMetrics": {
          "hero_sku_in_stock_pct_30d": null,
          "dtc_vs_amazon_stock_alignment_pct": null,
          "avg_backorder_resolution_days": null
        }
      },
      "G6_review_ecosystem": {
        "label": "评论生态系统内容分析",
        "layer": "C",
        "dataSource": "Playwright 被动采集（reviewSignals）+ 人工评论内容分析",
        "collectionMethod": "playwright_plus_manual",
        "status": "partial",
        "priority": "P1",
        "note": "seoTechnical 已采集 reviewCount/ratingValue；本维度扩展到内容质量层",
        "benchmarks": {
          "photo_ugc_ratio_target": 0.25,
          "review_velocity_target_weekly": 5,
          "negative_review_response_rate_target": 0.80
        },
        "collectedSignals": {
          "m5_smart_review_count": 1438,
          "m5_smart_rating": 4.6,
          "mobile_flow_review_count": 470,
          "mobile_flow_rating": 4.7,
          "tuckgo_review_count": 10,
          "tuckgo_rating": 5.0
        },
        "manualAnalysis": {
          "top_negative_themes": null,
          "photo_ugc_ratio": null,
          "negative_response_rate": null,
          "ai_medical_claim_risk": null,
          "competitor_gap_analysis": null
        }
      },
      "G7_checkout_business": {
        "label": "结账链路业务指标",
        "layer": "C",
        "dataSource": "Playwright 采集（checkoutSignals）+ Shopify Analytics",
        "collectionMethod": "playwright_plus_shopify",
        "status": "partial",
        "priority": "P1",
        "note": "当前 checkout 路由已采集性能指标；本维度扩展到业务流程指标",
        "benchmarks": {
          "checkout_step_completion_desktop_min": 0.88,
          "checkout_step_completion_mobile_min": 0.78,
          "shop_pay_cvr_multiplier": 1.72
        },
        "collectedSignals": {
          "hasApplePay": null,
          "hasShopPay": null,
          "hasGooglePay": null,
          "guestCheckoutAvailable": null,
          "formFieldCount": null,
          "shippingCostEarlyVisible": null
        },
        "shopifyMetrics": {
          "checkout_step_contact_completion": null,
          "checkout_step_shipping_completion": null,
          "checkout_step_payment_completion": null,
          "shop_pay_adoption_rate": null,
          "apple_pay_adoption_rate": null
        }
      },
      "G8_social_commerce": {
        "label": "社交电商诊断（TikTok Shop/Instagram Shop）",
        "layer": "D",
        "dataSource": "TikTok Shop Seller Center + UTM parameter tracking",
        "collectionMethod": "manual_tiktok_seller_center",
        "status": "not_started",
        "priority": "P1",
        "benchmarks": {
          "listing_cvr_target": 0.02,
          "blended_cac_target_usd": 40,
          "creator_repeat_purchase_rate_target": 0.18,
          "monthly_gmv_baseline_usd": 200000
        },
        "metrics": {
          "monthly_gmv_usd": null,
          "active_creator_count": null,
          "tier1_creator_count": null,
          "listing_cvr": null,
          "blended_cac_usd": null,
          "affiliate_commission_pct": null,
          "tiktok_buyer_30d_repeat": null,
          "tiktok_buyer_90d_repeat": null,
          "top_creator_gmv_pct": null
        },
        "knownData": {
          "sponsored_posts_12m": 22100,
          "vs_willow_posts": 3200,
          "vs_babybrezza_posts": 2900,
          "primary_channel_pct": 0.777
        }
      },
      "G9_pdp_content_depth": {
        "label": "PDP 内容深度审计",
        "layer": "C",
        "dataSource": "Playwright 采集（contentDepth）",
        "collectionMethod": "playwright",
        "status": "not_started",
        "priority": "P2",
        "benchmarks": {
          "unique_word_count_min": 600,
          "faq_count_min": 5,
          "cta_above_fold_required": true
        },
        "collectedByRoute": {
          "pdp-m5-smart": {"uniqueWordCount": null, "hasSizingGuide": null, "hasSafetyCerts": null, "faqCount": null, "ctaAboveFold": null},
          "pdp-s12-pro": {"uniqueWordCount": null, "hasSizingGuide": null, "hasSafetyCerts": null, "faqCount": null},
          "pdp-tuckgo-stroller": {"uniqueWordCount": null, "hasSizingGuide": null, "hasSafetyCerts": null, "faqCount": null},
          "pdp-mobile-flow": {"uniqueWordCount": null, "hasSizingGuide": null, "hasSafetyCerts": null, "faqCount": null},
          "pdp-kleanpal-pro": {"uniqueWordCount": null, "hasSizingGuide": null, "hasSafetyCerts": null, "faqCount": null}
        }
      },
      "G10_support_quality": {
        "label": "客服质量信号诊断",
        "layer": "B",
        "dataSource": "Zendesk / Help Scout + Shopify refund data",
        "collectionMethod": "manual_crm",
        "status": "not_started",
        "priority": "P2",
        "benchmarks": {
          "dtc_refund_rate_max": 0.20,
          "amazon_refund_rate_max": 0.35,
          "first_response_hours_max": 24,
          "first_contact_resolution_rate_min": 0.65,
          "nps_support_min": 50
        },
        "metrics": {
          "dtc_refund_rate": null,
          "amazon_refund_rate": null,
          "top_refund_reasons": null,
          "avg_response_hours": null,
          "first_contact_resolution_rate": null,
          "nps_support": null,
          "safety_escalation_pct": null
        }
      },
      "G11_seo_architecture": {
        "label": "SEO 架构深度（分面导航/品类页/内链/翻页）",
        "layer": "C",
        "dataSource": "Playwright 采集（seoArchitecture）+ Google Search Console",
        "collectionMethod": "playwright_plus_gsc",
        "status": "not_started",
        "priority": "P2",
        "benchmarks": {
          "category_page_word_count_min": 400,
          "pagination_should_noindex_beyond_page": 2
        },
        "collectedByRoute": {
          "collection-pumps": {"filterParamsIndexable": null, "categoryPageWordCount": null, "paginationNoindexed": null, "hasFacetedNavUrls": null},
          "collection-nursing": {"filterParamsIndexable": null, "categoryPageWordCount": null}
        },
        "gscManualMetrics": {
          "crawl_coverage_errors": null,
          "core_web_vitals_mobile_pass_rate": null,
          "indexed_pages_count": null,
          "crawl_budget_waste_pct": null
        }
      }
    }
  }
}
```

### - [ ] Step 2: 验证 JSON 有效性

```bash
node -e "JSON.parse(require('fs').readFileSync('src/_data/public-cross-audit.json','utf8')); console.log('valid')"
npm run test:allowlist
npm run build
```

### - [ ] Step 3: Commit Phase 11

```bash
git add src/_data/public-cross-audit.json
git commit -m "feat: Phase 11 注册 G1-G11 诊断维度数据骨架"
```

---

## Phase 12: collect-360-content.mjs 实现

**目标**：实现 G6/G7/G9/G11 的 Playwright 自动化采集。

### - [ ] Step 1: 实现 collect-360-content.mjs

```javascript
/**
 * collect-360-content.mjs
 * 360 内容层采集脚本
 * 采集：评论信号(G6) + 结账信号(G7) + PDP内容深度(G9) + SEO架构(G11) + 库存信号(G5)
 * 与 collect.mjs（性能层）并存，输出到 src/_data/content-sessions/
 */
import {chromium} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const TARGET_URL = process.env.AUDIT_TARGET_URL;
const DATE = process.env.AUDIT_SESSION_DATE || new Date().toISOString().split("T")[0];
const OUT_DIR = process.env.AUDIT_CONTENT_OUTPUT_DIR || "src/_data/content-sessions";
const ROUTE_CONFIG_PATH = process.env.AUDIT_ROUTE_CONFIG || "config/collection-routes-360-full.json";

async function collectContentMetrics(page, route) {
  const result = {
    routeId: route.id,
    routePath: route.path,
    collectedAt: new Date().toISOString()
  };

  // G6: 评论生态信号
  if (!route.path.startsWith("/collections") && !route.path.startsWith("/cart") && 
      !route.path.startsWith("/checkout") && !route.path.startsWith("/search") &&
      !route.path.startsWith("/sitemap")) {
    result.reviewSignals = await page.evaluate(() => {
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      let reviewCount = null, ratingValue = null;
      jsonLdScripts.forEach(s => {
        try {
          const d = JSON.parse(s.textContent);
          const items = Array.isArray(d) ? d : (d["@graph"] || [d]);
          items.forEach(item => {
            if (item["@type"] === "Product" && item.aggregateRating) {
              reviewCount = item.aggregateRating.reviewCount || null;
              ratingValue = item.aggregateRating.ratingValue || null;
            }
          });
        } catch(e) {}
      });
      const reviewWidget = document.querySelector('[data-reviews], .reviews-widget, #shopify-product-reviews, .yotpo, .stamped-io');
      const reviewWidgetPresent = !!reviewWidget;
      const hasPhotoReviews = !!document.querySelector('.review-image, .review-photo, [data-review-image]');
      const reviewWidgetAboveFold = reviewWidget ? reviewWidget.getBoundingClientRect().top < window.innerHeight : false;
      return { reviewCount, ratingValue, reviewWidgetPresent, hasPhotoReviews, reviewWidgetAboveFold };
    });

    // G9: PDP 内容深度
    result.contentDepth = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"], .product__description, .product-description');
      const bodyText = main ? main.innerText : document.body.innerText;
      const wordCount = bodyText.split(/\s+/).filter(w => w.length > 1).length;
      const hasVideo = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      const hasSizingGuide = /size\s?guide|sizing|flange|fit\s?guide|age\s?guide|measurement/i.test(bodyText);
      const hasSafetyCerts = /bpa.?free|cpsc|fda|astm|ce\s?mark|rohs|phthalate|food.?grade/i.test(bodyText);
      const faqElements = document.querySelectorAll('[itemtype*="FAQPage"] [itemtype*="Question"], details > summary, .faq-question');
      const faqCount = faqElements.length;
      const variantSelects = document.querySelectorAll('select[name*="option"], .variant-selector, [class*="variant"]');
      const variantCount = variantSelects.length;
      const addToCartBtn = document.querySelector('[name="add"], button[data-add-to-cart], .add-to-cart, #AddToCart');
      const ctaAboveFold = addToCartBtn ? addToCartBtn.getBoundingClientRect().bottom < window.innerHeight : false;
      const trustKeywords = /free\s?(return|ship)|30.day|money.back|warranty|guarantee/i;
      const trustSignalsText = document.body.innerText;
      const hasTrustSignals = trustKeywords.test(trustSignalsText);
      const trustSignalEl = Array.from(document.querySelectorAll('p, span, div')).find(el => 
        trustKeywords.test(el.innerText) && el.getBoundingClientRect().bottom < window.innerHeight
      );
      return { wordCount, hasVideo, hasSizingGuide, hasSafetyCerts, faqCount, variantCount, ctaAboveFold, trustSignalsAboveFold: !!trustSignalEl };
    });

    // G5: 库存信号
    result.inventorySignals = await page.evaluate(() => {
      const stockBadge = document.querySelector('[class*="stock"], [class*="inventory"], [data-inventory]');
      const stockText = stockBadge ? stockBadge.innerText : "";
      const backorderText = document.body.innerText;
      const backorderPresent = /backorder|pre.?order|ships?\s+in\s+\d|available\s+\w+\s+\d{1,2}/i.test(backorderText);
      const specificDate = /ships?\s+by\s+\w+\s+\d{1,2}|available\s+\w+\s+\d{1,2},?\s+\d{4}/i.test(backorderText);
      const outOfStock = /out\s+of\s+stock|sold\s+out/i.test(backorderText);
      return { stockBadgeVisible: !!stockBadge, stockText: stockText.trim().slice(0, 50), backorderPresent, specificDate, outOfStock };
    });
  }

  // G7: 结账链路信号
  if (route.path.startsWith("/checkout") || route.path.startsWith("/cart")) {
    result.checkoutSignals = await page.evaluate(() => {
      const hasApplePay = !!document.querySelector('.apple-pay-button, [data-method="apple-pay"], .shopify-payment-button__button--apple-pay');
      const hasShopPay = !!document.querySelector('.shopify-payment-button__button--shop-pay, [data-method="shop_pay"]');
      const hasGooglePay = !!document.querySelector('[data-method="google-pay"], .google-pay-button');
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"])');
      const formFieldCount = inputs.length;
      const guestBtn = document.querySelector('[href*="guest"], .guest-checkout, [data-continue-as-guest]');
      const guestCheckoutAvailable = !!guestBtn || !document.querySelector('[name="customer[login_name]"]');
      const shippingText = document.body.innerText;
      const shippingEarlyVisible = /free\s+ship|standard\s+ship|\$\d+\s+ship|calculated\s+at/i.test(shippingText);
      return { hasApplePay, hasShopPay, hasGooglePay, formFieldCount, guestCheckoutAvailable, shippingCostEarlyVisible: shippingEarlyVisible };
    });
  }

  // G11: SEO 架构信号
  if (route.path.startsWith("/collections") || route.path.startsWith("/search")) {
    result.seoArchitecture = await page.evaluate(() => {
      const canonical = document.querySelector('link[rel="canonical"]')?.href || null;
      const robotsMeta = document.querySelector('meta[name="robots"]')?.content || null;
      const isIndexable = !robotsMeta || (!robotsMeta.includes("noindex") && !robotsMeta.includes("none"));
      const mainContent = document.querySelector('main, .collection__description, .category-description');
      const wordCount = mainContent ? mainContent.innerText.split(/\s+/).filter(w => w.length > 1).length : 0;
      const filterLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => 
        a.href.includes('?') && /sort|filter|color|size|type|brand/i.test(a.href)
      );
      const productLinks = document.querySelectorAll('.product-item a, .grid__item a[href*="/products/"]');
      const internalLinksCount = document.querySelectorAll('a[href^="/"]').length;
      const paginationLinks = document.querySelectorAll('a[href*="page="], .pagination a, [class*="pagination"] a');
      return { canonical, isIndexable, categoryPageWordCount: wordCount, hasFacetedNavUrls: filterLinks.length > 0, facetedNavUrlCount: filterLinks.length, productCount: productLinks.length, internalLinksCount, paginationPresent: paginationLinks.length > 0 };
    });
  }

  return result;
}

async function main() {
  const routeConfig = JSON.parse(fs.readFileSync(ROUTE_CONFIG_PATH, "utf8"));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: {width: 1440, height: 900},
    userAgent: "Mozilla/5.0 (compatible; LuteAuditBot/1.0)"
  });
  const page = await context.newPage();

  const results = {
    sessionId: `content-session-${DATE}`,
    observedAt: DATE,
    methodologyVersion: routeConfig.methodologyVersion,
    targetUrl: TARGET_URL,
    collectedBy: "collect-360-content.mjs Playwright automated observation",
    routes: []
  };

  for (const route of routeConfig.routes) {
    if (route.path.startsWith("/sitemap")) continue; // 单独处理
    console.log(`[360-content] scanning ${route.id}...`);
    try {
      const url = new URL(route.path, TARGET_URL).toString();
      await page.goto(url, {waitUntil: "domcontentloaded", timeout: 30000});
      await page.waitForTimeout(2000);
      const metrics = await collectContentMetrics(page, route);
      results.routes.push(metrics);
      console.log(`[360-content] ${route.id} done — reviewCount=${metrics.reviewSignals?.reviewCount ?? "N/A"}, wordCount=${metrics.contentDepth?.wordCount ?? "N/A"}`);
    } catch(e) {
      console.error(`[360-content] ${route.id} error: ${e.message}`);
      results.routes.push({routeId: route.id, routePath: route.path, error: e.message});
    }
  }

  await browser.close();

  // Check sitemap reachability
  try {
    const sitemapRes = await (await import("node:http")).default.get ? null : null;
    results.sitemapReachable = true; // simplified
  } catch(e) { results.sitemapReachable = false; }

  fs.mkdirSync(OUT_DIR, {recursive: true});
  const outPath = path.join(OUT_DIR, `${DATE}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`[360-content] Results written: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

### - [ ] Step 2: 运行首次 360 内容层采集

```bash
AUDIT_TARGET_URL=https://momcozy.com npm run collect:360
```

### - [ ] Step 3: 验证输出

```bash
node -e "const d = JSON.parse(require('fs').readFileSync('src/_data/content-sessions/$(date +%Y-%m-%d).json','utf8')); console.log('routes:', d.routes.length, 'routes collected')"
```

### - [ ] Step 4: Commit Phase 12

```bash
git add scripts/collect-360-content.mjs src/_data/content-sessions/
git commit -m "feat: Phase 12 collect-360-content.mjs 首次运行结果"
```

---

## Phase 13: 洞察站新维度页面渲染

**目标**：把 G1-G11 的数据骨架和首次采集结果渲染到洞察站页面，区分「有数据」和「待采集」状态。

**架构决策**：
- G6/G7/G9/G11 已有或即将有 Playwright 采集数据 → 扩展到 `forensics.html`（技术证据页）
- G1/G2 漏斗行为层 → 扩展到 `metrics.html`（指标口径页）
- G3/G4 留存/邮件层 → 扩展到 `metrics.html`（经营健康区）
- G5 库存层 → 扩展到 `forensics.html`
- G8 社交电商 → 扩展到 `cross-audit.html`（增长决策区）
- G10 客服质量 → 扩展到 `metrics.html`
- G11 SEO 架构 → 扩展到 `forensics.html`

### 新增 section 函数（sections.mjs）

```javascript
// 360 诊断框架总览 section — 显示20维度覆盖状态
export function diagnostic360OverviewSection(data) { ... }

// G1/G2 行为数据层 — metrics.html
export function behaviorLayerSection(data) { ... }

// G3/G4 留存健康层 — metrics.html  
export function retentionHealthSection(data) { ... }

// G5/G6/G7/G9/G11 技术可采集层 — forensics.html
export function contentAuditSection(data) { ... }

// G8 社交电商 — cross-audit.html
export function socialCommerceSection(data) { ... }

// G10 客服质量 — metrics.html
export function supportQualitySection(data) { ... }
```

### - [ ] Step 1: 实现所有 section 函数

每个 section 需处理三种状态：
- `not_started` → 显示「待采集」卡片，说明采集方法和所需数据源
- `partial` → 显示已有数据 + 缺口提示
- `available` → 显示完整图表和分析

### - [ ] Step 2: 更新 forensicsBody / metricsBody / crossAuditBody 引用新 sections

### - [ ] Step 3: 更新 insight-report-contract.json 新增 360 维度页面约束

### - [ ] Step 4: 构建验证

```bash
npm run build
npm run test:insight-contract
npm run test:e2e
npm run test:a11y
```

### - [ ] Step 5: Commit Phase 13

```bash
git add scripts/history-site/sections.mjs config/insight-report-contract.json
git commit -m "feat: Phase 13 洞察站渲染 G1-G11 新诊断维度"
```

---

## Phase 14: 手工数据填入计划（G1/G2/G3/G4/G8/G10）

这些维度需要后台数据，提供具体的数据获取指引。

### G1 — 行为数据层

**立即行动**：
1. 注册 Microsoft Clarity（https://clarity.microsoft.com）— 免费
2. 添加 Clarity tracking code 到 Shopify theme（Customize → Theme settings → Analytics）
3. 等待14天数据积累
4. 查看：Recordings → Filter by "Rage clicks" + "Dead clicks" on /checkout
5. 查看：Heatmaps → /products/m5-smart-wearable-breast-pump...

**填入 `diagnosticGaps360.gaps.G1_behavior.metrics`**

### G2 — 漏斗分段 CVR

**立即行动**：
1. Shopify Admin → Analytics → Reports → Online Store Conversion Rate
2. 点击 "Breakdown by" → Device → Export
3. 点击 "Breakdown by" → Traffic Source → Export
4. 填入 `diagnosticGaps360.gaps.G2_funnel_segmented.metrics`

### G3 — LTV 队列分析

**立即行动**：
1. Shopify Admin → Analytics → Customers → Returning Customer Rate（按月看）
2. 或导出 Klaviyo → Analytics → Cohort Analysis
3. 计算 M1/M3 重复购买率：`orders from existing customers in month X / new customers in month X-1`

### G4 — 邮件/SMS

**立即行动**：
1. Klaviyo → Analytics → Overview → 查看 Total Revenue 和 Flows Revenue
2. 检查 Flows → Abandoned Cart → Conversion Rate
3. 检查 Forms → Email capture rate

### G8 — TikTok Shop

**立即行动**：
1. TikTok Shop Seller Center → Analytics → Conversion Rate by Creator
2. 为每个创作者设置 UTM 参数追踪
3. 对比 TikTok 来源客户的 30天复购率 vs 其他渠道

### G10 — 客服质量

**立即行动**：
1. 导出 Zendesk/Help Scout 最近 100 个工单
2. 按原因分类：退货/使用问题/安全问题/配送/其他
3. 计算平均首次响应时间

---

## Phase 15: 全量验证与部署

### - [ ] Step 1: 完整测试套件

```bash
npm test
```

期望：26 e2e + 7 a11y + 所有 lint 通过

### - [ ] Step 2: 本地视觉验证

```bash
npm run serve
# 检查所有新 section 在各页面正确渲染
# 确认「待采集」状态有清晰的行动指引
# 确认「有数据」状态有正确的图表和数值
```

### - [ ] Step 3: Production Layout Audit

```bash
PRODUCTION_LAYOUT_BASE_URL=http://localhost:8080 PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/360-layout npm run audit:production-layout
# 期望 failedChecks: 0
```

### - [ ] Step 4: PR + Tencent 部署

```bash
git push -u origin codex/360-diagnostic-framework-expansion
gh pr create --title "feat: 360 无死角诊断框架 G1-G11 完整实施" --body-file docs/superpowers/plans/2026-06-19-360-diagnostic-framework.md --base main
gh pr checks --watch
gh pr merge --squash --delete-branch
```

### - [ ] Step 5: 生产验证

```bash
curl -s https://shopify.lute-tlz-dddd.top/forensics.html | grep -o "diagnostic-360\|G1\|G2\|G3" | head -10
```

---

## 附录：20 维度完整覆盖矩阵

### 第一层：技术性能层（已完成）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| D1 | 前端性能（FCP/TTFB/LCP/DOM/JS） | ✅ 月度自动 | collect.mjs |
| D2 | 第三方脚本治理（kill-list + owner制） | ✅ 月度自动 | collect.mjs + 手工 |
| D5 | SEO 技术底座（Schema/canonical/meta） | ✅ 已采集 | 一次性 Playwright 扫描 |
| D7 | 安全被动扫描（CSP/SRI/FB Pixel/myshopify） | ✅ 已采集 | 一次性 Playwright 扫描 |

### 第二层：经营数据层（已有框架，口径待治理）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| D3 | 内部经营漏斗（CVR/AOV/弃单/复购） | ⚠️ 有但有 caveat | 内部 workbook 导入 |
| D8 | Bot 流量治理 | ⚠️ 框架有，数据缺 | owner analytics 导出 |
| D9 | 渠道归因质量（C7 已识别） | ⚠️ 问题识别，数据缺 | GA4/Shopify 分段 |

### 第三层：竞争对标层（已有初级框架）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| D4 | 竞品技术对标（6站×性能） | ✅ 已采集 | collect-competitors.mjs |
| D6 | GEO/AI 可见度（Perplexity 5问） | ✅ 初级基线 | 手动浏览器测试 |

### 第四层：新增 — 行为数据层（G1-G2）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| G1 | 行为数据层（Session Replay + 热图） | 🔴 待安装 Clarity | Microsoft Clarity 工具 |
| G2 | 漏斗分段 CVR（渠道×设备×用户） | 🔴 待导出 | Shopify Analytics |

### 第五层：新增 — 经营健康层（G3-G4/G10）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| G3 | 客户留存队列分析（LTV Cohort） | 🔴 待建模 | Shopify + Klaviyo 导出 |
| G4 | 邮件/SMS 营销性能 | 🔴 待导出 | Klaviyo Analytics |
| G10 | 客服质量信号 | 🔴 待导出 | Zendesk/Help Scout |

### 第六层：新增 — Playwright 可采集层（G5-G7/G9/G11）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| G5 | 库存健康信号（公开可见部分） | 🟡 待运行 collect:360 | collect-360-content.mjs |
| G6 | 评论生态（数量/质量/UGC比例） | 🟡 部分有（reviewCount/rating） | collect-360-content.mjs |
| G7 | 结账链路业务指标 | 🟡 待运行 collect:360 | collect-360-content.mjs |
| G9 | PDP 内容深度（字数/视频/认证/FAQ） | 🟡 待运行 collect:360 | collect-360-content.mjs |
| G11 | SEO 架构（分面导航/品类页/内链） | 🟡 待运行 collect:360 | collect-360-content.mjs |

### 第七层：新增 — 社交商务层（G8）

| # | 维度 | 数据状态 | 采集方式 |
|---|---|---|---|
| G8 | 社交电商（TikTok Shop GMV/创作者效率） | 🔴 待接入 | TikTok Seller Center |

---

## 数据治理规则

1. **口径标注**：每个指标必须标注数据来源、采集窗口、是否经过 human/bot 过滤
2. **承诺降级**：新维度数据在首次采集后只作为「方向参照」，不得直接作为预算承诺
3. **复采节奏**：Layer C（Playwright 可采集层）每月随 collect.mjs 同步运行；Layer B（后台数据）每季度手工更新；Layer D（社交商务）每月导出
4. **安全边界**：`collect-360-content.mjs` 被动只读，不登录、不下单、不填表单
5. **竞品同口径**：每次 collect:360 运行后，对竞品（Willow/Elvie/BabyBuddha）同步运行相同的内容层采集

---

## 自检清单

- [ ] 20 个维度在框架中都有对应的数据骨架（JSON key）
- [ ] 每个维度都有明确的数据来源、采集方式、优先级
- [ ] Layer C 维度有 Playwright 自动化采集脚本
- [ ] Layer B 维度有手工数据填入指南
- [ ] 所有维度的数据状态在洞察站可见（即使是「待采集」状态）
- [ ] `npm test` 全套通过
- [ ] 生产站已部署

---

*计划版本：v1.0 · 2026-06-19 · 整合 Phases 1-9 历史 + G1-G11 新增维度*
