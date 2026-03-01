```markdown
# 顶级 Agent 编排工作台 - 高级 UI 设计指导文档

> **缺省信息声明：** 
> 获悉当前项目色彩系统基于 `shadcn/ui` 生态并采用完全解耦的 CSS Variables 架构。基于你提供的线框草图与高保真对标图，当前界面缺乏层级呼吸感，且模块呈现出“堆砌感”。
>
> **设计愿景 (Design Vision)：** 
> 本指导文档将以 **“Precision & Intelligence (精准与智能)”** 为核心设计理念，采用 **Clean Minimalist (极简冷峻)** 风格，为你打造一个具备苹果级质感、高度克制且极具沉浸感的生产力工具。我们将全面接管并重塑排版、容器层级、响应式面板及微交互，确保其达到全球顶尖 B2B SaaS 产品的像素级交付标准。

---

## 1. 视觉基础规范 (Design Foundation)

在兼容现有 CSS Variables 的前提下，我们对基础视觉层进行严格收敛。请确保在 `:root` (浅色主题) 层面遵循以下色彩倾向和排版比例，以保证高阶质感。

### 1.1 色彩语义系统 (Semantic Color System)
工作台的核心在于“降噪”，我们将大量使用中性色来构建视觉层级，仅在关键交互点使用品牌色/主色。以下为默认的高阶浅色主题映射规范：

| 变量名 (CSS Variable) | Hex / RGB 推荐值 | 使用场景与视觉逻辑 |
| :--- | :--- | :--- |
| `--background` | `#FFFFFF` / `255, 255, 255` | 全局背景层，保持绝对干净纯粹，避免任何灰色底调。 |
| `--surface` / `--card` | `#F9FAFB` / `249, 250, 251` | 面板内嵌区域背景（如提示词编辑区、配置项卡片）。提供微妙的视觉分区。 |
| `--foreground` | `#09090B` / `9, 9, 11` | 顶级文字（H1-H3、关键表单输入值），对比度需符合 WCAG AAA 标准。 |
| `--muted-foreground`| `#71717A` / `113, 113, 122` | 次要文本（占位符、辅助说明文字、时间戳），降低视觉噪音。 |
| `--border` | `#E4E4E7` / `228, 228, 231` | 全局面板分割线、卡片边框。必须是极其克制的极细线 (`1px`)。 |
| `--primary` | `#6366F1` / `99, 102, 241` | 品牌/强调色（如“发布”按钮、聚焦时的光圈）。采用偏科技感的靛蓝色 (Indigo)。 |
| `--ring` | `#6366F1` / `99, 102, 241` | 焦点状态下的外发光环颜色，透明度通常配合使用。 |

