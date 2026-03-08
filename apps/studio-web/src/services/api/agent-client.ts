import { HttpAgent, type BaseEvent, type RunAgentInput } from '@ag-ui/client'
import { apiRequest } from '@app/services/api/api-client'
import { apiContextStorage } from '@app/services/api/context-storage'
import type {
  JsonResponse,
  RunAgentInputExtRequest,
  RunEventsResponse,
} from '@app/services/api/contracts'
import type { SseConnection } from '@repo/common'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface AgentStreamEventPayload {
  [key: string]: unknown
}

export type AgentStreamEventType
  = | 'RUN_STARTED'
    | 'RUN_FINISHED'
    | 'RUN_ERROR'
    | 'STEP_STARTED'
    | 'STEP_FINISHED'
    | 'TEXT_MESSAGE_START'
    | 'TEXT_MESSAGE_CONTENT'
    | 'TEXT_MESSAGE_END'
    | 'TEXT_MESSAGE_CHUNK'
    | 'REASONING_START'
    | 'REASONING_MESSAGE_START'
    | 'REASONING_MESSAGE_CONTENT'
    | 'REASONING_MESSAGE_END'
    | 'REASONING_MESSAGE_CHUNK'
    | 'REASONING_END'
    | 'REASONING_ENCRYPTED_VALUE'
    | 'TOOL_CALL_START'
    | 'TOOL_CALL_ARGS'
    | 'TOOL_CALL_END'
    | 'TOOL_CALL_RESULT'
    | 'TOOL_CALL_CHUNK'
    | 'STATE_SNAPSHOT'
    | 'STATE_DELTA'
    | 'MESSAGES_SNAPSHOT'
    | 'ACTIVITY_SNAPSHOT'
    | 'ACTIVITY_DELTA'
    | 'RAW'
    | 'CUSTOM'
    | 'unknown'

export interface AgentStreamEvent {
  event: AgentStreamEventType
  rawEvent: string
  data: AgentStreamEventPayload
  id?: string
  raw: string
  receivedAt: string
}

export interface AgentStreamHandlers {
  onEvent?: (event: AgentStreamEvent) => void
  onMessageDelta?: (event: AgentStreamEvent) => void
  onReasoningDelta?: (event: AgentStreamEvent) => void
  onToolEvent?: (event: AgentStreamEvent) => void
  onStateSnapshot?: (event: AgentStreamEvent) => void
  onStateDelta?: (event: AgentStreamEvent) => void
  onMessagesSnapshot?: (event: AgentStreamEvent) => void
  onActivitySnapshot?: (event: AgentStreamEvent) => void
  onActivityDelta?: (event: AgentStreamEvent) => void
  onLifecycleEvent?: (event: AgentStreamEvent) => void
  onUsage?: (event: AgentStreamEvent) => void
  onDone?: (event: AgentStreamEvent) => void
  onServerError?: (event: AgentStreamEvent) => void
  onError?: (error: unknown) => void
}

type AgentRunPayload = RunAgentInput & {
  resume?: RunAgentInputExtRequest['resume']
}

const resolveBaseUrl = (): string => {
  const base = import.meta.env.APP_API_BASE_URL
  if (typeof base !== 'string') {
    return ''
  }
  return base.endsWith('/') ? base.slice(0, -1) : base
}

const normalizePath = (path: string): string => {
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

const buildAgentStreamUrl = (instanceUuid: string): string => {
  return `${resolveBaseUrl()}${normalizePath(`/api/v1/agent/${instanceUuid}/sse`)}`
}

const buildAgentHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}
  const accessToken = apiContextStorage.getAccessToken()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

const serializeEvent = (event: BaseEvent): string => {
  try {
    return JSON.stringify(event)
  } catch {
    return ''
  }
}

const normalizeEventType = (eventType: string | undefined): AgentStreamEventType => {
  if (!eventType) {
    return 'unknown'
  }
  const allowed: AgentStreamEventType[] = [
    'RUN_STARTED',
    'RUN_FINISHED',
    'RUN_ERROR',
    'STEP_STARTED',
    'STEP_FINISHED',
    'TEXT_MESSAGE_START',
    'TEXT_MESSAGE_CONTENT',
    'TEXT_MESSAGE_END',
    'TEXT_MESSAGE_CHUNK',
    'REASONING_START',
    'REASONING_MESSAGE_START',
    'REASONING_MESSAGE_CONTENT',
    'REASONING_MESSAGE_END',
    'REASONING_MESSAGE_CHUNK',
    'REASONING_END',
    'REASONING_ENCRYPTED_VALUE',
    'TOOL_CALL_START',
    'TOOL_CALL_ARGS',
    'TOOL_CALL_END',
    'TOOL_CALL_RESULT',
    'TOOL_CALL_CHUNK',
    'STATE_SNAPSHOT',
    'STATE_DELTA',
    'MESSAGES_SNAPSHOT',
    'ACTIVITY_SNAPSHOT',
    'ACTIVITY_DELTA',
    'RAW',
    'CUSTOM',
  ]
  return allowed.includes(eventType as AgentStreamEventType)
    ? (eventType as AgentStreamEventType)
    : 'unknown'
}

