---
name: platform-reconstruction-360

> **状态：已完成归档** · 归档日期: 2026-06-20 · 所有 Phase 均已实施完成

description: Momcozy 诊断监控360平台完整重构计划。从静态报告站 → Next.js 动态平台，整合 browser-harness AI采集层，设计系统基于 LaunchFast+锡嘉风格融合。触发场景：「平台重构」「360平台」「Next.js 迁移」「采集计划」。
---

# Momcozy 诊断监控360平台 · 完整重构计划

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**目标**：从私密审计报告站 → 品牌独立站诊断监控360平台  
**决策基准**：Next.js/Vite · Momcozy深度优先保留多品牌扩展 · browser-harness补充Playwright · owner账号真实购买流程 · 不用Cloud

---

## 一、平台架构全景

```
┌──────────────────────────────────────────────────────────────┐
│           BRAND DIAGNOSTIC 360 PLATFORM                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 采集引擎  │→ │ 诊断引擎  │→ │ 洞察报告  │→ │ 执行决策  │   │
│  │Collection│  │Diagnostic│  │ Insight  │  │Execution │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       ↓              ↓             ↓              ↓          │
│  Playwright    20维度评分     6大页面          PR执行卡       │
│  browser-harness  Grade A-F  实时数据         Sprint计划     │
│  AI驱动采集    竞品对标      趋势追踪         验收门禁       │
└──────────────────────────────────────────────────────────────┘
```

---

## 二、技术选型

### 前端框架：Next.js 14 App Router

```
理由：
- 支持动态路由（/brands/[brand]/[report]）
- RSC + Server Actions 处理数据读写
- 静态导出兼容现有腾讯云部署
- Tailwind CSS 天然支持
- 未来多品牌扩展：layout.tsx 品牌主题注入
```

### 采集层双引擎

```
Playwright（定时批量层）
  - 月度 CI 自动运行（现有 collect.mjs）
  - 13条路由 × 双视口 × 性能指标
  - 输出：src/_data/sessions/YYYY-MM-DD.json

browser-harness（AI动态层）新增
  - owner 真实 Chrome 连接
  - JS渲染后内容采集（wordCount=0问题解决）
  - 真实购买流程测试（加购→结账→支付）
  - Domain Skills 积累（momcozy/ 文件夹）
  - 输出：src/_data/bh-sessions/YYYY-MM-DD-{label}.json
```

### 设计系统

```
LaunchFast风格（宽松 SaaS 文档感）+ 锡嘉风格（极简工业线条）

核心 Token：
  主色蓝: #5079D9
  中性黑: #3C3C44
  分割线: #E8E8E8（细1px）
  成功绿: #10B981
  警告橙: #F59E0B
  失败红: #EF4444

等级系统（对标LaunchFast Grade）：
  S → 蓝 #5079D9（业界最优）
  A → 绿 #10B981（超出基准）
  B → 黄绿（达标）
  C → 橙 #F59E0B（需关注）
  D → 红 #EF4444（需修复）
  F → 暗红（严重）
```

---

## 三、平台页面结构

```
/                                 → 品牌列表（支持多品牌扩展）
/brands/momcozy/                  → Momcozy 总览（Overview）
/brands/momcozy/metrics           → 指标口径
/brands/momcozy/forensics         → 风险归因（含360新维度）
/brands/momcozy/trends            → 趋势证据
/brands/momcozy/cross-audit       → 决策矩阵
/brands/momcozy/competitors       → 竞品对比
/brands/momcozy/360               → 360框架状态（新页面）
/brands/momcozy/collection        → 采集管理（触发/查看）
/brands/momcozy/execution         → 执行战单（PR卡片）
/api/collect/trigger              → 触发采集（Server Action）
/api/data/[brand]/[session]       → 数据读取 API
```

---

## 四、重构分阶段计划

### Phase R1：Next.js 骨架搭建（Week 1-2）

