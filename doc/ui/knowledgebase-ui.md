# 《高级UI设计指导文档：顶级向量知识库 (RAG) 工作台》

## 1. 设计愿景与核心基调 (Design Vision)

本项目旨在打造一个具有**现代极简主义（Clean Minimalist）**与**专业生产力工具（Pro-tools）**属性的 RAG 知识库工作台。表面上，它呈现为一套静谧、高效、无感知的专业文档管理系统；底层则通过高密度的交互细节，支撑起复杂的向量分块（Chunking）、检索（Retrieval）与大模型配置（LLM Config）等高阶功能。

**核心风格关键字：** 极简冷峻、高信息密度、呼吸感、所见即所得（WYSIWYG）、隐性操作（Progressive Disclosure）。

---

## 2. 视觉基础规范 (Design Foundation)

鉴于项目基于 `shadcn/ui` 生态并采用完全解耦的 CSS Variables 架构，本规范以语义化 Design Tokens 为核心，并提供满足 WCAG 2.1 AAA 级对比度标准的默认参考色值（适配 Light/Dark 模式）。

### 2.1 调色板系统 (Color System)

| Token (CSS Variable) | 语义与使用场景 (Usage) | Default Light (Hex / RGB) | Default Dark (Hex / RGB) |
| :--- | :--- | :--- | :--- |
| `--background` | 全局应用背景 | `#FFFFFF` / `255,255,255` | `#09090B` / `9,9,11` |
| `--foreground` | 全局主文本、核心图标 | `#09090B` / `9,9,11` | `#FAFAFA` / `250,250,250` |
| `--muted` | 弱化背景（如侧边栏、搜索框背景） | `#F4F4F5` / `244,244,245` | `#27272A` / `39,39,42` |
| `--muted-foreground` | 辅助文本（日期、元数据、省略号） | `#71717A` / `113,113,122` | `#A1A1AA` / `161,161,170` |
| `--primary` | 核心操作（按钮、选中高亮背景） | `#18181B` / `24,24,27` | `#FAFAFA` / `250,250,250` |
| `--border` | 分割线、卡片边框、Resizer 手柄 | `#E4E4E7` / `228,228,231` | `#27272A` / `39,39,42` |
| `--accent` | 列表项 Hover、选中状态背景 | `#F4F4F5` / `244,244,245` | `#27272A` / `39,39,42` |
| `--ring` | 焦点光环（Focus State） | `#18181B` / `24,24,27` | `#D4D4D8` / `212,212,216` |

### 2.2 排版系统 (Typography)

采用无衬线几何字体，首推 **Geist Sans** 或 **Inter**。字体层级需严格遵循以下规范，以确保阅读区的屏效比：

| 样式层级 | 字号 (Font-size) | 行高 (Line-height) | 字重 (Font-weight) | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| `Heading-1` | `24px (1.5rem)` | `32px` | `600 (Semibold)` | 页面主标题（如 Playground 标题） |
| `Heading-2` | `18px (1.125rem)`| `28px` | `600 (Semibold)` | 弹窗标题、区块标题 |
| `Body-Base` | `14px (0.875rem)`| `20px` | `400 (Regular)` | 分片(Chunk)正文内容、设置项描述 |
| `Body-Medium`| `14px (0.875rem)`| `20px` | `500 (Medium)` | 左侧文档列表名称、按钮文本 |
| `Caption` | `12px (0.75rem)` | `16px` | `400 (Regular)` | 状态标签、更新时间、Tooltip 文本 |

### 2.3 几何与深度 (Geometry & Shadows)

- **圆角 (Border Radius):** 
  - 全局变量 `--radius` 建议设定为 `0.5rem (8px)`。
  - 内部微小元素（如标签、Checkbox）使用 `calc(var(--radius) - 2px)`。
  - 弹窗 (Dialog) 使用 `calc(var(--radius) + 4px)`。
- **阴影 (Shadows):**
  - **Dropdown/Context Menu/Tooltip:** `box-shadow: 0 4px 12px rgba(0,0,0, 0.08), 0 0 0 1px var(--border);` (暗黑模式下阴影透明度提至 `0.3`，保留 border 约束边界)。

---

## 3. 布局与响应式规则 (Layout & Responsive)

整个应用采用视口级满屏布局（`100vh`, `100vw`），核心是基于 `react-resizable-panels` 理念的左右动态比例布局。

### 3.1 栅格与间距系统 (Spacing System)