### 1.2 排版系统 (Typography System)
排版是 SaaS 产品的灵魂。我们采用系统默认无衬线字体族，以获得最佳性能与原生质感。
*   **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`

| 层级 (Level) | 字号 (Size) | 行高 (Line Height) | 字重 (Weight) | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **Header (H1)** | `18px` (`1.125rem`) | `28px` | `600` (SemiBold) | 面板大标题（如“人设与回复逻辑”、“编排设置”） |
| **Subtitle (H2)**| `14px` (`0.875rem`) | `20px` | `500` (Medium) | 模块子标题（如“模型设置”、“插件”、“工作流”） |
| **Body (P)** | `14px` (`0.875rem`) | `22px` | `400` (Regular) | 提示词输入区、配置项文本、聊天气泡主体 |
| **Caption** | `12px` (`0.75rem`) | `16px` | `400` (Regular) | 辅助提示、Token 计数、时间戳、占位符 |

---

## 2. 响应式与三栏布局规则 (Layout & Responsive)

作为高密度的编排工作台，采用 `Resizable Panels`（可拖拽调整宽度的面板）是最佳实践。我们基于现代 CSS Grid 和 Flexbox 定义严密的响应式行为。

### 2.1 桌面端基础布局 (Desktop Layout: > 1024px)
*   **全局容器:** `height: 100vh; width: 100vw; overflow: hidden; display: flex; flex-direction: column;`
*   **顶栏 (Header):** 绝对高度 `h-14` (`56px`)，底边框 `1px solid var(--border)`。
*   **主体内容区 (Main Workspace):** 占据剩余视口高度 `calc(100vh - 56px)`。采用 3 栏 Flex/Grid 布局，中间通过拖拽柄 (Resizer Handle) 分割。

**三栏宽度配置建议 (默认比例 30% : 30% : 40%)：**
1.  **左侧（提示词编辑区）:** `min-width: 280px; max-width: 40%; flex-basis: 30%;`
2.  **中侧（编排设置区）:** `min-width: 320px; max-width: 40%; flex-basis: 30%;`
3.  **右侧（预览与调试区）:** `min-width: 360px; flex: 1;` （吸收剩余空间）

### 2.2 响应式断点规则 (Breakpoints System)

| 断点 (Breakpoint) | 触发宽度 | 布局重构逻辑 (Layout Behavior) |
| :--- | :--- | :--- |
| **Desktop (默认)** | `≥ 1024px` | 完整显示三栏 Resizable 布局，所有模块平铺。 |
| **Tablet (平板)** | `768px - 1023px`| 降级为两栏布局。左侧与中间栏合并为一个 Tab 切换区（Tab 1: 人设与提示词, Tab 2: 编排设置），右侧预览调试区保持常驻。拖拽柄保留。 |
| **Mobile (移动端)**| `< 768px` | 降级为单栏布局。默认显示“预览与调试”界面。提示词与编排配置折叠入底部的浮层 (Bottom Sheet / Drawer) 或汉堡菜单中。禁用可拖拽柄。 |

---

## 3. 核心组件与 UI 细节 (Components & Details)

为了消除草稿中的“粗糙感”，我们需通过细腻的阴影、圆角和留白（Padding）来重塑核心组件。

### 3.1 视口分割线与拖拽柄 (Resizer Handle)
*   **基础样式:** 宽度 `4px`，背景色透明。
*   **交互状态:** 处于 `hover` 或 `active` 时，中心显示一条 `2px` 宽的 `var(--primary)` 颜色指示线。
*   *设计意图：不打扰用户的视觉，但在需要交互时提供极其精准的反馈。*

### 3.2 容器与卡片质感 (Cards & Containers)
*   **全局圆角体系 (Border Radius):** 
    *   面板外部容器：不设圆角（紧贴屏幕边缘）。
    *   内部卡片/输入框/下拉菜单：`radius: 8px` (`0.5rem`)。
    *   按钮/标签：`radius: 6px` (`0.375rem`)。
*   **输入框 (Textarea - 提示词编辑区):**
    *   无外边框设计，采用软性背景色区分：`background: var(--surface); border: 1px solid transparent;`
    *   `Focus` 状态下：`background: var(--background); border-color: var(--primary); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);`

### 3.3 折叠面板 (Accordion - 中间编排设置区)
目标对标图中间栏采用了高密度的折叠面板逻辑。
*   **Item 间距:** 消除默认的 `margin`，采用上下贯通的 `1px solid var(--border)` 分割线。
*   **Header 填充 (Padding):** `padding: 12px 16px`。
*   **图标对齐:** 左侧为图标/标题，右侧为主操作（如添加 `+` 或下拉箭头 `Chevron`），绝对垂直居中。

### 3.4 聊天气泡 (Chat Bubbles - 右侧调试区)
*   **AI 气泡 (左侧):** 
    *   背景无色或极淡的灰色 `background: transparent`。
    *   文本与界面左对齐，去除包裹感，专注于 Markdown 内容渲染的可读性。
*   **User 气泡 (右侧):** 
    *   背景采用主题色弱化版：`background: var(--surface)`。
    *   圆角处理：`border-radius: 12px 12px 0 12px` (右上角尖角指向用户)。

---

## 4. 丝滑动效与微交互 (Motion & Interaction)

高级感往往来源于不可见的动画曲线。绝不允许使用线性动画 (`linear`)，所有动效必须基于精心调校的贝塞尔曲线。

### 4.1 全局缓动函数 (Global Easing)
前端实现时，请在全局配置或 Tailwind 扩展中定义以下贝塞尔曲线：
*   **Snappy (清脆干练):** `cubic-bezier(0.2, 0.8, 0.2, 1)` —— 用于元素 Hover、弹窗出现。
*   **Smooth (柔和流畅):** `cubic-bezier(0.4, 0, 0.2, 1)` —— 用于折叠面板展开、页面切换。

### 4.2 关键微交互规范 (Micro-interactions)

#### Interaction A: 按钮与图标组 Hover 态
*   **Trigger (触发条件):** 鼠标悬停在顶部导航栏“发布”按钮或右侧调试区的操作 Icon 上。
*   **Action (状态变化):**
    *   Ghost Icon Button：背景色从透明变为 `var(--surface)`，图标颜色变深。
    *   Primary Button：采用轻微的缩放反馈 `transform: scale(0.97)`，增加点击的物理按压感。
*   **Duration (持续时间):** `150ms`
*   **Easing (缓动曲线):** Snappy

#### Interaction B: Accordion 折叠面板顺滑展开 (Middle Panel)
*   **Trigger (触发条件):** 点击中间编排设置区的“模型”、“知识库”等标题模块。
*   **Action (状态变化):**
    *   内容区域 `height` 从 `0` 过渡到 `auto` (前端建议使用 Grid 动画 `grid-template-rows: 0fr` 至 `1fr` 的 hack，或基于 Radix/shadcn 的默认折叠动画)。
    *   右侧 Chevron 图标 `transform: rotate(-180deg)`。
    *   内容透明度 `opacity` 从 `0` 到 `1`，且带有一点向下位移的交错感 `transform: translateY(-4px) -> translateY(0)`。
*   **Duration (持续时间):** `250ms`
*   **Easing (缓动曲线):** Smooth

#### Interaction C: Resizer Panel 拖动反馈 (全局分割线)
*   **Trigger (触发条件):** 鼠标悬停及拖拽中间分割线。
*   **Action (状态变化):**
    *   Hover: 分割线透明度变化，鼠标指针变为 `col-resize`。
    *   Active (拖拽中): 工作台主体内容区 (尤其是文本和复杂组件) 禁用指针事件 (`pointer-events: none`) 与文本选中 (`user-select: none`) 以保证拖拽如丝般顺滑；分割线高亮呈现品牌主色 `var(--primary)`。
*   **Duration (持续时间):** Hover 延迟 `100ms` 触发（防止误触），过渡动画 `150ms`。
*   **Easing (缓动曲线):** Snappy
```