**目标**：新仓库 `lute-momcozy-platform`，能跑起来，现有数据能渲染

```bash
npx create-next-app@latest lute-momcozy-platform \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd lute-momcozy-platform

# 安装依赖
npm install recharts lucide-react clsx tailwind-merge
npm install -D @types/node
```

**文件结构**：
```
src/
├── app/
│   ├── layout.tsx                 ← 全局布局（深色侧边栏）
│   ├── page.tsx                   ← 品牌列表
│   └── brands/
│       └── [brand]/
│           ├── layout.tsx         ← 品牌级布局（导航 + 主题）
│           ├── page.tsx           ← 总览
│           ├── metrics/page.tsx
│           ├── forensics/page.tsx
│           ├── trends/page.tsx
│           ├── cross-audit/page.tsx
│           ├── competitors/page.tsx
│           ├── 360/page.tsx       ← 新：G1-G11状态
│           ├── collection/page.tsx← 新：采集管理
│           └── execution/page.tsx ← 新：执行战单
├── components/
│   ├── ui/                        ← 基础组件
│   │   ├── Card.tsx
│   │   ├── Badge.tsx              ← Grade A-F 徽章
│   │   ├── MetricCard.tsx
│   │   ├── Table.tsx
│   │   ├── Chart/                 ← Recharts封装
│   │   └── StatusIndicator.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── BrandHeader.tsx
│   │   └── Navigation.tsx
│   └── sections/                  ← 页面级模块
│       ├── DiagnosticOverview.tsx
│       ├── SecurityAudit.tsx
│       ├── GeoBaseline.tsx
│       ├── SeoTechnical.tsx
│       ├── Gap360Overview.tsx
│       └── CollectionStatus.tsx
├── lib/
│   ├── data/
│   │   ├── loader.ts              ← 读取 JSON 数据
│   │   ├── session.ts             ← Session 数据结构
│   │   └── brands.ts              ← 品牌配置
│   └── utils/
│       ├── grade.ts               ← 等级计算
│       ├── format.ts              ← 数字/日期格式
│       └── cn.ts                  ← clsx 工具
├── data/ → symlink 到 ../lute-momcozy-audit/src/_data/
└── styles/
    └── globals.css                ← Tailwind + 自定义 token
```

**任务清单**：
- [ ] 初始化 Next.js 项目，配置 Tailwind
- [ ] 实现设计 Token（基于 LaunchFast+锡嘉规范）
- [ ] 实现 Sidebar 导航组件（深色，锡嘉线条感）
- [ ] 实现 Badge/Grade 组件（A-F等级系统）
- [ ] 实现 MetricCard 组件
- [ ] 数据加载层：读取现有 public-cross-audit.json
- [ ] 总览页渲染现有数据

### Phase R2：页面重写（Week 2-3）

**目标**：6个核心页面全部迁移到 Next.js，视觉符合新设计语言

每个页面的重构重点：

```
总览页 /brands/momcozy
  - Hero：大字号标题（锡嘉风格，60px+）
  - 经营 KPI Cards：3列 grid，数据高亮
  - 决策链可视化（LaunchFast流程图风格）
  - 执行战单预览（最高优先级3项）

指标口径页 /brands/momcozy/metrics
  + 新增：G1-G4 经营健康待采集状态卡片
  + 新增：漏斗分段CVR空白提示（G2）
  + 新增：LTV队列空白提示（G3）

风险归因页 /brands/momcozy/forensics
  + 保留：securityAudit section
  + 保留：seoTechnical section
  + 新增：content360Section（G5/G6/G9/G11结果）
  + 新增：browser-harness采集状态指示器

趋势证据页 /brands/momcozy/trends
  + Recharts 折线图替代 SVG barChart
  + 时间轴展示多个 session 对比

决策矩阵页 /brands/momcozy/cross-audit
  + 保留：geoBaseline section
  + 新增：diagnostic360Overview section
  + 新增：G8社交电商状态卡片

竞品对比页 /brands/momcozy/competitors
  + 横向比较表格（锡嘉网格风格）
  + 雷达图展示多维竞品对比
```