基于 `4px` 步进规则：
- `2px (Micro)`: 图标与文字间距
- `8px (xs)`: 列表内元素间距
- `16px (sm)`: 卡片内边距 (Padding)
- `24px (md)`: 容器模块间距

### 3.2 响应式断点逻辑 (Breakpoints)

| 断点 (Breakpoint) | 触发条件 | 布局行为与形态变化 (Layout Behavior) |
| :--- | :--- | :--- |
| **Mobile** | `< 768px` | **折叠态：** 左右分屏失效。左侧文档列表占满全屏，点击某个文档后，右侧内容管理器以 Drawer（底部抽屉）或全屏 Slide-in 形式覆盖推入。 |
| **Tablet** | `768px - 1024px` | **固定侧边栏：** 左右分屏开启。左侧面板固定宽度 `260px`（不支持 Resizable 以防止触控误操作），右侧自适应占据剩余空间（`flex: 1`）。 |
| **Desktop** | `1024px - 1440px`| **动态分屏 (Resizable)：** 左侧面板 Default 宽度 30%，Min 20%，Max 45%。右侧面板 Default 70%。中间加入宽度为 `4px` 的可拖拽手柄区域。 |
| **Wide / Ultra** | `> 1440px` | **限制最大阅读宽度：** 左侧面板最大不超过 `480px`，右侧 Chunk 列表的单行最大宽度（`max-width`）限制为 `860px`，以保证最佳阅读体验，两侧居中留白。 |

---

## 4. 核心组件与UI细节 (Components & Details)