const routeStreamEvent = (
  event: AgentStreamEvent,
  handlers: AgentStreamHandlers,
): void => {
  handlers.onEvent?.(event)

  const normalizedEvent = event.event
  const parsedData = event.data

  if (normalizedEvent === 'RUN_STARTED' || normalizedEvent === 'STEP_STARTED' || normalizedEvent === 'STEP_FINISHED') {
    handlers.onLifecycleEvent?.(event)
    return
  }

  if (normalizedEvent === 'TEXT_MESSAGE_CONTENT' || normalizedEvent === 'TEXT_MESSAGE_CHUNK') {
    handlers.onMessageDelta?.(event)
    return
  }
  if (normalizedEvent === 'REASONING_MESSAGE_CONTENT' || normalizedEvent === 'REASONING_MESSAGE_CHUNK') {
    handlers.onReasoningDelta?.(event)
    return
  }
  if (
    normalizedEvent === 'TOOL_CALL_START'
    || normalizedEvent === 'TOOL_CALL_ARGS'
    || normalizedEvent === 'TOOL_CALL_END'
    || normalizedEvent === 'TOOL_CALL_RESULT'
    || normalizedEvent === 'TOOL_CALL_CHUNK'
  ) {
    handlers.onToolEvent?.(event)
    return
  }
  if (normalizedEvent === 'STATE_SNAPSHOT') {
    handlers.onStateSnapshot?.(event)
    return
  }
  if (normalizedEvent === 'STATE_DELTA') {
    handlers.onStateDelta?.(event)
    return
  }
  if (normalizedEvent === 'MESSAGES_SNAPSHOT') {
    handlers.onMessagesSnapshot?.(event)
    return
  }
  if (normalizedEvent === 'ACTIVITY_SNAPSHOT') {
    handlers.onActivitySnapshot?.(event)
    return
  }
  if (normalizedEvent === 'ACTIVITY_DELTA') {
    handlers.onActivityDelta?.(event)
    return
  }
  if (normalizedEvent === 'CUSTOM' && parsedData.name === 'ps.meta.usage') {
    handlers.onUsage?.(event)
    return
  }
  if (normalizedEvent === 'RUN_FINISHED') {
    handlers.onLifecycleEvent?.(event)
    handlers.onDone?.(event)
    return
  }
  if (normalizedEvent === 'RUN_ERROR') {
    handlers.onServerError?.(event)
  }
}

export const agentApi = {
  async execute(instanceUuid: string, payload: RunAgentInputExtRequest): Promise<RunEventsResponse> {
    const response = await apiRequest<JsonResponse<RunEventsResponse>>(`/api/v1/agent/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async streamExecute(
    instanceUuid: string,
    payload: RunAgentInputExtRequest,
    handlers: AgentStreamHandlers = {},
    signal?: AbortSignal,
  ): Promise<SseConnection> {
    const agent = new HttpAgent({
      url: buildAgentStreamUrl(instanceUuid),
      headers: buildAgentHeaders(),
    })
    const abortController = new AbortController()
    agent.abortController = abortController

    let closed = false
    let externalAbortListener: (() => void) | null = null

    if (signal) {
      const handleAbort = (): void => {
        if (closed) {
          return
        }
        closed = true
        agent.abortRun()
      }

      if (signal.aborted) {
        handleAbort()
      } else {
        signal.addEventListener('abort', handleAbort, { once: true })
        externalAbortListener = () => {
          signal.removeEventListener('abort', handleAbort)
        }
      }
    }

    const close = (): void => {
      if (closed) {
        return
      }
      closed = true
      externalAbortListener?.()
      externalAbortListener = null
      subscription.unsubscribe()
      agent.abortRun()
    }

    const subscription = agent.run(payload as AgentRunPayload).subscribe({
      next: (sourceEvent) => {
        if (closed) {
          return
        }
        const normalizedEvent = normalizeEventType(sourceEvent.type)
        const event: AgentStreamEvent = {
          event: normalizedEvent,
          rawEvent: sourceEvent.type,
          data: sourceEvent as AgentStreamEventPayload,
          raw: serializeEvent(sourceEvent),
          receivedAt: new Date().toISOString(),
        }
        routeStreamEvent(event, handlers)
      },
      error: (error) => {
        if (closed) {
          return
        }
        externalAbortListener?.()
        externalAbortListener = null
        handlers.onError?.(error)
      },
      complete: () => {
        externalAbortListener?.()
        externalAbortListener = null
      },
    })

    return {
      close,
      getRetryDelay: () => 0,
      getLastEventId: () => undefined,
    }
  },
}
