<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { agentApi, type AgentStreamEvent } from '@app/services/api/agent-client'
import { agentSessionApi } from '@app/services/api/agent-session-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { resourceApi } from '@app/services/api/resource-client'
import { serviceModuleApi } from '@app/services/api/service-module-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { useResourceWorkbenchContext } from '@app/views/workbench/workbench-context'
import type {
  AgentMessageRead,
  AnyInstanceRead,
  ReferenceRead,
  RunAgentInputExtRequest,
  ServiceModuleProviderRead,
} from '@app/services/api/contracts'
import type { SseConnection } from '@repo/common'
import {
  AgentIdeWorkbench,
  type AgentIdeSeed,
  type AgentInstancePatchPayload,
  type AgentModelOption,
  type AgentReferenceBinding,
  type AgentResourceCatalogItem,
  type AgentStreamDebugEvent,
  type AgentWorkbenchMessage,
  type RightViewMode,
} from '@repo/workbench-agent'

const props = defineProps<{
  resourceName: string
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const router = useRouter()
const { t } = useI18n()

const workbenchContext = useResourceWorkbenchContext()
const workspaceUuid = computed(() => workbenchContext.workspaceUuid.value)
const resourceUuid = computed(() => workbenchContext.resourceUuid.value)
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? workbenchContext.workspaceInstanceUuid.value)

const activeSessionUuid = ref<string | null>(null)
const activeRightView = ref<RightViewMode>('chat')
const lastSavedAt = ref<string | null>(null)
const inlineError = ref<string | null>(null)

const streamConnection = ref<SseConnection | null>(null)
const streamAbortController = ref<AbortController | null>(null)
const streamToken = ref<number>(0)
const isStreaming = ref(false)
const streamingSessionUuid = ref<string | null>(null)
const streamingCanonicalRunId = ref<string | null>(null)
const pendingUserMessage = ref<AgentWorkbenchMessage | null>(null)
const streamingAssistantMessage = ref<AgentWorkbenchMessage | null>(null)
const debugEvents = ref<AgentStreamDebugEvent[]>([])
const streamingRunState = ref<Record<string, unknown>>({})
const streamingActivityState = ref<Record<string, unknown>>({})

interface PendingInterruptToolCall {
  toolCallId: string
  name: string
  arguments: unknown
}

interface PendingInterruptState {
  interruptId: string
  reason: string | null
  toolCalls: PendingInterruptToolCall[]
  sessionUuid: string | null
  runId: string | null
  createdAt: string
}

interface StreamingToolCallState {
  id: string
  name: string
  args: string
  status: string
  result: string | null
}

interface SendMessageOptions {
  parentRunId?: string | null
}

const pendingInterrupt = ref<PendingInterruptState | null>(null)
const streamingToolCalls = ref<Record<string, StreamingToolCallState>>({})
const streamingMessagesSnapshot = ref<AgUiMessageRequest[]>([])
const inflightResumeInterruptId = ref<string | null>(null)

const deletingSessionUuid = ref<string | null>(null)
const clearingSessionUuid = ref<string | null>(null)
const renamingSessionUuid = ref<string | null>(null)
const syncingBindings = ref(false)

const closeStreamConnection = (): void => {
  if (streamAbortController.value) {
    streamAbortController.value.abort()
    streamAbortController.value = null
  }
  if (streamConnection.value) {
    streamConnection.value.close()
    streamConnection.value = null
  }
}

const asStringOrNull = (value: unknown): string | null => {
  return typeof value === 'string' && value.length > 0 ? value : null
}

const asRecordOrNull = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

const asRecord = (value: unknown): Record<string, unknown> => {
  return asRecordOrNull(value) ?? {}
}

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : []
}

const toJsonText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const cloneJsonRecord = (value: Record<string, unknown>): Record<string, unknown> => {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  } catch {
    return { ...value }
  }
}

const AG_UI_ROLES = [
  'developer',
  'system',
  'assistant',
  'user',
  'tool',
  'activity',
  'reasoning',
] as const

type AgUiRole = typeof AG_UI_ROLES[number]
type AgUiMessageRequest = RunAgentInputExtRequest['messages'][number]

const normalizeAgUiRole = (value: unknown): AgUiRole => {
  return AG_UI_ROLES.includes(value as AgUiRole) ? (value as AgUiRole) : 'assistant'
}

const parseJsonPointerPath = (path: string): string[] => {
  return path
    .split('/')
    .slice(1)
    .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
}

