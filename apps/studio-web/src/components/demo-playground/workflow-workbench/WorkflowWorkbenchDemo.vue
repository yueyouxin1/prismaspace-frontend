<script setup lang="ts">
import { computed, ref } from 'vue'
import { WorkflowWorkbench } from '@prismaspace/workflow/workbench'
import type {
  AgentInstanceRead,
  AnyInstanceRead,
  CreatorInfo,
  ResourceDetailRead,
  ResourceRead,
  ServiceModuleRead,
  ToolInstanceRead,
  WorkflowEventRead,
  WorkflowNodeDataRead,
  WorkflowNodeDefRead,
  WorkflowParameterSchema,
  WorkflowRead,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
  WorkflowStreamEvent,
} from '@prismaspace/contracts'
import type { SseConnection } from '@prismaspace/common'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import DemoPlaygroundPanel from '@app/components/demo-playground/DemoPlaygroundPanel.vue'

const now = new Date().toISOString()
const creator: CreatorInfo = { uuid: 'demo-user', nick_name: 'Workflow Demo', avatar: null }
const schema = (name: string, type: WorkflowParameterSchema['type'] = 'string', extra: Partial<WorkflowParameterSchema> = {}): WorkflowParameterSchema => ({
  name,
  type,
  required: false,
  open: true,
  ...extra,
})
const nodeDef = (
  id: number,
  node_uid: string,
  category: string,
  icon: string,
  node: WorkflowNodeDataRead,
): WorkflowNodeDefRead => ({
  id,
  node_uid,
  category,
  label: node.name,
  icon,
  description: node.description,
  display_order: id,
  node,
  is_active: true,
})

const nodeDefinitions = ref<WorkflowNodeDefRead[]>([
  nodeDef(1, 'Start', 'common', 'play', { registryId: 'Start', name: '开始', description: '定义输入', config: {}, inputs: [], outputs: [schema('query', 'string', { required: true })] }),
  nodeDef(2, 'End', 'common', 'stop', { registryId: 'End', name: '结束', description: '返回结果', config: { returnType: 'Text', stream: true, content: '最终结果：{{result}}' }, inputs: [schema('result')], outputs: [] }),
  nodeDef(3, 'Output', 'common', 'output', { registryId: 'Output', name: '输出', description: '中间输出', config: { returnType: 'Object', content: '' }, inputs: [schema('summary')], outputs: [] }),
  nodeDef(4, 'Branch', 'logic', 'branch', { registryId: 'Branch', name: '条件分支', description: '选择后续路径', config: { branchs: [{ id: 'branch_demo', logic: '&', conditions: [] }] }, inputs: [], outputs: [] }),
  nodeDef(5, 'Loop', 'logic', 'play', { registryId: 'Loop', name: '循环', description: '遍历数组', config: { loopType: 'list', executionMode: 'parallel', maxConcurrency: 2, loopList: schema('documents', 'array', { items: { type: 'string' } }), executionPolicy: { switch: true, timeoutMs: 180000, retryTimes: 1, processType: 2, dataOnErr: 'fallback' } }, inputs: [], outputs: [schema('loop_result')], blocks: [], edges: [] }),
  nodeDef(6, 'Interrupt', 'logic', 'pause-circle', { registryId: 'Interrupt', name: '人工确认', description: '等待恢复', config: { reason: 'approval_required', message: '请确认是否继续。', resume_output_key: 'resume' }, inputs: [], outputs: [schema('resume', 'object')] }),
  nodeDef(7, 'LLMNode', 'model', 'cpu', { registryId: 'LLMNode', name: '大模型', description: '生成摘要', config: { llm_module_version_uuid: 'model-demo', system_prompt: '你是一个摘要模型。', history: [], agent_config: { diversity_mode: 'balanced', model_params: { temperature: 0.5, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 }, io_config: { history_turns: 4, max_response_tokens: 256, enable_deep_thinking: true, max_thinking_tokens: 128, response_format: { type: 'text' } } }, executionPolicy: { switch: true, timeoutMs: 180000, retryTimes: 1, processType: 2, dataOnErr: '模型降级结果' } }, inputs: [schema('query')], outputs: [schema('output'), schema('reasoning_content')] }),
  nodeDef(8, 'AgentNode', 'agent', 'cpu', { registryId: 'AgentNode', name: 'Agent 智能体', description: '调用 Agent 资源', config: { resource_instance_uuid: 'agent-instance-demo', input_query: '{{query}}', input_content_parts: null, history: [], enable_session: false, session_uuid: '' }, inputs: [schema('query')], outputs: [schema('response')] }),
  nodeDef(9, 'ToolNode', 'tool', 'tool', { registryId: 'ToolNode', name: '工具', description: '调用工具资源', config: { resource_instance_uuid: 'tool-instance-demo', executionPolicy: { switch: true, timeoutMs: 180000, retryTimes: 0, processType: 3, dataOnErr: '' } }, inputs: [schema('url')], outputs: [schema('content')] }),
  nodeDef(10, 'WorkflowNode', 'logic', 'git-branch', { registryId: 'WorkflowNode', name: '子工作流', description: '调用工作流资源', config: { resource_instance_uuid: 'child-workflow-instance-demo', executionPolicy: { switch: true, timeoutMs: 180000, retryTimes: 0, processType: 2, dataOnErr: '{"analysis":"fallback"}' } }, inputs: [schema('query')], outputs: [schema('analysis')] }),
])