- [ ] 实现所有 6 个页面
- [ ] Chart 组件（Recharts 折线/柱状/雷达图）
- [ ] 响应式布局（desktop优先）
- [ ] 深色侧边栏 + 浅色内容区

### Phase R3：新功能页面（Week 3-4）

**目标**：平台独有的新能力

```
360框架页 /brands/momcozy/360
  - 20维度覆盖矩阵（全部G1-G11+D1-D9）
  - 每个维度：状态徽章 + 数据摘要 + 下一步行动
  - 进度条：已采集/总维度
  - 快速操作：触发采集按钮

采集管理页 /brands/momcozy/collection
  - 采集历史列表（所有sessions）
  - 采集引擎状态：Playwright / browser-harness
  - 手动触发采集按钮（Server Action）
  - 采集结果实时日志（streaming）

执行战单页 /brands/momcozy/execution
  - PR执行卡（EX-P0-FB-PIXEL等）
  - 按优先级分组（P0/P1/P2）
  - 状态追踪（待执行/进行中/已完成）
  - Sprint计划视图
```

- [ ] 360 框架状态页
- [ ] 采集管理页（触发 + 历史）
- [ ] 执行战单页

### Phase R4：browser-harness 集成（Week 4-5）

**目标**：browser-harness 作为第二采集层接入平台

```
新文件结构：
scripts/
├── collect.mjs                      ← 现有Playwright性能层（保留）
├── collect-360-content.mjs          ← 现有内容层（保留）
└── collect-bh.mjs                   ← 新：browser-harness AI层

src/_data/
├── sessions/                        ← Playwright性能层输出（保留）
├── content-sessions/                ← 内容层输出（保留）
└── bh-sessions/                     ← browser-harness输出（新）
    ├── YYYY-MM-DD-full-flow.json    ← 完整购买流程测试
    ├── YYYY-MM-DD-pdp-content.json  ← PDP深度内容采集
    └── YYYY-MM-DD-checkout.json     ← 结账链路测试
```

**collect-bh.mjs 核心能力**：
```javascript
// 通过 browser-harness Python 脚本调用
// 解决现有 wordCount=0 问题
// 测试真实购买流程
// owner账号模式 vs 匿名模式
```

- [ ] 编写 collect-bh.mjs（Shell 包装调用 Python）
- [ ] Domain Skills：momcozy/ 文件夹初始化
- [ ] 完整购买流程测试脚本
- [ ] 输出 schema 定义

### Phase R5：部署迁移（Week 5-6）

**目标**：新平台上线，旧站并行运行一段时间

```
部署方案：
- Next.js build → static export（next export）
- 与现有腾讯云部署兼容
- 新域名或子路径：/platform/
- 保留现有 shopify.lute-tlz-dddd.top（旧站）
```

- [ ] next.config.js 配置静态导出
- [ ] CI/CD 工作流适配（tencent.yml 更新）
- [ ] 新旧站并行运行
- [ ] DNS 切换计划

---

## 五、完整采集计划（三层架构）

### Layer 1：Playwright 性能层（现有，保留增强）

**频率**：每月 CI 自动（collect.yml）+ 手动触发  
**路由**：默认13条 + watchlist pack  
**输出**：`src/_data/sessions/YYYY-MM-DD.json`

**新增指标**（扩展 collect.mjs）：
```javascript
// 新增采集字段（向后兼容）
contentSecurityPolicy: headers['content-security-policy'] || null,
xFrameOptions: headers['x-frame-options'] || null,
shopPayPresent: !!page.locator('[data-method="shop_pay"]').count(),
applePayPresent: !!page.locator('.apple-pay-button').count(),
```

