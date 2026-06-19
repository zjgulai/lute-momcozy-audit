---
name: prd-2.0-momcozy-diagnostic-platform
description: Momcozy 电商诊断监控平台 PRD 2.0。覆盖从私密洞察报告站到多维度诊断监控平台的完整产品需求，包含当前现状基线、核心问题、功能需求、技术架构与执行路径。当需要对齐产品方向、制定迭代计划、评估任务优先级时使用。
---

# Momcozy 电商诊断监控平台 · PRD 2.0

> **版本**：2.0 · **日期**：2026-06-19 · **状态**：草稿待确认  
> **Owner**：路特 AI × Momcozy 团队  
> **生产地址（旧站）**：https://shopify.lute-tlz-dddd.top  
> **计划地址（新平台）**：https://platform.shopify.lute-tlz-dddd.top

---

## 一、版本信息

| 字段 | 内容 |
|---|---|
| 版本 | PRD 2.0 |
| 基准版本 | PRD 1.0（隐式——360诊断框架计划 + Platform Reconstruction Plan） |
| 变更原因 | Phase 1-15 大量已完成，产品形态发生根本性变化；需要重新对齐全局需求 |
| 生效日期 | 2026-06-19 |

### 变更日志

| 版本 | 日期 | 核心变更 |
|---|---|---|
| 1.0（隐式） | 2026-06-14 | 私密报告站初版：6页静态报告 |
| 1.5（隐式） | 2026-06-18 | 360框架扩展：安全/GEO/SEO/G5-G11维度 |
| **2.0** | **2026-06-19** | 双轨产品架构确认：静态站（已有）+ Next.js平台（建设中）；竞品扩至10个；GEO竞品格局纳入；PRD全面升版 |

---

## 二、需求概述

### 产品定位

| 字段 | 内容 |
|---|---|
| 产品名称 | Momcozy 电商诊断监控平台（Momcozy Diagnostic Platform） |
| 核心定位 | 面向电商 owner 的私密经营洞察与优化决策工具 |
| 目标用户 | Momcozy DTC 团队 owner（运营/增长/前端负责人） |
| 访问边界 | `noindex, nofollow`；私密部署；仅团队内部使用 |
| 数据边界 | 允许真实经营金额、KPI；**禁止**密钥/服务器地址/私有路径/原始数据端点 |

### 需求级别定义

- **S 级**：产品存活性需求，必须满足
- **A 级**：核心功能，直接影响产品价值
- **B 级**：重要功能，影响体验质量
- **C 级**：增值功能，可延后

---

## 三、现状基线（2026-06-19）

### 3.1 已交付产品（旧静态站）

**平台**：`lute-momcozy-audit` — 静态站，Node.js 构建，部署于腾讯云

**已上线 9 个页面**：

| 路由 | 标题 | 核心内容 | 行数 |
|---|---|---|---|
| `/` | I · 总览 | 经营KPI + 决策链 + 执行战单预览 | 50K字节 |
| `/metrics.html` | II · 指标口径 | 漏斗指标 + 口径风险 + G1-G4待采集层 | 43K字节 |
| `/forensics.html` | III · 风险归因 | 第三方治理 + 安全扫描 + SEO + G5-G11 | 50K字节 |
| `/trends.html` | IV · 趋势证据 | Session时间轴 + 性能趋势图 | 34K字节 |
| `/cross-audit.html` | V · 决策矩阵 | 硬结论 + GEO基线 + 360框架总览 | 54K字节 |
| `/competitors.html` | VI · 竞品对比 | 10品牌GEO格局 + 技术压力对比 | 37K字节 |
| `/framework.html` | VII · 360框架全景 | G1-G11覆盖矩阵 + 待采集队列 | 31K字节 |
| `/collection.html` | VIII · 采集管理 | Session历史 + 采集命令说明 | 25K字节 |
| `/execution.html` | IX · 执行战单 | 8条战单 + 验收门槛 | 28K字节 |

**测试覆盖**：26 e2e + 10 a11y = 36/36 通过

### 3.2 进行中产品（Next.js 平台）

**平台**：`lute-momcozy-platform` — Next.js 16 + Tailwind v4 + Recharts，静态导出，已有腾讯云 CI

**构建状态**：✅ `npm run build` 通过，13 个静态页面生成

