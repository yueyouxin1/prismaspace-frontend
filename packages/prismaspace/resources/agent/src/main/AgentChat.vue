<script setup lang="ts">
import type {
  AgUiMessageRequest,
  AgentMessageRead,
  AgentSessionRead,
  AnyInstanceRead,
  RunAgentInputExtRequest,
} from '@prismaspace/contracts'
import type { PromptInputMessage } from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import type { AttachmentSummary, DisplayMessage, SessionGroup, ToolCallView } from './agent-chat.types'
import { createClient } from '@prismaspace/sdk'
import { nanoid } from 'nanoid'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import AgentChatHeader from './components/AgentChatHeader.vue'
import AgentComposer from './components/AgentComposer.vue'
import AgentConversationView from './components/AgentConversationView.vue'
import AgentSessionList from './components/AgentSessionList.vue'

const props = defineProps<{
  client?: PrismaspaceClient | null
  instanceUuid?: string
  threadId?: string | null
  accessToken?: string | null
  baseUrl?: string
  locale?: string
  title?: string
  starterPrompts?: string[]
}>()

const emit = defineEmits<{
  (event: 'thread-change', value: string | null): void
  (event: 'update:threadId', value: string | null): void
  (event: 'session-change', value: AgentSessionRead | null): void
  (event: 'error', error: unknown): void
}>()

const HOST_ACCESS_TOKEN_KEY = 'prismaspace.session.access_token'
const MAX_SESSIONS = 100
const MAX_MESSAGES = 100
const SIDEBAR_LAYOUT_MIN_WIDTH = 980

const instanceDetail = ref<AnyInstanceRead | null>(null)
const sessions = ref<AgentSessionRead[]>([])
const messages = ref<DisplayMessage[]>([])
const activeThreadId = ref<string | null>(null)
const loadingSessions = ref(false)
const loadingMessages = ref(false)
const creatingSession = ref(false)
const isStreaming = ref(false)
const shellError = ref<string | null>(null)
const useWebSearch = ref(false)
const mobileSidebarOpen = ref(false)
const renamingSessionId = ref<string | null>(null)
const renamingTitle = ref('')
const shellRef = ref<HTMLElement | null>(null)
const currentRunId = ref<string | null>(null)
const currentAssistantMessageId = ref<string | null>(null)
const streamAbortController = shallowRef<AbortController | null>(null)
const streamConnection = shallowRef<{ close?: () => void } | null>(null)
const streamingStoppedByUser = ref(false)
const shellWidth = ref(0)

let initializeTicket = 0
let shellResizeObserver: ResizeObserver | null = null

const readHostAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const value = window.localStorage.getItem(HOST_ACCESS_TOKEN_KEY)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

