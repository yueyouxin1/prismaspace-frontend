import { connectSseStream, type SseConnection } from '@prismaspace/common'
import type {
  JsonResponse,
  JsonRecord,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowEventRead,
  WorkflowNodeDefRead,
  WorkflowRead,
  WorkflowRuntimeControlMessage,
  WorkflowRuntimeRunAttachMessage,
  WorkflowRuntimeRunCancelMessage,
  WorkflowRuntimeRunResumeMessage,
  WorkflowRuntimeRunStartMessage,
  WorkflowRuntimeUiEventAbortMessage,
  WorkflowRuntimeUiEventSubmitMessage,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
  WorkflowStreamEvent,
  WorkflowUpdateRequest,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data
const DEFAULT_WORKFLOW_PROTOCOL = 'wrp' as const

const parseJson = <T>(raw: string): T | null => {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const normalizeWorkflowStreamEvent = (event: { id?: string; event?: string; data: string }): WorkflowStreamEvent => {
  const parsed = parseJson<WorkflowStreamEvent>(event.data)
  if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string' && typeof parsed.runId === 'string') {
    return parsed
  }

  return {
    type: event.event || 'message',
    seq: event.id ? Number.parseInt(event.id, 10) || null : null,
    ts: new Date().toISOString(),
    runId: 'unknown',
    payload: parseJson<JsonRecord>(event.data) ?? {},
  }
}

export interface WorkflowStreamHandlers {
  onEvent?: (event: WorkflowStreamEvent) => void
  onServerError?: (message: string, event: WorkflowStreamEvent) => void
  onError?: (error: unknown) => void
}

export interface WorkflowRuntimeSessionHandlers extends WorkflowStreamHandlers {
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
}

export interface WorkflowRuntimeSessionClient {
  send: (message: WorkflowRuntimeControlMessage) => void
  startRun: (instanceUuid: string, input: WorkflowExecutionRequest, requestId?: string) => void
  attachRun: (runId: string, afterSeq?: number, requestId?: string) => void
  cancelRun: (runId: string, requestId?: string) => void
  resumeRun: (instanceUuid: string, runId: string, resume: NonNullable<WorkflowExecutionRequest['resume']>, requestId?: string) => void
  submitUiEvent: (runId: string, interactionId: string, payload: JsonRecord, requestId?: string) => void
  abortUiEvent: (runId: string, interactionId: string, requestId?: string) => void
  close: (code?: number, reason?: string) => void
  socket: WebSocket
}

export interface WorkflowClient {
  listNodeDefinitions: () => Promise<WorkflowNodeDefRead[]>
  getWorkflowInstance: (instanceUuid: string) => Promise<WorkflowRead>
  updateWorkflowInstance: (instanceUuid: string, payload: WorkflowUpdateRequest) => Promise<WorkflowRead>
  execute: (instanceUuid: string, payload: WorkflowExecutionRequest) => Promise<WorkflowExecutionResponse>
  executeAsync: (instanceUuid: string, payload: WorkflowExecutionRequest) => Promise<WorkflowRunSummaryRead>
  streamExecute: (instanceUuid: string, payload: WorkflowExecutionRequest, handlers?: WorkflowStreamHandlers) => Promise<SseConnection>
  resumeRun: (instanceUuid: string, runId: string, payload: NonNullable<WorkflowExecutionRequest['resume']>, handlers?: WorkflowStreamHandlers) => Promise<SseConnection>
  openRuntimeSession: (handlers?: WorkflowRuntimeSessionHandlers) => Promise<WorkflowRuntimeSessionClient>
  attachLiveRun: (runId: string, handlers?: WorkflowStreamHandlers, afterSeq?: number) => Promise<SseConnection>
  replayRunStream: (runId: string, handlers?: WorkflowStreamHandlers, limit?: number) => Promise<SseConnection>
  debugNode: (instanceUuid: string, nodeId: string, payload: WorkflowExecutionRequest) => Promise<WorkflowExecutionResponse>
  debugNodeStream: (instanceUuid: string, nodeId: string, payload: WorkflowExecutionRequest, handlers?: WorkflowStreamHandlers) => Promise<SseConnection>
  validate: (instanceUuid: string) => Promise<{ is_valid: boolean; errors: string[] }>
  listRuns: (instanceUuid: string, limit?: number) => Promise<WorkflowRunSummaryRead[]>
  getRun: (runId: string) => Promise<WorkflowRunRead>
  listRunEvents: (runId: string, limit?: number) => Promise<WorkflowEventRead[]>
  cancelRun: (runId: string) => Promise<{ run_id: string; accepted: boolean; local_cancelled: boolean }>
}

export const createWorkflowClient = (context: SdkContext): WorkflowClient => ({
  async listNodeDefinitions() {
    return unwrap(await context.transport.request<JsonResponse<WorkflowNodeDefRead[]>>('/api/v1/workflow/nodes'))
  },
  async getWorkflowInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRead>>(`/api/v1/instances/${instanceUuid}`))
  },
  async updateWorkflowInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async execute(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/execute`, {
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        ...payload,
      },
    }))
  },
  async executeAsync(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunSummaryRead>>(`/api/v1/workflow/${instanceUuid}/async`, {
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        ...payload,
      },
    }))
  },
  async streamExecute(instanceUuid, payload, handlers = {}) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/workflow/${instanceUuid}/sse?profile=1`),
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        ...payload,
      },
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
      autoReconnect: false,
      onEvent: (event) => {
        const normalized = normalizeWorkflowStreamEvent(event)
        handlers.onEvent?.(normalized)
        if (normalized.type === 'run.failed') {
          const message = String(normalized.payload.error ?? normalized.payload.message ?? 'Workflow stream error.')
          handlers.onServerError?.(message, normalized)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
  async resumeRun(instanceUuid, runId, payload, handlers = {}) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/workflow/${instanceUuid}/sse`),
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        resume_from_run_id: runId,
        resume: payload,
      },
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
      autoReconnect: false,
      onEvent: (event) => {
        const normalized = normalizeWorkflowStreamEvent(event)
        handlers.onEvent?.(normalized)
        if (normalized.type === 'run.failed') {
          const message = String(normalized.payload.error ?? normalized.payload.message ?? 'Workflow resume stream error.')
          handlers.onServerError?.(message, normalized)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
  async openRuntimeSession(handlers = {}) {
    const socket = new WebSocket(context.transport.buildWebSocketUrl('/api/v1/workflow/ws'))
    const normalizeAndDispatch = (raw: string) => {
      const parsed = parseJson<WorkflowStreamEvent>(raw)
      if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
        handlers.onError?.(new Error('Invalid workflow runtime websocket payload.'))
        return
      }
      handlers.onEvent?.(parsed)
      if (parsed.type === 'run.failed') {
        const message = String(parsed.payload.error ?? parsed.payload.message ?? 'Workflow runtime session error.')
        handlers.onServerError?.(message, parsed)
      }
    }

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => {
        handlers.onOpen?.()
        resolve()
      }, { once: true })
      socket.addEventListener('error', () => {
        reject(new Error('Failed to open workflow runtime websocket session.'))
      }, { once: true })
    })

    socket.addEventListener('message', (message) => {
      if (typeof message.data !== 'string') {
        return
      }
      normalizeAndDispatch(message.data)
    })
    socket.addEventListener('close', (event) => {
      handlers.onClose?.(event)
    })
    socket.addEventListener('error', (event) => {
      handlers.onError?.(event)
    })

    const send = (message: WorkflowRuntimeControlMessage) => {
      socket.send(JSON.stringify(message))
    }

    return {
      socket,
      send,
      startRun: (instanceUuid: string, input: WorkflowExecutionRequest, requestId?: string) => {
        const message: WorkflowRuntimeRunStartMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'run.start',
          requestId: requestId ?? null,
          instanceUuid,
          input,
        }
        send(message)
      },
      attachRun: (runId: string, afterSeq = 0, requestId?: string) => {
        const message: WorkflowRuntimeRunAttachMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'run.attach',
          requestId: requestId ?? null,
          runId,
          afterSeq,
        }
        send(message)
      },
      cancelRun: (runId: string, requestId?: string) => {
        const message: WorkflowRuntimeRunCancelMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'run.cancel',
          requestId: requestId ?? null,
          runId,
        }
        send(message)
      },
      resumeRun: (instanceUuid: string, runId: string, resume: NonNullable<WorkflowExecutionRequest['resume']>, requestId?: string) => {
        const message: WorkflowRuntimeRunResumeMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'run.resume',
          requestId: requestId ?? null,
          instanceUuid,
          runId,
          resume,
        }
        send(message)
      },
      submitUiEvent: (runId: string, interactionId: string, payload: JsonRecord, requestId?: string) => {
        const message: WorkflowRuntimeUiEventSubmitMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'ui.event.submit',
          requestId: requestId ?? null,
          runId,
          interactionId,
          payload,
        }
        send(message)
      },
      abortUiEvent: (runId: string, interactionId: string, requestId?: string) => {
        const message: WorkflowRuntimeUiEventAbortMessage = {
          protocol: DEFAULT_WORKFLOW_PROTOCOL,
          type: 'ui.event.abort',
          requestId: requestId ?? null,
          runId,
          interactionId,
        }
        send(message)
      },
      close: (code?: number, reason?: string) => {
        socket.close(code, reason)
      },
    }
  },
  async attachLiveRun(runId, handlers = {}, afterSeq = 0) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/workflow/runs/${runId}/live`, { after_seq: afterSeq, protocol: DEFAULT_WORKFLOW_PROTOCOL }),
      method: 'GET',
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
      autoReconnect: false,
      onEvent: (event) => {
        const normalized = normalizeWorkflowStreamEvent(event)
        handlers.onEvent?.(normalized)
        if (normalized.type === 'run.failed') {
          const message = String(normalized.payload.error ?? normalized.payload.message ?? 'Workflow live stream error.')
          handlers.onServerError?.(message, normalized)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
  async replayRunStream(runId, handlers = {}, limit = 1000) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/workflow/runs/${runId}/replay`, { limit, protocol: DEFAULT_WORKFLOW_PROTOCOL }),
      method: 'GET',
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
      autoReconnect: false,
      onEvent: (event) => {
        const normalized = normalizeWorkflowStreamEvent(event)
        handlers.onEvent?.(normalized)
        if (normalized.type === 'run.failed') {
          const message = String(normalized.payload.error ?? normalized.payload.message ?? 'Workflow replay stream error.')
          handlers.onServerError?.(message, normalized)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
  async debugNode(instanceUuid, nodeId, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/nodes/${nodeId}/debug`, {
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        ...payload,
      },
    }))
  },
  async debugNodeStream(instanceUuid, nodeId, payload, handlers = {}) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/workflow/${instanceUuid}/nodes/${nodeId}/debug/sse`),
      method: 'POST',
      body: {
        protocol: DEFAULT_WORKFLOW_PROTOCOL,
        ...payload,
      },
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
      autoReconnect: false,
      onEvent: (event) => {
        const normalized = normalizeWorkflowStreamEvent(event)
        handlers.onEvent?.(normalized)
        if (normalized.type === 'run.failed') {
          const message = String(normalized.payload.error ?? normalized.payload.message ?? 'Workflow debug stream error.')
          handlers.onServerError?.(message, normalized)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
  async validate(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<{ is_valid: boolean; errors: string[] }>>(`/api/v1/workflow/${instanceUuid}/validate`, {
      method: 'POST',
    }))
  },
  async listRuns(instanceUuid, limit = 20) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunSummaryRead[]>>(`/api/v1/workflow/${instanceUuid}/runs`, {
      query: { limit },
    }))
  },
  async getRun(runId) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunRead>>(`/api/v1/workflow/runs/${runId}`))
  },
  async listRunEvents(runId, limit = 1000) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowEventRead[]>>(`/api/v1/workflow/runs/${runId}/events`, {
      query: { limit },
    }))
  },
  async cancelRun(runId) {
    return unwrap(await context.transport.request<JsonResponse<{ run_id: string; accepted: boolean; local_cancelled: boolean }>>(`/api/v1/workflow/runs/${runId}/cancel`, {
      method: 'POST',
    }))
  },
})