### 4.1 左侧视图：文档浏览器 (Document Browser)
- **布局结构：** 顶部 Sticky 区域（Search Input & Filter 按钮），下方为滚动列表 (`overflow-y: auto`)。
- **内容截断与 Tooltip：** 文档名称容器应用 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`。当鼠标悬浮时（Delay 300ms），弹出 Tooltip 显示完整名称及元数据（文件大小、状态、分片数等）。
- **右键/更多菜单：** 鼠标悬浮（Hover）时，列表项最右侧淡入出现 `...` (More Vertical) 图标。点击或右键呼出 Context Menu（基于 shadcn DropdownMenu），包含：`重命名 (Rename)`、`重新解析 (Reparse)`、`下载 (Download)`、`<Divider>`、`删除 (Delete - 危险色)`。

# 《左侧视图专项更新：双布局系统 (List & Card Views) 设计指导》

基于项目需求，左侧“文档浏览器”需升级为支持**单列卡片式 (Card View)** 与 **行列表项 (List View)** 的双布局系统。此次更新旨在平衡“高信息密度扫视”与“丰富元数据直观阅读”的两种核心操作场景，同时保持极致的现代感与工程落地性。

---

## 4.1.1. 视图切换器交互规范 (View Toggle Control)

在左侧面板的顶部 Sticky 区域（Search Input 旁或下方），引入 Segmented Control（分段控制器）或 Toggle Group 组件，用于无缝切换布局。

- **视觉表现：** 
  - 容器采用 `background: var(--muted); border-radius: calc(var(--radius) - 2px); padding: 2px; display: inline-flex;`
  - 按钮尺寸：`w-8 h-8`（32x32px），图标尺寸 `16px`。
  - 选中态 (Active)：`background: var(--background); box-shadow: 0 1px 2px rgba(0,0,0,0.05); color: var(--foreground);`
  - 未选中态 (Inactive)：`background: transparent; color: var(--muted-foreground);`
- **默认状态：** 针对 RAG 知识库场景，建议默认采用 **行列表项 (List View)** 以最大化同屏文档展示数量。

---

## 4.1.2. 布局A：行列表项视图 (List View - 高信息密度)

此视图遵循**隐性操作 (Progressive Disclosure)** 原则，极度克制，适合快速检索和批量管理。

- **容器结构：** `display: flex; flex-direction: column; gap: 2px; padding: 0 8px;`
- **单行解剖 (Item Anatomy)：** 
  - 高度：`36px` (紧凑态)。
  - 间距：`padding: 6px 10px; gap: 10px; border-radius: calc(var(--radius) - 2px);`
- **信息排布：**
  - **左侧：** 16px 文档类型图标 (基于扩展名判定，如 PDF, TXT, Web)。
  - **中间：** 文档名称（`Body-Medium`, 单行溢出隐藏 `text-overflow: ellipsis`）。
  - **右侧：** 悬浮时淡入的 `...` 更多操作按钮 (Action Menu)。
- **元数据处理：** 状态、分片数、更新时间等附加数据在此视图下全部隐藏。仅当鼠标 Hover 停留超过 `300ms` 时，通过 Tooltip 气泡展示完整元数据列表。

---

## 4.1.3. 布局B：单列卡片视图 (Card View - 富信息展示)

此视图遵循**显性展示 (Explicit Display)** 原则，赋予每个文档独立的物理边界，适合精细化查阅单文档的解析状态。

- **容器结构：** `display: flex; flex-direction: column; gap: 12px; padding: 12px;`
- **单卡解剖 (Card Anatomy)：**
  - 视觉边界：`border: 1px solid var(--border); border-radius: var(--radius); background: var(--background);`
  - 内边距：`padding: 14px;`
  - 交互反馈：Hover 时 `border-color: var(--muted-foreground); box-shadow: 0 2px 8px rgba(0,0,0,0.04);`
- **信息排布 (内部流式布局)：**
  - **Header 区：** `display: flex; justify-content: space-between; align-items: flex-start;`
    - 包含：文档图标 + 多行折行名称（最大2行，`line-clamp: 2`） + 固定的 `...` 操作按钮。
  - **Divider：** 可选，使用 `margin: 10px 0; border-top: 1px dashed var(--border);` 增加呼吸感。
  - **Footer/Metadata 区：** `display: flex; flex-wrap: wrap; gap: 8px;`
    - **状态标签 (Badge)：** 如“解析成功 (Success)”、“向量化中 (Embedding)”，采用特定的语义色背景（如纯净的浅绿或浅蓝，透明度 15%）。
    - **分片与大小：** `<Icon> 128 Chunks` / `<Icon> 2.4 MB`，使用 `Caption` 层级，颜色为 `var(--muted-foreground)`。
    - **时间：** `Updated 2h ago`，右对齐或置于末尾。

---

## 4.1.4. 响应式与容器自适应行为 (Responsive & Container Queries)

鉴于左侧面板处于 `Resizable` 动态调整宽度的状态，双布局的内部元素必须具备极强的鲁棒性：

- **行视图 (List)：** 文档名称容器必须设置 `min-width: 0; flex: 1;` 以确保 `text-overflow: ellipsis` 在面板被极度压缩时仍能正常工作，防止撑爆 Flex 容器。
- **卡片视图 (Card)：** 建议使用现代 CSS 容器查询 (Container Queries)。
  - 当左侧面板宽度 `< 280px` 时（极窄模式）：卡片内部的 Metadata 区将从 `flex-row` 并排打断为 `flex-column` 垂直排列，以防止内容重叠。
  ```css
  .card-container { container-type: inline-size; }
  @container (max-width: 280px) {
    .card-metadata { flex-direction: column; align-items: flex-start; }
  }
  ```

---

## 4.1.5. 视图切换的丝滑动效 (Layout Transition Motion)

严禁在切换布局时出现生硬的闪烁 (Flicker) 或 DOM 高度突变造成的布局抖动 (Layout Shift)。前端实现需严格遵循以下动效规范：

### 4.1.5.1 状态交替动效 (Cross-fade Transition)
当用户点击切换器时，不建议对每个独立的 Item 进行形变动画（性能消耗过大且视觉混乱），而是对整个列表容器进行淡入淡出。

- **出场 (Exit)：** 当前视图容器 `opacity: 1 -> 0`，伴随微弱的向下位移 `transform: translateY(0) -> translateY(4px)`。
  - **Duration:** `100ms`
  - **Easing:** `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
- **入场 (Enter)：** 新视图容器 `opacity: 0 -> 1`，伴随从上向下的复位 `transform: translateY(-4px) -> translateY(0)`。
  - **Duration:** `200ms`
  - **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out)

### 4.2 右侧视图：内容管理器 (Chunk Manager)
- **卡片式分片 (Chunk Cards)：** 每个分段内容作为一个独立卡片。`padding: 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--background);`
- **悬浮操作 (Floating Actions)：** 
  - **默认态：** 仅展示纯净的文本与右上角的 Token 消耗/字符数标签。
  - **Hover态：** 卡片右上角浮现透明毛玻璃质感的 Toolbar（编辑、上方添加、下方添加、删除）。
- **双击编辑 (Double-click to Edit)：** 将文本区域从 `<div>` 瞬间替换为 `<textarea>` (或所见即所得编辑器组件)，不改变卡片高度，并自动获得 Focus，背景色略微变暗（`var(--muted)`），右下角出现 `Save` 和 `Cancel` 小按钮。