**已实现 10 页面**：与旧站 9 页对应，新增品牌列表首页 `/`

**关键依赖关系**：
- 平台通过 `../lute-momcozy-audit/src/_data/` 相对路径读取数据
- 两个仓库 **共享同一份数据源**，需保持同步

### 3.3 数据资产现状

**内部经营数据**（观测窗口：2025-12-03 → 2026-06-10）：

| 指标 | 数值 | 注意事项 |
|---|---|---|
| 总访次 | 13.56 万次 | 流量 137 非零观察日 |
| 整体 CVR | 2.40% | **C7 口径风险**：付费/自然流量未分段 |
| 加购率 | 8.60% | — |
| 弃单率 | 26.7% | 低于行业均值，正向 |
| AOV | $88.2 | 历史 $119（渠道 mix 变化） |
| 复购率 | 46.1% | 高于历史 26.7%，品牌忠诚度强信号 |
| Attach rate | 56.5% | 历史 33.7%，套装购买意愿提升 |
| 总销售额 | $72.07 万 | 204 非零销售日 |

**外部技术采集数据**（最新：session-2026-06-17）：

| 指标 | 数值 | 状态 |
|---|---|---|
| 首页 TTFB | 235ms（桌面）/ 216ms（移动） | ✅ 正常 |
| PDP JS 体积 | 2,212 KB | ❌ 是竞品上限 1,000KB 的 2.2x |
| 3P 失败（最大） | 92 次 | ❌ 是竞品上限 36 次的 2.6x |
| LCP 可观测 | 0/13 路由 | ❌ 全部 `lcp_unobserved_in_timeout` |
| Session 置信度 | low | ⚠️ 因 LCP=null，nullCount≥2 |

**竞品数据**（截至 2026-06-18）：

| 状态 | 内容 |
|---|---|
| 已采集竞品 | 6 个（Willow/Elvie/BabyBuddha/Lansinoh/BabyBreeza/Spectra） |
| 已配置待采 | 4 个新增（eufy/Freemie/Medela/BEABA） |
| 目标总数 | 10 个 |
| GEO 侦查 | 完成（2026-06-19），10 品牌格局矩阵已写入数据 |

**360 框架覆盖率**：9/20 维度已建立证据

| 层级 | 已覆盖 | 待采集 |
|---|---|---|
| D1-D9 原有维度 | 7 完整 + 2 部分（D8 bot缺数据，D9 归因风险已识别） | — |
| G1-G4 经营健康层 | 0（actionItems已写，等 owner 接入后台） | G1/G2/G3 P0；G4 P1 |
| G5-G7/G9/G11 技术可采集层 | 5（全部 Playwright 已完成首轮） | — |
| G8 社交电商 | 0（等 TikTok Shop Seller Center） | G8 P1 |
| G10 客服质量 | 0（等 Zendesk 数据） | G10 P2 |

### 3.4 安全态势

| 项目 | 状态 | 风险级别 |
|---|---|---|
| Content-Security-Policy | 仅 block-all-mixed-content，无精确脚本来源限制 | HIGH |
| 外部脚本无 SRI | 所有外部脚本无 integrity 属性，供应链注入风险 | HIGH |
| Facebook Pixel 重复 | 首页 2 次加载（2 个不同 Pixel ID） | MEDIUM |
| GA Measurement ID | 在 149+ 个 inline script 中明文暴露 | INFO |
| myshopify.com 子域 | momcozy.myshopify.com 访问 404，WAF 绕过不适用 | ✅ 无风险 |

### 3.5 GEO 态势

| 项目 | 状态 |
|---|---|
| AI 推荐出现率 | 5/5 问题均被提及（Perplexity 基线） |
| Best Overall 推荐 | 0/5（全部输给 Willow/Elvie） |
| 品牌定位固化 | 被 AI 固化为「budget/value segment」 |
| 引用来源 | 依赖外部评测媒体（Forbes/NYMag），自有页面几乎不被直接引用 |
| 主要竞争弱点 | 保险渠道（Medela/Spectra 主导）、职场场景（Elvie 主导） |

---

## 四、核心问题

### 问题 1：数据质量 — LCP 持续不可观测（P0）

**现象**：7 个 session 中最新 3 个（v3格式）LCP 全部为 `lcp_unobserved_in_timeout`，session 置信度 `low`。