const workflowInstance = ref<WorkflowRead>({
  uuid: 'workflow-instance-demo',
  name: 'Workflow Production Demo',
  description: 'Mocked workflow workbench demo.',
  version_tag: '__workspace__',
  status: 'workspace',
  created_at: now,
  updated_at: now,
  creator,
  graph: {
    nodes: [
      { id: 'start', data: { registryId: 'Start', name: '开始', description: '定义输入 query。', config: {}, inputs: [], outputs: [schema('query', 'string', { required: true })] }, position: { x: 120, y: 180 } },
      { id: 'llm', data: { registryId: 'LLMNode', name: '信息抽取', description: '流式生成摘要。', config: nodeDefinitions.value.find(item => item.node_uid === 'LLMNode')?.node.config ?? {}, inputs: [schema('query', 'string', { value: { type: 'ref', content: { blockID: 'start', path: 'query' } } })], outputs: [schema('output'), schema('reasoning_content')] }, position: { x: 520, y: 80 } },
      { id: 'tool', data: { registryId: 'ToolNode', name: '内容抓取工具', description: '读取页面正文。', config: nodeDefinitions.value.find(item => item.node_uid === 'ToolNode')?.node.config ?? {}, inputs: [schema('url', 'string', { value: { type: 'literal', content: 'https://example.com/article' } })], outputs: [schema('content'), schema('title')] }, position: { x: 520, y: 320 } },
      { id: 'workflow', data: { registryId: 'WorkflowNode', name: '子分析工作流', description: '调用子工作流。', config: nodeDefinitions.value.find(item => item.node_uid === 'WorkflowNode')?.node.config ?? {}, inputs: [schema('query', 'string', { value: { type: 'ref', content: { blockID: 'llm', path: 'output' } } })], outputs: [schema('analysis')] }, position: { x: 920, y: 220 } },
      { id: 'end', data: { registryId: 'End', name: '结束', description: '返回最终文本。', config: { returnType: 'Text', stream: true, content: '最终结果：{{result}}' }, inputs: [schema('result', 'string', { value: { type: 'ref', content: { blockID: 'workflow', path: 'analysis' } } })], outputs: [] }, position: { x: 1320, y: 220 } },
    ],
    edges: [
      { sourceNodeID: 'start', targetNodeID: 'llm', sourcePortID: '0', targetPortID: '0' },
      { sourceNodeID: 'start', targetNodeID: 'tool', sourcePortID: '0', targetPortID: '0' },
      { sourceNodeID: 'llm', targetNodeID: 'workflow', sourcePortID: '0', targetPortID: '0' },
      { sourceNodeID: 'workflow', targetNodeID: 'end', sourcePortID: '0', targetPortID: '0' },
    ],
    viewport: { x: 0, y: 0, zoom: 0.72 },
  },
  inputs_schema: [schema('query', 'string', { required: true })],
  outputs_schema: [schema('result')],
  is_stream: true,
})

