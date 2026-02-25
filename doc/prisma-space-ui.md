# 元象空间（PrismaSpace）UI 美学规范（全局项目视野）

**版本**：1.1
**适用对象**：UI 设计师 / 前端开发
**适用范围**：Marketing（门面）+ Platform（控制台）+ Studio（IDE）全局一致性约束
**核心设计原则**：**内容优先、状态可辨、跨层一致**（Content First, State Clarity, Cross-Layer Consistency）

> UI 以内容与状态为中心，装饰性元素最小化，所有视觉决策必须可由设计系统 tokens 复现。

---

## 0. 文档使用方式（必须遵守）

1. **先选层级，再做组件**：任何页面/模块开工前，先确认属于 **Marketing / Platform / Studio** 哪一层。
2. **两套视觉层级严格隔离**：

   * **Marketing / Platform**：标准密度，卡片/列表为主，避免 IDE 组件与 AI 语义组件的默认外观。
   * **Studio（IDE）**：紧凑密度，面板化布局，强调状态与操作效率。
3. **优先用 Token，而不是“感觉”**：颜色、字号、圆角、边框、阴影、动效都必须从本文给的 tokens/规则落地。
4. **AI 语义必须可识别**：AI Glow 只能在“AI 正在思考/生成/执行流”出现，禁止装饰性滥用。

---

## 1. 信息架构与路由分区（全局约束）

将产品拆为三个顶层入口，防止“门面被工具感污染”：

1. **Marketing（门面）**：`/`、`/templates`、`/templates/:id`、`/pricing`、`/docs`、`/community`
2. **Platform（SaaS 控制台）**：`/app`、`/app/projects/:id`、`/app/team`、`/app/billing`
3. **Studio（IDE）**：`/studio/:projectId/...`（UiApp / Workflow / Agent / DB / KB）

**上下文一致性（必须）**：UI 始终明确“用户 → 团队 → 工作空间（Workspace）”三级上下文。切换团队即切换计费与权限边界。

---

## 2. 组件库使用边界（平台层限制，创作层强化）

### 2.1 禁止默认外溢原则（红线）

> **不要在 Marketing / Platform 的常规页面默认使用 `ai-elements-vue` 组件库。**

`ai-elements-vue` 适用于 **Studio/IDE/AI 语义**（Chat / Thought / ToolCall / Markdown / 工具态等）。直接用于门面会导致“工具感过强、气质割裂”。

### 2.2 落地策略

* **Marketing / Platform**：优先 **Shadcn / Reka-ui / Tailwind 基础组件** 或原生样式。
* **Studio（IDE）**：可使用 `ai-elements-vue` + Shadcn/Reka-ui/Tailwind，并强化密度与 AI 状态表达。
* **一致性约束**：若 Platform 需复用少量 `ai-elements-vue`：

  1. 必须走统一样式适配层（tokens / class overrides）；
  2. 必须通过设计评审；
  3. 禁止带出 IDE 的默认密度与语义外观。

---

## 3. 设计 Tokens（全局默认）

> 本节定义“全局外观变量”。颜色、字号、圆角、边框、阴影、动效必须从设计系统 tokens 落地，不允许页面级自定义色值。

### 3.1 色彩系统：对齐 shadcn 主题变量

**唯一来源**：`prismaspace-frontend/doc/shadcn-colors.md` 与 `app/globals.css` 中的 CSS 变量。

**禁止**：

* 硬编码 hex / rgb / hsl
* 直接使用 Tailwind 固定色名（例如 `zinc-*`、`slate-*`）
* 自定义渐变或阴影色

**使用约束（示例）**：

* 页面背景：`bg-background`
* 承载面：`bg-card`、`bg-popover`、`bg-sidebar`
* 主文字/次文字：`text-foreground` / `text-muted-foreground`
* 分割与输入：`border-border`、`border-input`、`bg-muted`、`bg-secondary`
* 主交互：`bg-primary text-primary-foreground`，焦点环 `ring-ring`
* 异常/拦截：`bg-destructive`（文字对比使用组件默认前景或 `text-foreground`）

**AI 运行态（唯一允许的“发光”）**：

