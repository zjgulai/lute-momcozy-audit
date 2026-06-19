# Momcozy 诊断平台 · 设计系统规范

## 参考源分析

### 1. LaunchFast 文档站特征
- **风格**：现代化 SaaS 文档
- **配色**：极简中性 + 蓝色强调
- **排版**：大量留白，层级清晰
- **组件**：最小化，玻璃态卡片
- **密度**：宽松，易读

### 2. 锤子商城特征
- **风格**：极简主义，工业设计感
- **配色**：黑白灰为主
- **排版**：负空间利用，字重对比强
- **组件**：网格化，清晰分割
- **线条**：1px 细线，严谨网格

---

## 色彩系统

### 核心色板

中性色：
- 背景: #FFFFFF
- 浅背景: #FAFAFA
- 浅灰: #F3F3F3
- 分割线: #E8E8E8（锤子风格）
- 边框: #D9D9D9
- 禁用: #BFBFBF
- 辅助文本: #787887
- 正文: #3C3C44

强调色：
- 主色蓝: #5079D9（LaunchFast 链接 = 锤子蓝）
- 深蓝: #3F5FB5
- 更深蓝: #2D4699

语义色：
- 成功绿: #10B981
- 警告橙: #F59E0B
- 失败红: #EF4444
- 信息青: #06B6D4

### 应用映射

| 用途 | 色值 | 备注 |
|------|------|------|
| 页面背景 | #FFFFFF | 纯白 |
| 卡片背景 | #FAFAFA | LaunchFast |
| 文本主体 | #3C3C44 | 黑灰 |
| 文本辅助 | #787887 | 中灰 |
| 分割线 | #E8E8E8 | 浅灰（锤子） |
| 边框 | #D9D9D9 | 稍深 |
| 链接/按钮 | #5079D9 | 蓝 |
| 状态：通过 | #10B981 | 绿 |
| 状态：预警 | #F59E0B | 橙 |
| 状态：失败 | #EF4444 | 红 |

---

## 字体系统

### 字体栈

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
             'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB',
             'Heiti SC', 'Microsoft YaHei', sans-serif;
```

### 尺寸与权重

H1: 33.75px / 600 / line-height: 1.15 / margin: 0 0 12px 0
H2: 18px / 600 / line-height: 1.33 / margin: 36px 0 18px 0
H3: 16px / 600 / line-height: 1.6 / margin: 25.6px 0 9.6px 0
正文: 14px / 400 / line-height: 1.6
小文本: 12px / 400 / line-height: 1.5
按钮: 14px / 500 / line-height: 1.4

---

## 组件规范

### 按钮

主按钮（Primary）：
- 背景: #5079D9
- 文本: 白
- 填充: 10px 20px
- 圆角: 8px
- 字重: 600
- hover: #3F5FB5
- active: #2D4699

次要按钮（Secondary）：
- 背景: #F3F3F3
- 文本: #3C3C44
- 填充: 10px 20px
- 圆角: 8px
- 边框: 1px solid #D9D9D9

### 卡片

- 背景: #FAFAFA
- 边框: 1px solid #E8E8E8
- 圆角: 12px
- 填充: 24px
- 阴影: 0 1px 3px rgba(0,0,0,0.05)

### 表格

- 表头背景: #F3F3F3
- 表头底线: 2px solid #E8E8E8
- 行填充: 10px 16px
- 行边框: 1px solid #E8E8E8
- 行hover: #FAFAFA

### 徽章

- 填充: 4px 12px
- 圆角: 16px（药片形）
- 字体: 12px / 600
- 评级A: 绿 #10B981
- 评级B: 橙 #F59E0B
- 评级C/D: 红 #EF4444
- 评级F: 黑 #1F2937

### 输入框

- 填充: 10px 12px
- 边框: 1px solid #D9D9D9
- 圆角: 6px
- focus: 边框 #5079D9 + 光晕

---

## 布局与间距

### 间距基准（8px）

xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px

### 容器

- 最大宽度: 1200px
- 左右填充: 24px（桌面） / 16px（移动）
- 栅格: 12列，列间距 24px

---

## 数据可视化

### 评级配色

A10-A7: 绿色系 (#10B981 → #A7F3D0)
B5-B3: 橙色系 (#F59E0B → #FCD34D)
C2-C1: 红色系 (#EF4444 → #F87171)
F: 黑灰 (#1F2937)

### 图表色序

#5079D9（主）
#10B981（通过绿）
#F59E0B（预警橙）
#EF4444（失败红）
#8B5CF6（紫）
#06B6D4（青）

---

## 诊断平台应用示例

### 数据卡片

```html
<div class="card elevated">
  <div class="header">
    <h3>性能总分</h3>
    <span class="badge grade-a">A7</span>
  </div>
  <div class="metric">
    <span class="value">87/100</span>
    <span class="label">较上月 +5 分</span>
  </div>
</div>
```

### 对标表格

| 指标 | 当前 | 目标 | 状态 |
|------|------|------|------|
| LCP | 2.1s | <2.5s | ✓ 通过 |
| CLS | 0.15 | <0.1 | ⚠ 预警 |
| TTFB | 600ms | <600ms | ✗ 失败 |

---

## 交互动效

过渡: 0.2s cubic-bezier(0.4, 0, 0.2, 1)
按钮hover: translateY(-1px) + 阴影
卡片hover: 边框蓝 + 蓝色光晕阴影
加载: pulse 动画 2s