const resources = ref<ResourceRead[]>([
  { uuid: 'resource-agent-demo', name: '客服 Agent', description: '演示 Agent 资源', avatar: null, resource_type: 'agent', workspace_instance_uuid: 'agent-instance-demo', latest_published_instance_uuid: 'agent-instance-demo', creator, created_at: now, updated_at: now },
  { uuid: 'resource-tool-demo', name: '内容抓取工具', description: '演示 Tool 资源', avatar: null, resource_type: 'tool', workspace_instance_uuid: 'tool-instance-demo', latest_published_instance_uuid: 'tool-instance-demo', creator, created_at: now, updated_at: now },
  { uuid: 'resource-child-workflow-demo', name: '子分析工作流', description: '演示 Workflow 资源', avatar: null, resource_type: 'workflow', workspace_instance_uuid: 'child-workflow-instance-demo', latest_published_instance_uuid: 'child-workflow-instance-demo', creator, created_at: now, updated_at: now },
])

const toolInstance = ref<ToolInstanceRead>({ uuid: 'tool-instance-demo', name: '内容抓取工具', description: '返回页面标题与正文摘要。', version_tag: '__workspace__', status: 'workspace', created_at: now, updated_at: now, creator, url: 'https://example.com', method: 'GET', inputs_schema: [schema('url', 'string', { required: true })], outputs_schema: [schema('content'), schema('title')], llm_function_schema: null })
const agentInstance = ref<AgentInstanceRead>({ uuid: 'agent-instance-demo', name: '客服 Agent', description: '演示 Agent 实例', version_tag: '__workspace__', status: 'workspace', created_at: now, updated_at: now, creator, system_prompt: '你是一个客服助手。', llm_module_version_uuid: 'model-demo', agent_config: { diversity_mode: 'balanced', model_params: { temperature: 0.5, top_p: 0.9, presence_penalty: 0, frequency_penalty: 0 }, io_config: { history_turns: 6, max_response_tokens: 512, enable_deep_thinking: false, response_format: { type: 'text' } } } })
const childWorkflowInstance = ref<WorkflowRead>({ uuid: 'child-workflow-instance-demo', name: '子分析工作流', description: '演示子工作流', version_tag: '__workspace__', status: 'workspace', created_at: now, updated_at: now, creator, graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }, inputs_schema: [schema('query', 'string', { required: true })], outputs_schema: [schema('analysis')], is_stream: false })
const modules = ref<ServiceModuleRead[]>([{ name: 'doubao-lite', label: '豆包 Lite', provider_id: 1, versions: [{ uuid: 'model-demo', version_tag: 'v2026.03', description: 'Demo 模型版本', attributes: {}, config: {} }] }])

