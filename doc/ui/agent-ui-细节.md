# 顶级 Agent 编排工作台 - 核心模块详细设计规范 (UI/UX Blueprint)

> **文档说明：** 
> 本文档基于第一阶段的基础视觉规范与响应式布局逻辑，深入至**原子级组件 (Atomic Components)** 与**具体视图 (Specific Views)** 的像素级设计标准。本规范完全贴合 `shadcn/ui` 生态（基于 Radix UI 的无障碍基元）与 Tailwind CSS 实用类逻辑，确保前端团队可实现零偏差、高保真的落地还原。

---

## 1. 交付标准与覆盖范围 (Delivery Standards & Scope)

为确保输出达到全球顶尖生产力工具（如 Linear, Vercel）的质感，本期交付必须严格遵从以下量化标准：

### 1.1 量化验收标准 (Acceptance Criteria)
*   **空间对齐绝对化 (Spatial Alignment)：** 全局严格遵循 `4px` 基础栅格系统（如间距仅允许为 4, 8, 12, 16, 24, 32px）。所有模块的内边距 (Padding) 与外边距 (Margin) 必须在视觉上形成完美参考线。
*   **状态全覆盖 (State Completeness)：** 任何可交互元素（按钮、卡片、列表项、输入框）必须包含明确的 `Default`, `Hover`, `Focus-visible` (键盘导航保护), `Disabled` 四种状态规范。
*   **DOM 结构极简原则：** 避免无意义的嵌套 `div`，利用现代 CSS Grid / Flexbox 解决复杂布局，确保渲染性能。

### 1.2 涵盖核心视图模块 (Covered Modules)
1.  **Global Header:** 全局顶栏（面包屑与基础操作）。
2.  **Left Panel (人设与回复逻辑):** 高级提示词编辑区。
3.  **Middle Panel (编排设置区):** 模型配置、插件挂载、工作流与知识库接入（高密度表单与卡片列表）。
4.  **Right Panel (预览与调试区):** 会话流呈现与沉浸式测试输入。

---

## 2. 全局顶栏设计 (Global Header)

顶栏作为视口的最高层级，需保持极度的视觉克制，将视线焦点让渡给下方的工作区。

*   **容器规范:** `height: 56px`, `padding: 0 16px`, `display: flex`, `justify-content: space-between`, `align-items: center`。底边框采用 `1px solid var(--border)`。
*   **左侧 (身份与状态):**
    *   **返回图标:** 尺寸 `16x16px`，颜色 `var(--muted-foreground)`，Hover 时背景出现 `24x24px` 的轻度色块 `var(--surface)`，圆角 `6px`。
    *   **标题组 (Breadcrumb):** 
        *   主标题：“AgentApp Main”，字号 `14px`，字重 `500` (Medium)，颜色 `var(--foreground)`。
        *   状态戳：“已保存” / “最近更新: 时间”，字号 `12px`，颜色 `var(--muted-foreground)`，距离主标题 `gap: 8px`。
*   **右侧 (全局操作):**
    *   采用 Button Group 形式，间距 `gap: 8px`。
    *   **次要按钮 (Secondary - 保存配置):** 背景色 `var(--secondary)` (或浅灰)，文字色 `var(--secondary-foreground)`，悬停时背景加深 `5%`。
    *   **主按钮 (Primary - 发布):** 背景色 `var(--primary)`，文字色 `white`。采用 `shadow-sm`。

---

## 3. 左栏：人设与回复逻辑区 (Prompt Editor View)

此区域是 Prompt 工程师的核心工作区，设计目标是**“无干扰的沉浸式输入”**。

*   **头部容器:** 高度 `48px`，左右 Padding `16px`。标题字号 `14px`，字重 `600`。
*   **编辑容器 (The Editor):**
    *   **背景与边框:** 放弃传统的带边框输入框。整个编辑区域即为一个巨大的 Textarea 容器。无可见边框 (`border: none`)，背景色统一为 `var(--background)`。
    *   **排版 (Typography):** 考虑到可能包含伪代码或结构化 Prompt，字体建议提供等宽字体选项，默认使用 `sans-serif`。字号 `14px`，行高 `1.6` (即 `22px`)，增加阅读舒适度。颜色 `var(--foreground)`。
    *   **占位符 (Placeholder):** 颜色 `var(--muted-foreground)`。