**根因**：Momcozy 首页 hero 图片采用 CDN 懒加载或 CSS background，Playwright lab 环境 25s 内无法触发 `largest-contentful-paint` Performance Entry。

**修复进展**：collect.mjs 已将等待时间从 25s 延长至 40s + 前置 networkidle（2026-06-19），但若 hero 图片为 CSS background，LCP 将永久无法被 PerformanceObserver 捕获。

**影响**：trends 页趋势线置信度低；Google Core Web Vitals 状态未知；竞品 LCP 对标缺失。

### 问题 2：双产品架构未对齐（P0）

**现象**：存在两套平行产品——旧静态站（已部署）与 Next.js 平台（已构建但未部署）。

**当前状态**：
- 旧站：9页，今天刚更新，36/36测试通过，在生产运行
- Next.js 平台：10页，已构建，有腾讯云 CI，**但未部署**，也未同步旧站今天的变更

**核心矛盾**：两套产品同时演进，工程资源分散；owner 目前只能访问旧站。

**必须决策**：切换到 Next.js 平台，还是保留旧站作为唯一出口？

### 问题 3：G4/G8/G10 操作手册缺失（P1）

**现象**：G4（邮件/SMS）、G8（TikTok Shop）、G10（客服质量）的 `actionItems` 为空，框架虽已注册但 owner 无法知道如何接入。

**影响**：360 框架页（framework.html）展示这些维度为「待采集」但无操作路径；执行战单页缺少对应任务卡。

### 问题 4：竞品首轮采集未完成（P1）

**现象**：4 个新增竞品（eufy/Freemie/Medela/BEABA）已写入配置文件，但还未跑过任何采集。

**影响**：竞品对比页 GEO 格局表依赖 GEO 侦查数据（已有），但性能技术指标对比仍缺失 4 个竞品的真实采集数据。

### 问题 5：GEO 无「AI 叙事主权」（P1）

**现象**：Momcozy 在 AI 推荐中 0/5 获得 best overall，完全依赖第三方媒体引用。

**根因**：品牌自有页面缺乏：①保险渠道内容、②职场场景专题、③AggregateRating JSON-LD 完整声明（已实测存在，但叙事层未优化）。

### 问题 6：Facebook Pixel 双重计数（P1）

**现象**：首页 connect.facebook.net/en_US/fbevents.js 加载 2 次（Pixel ID 1207445154305002 和 838745568077400）。

**影响**：归因数据分裂；TikTok/FB 投放的真实 ROAS 可能被低估或重复计算。

---

## 五、功能需求

### F1 — 双轨产品决策（S级）

**需求描述**：明确旧静态站与 Next.js 平台的长期关系。

**功能要求**：

| ID | 需求 | 优先级 |
|---|---|---|
| F1-1 | 做出架构决策：Next.js 平台替代旧站 OR 双轨并行 OR 旧站保留为唯一出口 | S |
| F1-2 | 若切换：Next.js 平台部署至 platform.shopify.lute-tlz-dddd.top | S |
| F1-3 | 若切换：旧站 shopify.lute-tlz-dddd.top 继续保留（流量重定向或并行） | A |
| F1-4 | Next.js 平台同步旧站今天的所有变更（10竞品/G7/GEO战单/框架页） | A |

**验收标准**：owner 通过 platform.shopify.lute-tlz-dddd.top 能访问 10 个页面，所有数据与旧站一致。

### F2 — 数据质量提升（A级）

**需求描述**：提升 session 置信度，让趋势数据可信。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F2-1 | LCP 采集优化：networkidle 前置 + 等待延长 40s | A | ✅ 已实施 |
| F2-2 | LCP 不可观测时的叙事标注：在 trends 页明确标注「hero 图片为 CSS background 导致 LCP 永久不可采集」 | B | ❌ 待做 |
| F2-3 | confidence 计算降级策略：LCP=null 时若其他 5 项全有，confidence 升为 medium | B | ❌ 待做 |
| F2-4 | 下次月度采集后验证 F2-1 是否使 LCP 可观测 | A | ❌ 待验证（下月 CI） |

### F3 — 360 框架手册完善（A级）