**路由扩展**（collection-routes-360-full.json 已创建）：
- homepage + 10 PDPs + cart + checkout + 2 collection + 3 search

### Layer 2：内容层（collect-360-content.mjs，已有）

**频率**：每月随 Layer 1 同步运行  
**输出**：`src/_data/content-sessions/YYYY-MM-DD.json`  
**采集**：G5/G6/G7/G9/G11 内容信号

**待修复**：wordCount=0 问题（JS渲染等待时间不够）
```javascript
// 修复：改用 waitUntil: 'networkidle' + 更长等待
await page.goto(url, {waitUntil: "networkidle", timeout: 45000});
await page.waitForTimeout(5000);  // 等待 JS 渲染完成
```

### Layer 3：browser-harness AI层（新增）

**频率**：手动触发（结合 owner 操作）  
**输出**：`src/_data/bh-sessions/YYYY-MM-DD-{label}.json`

**三种采集模式**：

#### Mode A：匿名内容采集（解决 wordCount=0）
```python
# bh-sessions/YYYY-MM-DD-anonymous.json
# browser-harness <<'PY'
new_tab("https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control")
wait_for_load()
import time; time.sleep(5)  # 等待 JS 完整渲染

result = js("""
  (() => {
    const desc = document.querySelector('.product__description, .rte, .product-single__description');
    const wordCount = desc ? desc.innerText.split(/\s+/).filter(w => w.length > 1).length : 0;
    const safetyText = document.body.innerText;
    return {
      wordCount,
      hasBpaFree: /bpa.?free/i.test(safetyText),
      hasFdaApproved: /fda/i.test(safetyText),
      addToCartVisible: !!document.querySelector('[name="add"]'),
      addToCartRect: (() => {
        const btn = document.querySelector('[name="add"]');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return {top: r.top, bottom: r.bottom, inViewport: r.bottom < window.innerHeight};
      })()
    };
  })()
""")
print(result)
# PY
```

#### Mode B：owner 登录态完整流程测试
```python
# bh-sessions/YYYY-MM-DD-owner-flow.json
# 使用 owner 的真实 Chrome（已登录 Shopify admin）
# browser-harness <<'PY'

# Step 1: 访问 PDP
new_tab("https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control")
wait_for_load()
import time; time.sleep(3)

# Step 2: 截图确认页面状态
screenshot_before = capture_screenshot("/tmp/momcozy-pdp-before.png")

# Step 3: 点击 "Add to Cart"
add_btn = js("document.querySelector('[name=\"add\"]')")
if add_btn:
  rect = js("document.querySelector('[name=\"add\"]').getBoundingClientRect()")
  click_at_xy(rect['left'] + rect['width']/2, rect['top'] + rect['height']/2)
  time.sleep(2)
  screenshot_cart = capture_screenshot("/tmp/momcozy-cart-added.png")

# Step 4: 前往购物车
goto_url("https://momcozy.com/cart")
wait_for_load()
time.sleep(2)

cart_info = js("""
  (() => {
    const items = document.querySelectorAll('.cart__item, [class*="cart-item"]');
    const total = document.querySelector('[class*="cart-total"], .cart__total');
    return {
      itemCount: items.length,
      totalText: total ? total.innerText : null,
      hasCheckoutBtn: !!document.querySelector('[name="checkout"], [href*="/checkout"]')
    };
  })()
""")

# Step 5: 前往结账页（不真实付款）
goto_url("https://momcozy.com/checkout")
wait_for_load()
time.sleep(3)

checkout_info = js("""
  (() => {
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
    const shopPay = document.querySelector('.shopify-payment-button__button--shop-pay, [aria-label*="Shop Pay"]');
    const applePay = document.querySelector('.apple-pay-button, [aria-label*="Apple Pay"]');
    const googlePay = document.querySelector('[aria-label*="Google Pay"]');
    const guestCheckout = !document.querySelector('[name="customer[login_name]"]');
    return {
      formFieldCount: inputs.length,
      hasShopPay: !!shopPay,
      hasApplePay: !!applePay,
      hasGooglePay: !!googlePay,
      guestAvailable: guestCheckout,
      currentStep: document.querySelector('[class*="step"], [data-step]')?.innerText || 'unknown'
    };
  })()
""")

print("Cart:", cart_info)
print("Checkout:", checkout_info)

# 截图留档，不提交支付
screenshot_checkout = capture_screenshot("/tmp/momcozy-checkout.png")
# PY
```

