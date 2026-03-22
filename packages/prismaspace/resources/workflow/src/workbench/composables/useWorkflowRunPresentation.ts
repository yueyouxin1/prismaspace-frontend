import { computed, type Ref } from 'vue'
import type { WorkflowEventRead, WorkflowRunRead, WorkflowRunStatus } from '@prismaspace/contracts'
import type { WorkflowNodeRuntimeState, WorkflowNodeRuntimeStatus } from '../types/workflow-ide'

const PREVIEW_LIMIT = 180

const statusLabelMap: Record<WorkflowNodeRuntimeStatus, string> = {
  idle: '未执行',
  running: '执行中',
  succeeded: '运行成功',
  failed: '运行失败',
  skipped: '已跳过',
  interrupted: '等待恢复',
  cancelled: '已取消',
}

const trimPreview = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= PREVIEW_LIMIT) {
    return normalized
  }
  return `${normalized.slice(0, PREVIEW_LIMIT)}...`
}

const formatPreview = (value: unknown): string | null => {
  if (value == null) {
    return null
  }
  if (typeof value === 'string') {
    return trimPreview(value)
  }
  try {
    return trimPreview(JSON.stringify(value, null, 2))
  } catch {
    return trimPreview(String(value))
  }
}

const formatDuration = (durationMs: number | null | undefined): string | null => {
  if (typeof durationMs !== 'number' || Number.isNaN(durationMs) || durationMs < 0) {
    return null
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`
  }
  return `${(durationMs / 1000).toFixed(durationMs >= 10000 ? 0 : 1)}s`
}

const normalizeNodeStatus = (value: string | null | undefined): WorkflowNodeRuntimeStatus => {
  const normalized = String(value ?? '').toLowerCase()
  if (['running'].includes(normalized)) {
    return 'running'
  }
  if (['completed', 'succeeded', 'success'].includes(normalized)) {
    return 'succeeded'
  }
  if (['failed', 'error'].includes(normalized)) {
    return 'failed'
  }
  if (['skipped'].includes(normalized)) {
    return 'skipped'
  }
  if (['interrupted'].includes(normalized)) {
    return 'interrupted'
  }
  if (['cancelled', 'canceled'].includes(normalized)) {
    return 'cancelled'
  }
  return 'idle'
}

const ensureNodeState = (
  map: Record<string, WorkflowNodeRuntimeState>,
  nodeId: string,
): WorkflowNodeRuntimeState => {
  if (!map[nodeId]) {
    map[nodeId] = {
      nodeId,
      status: 'idle',
      statusLabel: statusLabelMap.idle,
      isActive: false,
      lastSequence: 0,
    }
  }
  return map[nodeId]
}

const extractNodeId = (event: WorkflowEventRead): string | null => {
  const payload = event.payload ?? {}
  if (typeof payload.node_id === 'string' && payload.node_id) {
    return payload.node_id
  }
  if (typeof payload.nodeId === 'string' && payload.nodeId) {
    return payload.nodeId
  }
  if (payload.node && typeof payload.node === 'object' && typeof (payload.node as Record<string, unknown>).id === 'string') {
    return String((payload.node as Record<string, unknown>).id)
  }
  return null
}

const extractStatusFromRun = (runStatus: WorkflowRunStatus | undefined): WorkflowNodeRuntimeStatus => {
  if (runStatus === 'running') return 'running'
  if (runStatus === 'succeeded') return 'succeeded'
  if (runStatus === 'failed') return 'failed'
  if (runStatus === 'cancelled') return 'cancelled'
  if (runStatus === 'interrupted') return 'interrupted'
  return 'idle'
}

const buildNodeRuntimeMap = (
  run: WorkflowRunRead | null,
  events: WorkflowEventRead[],
): Record<string, WorkflowNodeRuntimeState> => {
  const result: Record<string, WorkflowNodeRuntimeState> = {}

  for (const nodeExecution of run?.node_executions ?? []) {
    const state = ensureNodeState(result, nodeExecution.node_id)
    const durationMs = typeof nodeExecution.executed_time === 'number'
      ? nodeExecution.executed_time * 1000
      : null

    state.status = normalizeNodeStatus(nodeExecution.status)
    state.statusLabel = statusLabelMap[state.status]
    state.isActive = state.status === 'running'
    state.durationMs = durationMs
    state.durationLabel = formatDuration(durationMs)
    state.inputPreview = formatPreview(nodeExecution.input)
    state.outputPreview = formatPreview(nodeExecution.result?.output ?? nodeExecution.result)
    state.errorMessage = nodeExecution.error_message ?? null
  }

  const sortedEvents = events.slice().sort((left, right) => left.sequence_no - right.sequence_no)
  for (const event of sortedEvents) {
    const nodeId = extractNodeId(event)
    if (!nodeId) {
      if (event.event_type === 'run.interrupted') {
        const interrupt = event.payload?.interrupt as Record<string, unknown> | undefined
        const interruptNodeId = typeof interrupt?.node_id === 'string'
          ? interrupt.node_id
          : typeof interrupt?.nodeId === 'string'
            ? interrupt.nodeId
            : null
        if (interruptNodeId) {
          const state = ensureNodeState(result, interruptNodeId)
          state.status = 'interrupted'
          state.statusLabel = statusLabelMap.interrupted
          state.isActive = false
          state.errorMessage = formatPreview(interrupt)
        }
      }
      continue
    }

    const state = ensureNodeState(result, nodeId)
    state.lastSequence = Math.max(state.lastSequence, event.sequence_no)

    if (event.event_type === 'node.started') {
      state.status = 'running'
      state.statusLabel = statusLabelMap.running
      state.isActive = true
      state.inputPreview = formatPreview(event.payload?.input ?? event.payload)
      continue
    }

    if (event.event_type === 'node.completed') {
      const resultPayload = (event.payload?.result ?? {}) as Record<string, unknown>
      state.status = 'succeeded'
      state.statusLabel = statusLabelMap.succeeded
      state.isActive = false
      state.inputPreview = state.inputPreview ?? formatPreview(event.payload?.input)
      state.outputPreview = formatPreview(resultPayload.output ?? event.payload?.result ?? event.payload?.output)
      const durationMs = typeof event.payload?.executed_time === 'number'
        ? Number(event.payload.executed_time) * 1000
        : state.durationMs ?? null
      state.durationMs = durationMs
      state.durationLabel = formatDuration(durationMs)
      continue
    }

    if (event.event_type === 'node.failed') {
      state.status = 'failed'
      state.statusLabel = statusLabelMap.failed
      state.isActive = false
      state.errorMessage = String(event.payload?.error_message ?? event.payload?.error ?? '节点执行失败')
      continue
    }

    if (event.event_type === 'node.skipped') {
      state.status = 'skipped'
      state.statusLabel = statusLabelMap.skipped
      state.isActive = false
      continue
    }

    if (event.event_type === 'stream.started') {
      state.status = 'running'
      state.statusLabel = statusLabelMap.running
      state.isActive = true
      continue
    }

    if (event.event_type === 'stream.delta') {
      state.status = 'running'
      state.statusLabel = statusLabelMap.running
      state.isActive = true
      const chunk = formatPreview(event.payload?.content ?? event.payload?.delta ?? event.payload?.text ?? event.payload?.value)
      if (chunk) {
        const merged = `${state.streamPreview ?? ''}${chunk}`
        state.streamPreview = merged.length > PREVIEW_LIMIT ? merged.slice(-PREVIEW_LIMIT) : merged
      }
      continue
    }

    if (event.event_type === 'stream.finished') {
      state.isActive = false
      if (state.status === 'running') {
        state.status = 'succeeded'
        state.statusLabel = statusLabelMap.succeeded
      }
      continue
    }

    if (event.event_type === 'checkpoint.created') {
      state.checkpointLabel = `#${event.payload?.checkpointId ?? event.payload?.checkpoint_id ?? ''} · ${event.payload?.reason ?? 'checkpoint'}`
    }
  }

  const terminalStatus = extractStatusFromRun(run?.status)
  if (terminalStatus !== 'idle' && terminalStatus !== 'running') {
    for (const state of Object.values(result)) {
      if (state.status === 'running') {
        state.status = terminalStatus
        state.statusLabel = statusLabelMap[terminalStatus]
        state.isActive = false
      }
    }
  }

  return result
}

export interface WorkflowRunPresentationOptions {
  selectedRun: Ref<WorkflowRunRead | null>
  selectedRunEvents: Ref<WorkflowEventRead[]>
}

export const useWorkflowRunPresentation = ({
  selectedRun,
  selectedRunEvents,
}: WorkflowRunPresentationOptions) => {
  const nodeRuntimeMap = computed<Record<string, WorkflowNodeRuntimeState>>(() =>
    buildNodeRuntimeMap(selectedRun.value, selectedRunEvents.value),
  )

  return {
    nodeRuntimeMap,
  }
}
