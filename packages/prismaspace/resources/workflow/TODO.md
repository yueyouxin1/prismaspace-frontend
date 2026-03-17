# Workflow TODO

## 本文件目的

这份 TODO 只服务于当前迭代的单一目标：**先把 workflow 前端的最小实践链路跑通**，避免开发继续发散到其他节点、其他视觉细节或泛化重构。

当前最小实践链路定义为：

1. `Start` 节点定义工作流入参。
2. `End` 节点引用 `Start` 节点参数作为工作流出参。
3. 前端可正确保存、校验、执行该工作流。
4. 后端运行完成后返回符合预期的工作流结果。

---

## 当前背景

1. `workflow` 前端已经过多轮迁移，但距离可用水准仍有明显差距。
2. 后端 workflow 主链路基本达到可用并通过测试，前端尚未完成对后端能力的真实驱动。
3. `form-generator` 已基本稳定，当前节点配置面板仍停留在 MVP 骨架阶段。
4. `FormGeneratorDemo.vue` 已经提供了值得直接复用的复杂表单组织方式，尤其是：
   - `accordion-container`
   - `accordion-root`
   - `accordion-item`
   - `param-schema-editor`
5. 当前 `WorkflowNodeSidePanel.vue` 已经接入 `FormGenerator`，但整体结构与 Coze 节点配置面板仍有明显差距，且尚未围绕 `Start -> End` 最小闭环做专项收敛。

---

## 本阶段目标

### 核心目标

以 `Start` 和 `End` 两个节点为唯一范围，完成一套**真实可用**的节点配置面板与动态表单契约对齐方案，让前端可以驱动后端 workflow 的最小运行结果。

### 架构前提（新增确认）

从当前阶段开始，`workflow` 的编辑器事实标准不再由后端节点模板中的 `forms` 字段承担，而改由前端 `WorkflowNodeRegistry` 承担。

也就是说：

1. 后端继续负责**运行契约事实标准**：
   - `nodeData/config/inputs/outputs`
   - graph 持久化结构
   - validate / execute / debug 语义
   - `Start.outputs -> workflow.inputs_schema`
   - `End.inputs -> workflow.outputs_schema / workflow result`
2. 前端负责**编辑器契约事实标准**：
   - 节点配置面板分组结构
   - 字段布局与交互
   - accordion 组织方式
   - field renderer / editor 组合
   - 变量浏览与变量绑定相关 UI 组织
   - 节点元信息的编辑器呈现策略

结论：**不再继续维护“后端 forms 契约 + 前端特化逻辑”这两套并行标准。**

### 成功标准

- `Start` 节点可定义输入参数结构，表达“工作流入参”。
- `End` 节点可引用 `Start` 节点参数，表达“工作流出参结果”。
- 节点配置面板统一采用 `accordion` 分组结构。
- 动态表单渲染逻辑优先复用 `FormGeneratorDemo.vue` 已验证的组合方式，不再延续过时的零散渲染逻辑。
- 前后端在节点表单契约、变量引用契约、保存/执行结果语义上达成一致。
- 能从前端完成一次最小工作流运行，并拿到符合预期的 workflow result。

---

## 本阶段范围

### In Scope

1. `Start` 节点配置面板优化。
2. `End` 节点配置面板优化。
3. 节点配置面板分组结构统一为 `accordion`。
4. `form-generator` 与 workflow 节点表单契约的前后端修正与对齐。
5. `Start` 节点参数定义、变量暴露。
6. `End` 节点对 `Start` 变量的引用与出参映射。
7. 保存、校验、执行这条最小链路所需的前端接线与验证。

### Out of Scope

1. 其他节点的配置面板优化。
2. 全量 Coze workflow 节点体系补齐。
3. 运行历史、回放、事件流、节点调试等更大范围体验优化。
4. 与当前最小闭环无关的视觉打磨和泛化重构。

---

## 关键原则

1. **最小闭环优先**
   - 本阶段不追求“看起来差不多全了”，只追求 `Start -> End` 真正跑通。
2. **复用优先**
   - 优先复用 `FormGeneratorDemo.vue` 中已验证的 `accordion + param-schema-editor` 组合逻辑。
3. **契约优先**
   - 先把前端表单结构、变量引用结构、后端节点定义契约对齐，再做表层 UI 打磨。
4. **统一结构优先**
   - `Start` 与 `End` 节点面板都必须收敛到同一套 `accordion` 组织方式，避免继续分叉。