const applyJsonPatch = (snapshot: Record<string, unknown>, patchValue: unknown): Record<string, unknown> => {
  const operations = asArray(patchValue)
  if (!operations.length) {
    return snapshot
  }

  const next = cloneJsonRecord(snapshot)

  operations.forEach((operation) => {
    const opRecord = asRecordOrNull(operation)
    const op = asStringOrNull(opRecord?.op)
    const path = asStringOrNull(opRecord?.path)
    if (!op || !path || !path.startsWith('/')) {
      return
    }
    const tokens = parseJsonPointerPath(path)
    if (!tokens.length) {
      return
    }

    const lastToken = tokens[tokens.length - 1]
    if (typeof lastToken !== 'string') {
      return
    }
    const parentTokens = tokens.slice(0, -1)
    let parent: unknown = next

    for (const token of parentTokens) {
      if (Array.isArray(parent)) {
        const idx = Number(token)
        if (!Number.isInteger(idx) || idx < 0 || idx >= parent.length) {
          parent = null
          break
        }
        parent = parent[idx]
        continue
      }
      const parentRecord = asRecordOrNull(parent)
      if (!parentRecord) {
        parent = null
        break
      }
      const current = parentRecord[token]
      if (current === undefined) {
        if (op === 'add' || op === 'replace') {
          parentRecord[token] = {}
          parent = parentRecord[token]
        } else {
          parent = null
          break
        }
      } else {
        parent = current
      }
    }

    if (parent === null) {
      return
    }

    if (Array.isArray(parent)) {
      if (lastToken === '-') {
        if (op === 'add') {
          parent.push(opRecord?.value)
        }
        return
      }
      const index = Number(lastToken)
      if (!Number.isInteger(index) || index < 0 || index > parent.length) {
        return
      }
      if (op === 'add') {
        parent.splice(index, 0, opRecord?.value)
      } else if (op === 'replace') {
        if (index >= parent.length) {
          return
        }
        parent[index] = opRecord?.value
      } else if (op === 'remove') {
        if (index >= parent.length) {
          return
        }
        parent.splice(index, 1)
      }
      return
    }

    const parentRecord = asRecordOrNull(parent)
    if (!parentRecord) {
      return
    }
    if (op === 'remove') {
      delete parentRecord[lastToken]
      return
    }
    parentRecord[lastToken] = opRecord?.value
  })

  return next
}

const appendDebugEvent = (
  type: string,
  payload: Record<string, unknown> = {},
  sessionId: string | null = null,
  runId: string | null = null,
  turnId: string | null = null,
  traceId: string | null = null,
  messageId: string | null = null,
  level: 'info' | 'warn' | 'error' = 'info',
): void => {
  debugEvents.value.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    ts: new Date().toISOString(),
    sessionId,
    runId,
    turnId,
    traceId,
    messageId,
    level,
    payload,
  })
  if (debugEvents.value.length > 500) {
    debugEvents.value = debugEvents.value.slice(-500)
  }
}

const mergeStreamingAssistantMeta = (extra: Record<string, unknown>): void => {
  const current = streamingAssistantMessage.value
  if (!current) {
    return
  }
  const nextMeta = {
    ...(current.meta ?? {}),
    ...extra,
  }
  streamingAssistantMessage.value = {
    ...current,
    meta: nextMeta,
    streaming: true,
  }
}

const syncStreamingAssistantMeta = (): void => {
  const meta: Record<string, unknown> = {}
  if (streamingCanonicalRunId.value) {
    meta.runId = streamingCanonicalRunId.value
  }
  if (Object.keys(streamingRunState.value).length) {
    meta.runState = streamingRunState.value
  }
  if (Object.keys(streamingActivityState.value).length) {
    meta.activity = streamingActivityState.value
  }
  if (
    pendingInterrupt.value
    && (pendingInterrupt.value.sessionUuid === streamingSessionUuid.value || pendingInterrupt.value.sessionUuid === activeSessionUuid.value)
  ) {
    meta.pendingInterrupt = {
      interruptId: pendingInterrupt.value.interruptId,
      reason: pendingInterrupt.value.reason,
      toolCalls: pendingInterrupt.value.toolCalls,
    }
  }
  if (Object.keys(meta).length) {
    mergeStreamingAssistantMeta(meta)
  }
}

const syncStreamingAssistantToolCalls = (): void => {
  const current = streamingAssistantMessage.value
  if (!current) {
    return
  }
  const toolCalls = Object.values(streamingToolCalls.value).map((tool) => {
    const record: Record<string, unknown> = {
      id: tool.id,
      type: 'function',
      function: {
        name: tool.name,
        arguments: tool.args,
      },
      status: tool.status,
    }
    if (tool.result !== null) {
      record.result = tool.result
    }
    return record
  })
  streamingAssistantMessage.value = {
    ...current,
    toolCalls: toolCalls.length ? toolCalls : null,
    streaming: true,
  }
}

const upsertStreamingToolCall = (toolCallId: string, patch: Partial<StreamingToolCallState>): void => {
  if (!toolCallId) {
    return
  }
  const current = streamingToolCalls.value[toolCallId]
  streamingToolCalls.value = {
    ...streamingToolCalls.value,
    [toolCallId]: {
      id: toolCallId,
      name: patch.name ?? current?.name ?? '',
      args: patch.args ?? current?.args ?? '',
      status: patch.status ?? current?.status ?? 'started',
      result: patch.result ?? current?.result ?? null,
    },
  }
  syncStreamingAssistantToolCalls()
}

const parsePendingInterrupt = (
  event: AgentStreamEvent,
  sessionUuid: string | null,
): PendingInterruptState | null => {
  const interrupt = asRecordOrNull(event.data.interrupt)
  const interruptId = asStringOrNull(interrupt?.id)
  if (!interruptId) {
    return null
  }
  const payload = asRecord(interrupt?.payload)
  const toolCalls = asArray(payload.toolCalls ?? payload.tool_calls).reduce<PendingInterruptToolCall[]>((acc, item) => {
    const record = asRecordOrNull(item)
    const toolCallId = asStringOrNull(record?.toolCallId) ?? asStringOrNull(record?.tool_call_id)
    const name = asStringOrNull(record?.name) ?? asStringOrNull(record?.toolName) ?? asStringOrNull(record?.tool_name)
    if (!toolCallId || !name) {
      return acc
    }
    acc.push({
      toolCallId,
      name,
      arguments: record?.arguments ?? record?.args ?? {},
    })
    return acc
  }, [])

  return {
    interruptId,
    reason: asStringOrNull(interrupt?.reason),
    toolCalls,
    sessionUuid,
    runId: asStringOrNull(event.data.runId) ?? asStringOrNull(event.data.run_id),
    createdAt: new Date().toISOString(),
  }
}

