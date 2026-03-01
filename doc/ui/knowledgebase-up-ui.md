# 《高级UI重构指导指南：RAG工作台视觉与交互升维》

基于当前界面的现状评估，当前实现存在**空间利用率极低、视觉层级混乱、缺乏现代组件语意**等严重问题。作为顶级UI设计标准，我们需要将界面从“简陋的后台表单”重构为“极简、高密度、高质感的现代生产力工具”。

请前端开发团队严格按照以下无歧义的重构指南进行像素级（Pixel-perfect）修正，所有组件需基于 `shadcn/ui` 生态进行替换与升级。

---

## 1. 左侧视图：文档浏览器空间与视觉重构

### 1.1 头部（Header）空间极致压缩
**现状问题：** 头部信息冗余（统计卡片过大、按钮多且零散），占据了接近 50% 的高度，严重挤压了核心的“文档列表”空间。
**重构动作：**
1. **移除臃肿的统计面板：** 删除原有的“文档/解析中/失败”三个大方块。改为在标题旁或搜索框下方使用极简的 Badge 或纯文本（如：`2 Docs · 0 Parsing · 0 Failed`，使用 `--muted-foreground`，字号 `12px`）。
2. **操作区高密度聚合：**
   - 将“添加文档”从笨重的整行黑底大按钮，改为紧凑的主按钮（Primary Button），放置在搜索框同行，或作为头部标题右侧的 `size="icon"` 加号按钮。
   - **重构后布局示例 (Flexbox):**
     - Row 1: `[Search Input (带前缀搜索图标, 后缀可嵌入状态筛选器)]` + `[+ Add Button]`
     - Row 2: `[统计微标签]` + `[Spacer]` + `[布局切换 Toggle Group] + [刷新 Icon]`
3. **高度约束：** 确保整个头部区域高度被严格控制在 `100px` 以内。

### 1.2 文档列表项（List Items）视觉升维
**现状问题：** 列表项像臃肿的块状元素，缺乏文件类型图标，Checkbox 喧宾夺主，缺少交互菜单。
**重构动作：**
1. **引入文件类型图标：** 移除左侧生硬的 Checkbox（若非批量操作模式则隐藏）。替换为清晰的 16x16px 文件类型图标（如 Word 蓝、PDF 红、Web 灰等）。
2. **排版重塑：** 
   - 主标题：`font-medium`，`text-sm`，单行截断（`truncate`）。
   - 副标题（URI/Chunks）：`text-xs`，`text-muted-foreground`。
   - 容器：背景默认透明，Hover 时切换为 `bg-accent`，圆角设为 `rounded-md`。
3. **右键与悬浮菜单集成（核心交互）：**
   - **Hover 态：** 列表项右侧淡入展示 `...` (MoreHorizontal) 图标。
   - **组件应用：** 整个列表项必须包裹在 `shadcn/ui` 的 `<ContextMenu>` 中，同时 `...` 按钮绑定 `<DropdownMenu>`。
   - **菜单项必须包含：** `重命名 (Rename)`、`下载 (Download - 新增)`、`<Separator>`、`删除 (Delete - text-destructive)`。
   - **元数据 Tooltip：** 整个 Item 包裹 `<Tooltip>`，延迟 `300ms` 显示完整文件名、文件类型、解析状态及更新时间。

---

## 2. 右侧视图：内容管理器（Chunk Manager）重构

### 2.1 头部信息降噪
**现状问题：** 极其冗长的 OSS 链接直接暴露在标题下方，破坏了页面整洁度。
**重构动作：**
1. **URI 折叠与隐藏：** 将长链接截断（`max-w-[400px] truncate text-muted-foreground text-sm`），并在右侧提供一个微小的“复制 (Copy)”图标。或者更优雅的做法：将其收纳进标题旁边的 `(i)` 信息图标的 Hover Popover 中。
2. **Tab 样式优化：** 当前“分块 / 检索测试 / 配置”的 Tab 过于像普通的 Button。请统一替换为 `shadcn/ui` 的 `<Tabs>` 或 `<TabsList>` 组件，确保具有统一的底色和滑块切换动画。