5. **拒绝发散**
   - 任何不直接服务于 `Start -> End` 最小实践闭环的工作，一律延后。
6. **单一编辑器标准**
   - 节点如何渲染、如何分组、如何编辑，统一由前端 `WorkflowNodeRegistry` 决定。
7. **后端只保留运行契约**
   - 后端节点模板的 `forms` 字段及其表单契约进入废弃流程，不再作为前端渲染标准继续演进。

---

## 前端 WorkflowNodeRegistry 架构确认

### 定位

`WorkflowNodeRegistry` 是 workflow 前端工作台的**节点编辑器注册中心**。它是节点工作台体验的唯一事实标准，不承担后端运行职责。

### 负责的职责

1. 节点编辑器元信息
   - 节点标题、描述、图标、面板宽度、默认分组
2. 节点配置面板 schema
   - 使用何种 `FormGenerator` schema
   - 是否采用 `accordion-root / accordion-item / param-schema-editor`
3. 节点字段渲染策略
   - 需要哪些 field renderer
   - 哪些字段需要 editor 组件组合
4. 节点变量视图策略
   - 如何暴露变量说明
   - 哪些变量在该节点面板中需要特别提示
5. 节点工作台 fallback 策略
   - 若某节点未注册，则进入通用 fallback 面板，而不是依赖后端 `forms`

### 不负责的职责

1. 节点执行语义
2. graph 持久化协议
3. validate / execute / debug 后端行为
4. `nodeData/config/inputs/outputs` 的运行时事实定义

### 建议的前端 registry 结构

建议最小接口至少包含：

1. `type / registryId`
2. `panel`
   - 返回或生成节点侧边栏表单 schema
3. `canvas`
   - 节点卡片展示元信息
4. `variables`
   - 节点变量浏览与绑定辅助策略
5. `fallback`
   - 未注册节点如何降级展示

### 与后端 NodeDef 的关系

1. 前端 registry 是编辑器标准。
2. 后端 NodeDef 是运行契约与节点基础元数据来源。
3. 前端渲染时优先使用前端 registry。
4. 后端 `forms` 不再参与主渲染链路。
5. 前端最终写回的 `nodeData` 必须继续服从后端运行契约。

---

## 执行 TODO

### A. 现状核对

- [x] 盘点当前 `Start` / `End` 节点定义、表单 schema、变量 schema、保存结构。
- [x] 盘点当前 `WorkflowNodeSidePanel.vue` 中哪些逻辑可保留，哪些属于过时渲染逻辑需要替换。
- [x] 核对当前前端如何构建 `FormGenerator` schema，确认是否足以承接 `accordion` 分组。
- [x] 核对后端 `workflow/nodes` 对 `Start` / `End` 的真实契约，明确哪些字段已经可用，哪些字段需要前后端修正。
- [x] 盘点当前后端 `forms` 字段的产生链路、消费链路、残余依赖点，作为废弃清单。
- [x] 盘点当前前端哪些工作台逻辑仍直接依赖 `WorkflowNodeDefRead.forms`。

### A2. Registry 架构落地准备（新增）

- [x] 定义前端 `WorkflowNodeRegistry` 最小接口与目录结构。
- [x] 明确 `WorkflowNodeRegistry` 与 `WorkflowNodeDefRead` 的合并优先级。
- [x] 明确未注册节点的 fallback 面板策略。
- [x] 明确 `Start` / `End` 作为首批 registry 节点的迁移范围。

### B. 节点配置面板结构收敛

- [x] 参考 Coze `Start` / `End` 配置面板，整理本阶段必须复刻的信息结构。
- [x] 定义 workflow 节点配置面板的统一 `accordion` 分组规范。
- [x] 明确 `Start` 节点至少需要哪些分组。
- [x] 明确 `End` 节点至少需要哪些分组。
- [x] 明确哪些旧表单渲染逻辑将被 `FormGenerator + accordion` 替代。

### C. 表单生成器复用策略

- [x] 从 `FormGeneratorDemo.vue` 提炼可直接迁移的组织方式，而不是只复用单个字段。
- [x] 优先验证 `accordion-container` 是否适合单个参数 schema 编辑区。
- [x] 优先验证 `accordion-root + accordion-item` 是否适合多分组节点配置区。
- [x] 评估 `param-schema-editor` 在 workflow 节点侧边栏中的可用性、尺寸、交互与头部 action 承接方式。
- [x] 明确 workflow 场景下需要补充哪些 field renderer / adapter，而不是回退到手写表单。