#### Mode C：KOL UTM 入口质量对比
```python
# 对比：普通入口 vs KOL UTM 入口的第三方脚本负担
urls = [
  ("organic", "https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control"),
  ("kol-tiktok", "https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control?utm_source=tiktok&utm_medium=affiliate&utm_campaign=kol_tier1"),
  ("email-utm", "https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control?utm_source=klaviyo&utm_medium=email")
]

results = []
for label, url in urls:
  new_tab(url)
  wait_for_load()
  import time; time.sleep(3)
  
  metrics = js("""
    (() => {
      let failures = 0;
      // 记录失败的第三方请求（需要 Network 事件，在 Playwright 里做）
      const scripts = document.querySelectorAll('script[src]');
      const iframes = document.querySelectorAll('iframe');
      return {
        scriptCount: scripts.length,
        iframeCount: iframes.length,
        domNodes: document.querySelectorAll('*').length,
        pageLoadTime: performance.timing.loadEventEnd - performance.timing.fetchStart
      };
    })()
  """)
  results.append({"label": label, "url": url, **metrics})

import json
print(json.dumps(results, indent=2))
```

### 采集频率矩阵

| 层 | 频率 | 触发方式 | 输出 |
|---|---|---|---|
| Layer 1 Playwright 性能 | 每月 | CI 自动 (collect.yml) | sessions/ |
| Layer 2 内容层 | 每月（同步L1） | CI 自动 | content-sessions/ |
| Layer 3A BH 匿名内容 | 每2周 | 手动 | bh-sessions/ |
| Layer 3B BH owner 流程 | 每月 | owner 手动触发 | bh-sessions/ |
| Layer 3C BH KOL UTM | 按需（投放变化时） | 手动 | bh-sessions/ |
| 竞品采集 | 每月 | CI 自动 (collect.yml) | competitors/ |

---

## 六、browser-harness Domain Skills 建设

### 创建 momcozy/ Domain Skills 文件夹

```bash
mkdir -p ~/Developer/browser-harness/agent-workspace/domain-skills/momcozy.com
```

**初始化三个 Skill 文件**：

```markdown
# momcozy.com/pdp-content-extraction.md
Field-tested: 2026-06-19

## Product Description Selector
- Primary: .product__description (Shopify Dawn theme)
- Fallback: .rte, [data-product-description], .product-single__description

## Wait Strategy
- goto_url(pdp_url)
- wait_for_load()
- time.sleep(5)  # CRITICAL: JS takes 3-5s to fully render description

## Add to Cart Button
- Selector: [name="add"], button#product-form-submit
- CAVEAT: ctaAboveFold=False on M5/S12/Flow variants (selector works, but not in viewport)

## Review Count (JSON-LD)
- script[type="application/ld+json"] → Product.aggregateRating.reviewCount
- All PDPs have AggregateRating: M5=1439, S12=1828, Flow=470, TuckGo=10, KleanPal=898
```

```markdown
# momcozy.com/checkout-flow.md
Field-tested: 2026-06-19

## Cart URL
- /cart (public, no auth needed)
- Empty cart shows homepage redirect — add a product first

## Checkout Signals
- Shop Pay: NOT detected (as of 2026-06-19) — check [aria-label*="Shop Pay"]
- Apple Pay: NOT detected — check .apple-pay-button
- Guest checkout: AVAILABLE — no [name="customer[login_name]"] on page
- Form fields on empty checkout gate: 4 fields

## Rate Limiting
- UTM parameter URLs (tiktok, email) trigger 429 after ~10 requests in same session
- Wait 30s between UTM route requests
```