**需求描述**：补齐 G4/G8/G10 的操作手册，让 owner 有完整接入路径。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F3-1 | G4（邮件/SMS）actionItems：Klaviyo Analytics 导出步骤 + 基准目标 | A | ❌ 待做 |
| F3-2 | G8（TikTok Shop）actionItems：TikTok Seller Center 步骤 + Creator CVR | A | ❌ 待做 |
| F3-3 | G10（客服质量）actionItems：Zendesk/Help Scout 导出步骤 + 分类规则 | B | ❌ 待做 |
| F3-4 | framework.html 展示每个 gap 的完整操作步骤（展开/收起） | B | ❌ 待做 |

### F4 — 竞品采集扩充（A级）

**需求描述**：触发 10 个竞品的首次完整采集，建立新基线。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F4-1 | 触发竞品复采：eufy/Freemie/Medela/BEABA 首次采集 | A | ❌ 待触发 |
| F4-2 | 竞品采集结果写入 2026-06-19.json snapshot | A | ❌ 待做 |
| F4-3 | competitors.html 竞品技术对比表更新为 10 品牌数据 | A | ❌ 依赖 F4-2 |
| F4-4 | 竞品 GEO 定位矩阵与技术性能矩阵双视图 | B | ❌ 待设计 |

### F5 — GEO 内容战略落地（A级）

**需求描述**：从「被提及」升级为「被推荐」，建立 AI 叙事主权。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F5-1 | TuckGo Stroller meta title 扩展：30字 → 55-60字 | A | ❌ 战单已写，待执行 |
| F5-2 | Facebook Pixel 重复加载修复：2次 → 1次 | A | ❌ 战单已写，待执行 |
| F5-3 | 保险渠道内容页：/pages/insurance-coverage（HSA/FSA指南 + FAQ Schema） | A | ❌ 待内容创作 |
| F5-4 | 职场场景专题：/blogs/nursing-at-work（含 FAQ Schema） | B | ❌ 待内容创作 |
| F5-5 | GEO 效果追踪：Perplexity/ChatGPT 重测 10问，建立季度复测机制 | B | ❌ 待建立 |
| F5-6 | Shopify Agentic Storefront 接入评估 | C | ❌ 研究阶段 |

### F6 — 执行战单系统（B级）

**需求描述**：让执行战单从「清单」变成「可追踪的任务系统」。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F6-1 | 执行战单页支持状态追踪（待执行/进行中/已完成） | B | ❌ 旧站静态，Next.js 平台可实现 |
| F6-2 | 战单按 Sprint 分组（当前 Sprint / 下一 Sprint） | B | ❌ 待实现 |
| F6-3 | 战单完成后触发验收采集（GitHub Actions workflow dispatch） | C | ❌ 架构级需求 |

### F7 — browser-harness 第二采集层（C级）

**需求描述**：接入 browser-harness AI 驱动采集，解决 wordCount=0 / 真实购买流程等无法通过 Playwright 获取的问题。

| ID | 需求 | 优先级 | 状态 |
|---|---|---|---|
| F7-1 | collect-bh.mjs 脚本实现（Shell 包装调用 browser-harness） | C | ❌ 待实施 |
| F7-2 | Domain Skills：momcozy/ 文件夹初始化，积累 PDP 深度内容采集能力 | C | ❌ 待设计 |
| F7-3 | bh-sessions/ 目录集成到 collection.html 历史表 | C | ❌ 依赖 F7-1 |
| F7-4 | owner 账号真实购买流程测试（加购→结账→支付确认） | C | ❌ 需要 owner storage state |

---

## 六、技术架构

### 6.1 双产品架构（当前状态）