* 仅在 AI **思考 / 生成 / 执行**状态出现
* 只能使用 `primary` / `ring` / `accent` token 的低透明度描边或外发光
* 禁止新增颜色、渐变或装饰性光效

### 3.2 字体与排版（Typography）

**字体栈**

* UI：`Inter, system-ui, -apple-system`
* 代码/ID/Schema/DSL：`JetBrains Mono, Fira Code`

**层级控制（只用字重 + 主题文本色）**

* 一级信息：`font-semibold` + `text-foreground`
* 二级信息/标签：`font-medium` + `text-muted-foreground`

### 3.3 形状与质感（Shape & Texture）

* **圆角**：统一使用主题 `--radius`，禁止私自定义非标准半径。
* **边框**：统一 1px，颜色使用 `border-border`。
* **区域分隔**：优先使用不同 surface token（`background`/`card`/`muted`）+ 1px 边框，避免多重分割线叠加。

---

## 4. 动效与反馈（全局交互统一）

### 4.1 微交互（Micro-interactions）

* **按钮按压感**：点击必须 `scale-95`。
* **加载**：必须使用 Skeleton，与内容形状匹配；禁止全屏 Loading 转圈。
* **流式优先**：AI 输出必须渐进式展示，避免长时间静默。

### 4.2 提示体系（Toast / Modal）

* 成功/提示/警告/失败：统一 Toast 组件，使用 `variant` 与图标区分；颜色来源仅限主题 tokens。
* **业务阻断（唯一允许打断）**：

  * **402（配额/余额不足）**：强拦截 Modal，引导升级/充值
  * **403（权限不足）**：强拦截 Modal，引导申请权限/查看说明

> **402/403 是业务态，不是异常。** 文案与样式需与 `/pricing`、`/app/billing` 保持一致。

---

## 5. 三层页面的全局外观策略

### 5.1 Marketing（门面）

**目标**：模板发现与转化。

* 版式使用标准密度与通用组件。
* 主要视觉来自 **真实模板缩略图与产品截图**。
* AI 运行态提示仅按 “AI 运行态” 规则使用。

### 5.2 Platform（控制台）

**目标**：高效率管理与清晰的 Workspace 上下文。

* 布局容器化：卡片与列表为主，使用 `bg-card` / `border-border`。
* 图标：优先 Lucide 线条图标。
* 指标：大数字 + sparkline，颜色使用 `muted` / `primary` / `chart-*` token。

### 5.3 Studio（IDE）

**目标**：高效率编辑与运行。

* 面板化布局：面板之间无间隙，通过 `border-border` 分隔。
* 可折叠/可拖拽分栏：资源树、属性面板支持调整。
* 工具栏：可悬浮，背景使用 `bg-popover` 或 `bg-card`，如使用模糊需保持对比度可读。

---

## 6. 全局组件清单（跨层复用的“稳定件”）

这些组件允许在三层复用，但必须按对应层级 token 呈现：

1. **Button（Primary/Secondary/Ghost）**：Primary 仅使用 `primary` token，其他为中性 token。
2. **Input / Select / Search**：对比度控制，聚焦环使用 `ring` token。
3. **Card / Panel**：统一 1px 边框 + 微 elevation。
4. **Toast / Modal**：提示体系统一；402/403 模态为商业化与权限的唯一拦截入口。
5. **Skeleton**：所有异步加载必须覆盖。

---

## 7. 设计验收 Checklist（上线前必过）

* [ ] 页面层级正确：Marketing/Platform/Studio 之一（无混搭）
* [ ] `primary` token 亮色面积 ≤ 5%
* [ ] AI Glow 只在 AI 运行态出现
* [ ] 组件库边界合规：门面未默认使用 ai-elements-vue
* [ ] 加载为 Skeleton，按钮有 `scale-95`
* [ ] 402/403 以模态强拦截，其他错误尽量 Toast
* [ ] 字体：UI 与 Monospace 使用场景正确
* [ ] 全部颜色来自 shadcn 主题 tokens（无硬编码色值）

---

**一句话总结**：

> **让 PrismaSpace 看起来像一个你愿意在里面工作 8 小时的工具。**