### D. Start 节点最小可用能力

- [x] 让 `Start` 节点可定义 workflow 输入参数结构。
- [x] 确认 `Start` 参数定义后的 schema 能稳定写入 workflow graph / instance。
- [x] 确认 `Start` 节点输出变量对变量浏览器和引用系统可见。
- [x] 明确 `Start` 节点中“工作流入参”与运行时执行输入的映射关系。

### E. End 节点最小可用能力

- [x] 让 `End` 节点可定义 workflow 输出结构。
- [x] 让 `End` 节点变量值支持引用 `Start` 节点参数。
- [x] 明确 `End` 输出结构与后端 workflow result 的映射关系。
- [x] 确认 `End` 节点配置后，执行结果能稳定返回到后端运行结果中。

### F. 前后端契约对齐

- [x] 明确 `Start` / `End` 节点表单定义由谁提供、前端如何消费、哪些字段仍不一致。
- [x] 对齐参数 schema 的命名、类型、默认值、必填、嵌套对象表达方式。
- [x] 对齐变量引用值结构，确保 `End` 引用 `Start` 时前后端语义一致。
- [x] 对齐执行接口输入输出语义，避免前端显示可配但后端不认。
- [ ] 若发现契约缺口，先记录在案并收敛到最小必要修正，不扩大改动面。

### F2. 废弃后端 forms 契约（新增）

- [x] 将“后端 `forms` 作为前端渲染事实标准”的模式正式标记为废弃。
- [x] 停止新增或继续演进后端节点模板 `forms` 字段。
- [x] 在前端工作台主链路中移除对 `WorkflowNodeDefRead.forms` 的主渲染依赖。
- [x] 建立前端 registry 对 `Start` / `End` 的完整承接，替代当前后端 `forms` 链路。
- [ ] 完成前端 registry 稳定后，再移除后端 `forms` 字段、数据库同步与前端 contract 中的对应字段。
- [ ] 为废弃过程记录迁移顺序与清理条件，避免半废弃状态长期存在。

### G. 最小闭环联调

- [x] 构造一个最小样例：`Start` 定义一个字符串参数，例如 `message`。
- [x] 在 `End` 节点中将某个输出值引用到 `Start.message`。
- [ ] 从前端保存工作流，确认 graph 持久化正确。
- [x] 从运行时执行工作流，传入 `message` 实际值。
- [x] 验证后端运行完成后的 workflow result 是否正确返回该值。
- [ ] 记录最小闭环中的失败点、契约问题和 UI 问题。

### H. 验收与留档

- [ ] 输出本阶段的最小闭环验收清单。
- [x] 记录最终采用的节点配置面板结构。
- [x] 记录被替换掉的旧表单渲染逻辑，避免后续回退。
- [ ] 记录未纳入本阶段的后续事项，防止下一轮继续混入当前范围。
- [x] 记录 `WorkflowNodeRegistry` 架构、职责边界和后端 `forms` 废弃策略。

---

## 最小闭环验收清单

- [ ] 画布上存在且仅存在一个 `Start` 节点和一个 `End` 节点。
- [ ] `Start` 节点可以定义至少一个输入参数。
- [ ] `End` 节点可以将输出值绑定到 `Start` 节点参数引用。
- [ ] `Start` / `End` 节点配置面板都已采用 `accordion` 分组。
- [ ] 节点配置面板表单由统一的动态表单方案承接，不再依赖过时的分散渲染逻辑。
- [ ] 保存后重新加载工作流，`Start` / `End` 配置不丢失。
- [ ] 校验通过。
- [x] 执行通过。
- [x] 执行结果与 `End` 配置一致。

---

## 本阶段暂不处理

1. 其他节点的 Coze 级配置体验补齐。
2. 全量变量体系体验打磨。
3. 历史、回放、调试面板深度优化。
4. 更大范围的 workflow 工作台像素级对齐。
5. 在前端 `WorkflowNodeRegistry` 首批节点稳定前，暂不扩展到全部节点族。

---

## 下一阶段入口

只有当本文件中的最小闭环全部完成后，才进入下一阶段：

1. 扩展其他核心节点的配置面板。
2. 继续对齐 Coze 级变量引用与复杂 setter 体验。
3. 再推进运行历史、回放、调试链路的可用化。