const resolvedLocale = computed(() => {
  if (props.locale?.trim()) {
    return props.locale.trim()
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return 'zh-CN'
})

const isZh = computed(() => resolvedLocale.value.toLowerCase().startsWith('zh'))

const copy = computed(() => {
  if (isZh.value) {
    return {
      newChat: '新对话',
      today: '今天',
      previous7Days: '近 7 天',
      earlier: '更早',
      session: '会话',
      untitledSession: '未命名会话',
      loadingSessions: '正在加载会话...',
      loadingMessages: '正在加载消息...',
      noSessions: '还没有历史会话，开始一轮新的对话吧。',
      openingFallback: '你好，今天想聊什么？',
      missingInstance: '缺少 instanceUuid，无法初始化 AgentChat。',
      inputPlaceholder: '你有什么想知道的，快来问问我',
      renamePlaceholder: '输入会话标题',
      deleteConfirm: '确认删除这个会话？',
      attachmentOnlyPrompt: '请结合我附带的文件元信息继续处理。',
      attachmentOnlyLabel: '已附加文件',
      attachmentContext: 'Attached files metadata',
      attachFile: '添加附件',
      webSearch: '联网检索',
      webSearchContext: 'User prefers web-enabled retrieval if the agent has access.',
      webSearchEnabled: '优先联网检索',
      sources: '来源',
      showSources: '展开来源',
      hideSources: '收起来源',
      thinking: '已深度思考',
      analyzed: '已完成思考',
      toolChain: '工具链',
      you: '你',
      agent: 'Agent',
      failedLoadInstance: '加载 Agent 实例失败。',
      failedLoadSessions: '加载会话失败。',
      failedLoadMessages: '加载消息失败。',
      failedCreateSession: '创建会话失败。',
      failedRenameSession: '重命名会话失败。',
      failedDeleteSession: '删除会话失败。',
      failedExecute: 'Agent 执行失败。',
      noContent: '正在等待 Agent 输出...',
      authFallback: '未显式传入 accessToken，将尝试使用当前站点登录态。',
      copy: '复制',
      copied: '已复制',
      disclaimer: '内容由 AI 生成，仅供参考',
    }
  }

  return {
    newChat: 'New chat',
    today: 'Today',
    previous7Days: 'Previous 7 Days',
    earlier: 'Earlier',
    session: 'Sessions',
    untitledSession: 'Untitled session',
    loadingSessions: 'Loading sessions...',
    loadingMessages: 'Loading messages...',
    noSessions: 'No sessions yet. Start a new conversation.',
    openingFallback: 'Hello, what would you like to explore?',
    missingInstance: 'Missing instanceUuid. AgentChat cannot initialize.',
    inputPlaceholder: 'What would you like to ask?',
    renamePlaceholder: 'Enter a session title',
    deleteConfirm: 'Delete this session?',
    attachmentOnlyPrompt: 'Please continue with the attached file metadata.',
    attachmentOnlyLabel: 'Attached files',
    attachmentContext: 'Attached files metadata',
    attachFile: 'Attach file',
    webSearch: 'Web search',
    webSearchContext: 'User prefers web-enabled retrieval if the agent has access.',
    webSearchEnabled: 'Prefer web search',
    sources: 'Sources',
    showSources: 'Show sources',
    hideSources: 'Hide sources',
    thinking: 'Reasoning',
    analyzed: 'Reasoned through',
    toolChain: 'Tool chain',
    you: 'You',
    agent: 'Agent',
    failedLoadInstance: 'Failed to load agent instance.',
    failedLoadSessions: 'Failed to load sessions.',
    failedLoadMessages: 'Failed to load messages.',
    failedCreateSession: 'Failed to create session.',
    failedRenameSession: 'Failed to rename session.',
    failedDeleteSession: 'Failed to delete session.',
    failedExecute: 'Agent execution failed.',
    noContent: 'Waiting for the agent to produce output...',
    authFallback: 'No explicit accessToken was passed, falling back to the host session if available.',
    copy: 'Copy',
    copied: 'Copied!',
    disclaimer: 'AI generated content, for reference only',
  }
})

const instanceUuid = computed(() => props.instanceUuid?.trim() || '')
const explicitThreadId = computed(() => props.threadId?.trim() || '')
const isPinnedThreadMode = computed(() => explicitThreadId.value.length > 0)
const accessToken = computed(() => props.accessToken?.trim() || readHostAccessToken() || '')
const baseUrl = computed(() => {
  if (props.baseUrl?.trim()) {
    return props.baseUrl.trim()
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

const resolvedClient = computed(() => {
  if (props.client) {
    return props.client
  }
  if (!baseUrl.value) {
    return null
  }
  return createClient({
    baseUrl: baseUrl.value,
    locale: resolvedLocale.value,
    getAccessToken: () => accessToken.value || null,
  })
})

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(item => readString(item)).filter(Boolean)
}

function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function deriveSessionTitle(text: string, attachments: AttachmentSummary[]): string {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized) {
    return normalized.slice(0, 48)
  }
  if (attachments.length) {
    return `${copy.value.attachmentOnlyLabel} · ${attachments.length}`
  }
  return copy.value.untitledSession
}

function mergeSources(target: DisplayMessage['sources'], additions: DisplayMessage['sources']): DisplayMessage['sources'] {
  const next = [...target]
  additions.forEach((source) => {
    const key = `${source.title}::${source.url || ''}`
    if (!next.some(item => `${item.title}::${item.url || ''}` === key)) {
      next.push(source)
    }
  })
  return next
}

function upsertToolCall(target: ToolCallView[], addition: ToolCallView): ToolCallView[] {
  const index = target.findIndex(item => item.id === addition.id)
  if (index < 0) {
    return [...target, addition]
  }
  const next = [...target]
  const current = next[index] as ToolCallView
  next[index] = {
    ...current,
    ...addition,
    args: addition.args || current.args,
    result: addition.result ?? current.result,
    error: addition.error ?? current.error,
  }
  return next
}

const instanceName = computed(() => {
  const instanceLabel = readString(instanceDetail.value?.name)
  if (instanceLabel) {
    return instanceLabel
  }
  const config = toRecord(instanceDetail.value?.agent_config)
  const configName = readString(config.name) || readString(config.title)
  if (configName) {
    return configName
  }
  if (props.title?.trim()) {
    return props.title.trim()
  }
  return copy.value.agent
})

const conversationConfig = computed(() => {
  const config = toRecord(toRecord(toRecord(instanceDetail.value?.agent_config).ui_config).conversation)
  return {
    openingMessage: readString(config.opening_message) || copy.value.openingFallback,
    presetQuestions: toStringArray(config.preset_questions),
    showAllPresetQuestions: readBoolean(config.show_all_preset_questions, true),
  }
})

const visibleSuggestions = computed(() => {
  const overrideItems = Array.isArray(props.starterPrompts)
    ? props.starterPrompts.map(item => item.trim()).filter(Boolean)
    : []
  const items = overrideItems.length > 0 ? overrideItems : conversationConfig.value.presetQuestions
  if (overrideItems.length > 0) {
    return items
  }
  return conversationConfig.value.showAllPresetQuestions ? items : items.slice(0, 4)
})

const showSidebar = computed(() => !isPinnedThreadMode.value)
const showDesktopSidebar = computed(() => showSidebar.value && shellWidth.value >= SIDEBAR_LAYOUT_MIN_WIDTH)
const showSidebarToggle = computed(() => showSidebar.value && !showDesktopSidebar.value)
const showIntro = computed(() => !loadingMessages.value && messages.value.length === 0)
const showAuthFallbackNotice = computed(() => !props.client && !props.accessToken && !!instanceUuid.value)
const conversationViewKey = computed(() => activeThreadId.value || (showIntro.value ? 'empty-state' : 'chat-view'))

const emptyStateText = computed(() => {
  const opening = conversationConfig.value.openingMessage.trim() || copy.value.openingFallback
  const parts = opening.split(/(?<=[。！？.!?])/).map(item => item.trim()).filter(Boolean)
  return {
    title: parts[0] || opening,
    subtitle: parts.slice(1).join(' ').trim(),
  }
})

const sessionGroups = computed<SessionGroup[]>(() => {
  const sorted = [...sessions.value].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const groups: SessionGroup[] = [
    { key: 'today', label: copy.value.today, items: [] },
    { key: 'recent', label: copy.value.previous7Days, items: [] },
    { key: 'earlier', label: copy.value.earlier, items: [] },
  ]
  const now = Date.now()

  sorted.forEach((session) => {
    const updatedAt = new Date(session.updated_at).getTime()
    const diffDays = Number.isFinite(updatedAt)
      ? Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))
      : 999
    if (diffDays <= 0) {
      groups[0]?.items.push(session)
    } else if (diffDays <= 7) {
      groups[1]?.items.push(session)
    } else {
      groups[2]?.items.push(session)
    }
  })

  return groups.filter(group => group.items.length > 0)
})

function extractTextFromContentParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return ''
  }
  return parts
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }
      const record = toRecord(part)
      return readString(record.text) || readString(record.content) || readString(record.value)
    })
    .filter(Boolean)
    .join('\n')
}

function resolveMessageText(message: AgentMessageRead): string {
  return [
    readString(message.text_content),
    readString(message.content),
    extractTextFromContentParts(message.content_parts),
  ].find(Boolean) || ''
}

function extractSources(message: AgentMessageRead): DisplayMessage['sources'] {
  const meta = toRecord(message.meta)
  const next: DisplayMessage['sources'] = []
  const buckets = [meta.sources, meta.references, meta.citations, message.content_parts]

  buckets.forEach((bucket) => {
    ensureArray(bucket).forEach((item) => {
      const record = toRecord(item)
      const title
        = readString(record.title)
          || readString(record.name)
          || readString(record.label)
          || readString(record.url)
          || readString(record.href)
      const url = readString(record.url) || readString(record.href) || undefined
      if (title) {
        next.push({ title, url })
      }
    })
  })

  return next
}

function extractToolCalls(message: AgentMessageRead): ToolCallView[] {
  const fromToolCalls = ensureArray(message.tool_calls).map((entry) => {
    const record = toRecord(entry)
    const id = readString(record.id) || readString(record.tool_call_id) || nanoid()
    const name
      = readString(record.name)
        || readString(record.tool_name)
        || readString(toRecord(record.function).name)
        || copy.value.toolChain
    const args
      = readString(record.arguments)
        || readString(record.args)
        || safeStringify(record.parameters || record.input || '')
    const result = readString(record.result) || readString(record.output)
    const statusRaw = readString(record.status)
    const status: ToolCallView['status'] = statusRaw === 'error' ? 'error' : result ? 'success' : 'running'
    return {
      id,
      name,
      args: args === '""' ? '' : args,
      result: result || undefined,
      status,
      error: status === 'error' ? result || undefined : undefined,
    }
  })

  if (message.role === 'tool' || message.tool_call_id) {
    const toolId = readString(message.tool_call_id) || message.uuid
    const meta = toRecord(message.meta)
    const messageError = readString(toRecord(message).error)
    const name
      = readString(meta.tool_name)
        || readString(meta.name)
        || readString(meta.title)
        || copy.value.toolChain
    const result = resolveMessageText(message)
    fromToolCalls.push({
      id: toolId,
      name,
      args: '',
      result: result || undefined,
      status: messageError ? 'error' : 'success',
      error: messageError || undefined,
    })
  }

  return fromToolCalls
}