### 2.2 分片卡片（Chunk Cards）交互补全
**现状问题：** 分片卡片仅展示了文本，缺失必要的编辑和上下文操作，不符合“工作台”的预期。
**重构动作：**
1. **悬浮工具栏 (Floating Action Bar)：**
   - **触发：** 当鼠标 `hover` 到具体的 Chunk 卡片时。
   - **位置：** 卡片内部右上角（绝对定位 `absolute right-2 top-2`）。
   - **表现：** 一个带有毛玻璃效果（`backdrop-blur bg-background/80`）的紧凑图标组，包含：`编辑 (Edit)`、`上方添加 (Add Above)`、`下方添加 (Add Below)`、`删除 (Trash)`。
2. **右键菜单：** 对卡片应用 `<ContextMenu>`，提供与上述悬浮菜单完全一致的操作项。
3. **双击编辑：** 为卡片正文区域绑定 `onDoubleClick` 事件，触发后将纯文本 `<p>` 无缝替换为 `shadcn/ui` 的 `<Textarea>`，并自动聚焦（`autoFocus`），底部出现“保存/取消”按钮。

---

## 3. 检索配置面板（Playground）现代化升级

**现状问题：** 参数配置区极度丑陋，使用了原始的输入框，毫无“配置面板”应有的高级感与交互反馈。
**重构动作：** 彻底抛弃 `<input type="number">`，全面拥抱 `shadcn/ui` 的高级表单组件。

| 配置项 | 现状组件 | 重构目标组件 (shadcn/ui) | 交互与视觉规范 |
| :--- | :--- | :--- | :--- |
| **检索策略** | 基础 `<select>` | `<Select>` / `<SelectTrigger>` | 使用带边框的现代下拉框，选项（Hybrid, Vector, Keyword）需带简短说明描述。 |
| **Top K** | 基础 `<input>` | `<Slider>` + 紧凑输入框 | 引入滑动条组件，范围 `1 - 20`，步长 `1`。右侧联动一个宽约 `60px` 的数字输入框。 |
| **最低分数阈值**| 基础 `<input>` | `<Slider>` + 紧凑输入框 | 滑动条范围 `0.00 - 1.00`，步长 `0.01`。让开发者能直观拖拽“精度”。 |
| **查询改写** | 丑陋的自制 Toggle | `<Switch>` | 右对齐排布，开启后可向下方平滑展开（Accordion 效果）具体的改写模型选择。 |
| **结果重排** | 丑陋的自制 Toggle | `<Switch>` | 同上，采用标准的 `bg-primary` 开启状态色。 |

**排版建议：** 
采用表单标注重排（Label-Value Alignment）。Label 与 Control 之间应保持紧凑（如 `gap-2`），每一项配置使用 `py-4 border-b border-border/50` 进行轻微的视觉分隔，避免参数堆砌。

---

## 4. 微交互与动效参数 (Motion Specs)

请前端确保以下 CSS/Tailwind 交互动效被准确应用，消除生硬感：

1. **悬浮菜单淡入（Chunk 卡片 & 左侧列表 Item）：**
   ```css
   /* Tailwind 示例 */
   .group:hover .action-menu {
     opacity: 1;
     transform: translateY(0);
   }
   .action-menu {
     opacity: 0;
     transform: translateY(-4px);
     transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
   }
   ```
2. **Tab 切换/面板切换：**
   - 避免生硬的 DOM 替换。使用无闪烁的淡入淡出：`animate-in fade-in zoom-in-95 duration-200`。
3. **弹窗 (Dialog/ContextMenu)：**
   - 必须使用 `shadcn/ui` 默认的入场动画（基于 Radix UI 底层），附带半透明纯黑背景罩（`bg-black/80 backdrop-blur-sm`），提升专注度。