const resetStreamingStates = (): void => {
  streamingCanonicalRunId.value = null
  streamingRunState.value = {}
  streamingActivityState.value = {}
  streamingToolCalls.value = {}
  streamingMessagesSnapshot.value = []
}

const getEventRunId = (data: Record<string, unknown>): string | null => {
  return asStringOrNull(data.runId) ?? asStringOrNull(data.run_id)
}

const getEventThreadId = (data: Record<string, unknown>): string | null => {
  return asStringOrNull(data.threadId) ?? asStringOrNull(data.thread_id)
}

const getEventToolCallId = (data: Record<string, unknown>): string | null => {
  return asStringOrNull(data.toolCallId) ?? asStringOrNull(data.tool_call_id)
}

const getEventToolCallName = (data: Record<string, unknown>): string => {
  return asStringOrNull(data.toolCallName) ?? asStringOrNull(data.tool_call_name) ?? ''
}

const getEventMessageId = (data: Record<string, unknown>): string | null => {
  return asStringOrNull(data.messageId) ?? asStringOrNull(data.message_id)
}

const toJsonRecordArrayOrNull = (value: unknown): Record<string, unknown>[] | null => {
  if (!Array.isArray(value)) {
    return null
  }
  const next: Record<string, unknown>[] = []
  for (const item of value) {
    const record = asRecordOrNull(item)
    if (!record) {
      return null
    }
    next.push(record)
  }
  return next
}

const normalizeAgUiMessageContent = (value: unknown): AgUiMessageRequest['content'] => {
  if (value === null) {
    return null
  }
  if (typeof value === 'string') {
    return value
  }
  const contentParts = toJsonRecordArrayOrNull(value)
  if (contentParts) {
    return contentParts
  }
  if (value === undefined) {
    return ''
  }
  return toJsonText(value)
}

const handleStateSnapshotEvent = (event: AgentStreamEvent): void => {
  streamingRunState.value = cloneJsonRecord(asRecord(event.data.snapshot))
  syncStreamingAssistantMeta()
}

const handleStateDeltaEvent = (event: AgentStreamEvent): void => {
  streamingRunState.value = applyJsonPatch(streamingRunState.value, event.data.delta)
  syncStreamingAssistantMeta()
}

const handleMessagesSnapshotEvent = (event: AgentStreamEvent): void => {
  const rawMessages = asArray(event.data.messages)
  streamingMessagesSnapshot.value = rawMessages.map((item, index) => {
    const message = asRecord(item)
    const toolCalls = toJsonRecordArrayOrNull(message.toolCalls ?? message.tool_calls)
    const toolCallId = asStringOrNull(message.toolCallId) ?? asStringOrNull(message.tool_call_id)
    const error = asStringOrNull(message.error) ?? asStringOrNull(message.error_message)
    const encryptedValue = asStringOrNull(message.encryptedValue) ?? asStringOrNull(message.encrypted_value)
    const activityType = asStringOrNull(message.activityType) ?? asStringOrNull(message.activity_type)
    return {
      id:
        asStringOrNull(message.id)
        ?? `snapshot-${index}`,
      role: normalizeAgUiRole(message.role),
      content: normalizeAgUiMessageContent(
        message.content ?? message.contentParts ?? message.content_parts ?? message.text_content,
      ),
      ...(toolCalls ? { toolCalls } : {}),
      ...(toolCallId ? { toolCallId } : {}),
      ...(error ? { error } : {}),
      ...(encryptedValue ? { encryptedValue } : {}),
      ...(activityType ? { activityType } : {}),
    } satisfies AgUiMessageRequest
  })
  mergeStreamingAssistantMeta({
    messageSnapshotCount: streamingMessagesSnapshot.value.length,
  })
}

const handleActivitySnapshotEvent = (event: AgentStreamEvent): void => {
  streamingActivityState.value = cloneJsonRecord(asRecord(event.data.content))
  syncStreamingAssistantMeta()
}

const handleActivityDeltaEvent = (event: AgentStreamEvent): void => {
  streamingActivityState.value = applyJsonPatch(streamingActivityState.value, event.data.patch)
  syncStreamingAssistantMeta()
}