function createDisplayMessage(role: DisplayMessage['role'], content = ''): DisplayMessage {
  return {
    id: nanoid(),
    role,
    content,
    reasoning: '',
    createdAt: new Date().toISOString(),
    streaming: false,
    reasoningOpen: false,
    sourcesOpen: false,
    sources: [],
    toolCalls: [],
    attachments: [],
    error: null,
    runId: null,
  }
}

function foldPersistedMessages(history: AgentMessageRead[]): DisplayMessage[] {
  const next: DisplayMessage[] = []
  const assistantByGroupKey = new Map<string, DisplayMessage>()

  const ensureAssistantMessage = (message: AgentMessageRead): DisplayMessage => {
    const groupKey = readString(message.turn_id) || readString(message.run_id) || readString(message.trace_id) || message.uuid
    const existing = assistantByGroupKey.get(groupKey)
    if (existing) {
      return existing
    }
    const created = createDisplayMessage('assistant')
    created.id = `assistant-${groupKey}`
    created.createdAt = message.created_at
    created.runId = readString(message.run_id) || null
    assistantByGroupKey.set(groupKey, created)
    next.push(created)
    return created
  }

  const sorted = [...history].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  sorted.forEach((entry) => {
    const role = readString(entry.role)
    const content = resolveMessageText(entry)

    if (role === 'user') {
      const message = createDisplayMessage('user', content)
      message.id = entry.uuid
      message.createdAt = entry.created_at
      next.push(message)
      return
    }

    if (role === 'system') {
      const message = createDisplayMessage('system', content)
      message.id = entry.uuid
      message.createdAt = entry.created_at
      next.push(message)
      return
    }

    const assistantMessage = ensureAssistantMessage(entry)
    if (content && role !== 'tool' && role !== 'reasoning') {
      assistantMessage.content = [assistantMessage.content, content].filter(Boolean).join('\n\n')
    }

    const reasoning = readString(entry.reasoning_content)
    if (role === 'reasoning' || reasoning) {
      assistantMessage.reasoning = [assistantMessage.reasoning, reasoning || content].filter(Boolean).join('\n')
    }

    extractToolCalls(entry).forEach((toolCall) => {
      assistantMessage.toolCalls = upsertToolCall(assistantMessage.toolCalls, toolCall)
    })
    assistantMessage.sources = mergeSources(assistantMessage.sources, extractSources(entry))

    const entryError = readString(toRecord(entry).error)
    if (!assistantMessage.error && entryError) {
      assistantMessage.error = entryError
    }
  })

  return next
}

function emitThreadChange(nextThreadId: string | null): void {
  emit('thread-change', nextThreadId)
  if (props.threadId !== undefined) {
    emit('update:threadId', nextThreadId)
  }
}

function emitSessionChange(nextThreadId: string | null): void {
  const session = sessions.value.find(item => item.uuid === nextThreadId) ?? null
  emit('session-change', session)
}

function setShellError(message: string, error?: unknown): void {
  shellError.value = message
  if (error) {
    emit('error', error)
  }
}

async function loadInstance(currentTicket: number): Promise<void> {
  if (!resolvedClient.value || !instanceUuid.value) {
    return
  }
  try {
    const data = await resolvedClient.value.resource.getInstance(instanceUuid.value)
    if (currentTicket !== initializeTicket) {
      return
    }
    instanceDetail.value = data
  } catch (error) {
    if (currentTicket === initializeTicket) {
      setShellError(copy.value.failedLoadInstance, error)
    }
  }
}