*   **底部浮动工具栏 (Toolbar - 选配增强):**
    *   定位在编辑器底部（距底 `16px`，水平居中或右下角）。
    *   包含快捷插入变量的 Icon `{ }`、Token 估算计数器（如 `1,240 tokens`）。视觉处理需极其微弱（透明度 `60%`，Hover 变 `100%`），绝对不抢主视野。

---

## 4. 中栏：编排设置区 (Orchestration & Config View)

此区域具有最高的信息密度，采用 `Accordion` (折叠面板) 结合 `Bento UI` (便当盒布局) 的理念来组织复杂表单。

### 4.1 模型选择器 (Model Selector Dropdown)
这是编排区的灵魂组件，需展现极高的专业度。

| 元素 | 设计与交互规范细节 |
| :--- | :--- |
| **触发器 (Trigger)** | 伪装成输入框外观。`height: 36px`，`border: 1px solid var(--border)`，`border-radius: 8px`，背景 `var(--background)`。内部左侧显示当前模型 Icon (如 OpenAI Logo 的极简 SVG, `16px`) 和名称 (字重 `500`)，右侧绝对居中一个向下的 Chevron Icon (`14px`, `var(--muted-foreground)`)。<br>**Hover 态:** 边框色变深至 `var(--muted-foreground)`。<br>**Focus 态:** `ring-2` 效果，`ring-color: rgba(99,102,241, 0.2)`，边框变为 `var(--primary)`。 |
| **下拉面板 (Popover)** | 点击触发器后弹出。宽度与触发器等宽。`border-radius: 8px`，`box-shadow: 0 10px 38px -10px rgba(22, 23, 24, 0.35), 0 10px 20px -15px rgba(22, 23, 24, 0.2)` (模拟 Radix UI 的高级阴影)。背景绝对纯白 `var(--background)`。 |
| **搜索框 (Search)** | 面板顶部吸顶。`height: 40px`，无边框，底部有 `1px solid var(--border)`。带左侧放大镜 Icon，占位符 "搜索模型..."。 |
| **选项列表 (List Item)** | 高度 `36px`，左右 Padding `8px`，外层 Margin `4px`。垂直居中。内部包含：左侧提供商 Icon (`16px`)，主标题 (如 `gpt-4-turbo`)，右侧可能带有 Badge (如 `Pro` 或 `Vision` 标签，极小号字体 `10px`，淡色背景)。<br>**Hover 态 (Active):** 背景变为 `var(--surface)`，圆角 `6px`，文字高亮。 |

### 4.2 参数调节区 (Slider & Inputs Bento Grid)
如 Temperature, Top P 等参数的布局。
*   **布局逻辑:** 采用 2 列的 Grid 布局 (`grid-template-columns: 1fr 1fr; gap: 16px;`)。
*   **单一控制组 (Control Group):**
    *   **Label 栏:** 包含标题 (如 "温度") 和当前值输入框。标题字号 `12px`，颜色 `var(--muted-foreground)`；当前值采用极简无边框数字输入框，悬停出现极淡的背景块。
    *   **Slider 滑块:** 轨道高度 `4px`，背景 `var(--surface)`。填充段 (Track fill) 为 `var(--foreground)` (冷峻风格，不使用品牌色以避免刺眼)。滑块把手 (Thumb) 为 `16x16px` 的白色纯圆，带严谨的 `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`。<br>**交互:** 拖动时 Thumb 放大至 `1.1` 倍，轨道过渡平滑。

### 4.3 技能/插件/知识库挂载列表 (List Items)
用于展示已添加的工具（如 Web Search, 数据库）。
*   **卡片化呈现:** 每个已添加的插件作为一个整宽条目。`padding: 8px 12px`, `border: 1px solid var(--border)`, `border-radius: 8px`, `background: var(--background)`, 元素间距 `gap: 8px`。
*   **元素构成:**
    *   左侧：模块专属 Icon (带背景色的方形圆角容器，`size: 24px`, `radius: 6px`)。
    *   中间：标题与极简描述 (`truncate` 截断，单行显示)。
    *   右侧：Hover 时出现的快捷操作区 (如设置小齿轮Icon、删除垃圾桶Icon，颜色默认为浅灰，Hover 图标时分别变为深灰与危险色 `var(--destructive)`)。