### 4.3 检索视图 (Retrieval Playground)
- **触发机制：** 点击全局导航的“检索测试”进入独立视图。
- **双栏布局：**
  - **左侧 (Configuration & Query)：** 固定宽度 `320px`。包含多行输入框（Query Input）、模型选择器、Slider 滑块（Top-K 数量、相似度阈值 Score）。
  - **右侧 (Results)：** 类似于 Chunk Manager，但高亮显示召回文本块（使用标记颜色，如 `<mark>` 标签配合 `--accent`），并标注“相似度分数 (Score: 0.92)”。

### 4.4 知识库配置与添加文档 (Modals / Wizards)
- **添加文档 Dialog：** 
  - 采用多步骤 Wizard 逻辑。
  - 步骤1：数据源选择（Bento Grid 布局的 8 个方形卡片：本地文件、URI、纯文本、QA问答对、网页、飞书、Notion 等，带大图标）。
  - 步骤2：上传区/配置区（使用拖拽热区 Dropzone）。
  - 步骤3：分段与解析策略（基础参数展开，高级参数隐藏在 Accordion 折叠面板中）。
- **知识库配置 Dialog：** 侧边栏导航式的 Dialog，左侧为 Tabs（模型配置、索引策略、权限），右侧为表单。

---

## 5. 丝滑动效与微交互 (Motion & Interaction)

所有动效必须服务于“操作反馈”，严禁冗长无意义的动画。前端开发需严格使用以下 `cubic-bezier` 参数实现 CSS 过渡或 Framer Motion 动效。

### 5.1 全局缓动曲线与时长规范 (Easing & Duration)

| 动效类型 (Motion Type) | 持续时间 (Duration) | 缓动函数 (Easing Curve) | CSS / Framer Motion 示例 |
| :--- | :--- | :--- | :--- |
| **微交互反馈** (Hover, 变色) | `150ms` | `linear` | `transition: all 150ms linear;` |
| **弹出层进场** (Dialog, Tooltip) | `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | `easeOut` 极速弹出感 |
| **弹出层退场** (Dialog, Tooltip) | `150ms` | `cubic-bezier(0.4, 0, 1, 1)` | `easeIn` 快速消失，不留残影 |
| **布局变化** (Resizer 拖拽松开) | `300ms` | `cubic-bezier(0.25, 1, 0.5, 1)` | 平滑缓停，弹性适中 |

### 5.2 关键微交互定义 (Key Micro-interactions)

#### 5.2.1 列表项的隐性菜单浮现 (Progressive Disclosure)
- **触发条件 (Trigger):** `mouseover` 在左侧文档列表的单行 Item 上。
- **状态变化:**
  - Item 背景色从 `transparent` 变为 `var(--accent)`。
  - 右侧的 Action Group（更多按钮）透明度从 `opacity: 0` 变为 `opacity: 1`，并伴随一个微小的位移 `transform: translateX(4px) -> translateX(0)`。
- **代码参考 (CSS):**
  ```css
  .list-item { transition: background 150ms ease; }
  .list-item .actions { 
    opacity: 0; 
    transform: translateX(4px);
    transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .list-item:hover .actions { 
    opacity: 1; 
    transform: translateX(0); 
  }
  ```

#### 5.2.2 响应式面板拖拽反馈 (Resizer Handle)
- **触发条件:** 鼠标悬浮并按下 (Active) 在左右两侧分割的 `4px` 手柄上。
- **状态变化:** 
  - Hover 时，手柄背景色由透明渐变为 `var(--border)`。
  - Active (Dragging) 时，手柄变成明显的强调色（如全局的主题蓝色或 `var(--primary)`的淡化版），页面光标锁定为 `col-resize`，并且两边容器停止响应 `pointer-events: none` 以防止文本被意外选中或触发 Hover。
  - 结束拖拽，恢复原样，具有平滑弹回效果。

#### 5.2.3 双击 Chunk 编辑过渡 (Double-click to Edit)
- **触发条件:** `dblclick` 分片卡片正文区域。
- **状态变化:**
  - 阅读态文本立即隐藏（无过渡，保证输入无延迟感）。
  - 原地展开 `<textarea>` 控件，周围产生一道 `box-shadow: 0 0 0 2px var(--ring)` 焦点环，模拟极速进入编辑空间的感觉。
  - 工具栏（Save/Cancel）使用 Framer Motion 的 `AnimatePresence`，从下方滑入：`initial={{ opacity: 0, y: 10 }}` -> `animate={{ opacity: 1, y: 0 }}`，耗时 200ms，`cubic-bezier(0.16, 1, 0.3, 1)`。