async function loadSessions(currentTicket: number): Promise<void> {
  if (!resolvedClient.value || !instanceUuid.value || isPinnedThreadMode.value) {
    sessions.value = []
    return
  }
  loadingSessions.value = true
  try {
    const items = await resolvedClient.value.agentSession.listSessions(instanceUuid.value, 1, MAX_SESSIONS)
    if (currentTicket !== initializeTicket) {
      return
    }
    sessions.value = [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  } catch (error) {
    if (currentTicket === initializeTicket) {
      setShellError(copy.value.failedLoadSessions, error)
    }
  } finally {
    if (currentTicket === initializeTicket) {
      loadingSessions.value = false
    }
  }
}

async function loadMessages(threadId: string, currentTicket = initializeTicket): Promise<void> {
  if (!resolvedClient.value || !threadId) {
    messages.value = []
    return
  }
  loadingMessages.value = true
  try {
    const history = await resolvedClient.value.agentSession.listMessages(threadId, 0, MAX_MESSAGES)
    if (currentTicket !== initializeTicket) {
      return
    }
    messages.value = foldPersistedMessages(history)
  } catch (error) {
    if (currentTicket === initializeTicket) {
      messages.value = []
      setShellError(copy.value.failedLoadMessages, error)
    }
  } finally {
    if (currentTicket === initializeTicket) {
      loadingMessages.value = false
    }
  }
}

async function activateThread(nextThreadId: string | null, options?: { loadHistory?: boolean, closeSidebar?: boolean }): Promise<void> {
  activeThreadId.value = nextThreadId
  emitThreadChange(nextThreadId)
  emitSessionChange(nextThreadId)
  renamingSessionId.value = null
  if (options?.closeSidebar) {
    mobileSidebarOpen.value = false
  }
  if (!nextThreadId) {
    messages.value = []
    return
  }
  if (options?.loadHistory !== false) {
    messages.value = []
    await loadMessages(nextThreadId)
  }
}

async function createSession(title = copy.value.untitledSession): Promise<AgentSessionRead | null> {
  if (!resolvedClient.value || !instanceUuid.value) {
    setShellError(copy.value.failedCreateSession)
    return null
  }
  creatingSession.value = true
  try {
    const session = await resolvedClient.value.agentSession.createSession({
      agent_instance_uuid: instanceUuid.value,
      title,
    })
    sessions.value = [session, ...sessions.value.filter(item => item.uuid !== session.uuid)]
    return session
  } catch (error) {
    setShellError(copy.value.failedCreateSession, error)
    return null
  } finally {
    creatingSession.value = false
  }
}

function touchSession(threadId: string): void {
  if (isPinnedThreadMode.value || !threadId) {
    return
  }
  const current = sessions.value.find(item => item.uuid === threadId)
  if (!current) {
    return
  }
  const updated = {
    ...current,
    updated_at: new Date().toISOString(),
  }
  sessions.value = [updated, ...sessions.value.filter(item => item.uuid !== threadId)]
  if (activeThreadId.value === threadId) {
    emitSessionChange(threadId)
  }
}

async function handleNewSession(): Promise<void> {
  const session = await createSession(copy.value.untitledSession)
  if (!session) {
    return
  }
  await activateThread(session.uuid, { loadHistory: false, closeSidebar: true })
  messages.value = []
}

function beginRename(session: AgentSessionRead): void {
  renamingSessionId.value = session.uuid
  renamingTitle.value = readString(session.title) || copy.value.untitledSession
}

function cancelRename(): void {
  renamingSessionId.value = null
  renamingTitle.value = ''
}

async function submitRename(session: AgentSessionRead): Promise<void> {
  if (!resolvedClient.value) {
    return
  }
  const nextTitle = renamingTitle.value.trim() || copy.value.untitledSession
  try {
    const updated = await resolvedClient.value.agentSession.updateSession(session.uuid, { title: nextTitle })
    sessions.value = sessions.value.map(item => (item.uuid === updated.uuid ? updated : item))
    cancelRename()
  } catch (error) {
    setShellError(copy.value.failedRenameSession, error)
  }
}

async function deleteSession(session: AgentSessionRead): Promise<void> {
  if (!resolvedClient.value || typeof window === 'undefined') {
    return
  }
  if (!window.confirm(copy.value.deleteConfirm)) {
    return
  }
  try {
    await resolvedClient.value.agentSession.deleteSession(session.uuid)
    sessions.value = sessions.value.filter(item => item.uuid !== session.uuid)
    if (activeThreadId.value === session.uuid) {
      const fallback = sessions.value[0] ?? null
      await activateThread(fallback?.uuid ?? null, { loadHistory: true, closeSidebar: true })
    }
  } catch (error) {
    setShellError(copy.value.failedDeleteSession, error)
  }
}

function createAttachmentSummaries(input: PromptInputMessage['files']): AttachmentSummary[] {
  return input.map((file, index) => {
    const raw = toRecord(file)
    const maybeFile = raw.file instanceof File ? raw.file : null
    return {
      id: readString(raw.id) || `file-${index}-${nanoid(6)}`,
      name: readString(raw.filename) || copy.value.attachFile,
      size: maybeFile?.size,
      type: readString(raw.mediaType) || undefined,
    }
  })
}

function ensureCurrentAssistantMessage(runId: string): DisplayMessage {
  const existing = currentAssistantMessageId.value
    ? messages.value.find(message => message.id === currentAssistantMessageId.value)
    : null
  if (existing) {
    return existing
  }
  const assistantMessage = createDisplayMessage('assistant')
  assistantMessage.streaming = true
  assistantMessage.reasoningOpen = true
  assistantMessage.runId = runId
  messages.value = [...messages.value, assistantMessage]
  currentAssistantMessageId.value = assistantMessage.id
  return assistantMessage
}

function patchCurrentAssistant(runId: string, updater: (message: DisplayMessage) => void): void {
  const target = ensureCurrentAssistantMessage(runId)
  updater(target)
  messages.value = [...messages.value]
}

function markStreamingFinished(options?: { error?: string | null }): void {
  isStreaming.value = false
  const target = currentAssistantMessageId.value
    ? messages.value.find(message => message.id === currentAssistantMessageId.value)
    : null
  if (target) {
    target.streaming = false
    if (options?.error) {
      target.error = options.error
    }
    if (target.reasoning && !options?.error && typeof window !== 'undefined') {
      window.setTimeout(() => {
        const latest = messages.value.find(message => message.id === target.id)
        if (!latest || latest.streaming) {
          return
        }
        latest.reasoningOpen = false
        messages.value = [...messages.value]
      }, 900)
    }
  }
  currentAssistantMessageId.value = null
  currentRunId.value = null
}

function buildRunPayload(threadId: string, userMessage: DisplayMessage): RunAgentInputExtRequest {
  const context: RunAgentInputExtRequest['context'] = []
  if (userMessage.attachments.length > 0) {
    context.push({
      description: copy.value.attachmentContext,
      value: safeStringify(userMessage.attachments),
    })
  }
  if (useWebSearch.value) {
    context.push({
      description: copy.value.webSearch,
      value: copy.value.webSearchContext,
    })
  }

  const content = userMessage.content.trim() || copy.value.attachmentOnlyPrompt
  const agUiMessage: AgUiMessageRequest = {
    id: userMessage.id,
    role: 'user',
    content,
  }

  return {
    threadId,
    runId: nanoid(),
    state: {},
    messages: [agUiMessage],
    tools: [],
    context,
    forwardedProps: {
      platform: {
        protocol: 'ag-ui',
        sessionMode: 'stateful',
        agentUuid: instanceUuid.value,
      },
    },
  }
}

async function submitToAgent(payload: RunAgentInputExtRequest): Promise<void> {
  if (!resolvedClient.value || !instanceUuid.value) {
    setShellError(copy.value.failedExecute)
    return
  }

  shellError.value = null
  currentRunId.value = payload.runId
  ensureCurrentAssistantMessage(payload.runId)
  isStreaming.value = true
  streamingStoppedByUser.value = false

  streamAbortController.value?.abort()
  streamConnection.value?.close?.()

  const controller = new AbortController()
  streamAbortController.value = controller

  try {
    const connection = await resolvedClient.value.agent.streamExecute(instanceUuid.value, payload, {
      onLifecycleEvent: (event) => {
        const data = toRecord(event.data)
        if (event.event === 'RUN_STARTED') {
          currentRunId.value = readString(data.runId) || payload.runId
        }
      },
      onMessageDelta: (event) => {
        const data = toRecord(event.data)
        const runId = currentRunId.value || payload.runId
        patchCurrentAssistant(runId, (message) => {
          message.content += readString(data.delta)
        })
      },
      onReasoningDelta: (event) => {
        const data = toRecord(event.data)
        const runId = currentRunId.value || payload.runId
        patchCurrentAssistant(runId, (message) => {
          message.reasoning += readString(data.delta)
          message.reasoningOpen = true
        })
      },
      onToolEvent: (event) => {
        const data = toRecord(event.data)
        const runId = currentRunId.value || payload.runId
        patchCurrentAssistant(runId, (message) => {
          if (event.event === 'TOOL_CALL_START') {
            message.toolCalls = upsertToolCall(message.toolCalls, {
              id: readString(data.toolCallId) || nanoid(),
              name: readString(data.toolCallName) || copy.value.toolChain,
              args: '',
              status: 'running',
            })
            return
          }

          if (event.event === 'TOOL_CALL_ARGS') {
            message.toolCalls = upsertToolCall(message.toolCalls, {
              id: readString(data.toolCallId) || nanoid(),
              name: copy.value.toolChain,
              args: readString(data.delta),
              status: 'running',
            })
            return
          }

          if (event.event === 'TOOL_CALL_RESULT') {
            message.toolCalls = upsertToolCall(message.toolCalls, {
              id: readString(data.toolCallId) || nanoid(),
              name: copy.value.toolChain,
              args: '',
              result: readString(data.content),
              status: 'success',
            })
            return
          }

          if (event.event === 'TOOL_CALL_END') {
            const toolId = readString(data.toolCallId)
            if (!toolId) {
              return
            }
            const target = message.toolCalls.find(item => item.id === toolId)
            if (target && target.status === 'running') {
              target.status = target.error ? 'error' : 'success'
            }
          }
        })
      },
      onServerError: (event) => {
        const data = toRecord(event.data)
        const errorMessage = readString(data.message) || copy.value.failedExecute
        markStreamingFinished({ error: errorMessage })
        setShellError(errorMessage)
      },
      onDone: async () => {
        markStreamingFinished()
      },
      onError: (error) => {
        if (streamingStoppedByUser.value) {
          return
        }
        markStreamingFinished({ error: copy.value.failedExecute })
        setShellError(copy.value.failedExecute, error)
      },
    }, controller.signal)

    streamConnection.value = connection
  } catch (error) {
    if (streamingStoppedByUser.value) {
      return
    }
    markStreamingFinished({ error: copy.value.failedExecute })
    setShellError(copy.value.failedExecute, error)
  }
}

async function handleSubmit(input: PromptInputMessage): Promise<void> {
  if (isStreaming.value || !instanceUuid.value) {
    return
  }

  const text = input.text.trim()
  const attachments = createAttachmentSummaries(input.files)
  if (!text && attachments.length === 0) {
    return
  }

  let threadId = activeThreadId.value
  if (!threadId) {
    const session = await createSession(deriveSessionTitle(text, attachments))
    threadId = session?.uuid ?? null
    if (threadId) {
      await activateThread(threadId, { loadHistory: false, closeSidebar: true })
    }
  }

  if (!threadId) {
    return
  }

  const userMessage = createDisplayMessage('user', text)
  userMessage.attachments = attachments
  messages.value = [...messages.value, userMessage]
  touchSession(threadId)
  await submitToAgent(buildRunPayload(threadId, userMessage))
}

function stopStreaming(): void {
  streamingStoppedByUser.value = true
  streamAbortController.value?.abort()
  streamConnection.value?.close?.()
  markStreamingFinished()
}

function toggleWebSearch(): void {
  useWebSearch.value = !useWebSearch.value
}

function handlePromptInputError(payload: { code: string, message: string }): void {
  setShellError(payload.message || copy.value.failedExecute)
}

function handleSuggestionClick(suggestion: string): void {
  void handleSubmit({ text: suggestion, files: [] })
}

function syncShellWidth(element: HTMLElement | null): void {
  shellWidth.value = element ? Math.round(element.getBoundingClientRect().width) : 0
}

watch(shellRef, (next) => {
  shellResizeObserver?.disconnect()
  shellResizeObserver = null
  syncShellWidth(next)
  if (!next || typeof ResizeObserver === 'undefined') {
    return
  }
  shellResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    shellWidth.value = Math.round(entry?.contentRect.width || next.getBoundingClientRect().width)
  })
  shellResizeObserver.observe(next)
})

