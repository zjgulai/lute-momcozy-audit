# Private Data Provenance & Publication Boundary

## Scope

生成站点属于**私密经营版**，允许在站点页面中展示真实经营金额与运营 KPI。该项目通过固定生成链路将私密数据转译为报告文本与指标阐述，最终产物为静态网站快照。

## Data Flow

1. 运营/采集原始数据通过 `src/_data/public-cross-audit.json` 和
   `src/_data/sessions/*.json` 提供审计输入。
2. `scripts/build-history-site.mjs` 聚合输入并渲染为 `_site/*.html`。
3. 发布前由 `npm test` 进行:
   - schema 校验（`test:allowlist`、`test:sessions`）
   - 路由与版本契约校验（`test:release-contract`）
   - 内容安全校验（`test:source-safety`、`test:safety`）
4. 监控和发布流程再通过 `scripts/uptime-monitor.mjs` 与工作流二次确认。

## Publication Boundary (Allowed)

- 真实金额与货币金额展示
- KPI 文案与关键指标（ROI、AOV、monthly_revenue、overall conversion rate 等）
- 历史经营数据、当前经营数据、采集数据摘要与趋势对比

## Publication Boundary (Forbidden)

- 私钥、密钥片段、敏感凭证
- 私有文件路径（如 `~/.ssh`、`/var` 等本机路径）
- 服务器地址与原始接口路径（如本机端口地址、未清洗的接口路径）
- 原始结构化数据文件链接

## Verification

- 发布边界规则与发布契约须一并通过 `npm run test:release-contract`。
- 变更私有数据来源、可见字段规则或导出字段时必须同步更新：
  - `config/private-data-publication-boundary.json`
  - 本文档