---

## 5. 右栏：预览与调试区 (Preview & Debug View)

模拟真实终端用户的对话体验，兼顾开发者的 Debug 诉求。

### 5.1 调试视图顶栏 (Header)
*   与左栏头部对齐，高度 `48px`。
*   **标题组:** 包含“会话”下拉选单（管理不同测试线程），及“新建会话” (`Ghost Button` 样式，带 `+` Icon）。
*   **高级调试 Switch:** 提供一个紧凑的 Toggle/Switch（“深度思考 / 展开执行路径”）。开启时，AI 会话气泡下方展示执行耗时、调用了哪个插件、Token 消耗等元数据。

### 5.2 对话展示区 (Chat Scroll Area)
*   **背景:** 略异于主背景，推荐采用极浅的 `var(--surface)` 或背景加上极稀疏的网格图案 (`Grid Pattern` 透明度 3%) 营造“测试环境”的隐喻。
*   **空白态 (Empty State):** 居中展示应用大图标 (Icon `48px`)，下方文字“发送消息开始调试”，颜色 `var(--muted-foreground)`。
*   **气泡气场 (Bubbles):**
    *   **User:** 靠右，背景 `var(--background)`，边框 `1px solid var(--border)`，圆角 `12px 12px 0 12px`，最大宽度 `80%`。
    *   **Agent (AI):** 靠左，无边框，无明显背景色（融入底色），纯文字与 Markdown 渲染区。最大宽度 `90%`。若包含思考过程，以折叠面板 `Accordion` 形式前置展示（标题为“思考过程 0.5s”，字号 `12px`）。

### 5.3 底部输入区 (Message Input Bottom Bar)
*   **输入框容器:** 浮动在底部的卡片形态。`margin: 16px`，`border-radius: 12px`，`border: 1px solid var(--border)`，`box-shadow: 0 4px 12px rgba(0,0,0,0.05)`。内部背景纯白。
*   **多行输入 (Textarea):** 自动增高 (`min-height: 40px`, `max-height: 200px`)。字号 `14px`。
*   **操作群组:** 
    *   左下角：附件/图片上传 Icon (`+` 或回形针)。
    *   右下角：发送按钮 (`Enter` 发送，`Shift+Enter` 换行)。发送按钮底色 `var(--foreground)` (黑/深灰)，带向上的箭头 Icon。输入框有值时，按钮透明度 `100%`；空值时 `disabled` 且透明度 `30%`。

---

## 6. 微交互动效细则 (Micro-Interaction Specs)

（作为开发者直接复制至 CSS / Tailwind Config 的参考）

```css
/* 设计总监动效预设 (Design Director's Easing Tokens) */
:root {
  /* 用于菜单弹出、下拉框、Tooltip - 迅捷无残影 */
  --ease-out-flex: cubic-bezier(0.16, 1, 0.3, 1);
  /* 用于面板折叠、大幅度页面重排 - 连贯柔和 */
  --ease-in-out-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 基础时长映射 */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
}

/* 示范：Model Dropdown 的顺滑展开动效 (配合 Radix UI 等库) */
@keyframes slideUpAndFade {
  from { opacity: 0; transform: translateY(4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.model-dropdown-content[data-state="open"] {
  animation: slideUpAndFade var(--duration-fast) var(--ease-out-flex) forwards;
  will-change: transform, opacity;
}
```

> **总结批注：**
> 前端工程化落地时，请务必保证对所有 `:focus-visible` 伪类进行定义，使用 `ring` 属性替代粗暴的 `outline: none`，这不仅是专业级 UI 的底线，更是高级无障碍设计（A11y）的硬性要求。上述规范的所有尺寸与间距，若能在开发中抽象为 Design Tokens，将极大提升后续迭代的效率与视觉一致性。