const handleToolEvent = (event: AgentStreamEvent): void => {
  const toolCallId = getEventToolCallId(event.data)
  if (!toolCallId) {
    return
  }
  if (event.event === 'TOOL_CALL_START') {
    upsertStreamingToolCall(toolCallId, {
      name: getEventToolCallName(event.data),
      status: 'started',
    })
    syncStreamingAssistantMeta()
    return
  }
  if (event.event === 'TOOL_CALL_ARGS' || event.event === 'TOOL_CALL_CHUNK') {
    const delta = asStringOrNull(event.data.delta) ?? ''
    const current = streamingToolCalls.value[toolCallId]
    upsertStreamingToolCall(toolCallId, {
      args: `${current?.args ?? ''}${delta}`,
      status: current?.status ?? 'started',
    })
    syncStreamingAssistantMeta()
    return
  }
  if (event.event === 'TOOL_CALL_END') {
    upsertStreamingToolCall(toolCallId, {
      status: 'awaiting_result',
    })
    syncStreamingAssistantMeta()
    return
  }
  if (event.event === 'TOOL_CALL_RESULT') {
    const content = asStringOrNull(event.data.content) ?? asStringOrNull(event.data.result) ?? toJsonText(event.data.content)
    upsertStreamingToolCall(toolCallId, {
      result: content,
      status: 'completed',
    })
    syncStreamingAssistantMeta()
  }
}

const handleLifecycleEvent = (event: AgentStreamEvent): void => {
  const eventRunId = getEventRunId(event.data)
  if (eventRunId) {
    streamingCanonicalRunId.value = eventRunId
  }

  if (event.event === 'RUN_STARTED') {
    streamingRunState.value = applyJsonPatch(streamingRunState.value, [
      { op: 'add', path: '/runStatus', value: 'running' },
    ])
    if (inflightResumeInterruptId.value && pendingInterrupt.value?.interruptId === inflightResumeInterruptId.value) {
      pendingInterrupt.value = null
      inflightResumeInterruptId.value = null
    }
    syncStreamingAssistantMeta()
    return
  }

  if (event.event !== 'RUN_FINISHED') {
    return
  }

  const outcome = asStringOrNull(event.data.outcome) ?? 'success'
  const mappedRunStatus = outcome === 'interrupt'
    ? 'interrupted'
    : outcome === 'cancelled'
      ? 'cancelled'
      : 'completed'
  streamingRunState.value = applyJsonPatch(streamingRunState.value, [
    { op: 'replace', path: '/runStatus', value: mappedRunStatus },
  ])

  if (outcome === 'interrupt') {
    const interrupt = parsePendingInterrupt(
      event,
      streamingSessionUuid.value ?? activeSessionUuid.value,
    )
    if (interrupt) {
      pendingInterrupt.value = interrupt
    }
  }

  syncStreamingAssistantMeta()
}

const buildResumePayload = (sessionUuid: string, inputText: string): RunAgentInputExtRequest['resume'] | undefined => {
  const interrupt = pendingInterrupt.value
  if (!interrupt || interrupt.sessionUuid !== sessionUuid) {
    return undefined
  }
  if (!interrupt.toolCalls.length) {
    return undefined
  }
  return {
    interruptId: interrupt.interruptId,
    payload: {
      toolResults: interrupt.toolCalls.map(call => ({
        toolCallId: call.toolCallId,
        content: {
          tool_name: call.name,
          user_input: inputText,
        },
      })),
    },
  }
}

const finalizeStreaming = async (token: number, options: { clearMessages?: boolean } = {}): Promise<void> => {
  if (streamToken.value !== token) {
    return
  }
  streamToken.value = 0
  isStreaming.value = false
  closeStreamConnection()
  inflightResumeInterruptId.value = null

  await Promise.all([
    sessionsQuery.refetch(),
    messagesQuery.refetch(),
  ])

  if (options.clearMessages !== false) {
    pendingUserMessage.value = null
    streamingAssistantMessage.value = null
    streamingSessionUuid.value = null
  }
  resetStreamingStates()
}

const stopStreaming = async (): Promise<void> => {
  if (!isStreaming.value) {
    return
  }
  appendDebugEvent(
    'client.cancel',
    { reason: 'manual_stop' },
    streamingSessionUuid.value ?? activeSessionUuid.value,
    streamingCanonicalRunId.value,
    null,
    null,
    null,
    'warn',
  )
  const token = streamToken.value
  closeStreamConnection()
  await finalizeStreaming(token)
}

onBeforeUnmount(() => {
  closeStreamConnection()
})

const resourceDetailQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.resourceDetail(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value)),
  queryFn: async () => resourceApi.getResource(resourceUuid.value),
})

const workspaceResourcesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.workspaceResources(workspaceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => resourceApi.listWorkspaceResources(workspaceUuid.value as string),
})

const refsQuery = useQuery({
  queryKey: computed(() => ['agent', instanceUuid.value ?? 'none', 'refs']),
  enabled: computed(() => Boolean(instanceUuid.value)),
  queryFn: async () => resourceApi.listInstanceRefs(instanceUuid.value as string),
})

const sessionsQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.chatSessions(instanceUuid.value ?? 'none', 1, 50)),
  enabled: computed(() => Boolean(instanceUuid.value)),
  queryFn: async () => agentSessionApi.listSessions(instanceUuid.value as string, 1, 50),
})

watch(
  () => sessionsQuery.data.value,
  (sessions) => {
    if (!sessions?.length) {
      activeSessionUuid.value = null
      return
    }
    const stillExists = activeSessionUuid.value
      ? sessions.some(session => session.uuid === activeSessionUuid.value)
      : false
    if (!stillExists) {
      activeSessionUuid.value = sessions[0]?.uuid ?? null
    }
  },
  { immediate: true },
)

watch(
  () => activeSessionUuid.value,
  (next, prev) => {
    if (prev && next !== prev && isStreaming.value) {
      void stopStreaming()
    }
    inlineError.value = null
  },
)

const messagesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.chatMessages(activeSessionUuid.value ?? 'none', 0, 100)),
  enabled: computed(() => Boolean(activeSessionUuid.value)),
  queryFn: async () => agentSessionApi.listMessages(activeSessionUuid.value as string, 0, 100),
})

const modelCatalogQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.serviceModulesAvailable(workspaceUuid.value, 'llm')),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => {
    const [providers, modules] = await Promise.all([
      serviceModuleApi.listModuleProviders(),
      serviceModuleApi.listAvailableModules(workspaceUuid.value, 'llm'),
    ])
    return { providers, modules }
  },
})

const providerMap = computed(() => {
  const map = new Map<number, ServiceModuleProviderRead>()
  ;(modelCatalogQuery.data.value?.providers ?? []).forEach((provider) => {
    map.set(provider.id, provider)
  })
  return map
})

const modelOptions = computed<AgentModelOption[]>(() => {
  const modules = modelCatalogQuery.data.value?.modules ?? []
  const options: AgentModelOption[] = []
  modules.forEach((module) => {
    const provider = providerMap.value.get(module.provider_id)
    module.versions.forEach((version) => {
      options.push({
        modelUuid: version.uuid,
        displayName: `${module.label} · ${version.version_tag}`,
        provider: provider?.name ?? 'unknown',
        providerLabel: provider?.label ?? provider?.name ?? 'Unknown',
        moduleName: module.name,
        moduleLabel: module.label,
        versionTag: version.version_tag,
        description: version.description,
      })
    })
  })
  return options
})

const toAgentSeed = (resourceName: string, instance: AnyInstanceRead | null | undefined): AgentIdeSeed | null => {
  if (!instance || typeof instance !== 'object') {
    return null
  }
  const raw = instance as Record<string, unknown>
  if (typeof raw.system_prompt !== 'string') {
    return null
  }
  return {
    resourceName,
    systemPrompt: raw.system_prompt,
    llmModuleVersionUuid: typeof raw.llm_module_version_uuid === 'string' ? raw.llm_module_version_uuid : null,
    agentConfig: asRecord(raw.agent_config),
  }
}

const ideSeed = computed(() => {
  return toAgentSeed(
    resourceDetailQuery.data.value?.name ?? props.resourceName,
    resourceDetailQuery.data.value?.workspace_instance,
  )
})

const saveMutation = useMutation({
  mutationFn: async (payload: AgentInstancePatchPayload) => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return resourceApi.updateInstance(instanceUuid.value, payload as Record<string, unknown>)
  },
  onSuccess: async () => {
    inlineError.value = null
    lastSavedAt.value = new Date().toISOString()
    await Promise.all([
      resourceDetailQuery.refetch(),
      workbenchContext.refresh(),
    ])
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.saveFailed')
    emitBusinessError(error)
  },
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    await resourceApi.publishInstance(instanceUuid.value, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onSuccess: async () => {
    inlineError.value = null
    await Promise.all([
      resourceDetailQuery.refetch(),
      workbenchContext.refresh(),
    ])
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.publishFailed')
    emitBusinessError(error)
  },
})

const createSessionMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return agentSessionApi.createSession({
      agent_instance_uuid: instanceUuid.value,
    })
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.createSessionFailed')
    emitBusinessError(error)
  },
})

const ensureSessionUuid = async (): Promise<string> => {
  if (activeSessionUuid.value) {
    return activeSessionUuid.value
  }
  const created = await createSessionMutation.mutateAsync()
  activeSessionUuid.value = created.uuid
  await sessionsQuery.refetch()
  return created.uuid
}

const handleSave = async (payload: AgentInstancePatchPayload): Promise<void> => {
  await saveMutation.mutateAsync(payload)
}

const handleCreateSession = async (): Promise<void> => {
  const session = await createSessionMutation.mutateAsync()
  activeSessionUuid.value = session.uuid
  activeRightView.value = 'chat'
  inlineError.value = null
  await sessionsQuery.refetch()
}

const handleSelectSession = (sessionUuid: string): void => {
  activeSessionUuid.value = sessionUuid
  activeRightView.value = 'chat'
}

const handleRenameSession = async (payload: { sessionUuid: string, title: string }): Promise<void> => {
  renamingSessionUuid.value = payload.sessionUuid
  try {
    await agentSessionApi.updateSession(payload.sessionUuid, {
      title: payload.title,
    })
    inlineError.value = null
    await sessionsQuery.refetch()
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.sessionManager.renameFailed')
    emitBusinessError(error)
  } finally {
    renamingSessionUuid.value = null
  }
}

const handleDeleteSession = async (sessionUuid: string): Promise<void> => {
  deletingSessionUuid.value = sessionUuid
  try {
    if (isStreaming.value && streamingSessionUuid.value === sessionUuid) {
      await stopStreaming()
    }
    await agentSessionApi.deleteSession(sessionUuid)
    if (activeSessionUuid.value === sessionUuid) {
      activeSessionUuid.value = null
      pendingUserMessage.value = null
      streamingAssistantMessage.value = null
      streamingSessionUuid.value = null
      resetStreamingStates()
    }
    if (pendingInterrupt.value?.sessionUuid === sessionUuid) {
      pendingInterrupt.value = null
    }
    inlineError.value = null
    await sessionsQuery.refetch()
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.sessionManager.deleteFailed')
    emitBusinessError(error)
  } finally {
    deletingSessionUuid.value = null
  }
}

