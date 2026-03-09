import { HttpAgent, type BaseEvent, type RunAgentInput } from '@ag-ui/client'
import type {
  JsonResponse,
  RunAgentInputExtRequest,
  RunEventsResponse,
} from '@prismaspace/contracts'
import type { SseConnection } from '@prismaspace/common'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface AgentStreamEventPayload {
  [key: string]: unknown
}

export type AgentStreamEventType =
  | 'RUN_STARTED'
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

export interface AgentClient {
  execute: (instanceUuid: string, payload: RunAgentInputExtRequest) => Promise<RunEventsResponse>
  streamExecute: (
    instanceUuid: string,
    payload: RunAgentInputExtRequest,
    handlers?: AgentStreamHandlers,
    signal?: AbortSignal,
  ) => Promise<SseConnection>
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
    'RUN_STARTED', 'RUN_FINISHED', 'RUN_ERROR', 'STEP_STARTED', 'STEP_FINISHED', 'TEXT_MESSAGE_START',
    'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'TEXT_MESSAGE_CHUNK', 'REASONING_START',
    'REASONING_MESSAGE_START', 'REASONING_MESSAGE_CONTENT', 'REASONING_MESSAGE_END',
    'REASONING_MESSAGE_CHUNK', 'REASONING_END', 'REASONING_ENCRYPTED_VALUE', 'TOOL_CALL_START',
    'TOOL_CALL_ARGS', 'TOOL_CALL_END', 'TOOL_CALL_RESULT', 'TOOL_CALL_CHUNK', 'STATE_SNAPSHOT',
    'STATE_DELTA', 'MESSAGES_SNAPSHOT', 'ACTIVITY_SNAPSHOT', 'ACTIVITY_DELTA', 'RAW', 'CUSTOM',
  ]
  return allowed.includes(eventType as AgentStreamEventType) ? (eventType as AgentStreamEventType) : 'unknown'
}

const routeStreamEvent = (event: AgentStreamEvent, handlers: AgentStreamHandlers): void => {
  handlers.onEvent?.(event)
  const parsedData = event.data

  if (event.event === 'RUN_STARTED' || event.event === 'STEP_STARTED' || event.event === 'STEP_FINISHED') {
    handlers.onLifecycleEvent?.(event)
    return
  }
  if (event.event === 'TEXT_MESSAGE_CONTENT' || event.event === 'TEXT_MESSAGE_CHUNK') {
    handlers.onMessageDelta?.(event)
    return
  }
  if (event.event === 'REASONING_MESSAGE_CONTENT' || event.event === 'REASONING_MESSAGE_CHUNK') {
    handlers.onReasoningDelta?.(event)
    return
  }
  if (['TOOL_CALL_START', 'TOOL_CALL_ARGS', 'TOOL_CALL_END', 'TOOL_CALL_RESULT', 'TOOL_CALL_CHUNK'].includes(event.event)) {
    handlers.onToolEvent?.(event)
    return
  }
  if (event.event === 'STATE_SNAPSHOT') {
    handlers.onStateSnapshot?.(event)
    return
  }
  if (event.event === 'STATE_DELTA') {
    handlers.onStateDelta?.(event)
    return
  }
  if (event.event === 'MESSAGES_SNAPSHOT') {
    handlers.onMessagesSnapshot?.(event)
    return
  }
  if (event.event === 'ACTIVITY_SNAPSHOT') {
    handlers.onActivitySnapshot?.(event)
    return
  }
  if (event.event === 'ACTIVITY_DELTA') {
    handlers.onActivityDelta?.(event)
    return
  }
  if (event.event === 'CUSTOM' && parsedData.name === 'ps.meta.usage') {
    handlers.onUsage?.(event)
    return
  }
  if (event.event === 'RUN_FINISHED') {
    handlers.onLifecycleEvent?.(event)
    handlers.onDone?.(event)
    return
  }
  if (event.event === 'RUN_ERROR') {
    handlers.onServerError?.(event)
  }
}

export const createAgentClient = (context: SdkContext): AgentClient => ({
  async execute(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<RunEventsResponse>>(`/api/v1/agent/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    }))
  },
  async streamExecute(instanceUuid, payload, handlers = {}, signal) {
    const agent = new HttpAgent({
      url: context.transport.buildUrl(`/api/v1/agent/${instanceUuid}/sse?profile=1`),
      headers: context.transport.buildHeaders(),
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
        externalAbortListener = () => signal.removeEventListener('abort', handleAbort)
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
        routeStreamEvent({
          event: normalizeEventType(sourceEvent.type),
          rawEvent: sourceEvent.type,
          data: sourceEvent as AgentStreamEventPayload,
          raw: serializeEvent(sourceEvent),
          receivedAt: new Date().toISOString(),
        }, handlers)
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
})
