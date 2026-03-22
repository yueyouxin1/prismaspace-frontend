# Workflow TODO

## 本轮定位

本文件已从“`Start -> End` 最小闭环验证”升级为 **Workflow 工作台生产化迭代清单**。  
上一阶段最小闭环已经完成并归档，本轮不再以旧目标作为主验收标准。

### 上阶段归档摘要

- [x] `Start -> End` 最小保存 / 校验 / 执行闭环已跑通。
- [x] 前端 `WorkflowNodeRegistry` 已经接管 `Start / End` 编辑器标准。
- [x] 后端 `forms` 已停止作为前端主渲染事实来源。

---

## 本轮目标

1. 前端工作台覆盖后端当前已支持的全部节点：`Start / End / Output / Branch / Loop / Interrupt / LLMNode / AgentNode / ToolNode / WorkflowNode`。
2. 节点配置面板全部走前端 registry + schema 驱动表单生成，不在通用 UI 中耦合节点专有逻辑。
3. 画布与运行面板共享同一套 run 事实来源，支持 live / history / replay 的节点状态高亮、底部结果预览和事件流驱动反馈。
4. 修正常规节点因为 `inputs_schema` 变化而生成多余 handle 的错误，端口策略改为节点类型驱动。
5. 补齐异常处理 / 降级配置 UI，并让运行结果正确映射 fallback / error branch / interrupt / cancelled。
6. 输出 Demo、更新 TODO、完成自检，达到可继续精修的生产级基线。

---

## 核心约束

- 唯一运行协议仍是 `WRP v1`。
- fallback 面板只服务未来未知节点，不再作为当前已支持节点的编辑入口。
- 画布节点状态遵循“选中 run 优先”：选中历史/回放 run 时画布跟随该 run，否则跟随 live run 或最近一次 run。
- 资源型节点契约回填复用现有 `GET /api/v1/instances/{uuid}`，不新增前端伪接口。

---

## 执行清单

### A. 节点覆盖与 registry 收敛

- [x] 将 `WorkflowNodeRegistry` 扩展为可承载 `panel schema / port strategy / canvas summary / result preview / resource hydration / fault tolerance visibility`。
- [x] 为 `Start / End / Output / Branch / Loop / Interrupt / LLMNode / AgentNode / ToolNode / WorkflowNode` 建立专用 registry。
- [x] 将当前只覆盖 `Start / End` 的 registry 集合升级为全后端节点集合。
- [x] 保留未知节点 fallback，但明确与已支持节点主链路隔离。

### B. 节点配置面板