```
┌──────────────────────────────────────────────────────────────┐
│                    数据层（共享）                              │
│  lute-momcozy-audit/src/_data/                               │
│  ├── public-cross-audit.json  ← 主数据（经营/安全/GEO/360）   │
│  ├── sessions/                ← Playwright 性能采集历史       │
│  ├── competitors/             ← 竞品采集快照                  │
│  ├── segment-sessions/        ← 分段复采归档                  │
│  └── bot-evidence.json        ← Bot 证据（当前缺失）           │
└──────────────────────────────────────────────────────────────┘
         ↓                              ↓
┌─────────────────┐           ┌─────────────────────────────┐
│   旧静态站       │           │   Next.js 平台（未部署）     │
│ lute-momcozy-   │           │ lute-momcozy-platform       │
│ audit           │           │                             │
│                 │           │ Next.js 16 + Tailwind v4    │
│ Node.js build   │           │ + Recharts                  │
│ scripts/build-  │           │                             │
│ history-site.   │           │ 10页 · 静态导出              │
│ mjs             │           │ 已有腾讯云 CI               │
│                 │           │ 目标域名:                    │
│ 9页 · 36测试    │           │ platform.shopify.lute-...   │
│ 生产运行         │           │                             │
│ shopify.lute-...│           │ 数据通过相对路径读取旧站数据  │
└─────────────────┘           └─────────────────────────────┘
         ↓                              ↓
┌──────────────────────────────────────────────────────────────┐
│                   腾讯云轻量服务器                             │
│  ai_video_nginx 容器                                          │
│  /opt/momcozy-audit/html/   ← 旧站（当前部署）               │
│  /opt/momcozy-platform/html/ ← 新平台（未部署，nginx已配置）  │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 推荐架构决策

**建议：切换到 Next.js 平台作为唯一正式出口，旧站保留 3 个月作为 fallback。**

理由：
1. Next.js 平台已完整实现，构建通过，CI 已有
2. 旧站静态 HTML 方案扩展性受限（执行战单追踪、动态数据等功能无法支持）
3. 两套产品维护成本倍增，数据同步容易遗漏
4. Next.js 生态（Recharts/Tailwind/TypeScript）更适合平台的长期演进

**切换路径**：
```
① 同步旧站最新变更到 Next.js 平台
② 部署 Next.js 平台到 platform.shopify.lute-tlz-dddd.top
③ owner 切换访问新平台，验收 2 周
④ 旧站保留并行（不关闭）
⑤ 2 周后若无问题：旧站 shopify.lute-tlz-dddd.top 重定向到新平台
```

### 6.3 采集层架构（三层，计划中）

```
Layer 1：Playwright 性能层（已有）
  频率：月度 CI 自动 + 手动触发
  路由：13条（主趋势） / watchlist pack（10 PDP）
  产出：sessions/YYYY-MM-DD.json

Layer 2：Playwright 内容层（已有）
  脚本：collect-360-content.mjs
  路由：15条（PDP内容/评论/SEO架构）
  产出：G5-G11 写入 public-cross-audit.json

Layer 3：browser-harness AI层（计划中）
  脚本：collect-bh.mjs（待实施）
  能力：JS渲染内容 / 真实购买流程 / owner账号
  产出：bh-sessions/YYYY-MM-DD-{label}.json