const initialSummary: WorkflowRunSummaryRead = { run_id: 'run-demo-1', thread_id: 'thread-run-demo-1', parent_run_id: null, status: 'succeeded', trace_id: 'trace-run-demo-1', error_code: null, error_message: null, started_at: now, finished_at: now, latest_checkpoint: { id: 1, step_index: 4, reason: 'node_completed', node_id: 'end', canonical: null, created_at: now } }
const initialDetail = ref<WorkflowRunRead>({
  ...initialSummary,
  workflow_instance_uuid: workflowInstance.value.uuid,
  workflow_name: workflowInstance.value.name,
  node_executions: [
    { node_id: 'start', node_name: '开始', node_type: 'Start', attempt: 1, status: 'COMPLETED', input: { query: '请总结这篇文章的核心结论' }, result: { output: { query: '请总结这篇文章的核心结论' } }, error_message: null, activated_port: '0', executed_time: 0.003, started_at: now, finished_at: now },
    { node_id: 'llm', node_name: '信息抽取', node_type: 'LLMNode', attempt: 1, status: 'COMPLETED', input: { query: '请总结这篇文章的核心结论' }, result: { output: { output: '文章讨论了工作流工作台生产化、节点注册和事件驱动 UI。', reasoning_content: '先解析输入，再汇总状态。' } }, error_message: null, activated_port: '0', executed_time: 2.6, started_at: now, finished_at: now },
    { node_id: 'tool', node_name: '内容抓取工具', node_type: 'ToolNode', attempt: 1, status: 'COMPLETED', input: { url: 'https://example.com/article' }, result: { output: { title: 'Workflow Production Demo', content: '抓取到了正文和标题。' } }, error_message: null, activated_port: '0', executed_time: 0.8, started_at: now, finished_at: now },
    { node_id: 'workflow', node_name: '子分析工作流', node_type: 'WorkflowNode', attempt: 1, status: 'COMPLETED', input: { query: '文章讨论了工作流工作台生产化、节点注册和事件驱动 UI。' }, result: { output: { analysis: '子工作流补充了 lineage 与恢复语义。', __meta__: { child_run_id: 'child-run-demo', child_thread_id: 'child-thread-demo', child_workflow_uuid: 'child-workflow-instance-demo' } } }, error_message: null, activated_port: '0', executed_time: 1.4, started_at: now, finished_at: now },
    { node_id: 'end', node_name: '结束', node_type: 'End', attempt: 1, status: 'COMPLETED', input: { result: '子工作流补充了 lineage 与恢复语义。' }, result: { output: { result: '子工作流补充了 lineage 与恢复语义。' }, content: '最终结果：子工作流补充了 lineage 与恢复语义。' }, error_message: null, activated_port: '0', executed_time: 0.1, started_at: now, finished_at: now },
  ],
  can_resume: false,
  interrupt: null,
})
const initialEvents = ref<WorkflowEventRead[]>([
  { sequence_no: 1, event_type: 'run.started', payload: { run_id: initialSummary.run_id, thread_id: initialSummary.thread_id }, created_at: now },
  { sequence_no: 2, event_type: 'node.started', payload: { node_id: 'start', node: { id: 'start', registryId: 'Start', name: '开始' } }, created_at: now },
  { sequence_no: 3, event_type: 'node.completed', payload: { node_id: 'start', node: { id: 'start', registryId: 'Start', name: '开始' }, result: { output: { query: '请总结这篇文章的核心结论' } }, executed_time: 0.003 }, created_at: now },
  { sequence_no: 4, event_type: 'node.started', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' } }, created_at: now },
  { sequence_no: 5, event_type: 'stream.delta', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, content: '文章讨论了工作流工作台生产化、节点注册和事件驱动 UI。' }, created_at: now },
  { sequence_no: 6, event_type: 'node.completed', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, result: { output: { output: '文章讨论了工作流工作台生产化、节点注册和事件驱动 UI。' } }, executed_time: 2.6 }, created_at: now },
  { sequence_no: 7, event_type: 'node.started', payload: { node_id: 'tool', node: { id: 'tool', registryId: 'ToolNode', name: '内容抓取工具' } }, created_at: now },
  { sequence_no: 8, event_type: 'node.completed', payload: { node_id: 'tool', node: { id: 'tool', registryId: 'ToolNode', name: '内容抓取工具' }, result: { output: { content: '抓取到了正文和标题。' } }, executed_time: 0.8 }, created_at: now },
  { sequence_no: 9, event_type: 'node.started', payload: { node_id: 'workflow', node: { id: 'workflow', registryId: 'WorkflowNode', name: '子分析工作流' } }, created_at: now },
  { sequence_no: 10, event_type: 'checkpoint.created', payload: { checkpointId: 1, reason: 'node_completed', nodeId: 'workflow' }, created_at: now },
  { sequence_no: 11, event_type: 'node.completed', payload: { node_id: 'workflow', node: { id: 'workflow', registryId: 'WorkflowNode', name: '子分析工作流' }, result: { output: { analysis: '子工作流补充了 lineage 与恢复语义。' } }, executed_time: 1.4 }, created_at: now },
  { sequence_no: 12, event_type: 'node.started', payload: { node_id: 'end', node: { id: 'end', registryId: 'End', name: '结束' } }, created_at: now },
  { sequence_no: 13, event_type: 'node.completed', payload: { node_id: 'end', node: { id: 'end', registryId: 'End', name: '结束' }, result: { output: { result: '子工作流补充了 lineage 与恢复语义。' }, content: '最终结果：子工作流补充了 lineage 与恢复语义。' }, executed_time: 0.1 }, created_at: now },
  { sequence_no: 14, event_type: 'run.finished', payload: { output: { result: '子工作流补充了 lineage 与恢复语义。' }, content: '最终结果：子工作流补充了 lineage 与恢复语义。' }, created_at: now },
])
const runSummaries = ref<WorkflowRunSummaryRead[]>([initialSummary])
const runDetails = ref<Record<string, WorkflowRunRead>>({ [initialSummary.run_id]: initialDetail.value })
const runEvents = ref<Record<string, WorkflowEventRead[]>>({ [initialSummary.run_id]: initialEvents.value })