- [x] `Start` 面板收敛为工作流输入 schema 编辑器。
- [x] `End` 面板收敛为返回模式 + 输出变量 + 文本模板 + 流式开关。
- [x] `Output` 面板补齐中间输出配置。
- [x] `Branch` 面板补齐条件分支编辑器与否则语义。
- [x] `Loop` 面板补齐循环类型、数组/次数来源、串并行、最大并发、循环输出与子流程 JSON 入口。
- [x] `Interrupt` 面板补齐 `reason / message / resume_output_key / outputs`。
- [x] `LLMNode` 面板补齐模型、提示词、输入绑定、输出、response format、deep thinking 与异常处理。
- [x] `AgentNode` 面板补齐资源选择、query / content parts / history / session / outputs`。
- [x] `ToolNode` 面板补齐资源选择、输入绑定、只读输出契约与异常处理。
- [x] `WorkflowNode` 面板补齐子工作流选择、输入绑定、只读输出契约与异常处理。

### C. 端口策略与画布节点

- [x] 用 registry 端口策略替换“按 inputs / outputs 个数自动生成 handle”的错误逻辑。
- [x] 固定 `Start` 仅单输出、`End` 仅单输入。
- [x] 固定 `Output / Interrupt / LLMNode / AgentNode / ToolNode / WorkflowNode / Loop` 默认单入单出。
- [x] `Branch` 改为按分支组生成多输出端口，并补 `-1` 否则端口。
- [x] 支持异常处理配置为 `processType = 3` 时追加 `error` 端口。
- [x] 节点卡片补齐运行状态徽标、底部结果预览、checkpoint / duration 展示。

### D. 运行态与事件流

- [x] 新增统一 run presenter / reducer，将 `selectedRun + selectedRunEvents` 收敛为节点运行态 map。
- [x] 消费 `node.started / node.completed / node.failed / node.skipped / stream.* / run.interrupted / checkpoint.created`。
- [x] 画布节点边框、状态徽标、底部结果预览全部接到同一份运行态。
- [x] live / history / replay 共用同一套节点运行态模型。
- [x] 移除选中节点时无意义的 `nodeDefsQuery.refetch()`。

### E. 资源型节点契约回填

- [x] 将资源契约回填从硬编码 `ToolNode / WorkflowNode` 升级为 registry 驱动。
- [x] `ToolNode` 通过实例详情同步 `inputs_schema / outputs_schema`。
- [x] `WorkflowNode` 通过实例详情同步 `inputs_schema / outputs_schema`。
- [x] `AgentNode` 接入资源实例选择与基础实例元信息回填。
- [x] 资源实例切换后，节点名称 / 描述 / IO 契约可同步到画布节点。

### F. 容错降级配置

- [x] 统一暴露 `executionPolicy.switch / timeoutMs / retryTimes / processType / dataOnErr`。
- [x] 在需要的节点 registry 中启用异常处理分组。
- [x] 前端端口策略与异常分支 `error` 对齐。
- [x] 后端 `Output` 节点最小语义补齐为“返回已解析输入 / 可选文本模板”，以支撑前端结果预览。

### G. Demo 与验证入口

- [x] 新增 `WorkflowWorkbenchDemo.vue`。
- [x] Demo 通过 mocked `PrismaspaceClient` 挂载公开 `WorkflowWorkbench`。
- [x] Demo 覆盖节点 registry、资源契约回填、事件驱动画布三类能力。
- [x] Demo 已注册到 `component-demos.ts`。

### H. 自检与留档

- [x] workflow 包 + demo 已通过聚焦 `vue-tsc` 检查。
- [ ] 继续补充更细粒度前端单测（registry / run presenter / hydration）。
- [ ] 继续补充更强的保存 / 重载 / replay / resume 集成验证。
- [x] 本轮 TODO 已更新为当前交付标准。

---

## 当前验收清单

### 节点与面板

- [x] 后端已支持节点全部具备专用 registry 面板。
- [x] 已支持节点不再落到 fallback JSON 面板。
- [x] 节点配置继续通过 schema 驱动表单生成器渲染。

### 画布与运行态

- [x] 节点卡片可显示运行中 / 成功 / 失败 / 中断 / 跳过状态。
- [x] 节点卡片底部可显示最近结果预览。
- [x] 历史 run / replay / live run 可共用同一套画布状态来源。
- [x] 普通常规节点新增参数不再增加多余 handle。

### 资源型节点

- [x] `ToolNode` 资源切换后自动回填输入输出契约。
- [x] `WorkflowNode` 资源切换后自动回填输入输出契约。
- [x] `AgentNode` 资源选择已接入正式面板。

### Demo / 工程检查

- [x] `/components/workflow-workbench` 已有可运行 demo。
- [x] 聚焦 workflow 包的 `vue-tsc` 已通过。
- [ ] 仍需补一轮真实后端联调回归。

---

## 下一轮精修入口

1. 把 `Loop` 子流程 JSON 入口升级成真正的嵌套画布编辑体验。
2. 为 `Branch / Loop / Interrupt / ToolNode / WorkflowNode` 补更细的前端单测与交互回归。
3. 继续向 Coze 级历史 / trace / replay 可视化细节对齐。
4. 基于真实后端环境完成保存 / 重载 / validate / execute / replay / resume 全链路验收并全部勾满。