const handleClearSessionContext = async (sessionUuid: string): Promise<void> => {
  clearingSessionUuid.value = sessionUuid
  try {
    if (isStreaming.value && streamingSessionUuid.value === sessionUuid) {
      await stopStreaming()
    }
    await agentSessionApi.clearContext(sessionUuid, { mode: 'production' })
    if (activeSessionUuid.value === sessionUuid) {
      pendingUserMessage.value = null
      streamingAssistantMessage.value = null
      streamingSessionUuid.value = null
      resetStreamingStates()
      await messagesQuery.refetch()
    }
    if (pendingInterrupt.value?.sessionUuid === sessionUuid) {
      pendingInterrupt.value = null
    }
    inlineError.value = null
    appendDebugEvent('session.context_cleared', { session_uuid: sessionUuid }, sessionUuid, null, null, null, null)
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.sessionManager.clearFailed')
    emitBusinessError(error)
  } finally {
    clearingSessionUuid.value = null
  }
}

const appendAssistantText = (chunk: string): void => {
  const current = streamingAssistantMessage.value
  if (!current) {
    return
  }
  streamingAssistantMessage.value = {
    ...current,
    content: `${current.content ?? ''}${chunk}`,
    streaming: true,
  }
}

const appendReasoningText = (chunk: string): void => {
  const current = streamingAssistantMessage.value
  if (!current) {
    return
  }
  streamingAssistantMessage.value = {
    ...current,
    reasoning: `${current.reasoning ?? ''}${chunk}`,
    streaming: true,
  }
}