const demoResource = computed<ResourceDetailRead>(() => ({
  uuid: 'resource-workflow-demo',
  name: 'Workflow Production Demo',
  description: 'Mocked workflow workbench for registry, run state and hydration.',
  avatar: null,
  resource_type: 'workflow',
  workspace_instance_uuid: workflowInstance.value.uuid,
  latest_published_instance_uuid: workflowInstance.value.uuid,
  creator,
  created_at: now,
  updated_at: now,
  workspace_instance: workflowInstance.value,
}))

const connection = (cleanup?: () => void): SseConnection => ({ close: () => cleanup?.(), getRetryDelay: () => 0, getLastEventId: () => undefined })
const createRunningSummary = (runId: string): WorkflowRunSummaryRead => ({
  run_id: runId,
  thread_id: `thread-${runId}`,
  parent_run_id: null,
  status: 'running',
  trace_id: `trace-${runId}`,
  error_code: null,
  error_message: null,
  started_at: new Date().toISOString(),
  finished_at: null,
  latest_checkpoint: null,
})
const upsertRun = (detail: WorkflowRunRead) => {
  runDetails.value = { ...runDetails.value, [detail.run_id]: detail }
  runSummaries.value = [{ run_id: detail.run_id, thread_id: detail.thread_id, parent_run_id: detail.parent_run_id, status: detail.status, trace_id: detail.trace_id, error_code: detail.error_code, error_message: detail.error_message, started_at: detail.started_at, finished_at: detail.finished_at, latest_checkpoint: detail.latest_checkpoint }, ...runSummaries.value.filter(item => item.run_id !== detail.run_id)]
}
const emitEvents = (runId: string, events: WorkflowEventRead[], handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => {
  const timers = events.map((event, index) => window.setTimeout(() => {
    runEvents.value = { ...runEvents.value, [runId]: [...(runEvents.value[runId] ?? []), event] }
    handlers?.onEvent?.({ type: event.event_type, seq: event.sequence_no, ts: event.created_at, runId, threadId: `thread-${runId}`, payload: event.payload })
    if (event.event_type === 'run.finished') {
      upsertRun({ ...initialDetail.value, ...initialSummary, run_id: runId, thread_id: `thread-${runId}`, trace_id: `trace-${runId}`, status: 'succeeded', started_at: now, finished_at: new Date().toISOString() })
    }
  }, index * 160))
  return connection(() => timers.forEach(timer => window.clearTimeout(timer)))
}

const client = {
  resource: {
    getResource: async () => demoResource.value,
    listWorkspaceResources: async () => resources.value,
    getInstance: async (instanceUuid: string) => {
      if (instanceUuid === toolInstance.value.uuid) return toolInstance.value as AnyInstanceRead
      if (instanceUuid === agentInstance.value.uuid) return agentInstance.value as AnyInstanceRead
      if (instanceUuid === childWorkflowInstance.value.uuid) return childWorkflowInstance.value as AnyInstanceRead
      return workflowInstance.value as AnyInstanceRead
    },
    publishInstance: async () => workflowInstance.value as AnyInstanceRead,
  },
  workflow: {
    listNodeDefinitions: async () => nodeDefinitions.value,
    getWorkflowInstance: async () => workflowInstance.value,
    updateWorkflowInstance: async (_instanceUuid: string, payload: { graph?: WorkflowRead['graph'] }) => {
      if (payload.graph) {
        workflowInstance.value = {
          ...workflowInstance.value,
          graph: payload.graph,
          inputs_schema: payload.graph.nodes.find(node => node.data.registryId === 'Start')?.data.outputs ?? [],
          outputs_schema: payload.graph.nodes.find(node => node.data.registryId === 'End')?.data.inputs ?? [],
          is_stream: Boolean(payload.graph.nodes.find(node => node.data.registryId === 'End')?.data.config?.stream),
          updated_at: new Date().toISOString(),
        }
      }
      return workflowInstance.value
    },
    validate: async () => {
      const hasStart = workflowInstance.value.graph.nodes.some(node => node.data.registryId === 'Start')
      const hasEnd = workflowInstance.value.graph.nodes.some(node => node.data.registryId === 'End')
      return hasStart && hasEnd ? { is_valid: true, errors: [] } : { is_valid: false, errors: ['演示环境要求至少包含 Start 和 End 节点。'] }
    },
    listRuns: async () => runSummaries.value,
    getRun: async (runId: string) => runDetails.value[runId] ?? initialDetail.value,
    listRunEvents: async (runId: string) => runEvents.value[runId] ?? [],
    streamExecute: async (_instanceUuid: string, payload: { inputs?: Record<string, unknown> }, handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => {
      const runId = `run-demo-${Date.now()}`
      const text = String(payload.inputs?.query ?? payload.inputs?.input ?? '新的演示运行')
      const liveEvents = [
        { sequence_no: 1, event_type: 'run.started', payload: { run_id: runId, thread_id: `thread-${runId}` }, created_at: new Date().toISOString() },
        { sequence_no: 2, event_type: 'node.started', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' } }, created_at: new Date().toISOString() },
        { sequence_no: 3, event_type: 'stream.delta', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, content: `${text} 的分析已启动。` }, created_at: new Date().toISOString() },
        { sequence_no: 4, event_type: 'node.completed', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, result: { output: { output: `${text} 的分析已完成。` } }, executed_time: 1.2 }, created_at: new Date().toISOString() },
        { sequence_no: 5, event_type: 'node.started', payload: { node_id: 'end', node: { id: 'end', registryId: 'End', name: '结束' } }, created_at: new Date().toISOString() },
        { sequence_no: 6, event_type: 'node.completed', payload: { node_id: 'end', node: { id: 'end', registryId: 'End', name: '结束' }, result: { output: { result: `${text} 的分析已完成。` }, content: `最终结果：${text} 的分析已完成。` }, executed_time: 0.1 }, created_at: new Date().toISOString() },
        { sequence_no: 7, event_type: 'run.finished', payload: { output: { result: `${text} 的分析已完成。` }, content: `最终结果：${text} 的分析已完成。` }, created_at: new Date().toISOString() },
      ] satisfies WorkflowEventRead[]
      upsertRun({ ...initialDetail.value, ...initialSummary, run_id: runId, thread_id: `thread-${runId}`, trace_id: `trace-${runId}`, status: 'running', started_at: new Date().toISOString(), finished_at: null, node_executions: [] })
      runEvents.value = { ...runEvents.value, [runId]: [] }
      return emitEvents(runId, liveEvents, handlers)
    },
    executeAsync: async () => {
      const runId = `run-demo-${Date.now()}`
      const summary = createRunningSummary(runId)
      upsertRun({ ...initialDetail.value, ...summary, workflow_instance_uuid: workflowInstance.value.uuid, workflow_name: workflowInstance.value.name, node_executions: [], can_resume: false, interrupt: null })
      runEvents.value = { ...runEvents.value, [runId]: [] }
      return summary
    },
    attachLiveRun: async (runId: string, handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => {
      const existing = runEvents.value[runId] ?? []
      if (existing.length) {
        return emitEvents(runId, existing, handlers)
      }
      const liveEvents = [
        { sequence_no: 1, event_type: 'run.started', payload: { run_id: runId, thread_id: `thread-${runId}` }, created_at: new Date().toISOString() },
        { sequence_no: 2, event_type: 'node.started', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' } }, created_at: new Date().toISOString() },
        { sequence_no: 3, event_type: 'stream.delta', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, content: '后台演示运行已连接。' }, created_at: new Date().toISOString() },
        { sequence_no: 4, event_type: 'node.completed', payload: { node_id: 'llm', node: { id: 'llm', registryId: 'LLMNode', name: '信息抽取' }, result: { output: { output: '后台演示运行已完成。' } }, executed_time: 0.8 }, created_at: new Date().toISOString() },
        { sequence_no: 5, event_type: 'run.finished', payload: { output: { result: '后台演示运行已完成。' }, content: '最终结果：后台演示运行已完成。' }, created_at: new Date().toISOString() },
      ] satisfies WorkflowEventRead[]
      return emitEvents(runId, liveEvents, handlers)
    },
    replayRunStream: async (runId: string, handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => emitEvents(runId, [{ sequence_no: 0, event_type: 'session.ready', payload: { capabilities: ['replay'] }, created_at: now }, ...(runEvents.value[runId] ?? []), { sequence_no: (runEvents.value[runId]?.length ?? 0) + 1, event_type: 'run.replay.completed', payload: {}, created_at: now }], handlers),
    debugNodeStream: async (_instanceUuid: string, nodeId: string, payload: { inputs?: Record<string, unknown> }, handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => emitEvents(`debug-${nodeId}`, [{ sequence_no: 1, event_type: 'run.started', payload: { run_id: `debug-${nodeId}`, thread_id: `thread-debug-${nodeId}` }, created_at: now }, { sequence_no: 2, event_type: 'node.started', payload: { node_id: nodeId, node: { id: nodeId, registryId: nodeId, name: nodeId } }, created_at: now }, { sequence_no: 3, event_type: 'node.completed', payload: { node_id: nodeId, node: { id: nodeId, registryId: nodeId, name: nodeId }, result: { output: { debug: String(payload.inputs?.query ?? 'debug') } }, executed_time: 0.1 }, created_at: now }, { sequence_no: 4, event_type: 'run.finished', payload: { output: { debug: String(payload.inputs?.query ?? 'debug') } }, created_at: now }], handlers),
    resumeRun: async (_instanceUuid: string, runId: string, payload: { output?: unknown }, handlers?: { onEvent?: (event: WorkflowStreamEvent) => void }) => emitEvents(runId, [{ sequence_no: 1, event_type: 'run.started', payload: { run_id: runId, thread_id: `thread-${runId}` }, created_at: now }, { sequence_no: 2, event_type: 'run.finished', payload: { output: payload.output ?? { approved: true } }, created_at: now }], handlers),
    cancelRun: async (runId: string) => ({ run_id: runId, accepted: true, local_cancelled: true }),
  },
  serviceModule: {
    listAvailableModules: async () => modules.value,
  },
} as unknown as PrismaspaceClient
</script>

<template>
  <div class="relative h-[860px] overflow-hidden rounded-[24px] border border-[#e6e8f2] bg-[#f7f7fb]">
    <WorkflowWorkbench
      :client="client"
      workspace-uuid="workspace-demo"
      resource-uuid="resource-workflow-demo"
      workspace-instance-uuid="workflow-instance-demo"
      latest-published-instance-uuid="workflow-instance-demo"
    />

    <DemoPlaygroundPanel
      title="Workflow Workbench"
      description="Mocked WorkflowWorkbench：验证 registry 面板、资源契约回填和事件驱动画布状态。"
      badge="Workflow"
    >
      <div class="space-y-3 text-sm text-muted-foreground">
        <p>默认加载一条成功 run，便于检查节点高亮、底部结果预览和历史回放。</p>
        <p>选择 `ToolNode / WorkflowNode / AgentNode` 可直接验证资源实例切换后的输入输出契约回填。</p>
        <p>点击底部 `试运行` 会触发 mock SSE 流，检查 live 状态是否同步到画布节点。</p>
      </div>
    </DemoPlaygroundPanel>
  </div>
</template>