```markdown
# momcozy.com/seo-architecture.md
Field-tested: 2026-06-19

## Faceted Navigation URLs
- All collection pages have filter URLs: ?filter.p.tag=, ?sort_by=
- collection/nursing-bra: 130 faceted URLs (highest crawl budget waste)
- collection/electric-breast-pump: 12 faceted URLs
- RISK: These are indexable (no noindex), Google wastes crawl budget

## Category Page Content
- electric-breast-pump: 4 words (CRITICAL: SEO needs 400+ words)
- nursing-bras: 39 words (still below 400 target)

## Breadcrumb Schema
- ALL PDPs have BreadcrumbList JSON-LD ✅
- Canonical: all self-referencing ✅
```

---

## 七、设计系统实施

基于 LaunchFast (宽松SaaS文档感) + 锡嘉 (极简工业线条) 融合规范：

### 核心 Token

```css
:root {
  /* 中性色（锤子极简） */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #FAFAFA;
  --color-bg-muted: #F3F3F3;
  --color-border: #E8E8E8;      /* 锤子1px细线 */
  --color-border-strong: #D9D9D9;
  --color-text-primary: #3C3C44;
  --color-text-secondary: #787887;

  /* 主色（LaunchFast蓝） */
  --color-primary: #5079D9;
  --color-primary-hover: #3F5FB5;

  /* 语义色（诊断状态） */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --color-info: #06B6D4;

  /* 间距（8px基准） */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* 字体 */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
}
```

### Grade Badge 组件

```tsx
// components/ui/Badge.tsx
const gradeConfig = {
  S: { bg: '#EEF2FF', text: '#5079D9', label: 'S级' },
  A: { bg: '#D1FAE5', text: '#047857', label: 'A级' },
  B: { bg: '#FEF3C7', text: '#92400E', label: 'B级' },
  C: { bg: '#FEE2E2', text: '#991B1B', label: 'C级' },
  D: { bg: '#FEE2E2', text: '#7F1D1D', label: 'D级' },
  F: { bg: '#1F2937', text: '#FFFFFF', label: 'F级' },
};
```

---

## 八、执行顺序（含 browser-harness 安装）

### 立即（今天）
1. ✅ browser-harness 已安装（0.1.0）
2. ⏳ 等待 Chrome 远程调试 checkbox 勾选（需要你操作）
3. 验证 momcozy.com 内容采集（wordCount问题验证）

### Week 1
- Next.js 项目初始化
- 设计 Token 实施
- 基础组件库（Card/Badge/Sidebar）
- 数据加载层
- 总览页 MVP

### Week 2
- 6个核心页面迁移
- Chart 组件（Recharts）
- 360状态页

### Week 3
- collect-bh.mjs 编写
- Domain Skills 建设
- 完整购买流程测试
- 采集管理页

### Week 4
- 执行战单页
- 多品牌扩展预留接口
- 测试覆盖

### Week 5-6
- 部署迁移
- 新旧站并行
- 文档更新

---

## 九、验收门禁

每个 Phase 完成后必须通过：

```bash
# 构建
npm run build  # 零 TypeScript error

# 数据一致性
npm run test:report-data-consistency

# 合规
npm run test:safety

# E2E
npx playwright test

# browser-harness
browser-harness --doctor  # chrome running + daemon alive

# 生产布局
PRODUCTION_LAYOUT_BASE_URL=http://localhost:3000 npm run audit:production-layout
# failedChecks: 0
```

---

*计划版本：v1.0 · 2026-06-19 · 基于决策：Next.js · Momcozy深度优先 · browser-harness补充 · owner账号真实流程*