watch(showSidebarToggle, (value) => {
  if (!value) {
    mobileSidebarOpen.value = false
  }
}, { immediate: true })

watch(
  [instanceUuid, explicitThreadId, () => props.client, () => props.accessToken, baseUrl, resolvedLocale],
  async () => {
    initializeTicket += 1
    const currentTicket = initializeTicket

    stopStreaming()
    shellError.value = null
    mobileSidebarOpen.value = false
    renamingSessionId.value = null
    renamingTitle.value = ''
    messages.value = []
    sessions.value = []
    instanceDetail.value = null
    activeThreadId.value = explicitThreadId.value || null

    if (!instanceUuid.value) {
      shellError.value = copy.value.missingInstance
      return
    }

    await loadInstance(currentTicket)
    if (currentTicket !== initializeTicket) {
      return
    }

    if (isPinnedThreadMode.value) {
      if (activeThreadId.value) {
        await loadMessages(activeThreadId.value, currentTicket)
      }
      return
    }

    await loadSessions(currentTicket)
    if (currentTicket !== initializeTicket) {
      return
    }

    if (sessions.value.length > 0) {
      const nextActive = activeThreadId.value && sessions.value.some(item => item.uuid === activeThreadId.value)
        ? activeThreadId.value
        : sessions.value[0]?.uuid || null
      activeThreadId.value = nextActive
      emitThreadChange(nextActive)
      emitSessionChange(nextActive)
      if (nextActive) {
        await loadMessages(nextActive, currentTicket)
      }
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  streamAbortController.value?.abort()
  streamConnection.value?.close?.()
  shellResizeObserver?.disconnect()
  shellResizeObserver = null
})
</script>

<template>
  <div
    ref="shellRef"
    class="relative flex h-full min-h-0 w-full overflow-hidden bg-[#fafafa] font-['Geist','Inter','Segoe_UI',sans-serif] text-slate-900"
  >
    <AgentSessionList
      v-if="showDesktopSidebar"
      :loading="loadingSessions"
      :creating="creatingSession"
      :session-groups="sessionGroups"
      :active-thread-id="activeThreadId"
      :renaming-session-id="renamingSessionId"
      :renaming-title="renamingTitle"
      :copy="copy"
      @create="handleNewSession"
      @select="activateThread($event, { closeSidebar: true })"
      @begin-rename="beginRename"
      @submit-rename="submitRename"
      @cancel-rename="cancelRename"
      @delete="deleteSession"
      @update:renaming-title="renamingTitle = $event"
    />

    <div class="flex min-w-0 flex-1 flex-col bg-[#fafafa]">
      <AgentChatHeader
        :title="instanceName"
        :show-sidebar-toggle="showSidebarToggle"
        :can-create-session="showSidebar"
        :creating-session="creatingSession"
        :sidebar-label="copy.session"
        :new-chat-label="copy.newChat"
        @toggle-sidebar="mobileSidebarOpen = true"
        @new-session="handleNewSession"
      />

      <AgentConversationView
        :conversation-key="conversationViewKey"
        :messages="messages"
        :shell-error="shellError"
        :show-auth-fallback-notice="showAuthFallbackNotice"
        :show-intro="showIntro"
        :empty-title="emptyStateText.title"
        :empty-subtitle="emptyStateText.subtitle"
        :loading-messages="loadingMessages"
        :copy="copy"
      />

      <AgentComposer
        :copy="copy"
        :placeholder="copy.inputPlaceholder"
        :suggestions="visibleSuggestions"
        :show-suggestions="showIntro"
        :use-web-search="useWebSearch"
        :is-streaming="isStreaming"
        @submit="handleSubmit"
        @error="handlePromptInputError"
        @toggle-web-search="toggleWebSearch"
        @stop-streaming="stopStreaming"
        @suggestion-click="handleSuggestionClick"
      />
    </div>

    <AgentSessionList
      drawer
      :visible="mobileSidebarOpen && showSidebarToggle"
      :loading="loadingSessions"
      :creating="creatingSession"
      :session-groups="sessionGroups"
      :active-thread-id="activeThreadId"
      :renaming-session-id="renamingSessionId"
      :renaming-title="renamingTitle"
      :copy="copy"
      @close="mobileSidebarOpen = false"
      @create="handleNewSession"
      @select="activateThread($event, { closeSidebar: true })"
      @begin-rename="beginRename"
      @submit-rename="submitRename"
      @cancel-rename="cancelRename"
      @delete="deleteSession"
      @update:renaming-title="renamingTitle = $event"
    />
  </div>
</template>