const createRequestRunId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `request-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const resolveResumeParentRunId = (sessionUuid: string): string | null => {
  const interrupt = pendingInterrupt.value
  if (!interrupt || interrupt.sessionUuid !== sessionUuid) {
    return null
  }
  return interrupt.runId
}

const resolveTurnParentRunId = (message: AgentMessageRead): string | null => {
  if (message.run_id) {
    return message.run_id
  }
  if (!message.turn_id) {
    return null
  }
  const relatedMessage = [...(messagesQuery.data.value ?? [])]
    .reverse()
    .find(candidate => candidate.turn_id === message.turn_id && candidate.run_id)
  return relatedMessage?.run_id ?? null
}

const buildAgUiMessages = (inputText: string, token: number): AgUiMessageRequest[] => {
  return [{
    id: `local-user-${token}`,
    role: 'user',
    content: inputText,
  }]
}

const handleSendMessage = async (text: string, options: SendMessageOptions = {}): Promise<void> => {
  if (isStreaming.value) {
    return
  }
  if (!instanceUuid.value) {
    inlineError.value = t('platform.workbench.errors.noWorkspaceInstance')
    return
  }

  const sessionUuid = await ensureSessionUuid()
  const token = Date.now()
  streamToken.value = token
  isStreaming.value = true
  streamingSessionUuid.value = sessionUuid
  activeSessionUuid.value = sessionUuid
  activeRightView.value = 'chat'
  inlineError.value = null

  const now = new Date().toISOString()
  pendingUserMessage.value = {
    uuid: `local-user-${token}`,
    role: 'user',
    content: text,
    createdAt: now,
  }
  streamingAssistantMessage.value = {
    uuid: `local-assistant-${token}`,
    role: 'assistant',
    content: '',
    reasoning: '',
    references: [],
    createdAt: now,
    streaming: true,
  }
  resetStreamingStates()

  const requestRunId = createRequestRunId()
  const requestMessages = buildAgUiMessages(text, token)
  const resume = buildResumePayload(sessionUuid, text)
  const parentRunId = options.parentRunId ?? resolveResumeParentRunId(sessionUuid)
  inflightResumeInterruptId.value = resume?.interruptId ?? null
  appendDebugEvent('request', {
    requestRunId,
    parentRunId,
    threadId: sessionUuid,
    messages: requestMessages.length,
    resumedFromInterrupt: Boolean(resume),
    pendingToolResults: resume?.payload?.toolResults?.length ?? 0,
  }, sessionUuid, null, null, null, null)

  const abortController = new AbortController()
  streamAbortController.value = abortController

  try {
    const connection = await agentApi.streamExecute(instanceUuid.value, {
      threadId: sessionUuid,
      runId: requestRunId,
      ...(parentRunId ? { parentRunId } : {}),
      state: {},
      messages: requestMessages,
      tools: [],
      context: [],
      forwardedProps: {},
      ...(resume ? { resume } : {}),
    }, {
      onEvent: (event) => {
        if (streamToken.value !== token) {
          return
        }
        const eventRunId = getEventRunId(event.data)
        if (eventRunId) {
          streamingCanonicalRunId.value = eventRunId
        }
        const eventMessageId = getEventMessageId(event.data)
        if (event.event === 'TEXT_MESSAGE_START' && eventMessageId && streamingAssistantMessage.value) {
          streamingAssistantMessage.value = {
            ...streamingAssistantMessage.value,
            uuid: eventMessageId,
          }
        }
        let eventSessionUuid = streamingSessionUuid.value
        let eventTurnId = eventRunId
        let eventRunRef = eventRunId
        let eventTraceId: string | null = null
        let debugType: string = event.event
        let debugPayload = event.data
        let level: 'info' | 'warn' | 'error' = 'info'
        const eventName = asStringOrNull(event.data.name)

        if (event.event === 'CUSTOM' && event.data.name === 'ps.meta.trace') {
          const traceMeta = asRecord(event.data.value)
          eventSessionUuid = asStringOrNull(traceMeta?.sessionUuid) ?? eventSessionUuid
          eventRunRef = asStringOrNull(traceMeta?.runId) ?? eventRunRef
          eventTurnId = asStringOrNull(traceMeta?.turnId) ?? eventTurnId
          eventTraceId = asStringOrNull(traceMeta?.traceId)
          debugType = 'trace'
          debugPayload = traceMeta
        } else if (event.event === 'CUSTOM' && eventName === 'ps.meta.usage') {
          debugType = 'usage'
          debugPayload = asRecord(event.data.value)
        }

        if (event.event === 'RUN_ERROR') {
          level = 'error'
        } else if (event.event === 'RUN_FINISHED') {
          const outcome = asStringOrNull(event.data.outcome)
          if (outcome === 'interrupt' || outcome === 'cancelled') {
            level = 'warn'
          }
        }

        appendDebugEvent(
          debugType,
          debugPayload,
          eventSessionUuid,
          eventRunRef,
          eventTurnId,
          eventTraceId,
          eventMessageId,
          level,
        )

        if (eventSessionUuid && eventSessionUuid !== streamingSessionUuid.value) {
          streamingSessionUuid.value = eventSessionUuid
          activeSessionUuid.value = eventSessionUuid
        }
      },
      onLifecycleEvent: (event) => {
        if (streamToken.value !== token) {
          return
        }
        const threadId = getEventThreadId(event.data)
        if (threadId) {
          streamingSessionUuid.value = threadId
          activeSessionUuid.value = threadId
        }
        handleLifecycleEvent(event)
      },
      onMessageDelta: (event) => {
        if (streamToken.value !== token) {
          return
        }
        const chunk = asStringOrNull(event.data.delta) ?? asStringOrNull(event.data.content) ?? ''
        if (chunk) {
          appendAssistantText(chunk)
        }
      },
      onReasoningDelta: (event) => {
        if (streamToken.value !== token) {
          return
        }
        const chunk = asStringOrNull(event.data.delta) ?? asStringOrNull(event.data.reasoning) ?? asStringOrNull(event.data.content) ?? ''
        if (chunk) {
          appendReasoningText(chunk)
        }
      },
      onToolEvent: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleToolEvent(event)
      },
      onStateSnapshot: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleStateSnapshotEvent(event)
      },
      onStateDelta: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleStateDeltaEvent(event)
      },
      onMessagesSnapshot: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleMessagesSnapshotEvent(event)
      },
      onActivitySnapshot: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleActivitySnapshotEvent(event)
      },
      onActivityDelta: (event) => {
        if (streamToken.value !== token) {
          return
        }
        handleActivityDeltaEvent(event)
      },
      onDone: () => {
        void finalizeStreaming(token)
      },
      onServerError: (event) => {
        if (streamToken.value !== token) {
          return
        }
        const errorMessage = asStringOrNull(event.data.message)
          ?? asStringOrNull(event.data.error)
          ?? t('platform.workbench.agent.executeFailed')
        inlineError.value = errorMessage
        emitBusinessError(new Error(errorMessage))
        void finalizeStreaming(token)
      },
      onError: (error) => {
        if (streamToken.value !== token) {
          return
        }
        inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.executeFailed')
        emitBusinessError(error)
        void finalizeStreaming(token)
      },
    }, abortController.signal)

    if (streamToken.value !== token) {
      connection.close()
      return
    }
    streamConnection.value = connection
  } catch (error) {
    if (streamToken.value === token) {
      inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.executeFailed')
      emitBusinessError(error)
      await finalizeStreaming(token)
    }
  }
}

const handleRetryLastUser = async (): Promise<void> => {
  const reversed = [...(messagesQuery.data.value ?? [])].reverse()
  const lastUser = reversed.find(message => {
    const content = message.text_content ?? message.content ?? ''
    return message.role === 'user' && content.trim().length > 0
  })
  const content = lastUser ? (lastUser.text_content ?? lastUser.content ?? '') : ''
  if (!lastUser || !content.trim()) {
    return
  }
  await handleSendMessage(content, {
    parentRunId: resolveTurnParentRunId(lastUser),
  })
}

const handleContinueMessage = async (): Promise<void> => {
  await handleSendMessage(t('common.continue'))
}

const handlePublish = async (): Promise<void> => {
  if (!instanceUuid.value) {
    return
  }
  await publishMutation.mutateAsync()
}

const handleClearDebugEvents = (): void => {
  debugEvents.value = []
}

const sessionItems = computed(() => {
  return (sessionsQuery.data.value ?? []).map(session => ({
    uuid: session.uuid,
    title: session.title,
    messageCount: session.message_count,
    updatedAt: session.updated_at,
  }))
})

const resourceCatalog = computed<AgentResourceCatalogItem[]>(() => {
  return (workspaceResourcesQuery.data.value ?? []).map(resource => ({
    resourceUuid: resource.uuid,
    name: resource.name,
    description: resource.description,
    resourceType: resource.resource_type,
    workspaceInstanceUuid: resource.workspace_instance_uuid,
    latestPublishedInstanceUuid: resource.latest_published_instance_uuid,
  }))
})

const bindingItems = computed<AgentReferenceBinding[]>(() => {
  return (refsQuery.data.value ?? []).map((binding: ReferenceRead) => ({
    id: binding.id,
    sourceNodeUuid: binding.source_node_uuid,
    alias: binding.alias,
    targetInstanceUuid: binding.target_instance_uuid,
    targetResourceName: binding.target_resource_name,
    targetResourceType: binding.target_resource_type,
    targetVersionTag: binding.target_version_tag,
  }))
})

const handleAddBinding = async (payload: { sourceNodeUuid: string, targetInstanceUuid: string }): Promise<void> => {
  if (!instanceUuid.value || syncingBindings.value) {
    return
  }
  const exists = bindingItems.value.some(item => item.sourceNodeUuid === payload.sourceNodeUuid && item.targetInstanceUuid === payload.targetInstanceUuid)
  if (exists) {
    return
  }
  syncingBindings.value = true
  try {
    await resourceApi.addInstanceRef(instanceUuid.value, {
      target_instance_uuid: payload.targetInstanceUuid,
      source_node_uuid: payload.sourceNodeUuid,
    })
    await refsQuery.refetch()
    inlineError.value = null
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.core.refs.addFailed')
    emitBusinessError(error)
  } finally {
    syncingBindings.value = false
  }
}

const handleRemoveBinding = async (payload: { sourceNodeUuid: string, targetInstanceUuid: string }): Promise<void> => {
  if (!instanceUuid.value || syncingBindings.value) {
    return
  }
  syncingBindings.value = true
  try {
    await resourceApi.removeInstanceRef(instanceUuid.value, payload.targetInstanceUuid, payload.sourceNodeUuid)
    await refsQuery.refetch()
    inlineError.value = null
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.core.refs.removeFailed')
    emitBusinessError(error)
  } finally {
    syncingBindings.value = false
  }
}

const baseMessageItems = computed<AgentWorkbenchMessage[]>(() => {
  if (!activeSessionUuid.value) {
    return []
  }
  return (messagesQuery.data.value ?? []).map((message: AgentMessageRead) => ({
    uuid: message.uuid,
    role: message.role,
    content: message.text_content ?? message.content,
    reasoning: message.reasoning_content ?? null,
    createdAt: message.created_at,
    meta: message.meta as Record<string, unknown> | null,
    toolCalls: message.tool_calls as Record<string, unknown>[] | null,
  }))
})

const messageItems = computed<AgentWorkbenchMessage[]>(() => {
  const merged = [...baseMessageItems.value]
  const sessionUuid = activeSessionUuid.value
  if (!sessionUuid || streamingSessionUuid.value !== sessionUuid) {
    return merged
  }

  if (pendingUserMessage.value) {
    merged.push(pendingUserMessage.value)
  }
  if (streamingAssistantMessage.value) {
    merged.push(streamingAssistantMessage.value)
  }
  return merged
})

const debugEventItems = computed(() => {
  if (!activeSessionUuid.value) {
    return debugEvents.value.slice(-200)
  }
  return debugEvents.value
    .filter(event => !event.sessionId || event.sessionId === activeSessionUuid.value)
    .slice(-200)
})

watch(
  () => resourceDetailQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => modelCatalogQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => workspaceResourcesQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => refsQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => sessionsQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => messagesQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)
</script>

<template>
  <AgentIdeWorkbench
    :seed="ideSeed"
    :resource-description="resourceDescription"
    :updated-at="lastSavedAt ?? resourceDetailQuery.data.value?.updated_at ?? updatedAt ?? null"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :model-options="modelOptions"
    :resources="resourceCatalog"
    :bindings="bindingItems"
    :sessions="sessionItems"
    :active-session-uuid="activeSessionUuid"
    :active-right-view="activeRightView"
    :messages="messageItems"
    :debug-events="debugEventItems"
    :loading="resourceDetailQuery.isLoading.value"
    :saving="saveMutation.isPending.value"
    :models-loading="modelCatalogQuery.isLoading.value"
    :loading-bindings="refsQuery.isLoading.value"
    :syncing-bindings="syncingBindings"
    :loading-sessions="sessionsQuery.isLoading.value"
    :loading-messages="messagesQuery.isLoading.value"
    :creating-session="createSessionMutation.isPending.value"
    :deleting-session-uuid="deletingSessionUuid"
    :clearing-session-uuid="clearingSessionUuid"
    :renaming-session-uuid="renamingSessionUuid"
    :executing="isStreaming"
    :publishing="publishMutation.isPending.value"
    :last-saved-at="lastSavedAt"
    :error-message="inlineError"
    @back="router.push('/resources')"
    @save="handleSave"
    @publish="handlePublish"
    @add-binding="handleAddBinding"
    @remove-binding="handleRemoveBinding"
    @create-session="handleCreateSession"
    @select-session="handleSelectSession"
    @rename-session="handleRenameSession"
    @delete-session="handleDeleteSession"
    @clear-session-context="handleClearSessionContext"
    @send-message="handleSendMessage"
    @retry-last-user="handleRetryLastUser"
    @continue-message="handleContinueMessage"
    @stop-stream="stopStreaming"
    @clear-debug-events="handleClearDebugEvents"
    @update:active-right-view="activeRightView = $event"
  />
</template>