```

---

## 七、名词解释

| 术语 | 含义 |
|---|---|
| CVR | 整体转化率（下单/访客），当前 2.40%，含 C7 口径风险 |
| C7 | 付费/自然流量口径混淆结论，CVR 可能被高估 |
| GEO | Generative Engine Optimization，AI 生成式搜索引擎可见度优化 |
| LCP | Largest Contentful Paint，当前所有路由均不可观测（CSS background 问题） |
| confidence | Session 置信度（high/medium/low），基于 null 指标数量计算 |
| G1-G11 | 360 框架新增 11 个诊断维度，按采集难度分三层 |
| D1-D9 | 原有 9 个诊断维度（D8 bot 数据缺失，D9 归因问题已识别） |
| 3P failures | 第三方脚本请求失败次数，当前最大 92，竞品上限 36 |
| SRI | Subresource Integrity，脚本完整性验证，当前外部脚本均缺失 |
| Session | 一次完整 Playwright 采集的结果，含多路由多视口数据 |
| attach rate | 配件/套装购买率，当前 56.5%（历史 33.7%）|

---

## 八、TBD（待确认事项）

| # | 问题 | 影响 | 期望决策方 | **状态** |
|---|---|---|---|---|
| TBD-1 | **Next.js 平台是否切换为唯一出口？** 还是双轨并行？ | 影响 F1 全部需求、工程资源分配 | Owner | **✅ 确认：唯一出口（2026-06-19）** |
| TBD-2 | **旧站关闭时间线**：切换新平台后旧站保留多久？ | 影响运维成本与用户引导 | Owner | **✅ 确认：直接覆盖旧站（2026-06-19）**，Next.js 平台已部署至 shopify.lute-tlz-dddd.top |
| TBD-3 | **G1/G2/G3 接入时间线**：owner 何时开始接入 Clarity/Shopify Analytics？ | P0 维度，影响 CVR 结论可信度 | Owner | **✅ 确认：随时开始（2026-06-19）**，操作手册已输出 |
| TBD-4 | **竞品首次采集**：4 个新竞品采集是否授权自动触发？ | 影响 F4-1 执行 | Owner | **✅ 确认：立即触发（2026-06-19）** |
| TBD-5 | **GEO 内容**：保险内容页/职场专题是否由团队内容人员还是 AI 辅助生成？ | 影响 F5-3/F5-4 工程量 | Owner | ⏳ 待确认 |
| TBD-6 | **browser-harness**：F7 何时提上日程？需要 owner storage state | 影响 Layer 3 采集能力 | Owner + AI团队 | ⏳ 待确认 |
| TBD-7 | **LCP 根本修复**：若 hero 图片为 CSS background，需要修改 Momcozy 主题代码，是否在 Momcozy 技术团队的权限范围内？ | 影响 F2-4 验证结果 | Momcozy 技术团队 | ⏳ 待确认 |

---

## 九、执行路线图（建议）

### Sprint 1（本周，P0 优先）

| 任务 | 负责 | 预计耗时 | 依赖 |
|---|---|---|---|
| **TBD-1 决策**：Next.js 平台切换 vs 双轨 | Owner | 30分钟讨论 | — |
| Next.js 平台同步旧站变更（10竞品/G7/GEO战单） | AI | 2-3小时 | TBD-1确认 |
| Next.js 平台部署到腾讯云（若切换） | AI | 1小时 | TBD-1确认 |
| G4/G8/G10 操作手册补齐（actionItems） | AI | 1小时 | — |
| 4 个新竞品首次采集（eufy/Freemie/Medela/BEABA） | AI（若授权） | 30分钟 | TBD-4确认 |

### Sprint 2（下周，P1）

| 任务 | 负责 | 预计耗时 | 依赖 |
|---|---|---|---|
| TuckGo meta title 修复 + FB Pixel 去重 | Momcozy 技术团队 | — | — |
| G1 Clarity 接入（owner 侧） | Owner | 30分钟 | — |
| G2 Shopify Analytics 分段 CVR 导出（owner 侧） | Owner | 1小时 | — |
| GEO 内容创作：保险渠道内容页初稿 | 内容团队/AI | 3-4小时 | — |
| confidence 计算降级策略（F2-3） | AI | 1小时 | — |

### Sprint 3（2-3周后，P1-P2）

| 任务 | 负责 | 预计耗时 | 依赖 |
|---|---|---|---|
| G3 Klaviyo LTV 队列分析（owner 侧） | Owner | 2小时 | — |
| 职场妈妈场景专题内容 | 内容团队/AI | — | — |
| 下次月度采集验证 LCP 修复效果 | CI 自动 | — | 7月1日触发 |
| 执行战单状态追踪系统（Next.js 平台） | AI | 1-2天 | TBD-1完成 |

### 里程碑

| 里程碑 | 目标日期 | 验收标准 |
|---|---|---|
| **M1：平台决策完成** | 2026-06-20 | TBD-1~2 决策落地文档 |
| **M2：Next.js 平台部署** | 2026-06-21 | platform.shopify.lute-tlz-dddd.top 可访问，数据一致 |
| **M3：360 框架完整** | 2026-06-25 | G4/G8/G10 actionItems 完整；framework.html 无空白维度 |
| **M4：竞品扩至 10 个** | 2026-06-25 | 10 个竞品均有技术采集数据 |
| **M5：GEO 首批内容** | 2026-06-30 | 保险内容页上线；Perplexity 重测保险场景出现 |
| **M6：置信度提升验证** | 2026-07-05 | 月度 CI 采集后验证 LCP 是否可观测，置信度目标 medium |

---

## 十、质量检查清单

- [ ] 所有需求均有 ID、优先级、状态
- [ ] 技术术语均有名词解释
- [ ] TBD 项有明确的决策方和影响范围
- [ ] 里程碑有可验收的标准
- [ ] 双产品架构决策路径清晰
- [ ] PRD 内容不包含：密钥 / 服务器 IP / 私有文件路径 / 原始数据端点
- [ ] 经营金额与 KPI 按 owner 指令明确写入（符合私密经营版规则）
