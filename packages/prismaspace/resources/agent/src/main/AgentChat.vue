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
import { createClient } from '@prismaspace/sdk'
import { MessageResponse } from '@prismaspace/ui-ai-elements/components/ai-elements/message'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSpeechButton,
  PromptInputTextarea,
  PromptInputTools,
} from '@prismaspace/ui-ai-elements/components/ai-elements/prompt-input'
import {
  AlertCircleIcon,
  ArrowUpIcon,
  AtSignIcon,
  BotIcon,
  BrainCircuitIcon,
  CheckCheckIcon,
  ChevronDownIcon,
  Edit3Icon,
  GlobeIcon,
  Loader2Icon,
  MenuIcon,
  MessageSquareTextIcon,
  MicIcon,
  PlusIcon,
  SparklesIcon,
  SquareIcon,
  TerminalSquareIcon,
  Trash2Icon,
  UserIcon,
  WandSparklesIcon,
  WrenchIcon,
  XIcon,
} from 'lucide-vue-next'
import { nanoid } from 'nanoid'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

type MessageRole = 'user' | 'assistant' | 'system'
type ToolStatus = 'running' | 'success' | 'error'

interface AttachmentSummary {
  id: string
  name: string
  size?: number
  type?: string
}

interface SourceSummary {
  title: string
  url?: string | null
}

interface ToolCallView {
  id: string
  name: string
  args: string
  status: ToolStatus
  result?: string
  error?: string
}

interface DisplayMessage {
  id: string
  role: MessageRole
  content: string
  reasoning: string
  createdAt: string
  streaming: boolean
  reasoningOpen: boolean
  sourcesOpen: boolean
  sources: SourceSummary[]
  toolCalls: ToolCallView[]
  attachments: AttachmentSummary[]
  error?: string | null
  runId?: string | null
}

interface UsageSummary {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

interface SessionGroup {
  key: string
  label: string
  items: AgentSessionRead[]
}

const props = defineProps<{
  client?: PrismaspaceClient | null
  instanceUuid?: string
  threadId?: string | null
  accessToken?: string | null
  baseUrl?: string
  locale?: string
  title?: string
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

const instanceDetail = ref<AnyInstanceRead | null>(null)
const sessions = ref<AgentSessionRead[]>([])
const messages = ref<DisplayMessage[]>([])
const activeThreadId = ref<string | null>(null)
const loadingInstance = ref(false)
const loadingSessions = ref(false)
const loadingMessages = ref(false)
const creatingSession = ref(false)
const isStreaming = ref(false)
const shellError = ref<string | null>(null)
const usage = ref<UsageSummary | null>(null)
const useWebSearch = ref(false)
const mobileSidebarOpen = ref(false)
const renamingSessionId = ref<string | null>(null)
const renamingTitle = ref('')
const scrollContainerRef = ref<HTMLElement | null>(null)
const messageFeedRef = ref<HTMLElement | null>(null)
const bottomAnchorRef = ref<HTMLElement | null>(null)
const autoStickToBottom = ref(true)
const currentRunId = ref<string | null>(null)
const currentAssistantMessageId = ref<string | null>(null)
const streamAbortController = shallowRef<AbortController | null>(null)
const streamConnection = shallowRef<{ close?: () => void } | null>(null)
const streamingStoppedByUser = ref(false)

let initializeTicket = 0
let codeEnhanceTimer: number | undefined

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
      brand: 'PrismaSpace',
      workstation: '智能体可视化工作站',
      newChat: 'New chat',
      newChatHint: '⌘ K',
      today: 'Today',
      previous7Days: 'Previous 7 Days',
      earlier: 'Earlier',
      untitledSession: '未命名会话',
      loadingSessions: '正在加载会话...',
      loadingMessages: '正在加载消息...',
      noSessions: '还没有历史会话，先发起一轮新对话。',
      introTitle: '内容即界面',
      introSubtitle: '在这里直接和后端 Agent 资源交互，查看思维链、工具链和最终交付内容。',
      introPinnedSubtitle: '当前是固定 thread 模式，所有消息都会直接发送到这个会话。',
      openingFallback: '你好，我是你的 Agent 助手。告诉我你的目标，我会直接开始分析。',
      pinnedMode: '固定线程',
      sessionMode: '会话工作站',
      runtime: 'AG-UI Runtime',
      thread: 'Thread',
      session: 'Session',
      connected: '已连接',
      waiting: '等待连接',
      missingInstance: '缺少 instanceUuid，无法初始化 AgentChat。',
      inputPlaceholder: '问 Agent 任何问题，或输入 / 调起命令...',
      inputHint: 'Shift + Enter 换行',
      renamePlaceholder: '输入会话标题',
      deleteConfirm: '确认删除这个会话？',
      directThread: '固定会话',
      attachmentOnlyPrompt: '请结合我附带的文件元信息继续处理。',
      attachmentOnlyLabel: '已附加文件',
      attachmentContext: 'Attached files metadata',
      webSearch: '联网偏好',
      webSearchContext: 'User prefers web-enabled retrieval if the agent has access.',
      webSearchEnabled: '优先联网检索',
      mention: '@ Agent',
      sources: '来源',
      showSources: '展开来源',
      hideSources: '收起来源',
      thinking: 'Thinking process...',
      analyzed: '已完成推理',
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
      suggestions: '可直接试试这些问题',
      authFallback: '未显式传入 accessToken，将尝试使用当前站点登录态。',
      copy: 'Copy',
      copied: 'Copied!',
      startConversation: '开始对话',
    }
  }

  return {
    brand: 'PrismaSpace',
    workstation: 'Agent Workstation',
    newChat: 'New chat',
    newChatHint: '⌘ K',
    today: 'Today',
    previous7Days: 'Previous 7 Days',
    earlier: 'Earlier',
    untitledSession: 'Untitled session',
    loadingSessions: 'Loading sessions...',
    loadingMessages: 'Loading messages...',
    noSessions: 'No sessions yet. Start a new conversation.',
    introTitle: 'Content Is Interface',
    introSubtitle: 'Talk to the backend Agent resource directly and inspect reasoning, tool usage, and final output.',
    introPinnedSubtitle: 'Pinned thread mode is active. Every message is routed into this exact thread.',
    openingFallback: 'Hello, I am your Agent assistant. Tell me the goal and I will start from there.',
    pinnedMode: 'Pinned thread',
    sessionMode: 'Session workstation',
    runtime: 'AG-UI Runtime',
    thread: 'Thread',
    session: 'Session',
    connected: 'Connected',
    waiting: 'Waiting',
    missingInstance: 'Missing instanceUuid. AgentChat cannot initialize.',
    inputPlaceholder: 'Ask the agent anything, or type / for commands...',
    inputHint: 'Shift + Enter for a new line',
    renamePlaceholder: 'Enter a session title',
    deleteConfirm: 'Delete this session?',
    directThread: 'Pinned session',
    attachmentOnlyPrompt: 'Please continue with the attached file metadata.',
    attachmentOnlyLabel: 'Attached files',
    attachmentContext: 'Attached files metadata',
    webSearch: 'Web preference',
    webSearchContext: 'User prefers web-enabled retrieval if the agent has access.',
    webSearchEnabled: 'Prefer web search',
    mention: '@ Agent',
    sources: 'Sources',
    showSources: 'Show sources',
    hideSources: 'Hide sources',
    thinking: 'Thinking process...',
    analyzed: 'Reasoning complete',
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
    suggestions: 'Try one of these prompts',
    authFallback: 'No explicit accessToken was passed, falling back to the host session if available.',
    copy: 'Copy',
    copied: 'Copied!',
    startConversation: 'Start conversation',
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

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
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

function shortenId(value: string | null | undefined, head = 8, tail = 6): string {
  const raw = value?.trim()
  if (!raw) {
    return ''
  }
  if (raw.length <= head + tail + 3) {
    return raw
  }
  return `${raw.slice(0, head)}...${raw.slice(-tail)}`
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return ''
  }
  return new Intl.DateTimeFormat(resolvedLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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

function mergeSources(target: SourceSummary[], additions: SourceSummary[]): SourceSummary[] {
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
  if (props.title?.trim()) {
    return props.title.trim()
  }
  const name = instanceDetail.value?.name
  return typeof name === 'string' && name.trim() ? name.trim() : copy.value.agent
})

const instanceVersionTag = computed(() => {
  const tag = instanceDetail.value?.version_tag
  return typeof tag === 'string' && tag.trim() ? tag.trim() : ''
})

const conversationConfig = computed(() => {
  const config = toRecord(toRecord(toRecord(instanceDetail.value?.agent_config).ui_config).conversation)
  return {
    openingMessage: readString(config.opening_message) || copy.value.openingFallback,
    presetQuestions: toStringArray(config.preset_questions),
    showAllPresetQuestions: readBoolean(config.show_all_preset_questions, true),
  }
})

const currentSession = computed(() => {
  return sessions.value.find(session => session.uuid === activeThreadId.value) ?? null
})

const visibleSuggestions = computed(() => {
  const items = conversationConfig.value.presetQuestions
  return conversationConfig.value.showAllPresetQuestions ? items : items.slice(0, 4)
})

const showSidebar = computed(() => !isPinnedThreadMode.value)
const showIntro = computed(() => !loadingMessages.value && messages.value.length === 0)
const showAuthFallbackNotice = computed(() => !props.client && !props.accessToken && !!instanceUuid.value)

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

function extractSources(message: AgentMessageRead): SourceSummary[] {
  const meta = toRecord(message.meta)
  const next: SourceSummary[] = []
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
    const status: ToolStatus = statusRaw === 'error' ? 'error' : result ? 'success' : 'running'
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

function createDisplayMessage(role: MessageRole, content = ''): DisplayMessage {
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
  loadingInstance.value = true
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
  } finally {
    if (currentTicket === initializeTicket) {
      loadingInstance.value = false
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
    await nextTick()
    queueEnhancements()
    scrollToBottom('auto')
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
  if (options?.closeSidebar) {
    mobileSidebarOpen.value = false
  }
  if (!nextThreadId) {
    messages.value = []
    return
  }
  if (options?.loadHistory !== false) {
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
      name: readString(raw.filename) || 'Attachment',
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
    if (target.reasoning && !options?.error) {
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
  queueEnhancements()
}

async function refreshAfterStream(threadId: string): Promise<void> {
  if (!resolvedClient.value || !threadId) {
    return
  }
  try {
    const [sessionList, history] = await Promise.all([
      isPinnedThreadMode.value ? Promise.resolve(null) : resolvedClient.value.agentSession.listSessions(instanceUuid.value, 1, MAX_SESSIONS),
      resolvedClient.value.agentSession.listMessages(threadId, 0, MAX_MESSAGES),
    ])
    if (sessionList) {
      sessions.value = [...sessionList].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    messages.value = foldPersistedMessages(history)
  } catch {
    // Keep optimistic UI when sync fails.
  } finally {
    await nextTick()
    queueEnhancements()
    scrollToBottom('smooth')
  }
}

function normalizeUsage(raw: unknown): UsageSummary | null {
  const data = toRecord(raw)
  const promptTokens = readNumber(data.promptTokens ?? data.prompt_tokens)
  const completionTokens = readNumber(data.completionTokens ?? data.completion_tokens)
  const totalTokens = readNumber(data.totalTokens ?? data.total_tokens)
  if (promptTokens === null && completionTokens === null && totalTokens === null) {
    return null
  }
  return {
    promptTokens: promptTokens ?? undefined,
    completionTokens: completionTokens ?? undefined,
    totalTokens: totalTokens ?? undefined,
  }
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

  usage.value = null
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
      onUsage: (event) => {
        const data = toRecord(event.data)
        usage.value = normalizeUsage(data.value)
      },
      onServerError: (event) => {
        const data = toRecord(event.data)
        const errorMessage = readString(data.message) || copy.value.failedExecute
        markStreamingFinished({ error: errorMessage })
        setShellError(errorMessage)
      },
      onDone: async () => {
        markStreamingFinished()
        await refreshAfterStream(payload.threadId)
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
  await nextTick()
  scrollToBottom('smooth')
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

function handleScroll(): void {
  const container = scrollContainerRef.value
  if (!container) {
    return
  }
  autoStickToBottom.value = container.scrollHeight - container.scrollTop - container.clientHeight < 120
}

function scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
  if (!bottomAnchorRef.value) {
    return
  }
  if (!autoStickToBottom.value && behavior === 'smooth') {
    return
  }
  bottomAnchorRef.value.scrollIntoView({ block: 'end', behavior })
}

function detectToolIcon(name: string) {
  const value = name.toLowerCase()
  if (value.includes('search') || value.includes('web')) {
    return GlobeIcon
  }
  if (value.includes('code') || value.includes('terminal') || value.includes('exec')) {
    return TerminalSquareIcon
  }
  if (value.includes('agent') || value.includes('workflow')) {
    return WandSparklesIcon
  }
  return WrenchIcon
}

function queueEnhancements(): void {
  if (typeof window === 'undefined') {
    return
  }
  if (codeEnhanceTimer) {
    window.clearTimeout(codeEnhanceTimer)
  }
  codeEnhanceTimer = window.setTimeout(() => {
    enhanceCodeBlocks()
  }, 0)
}

function enhanceCodeBlocks(): void {
  const root = messageFeedRef.value
  if (!root || typeof document === 'undefined') {
    return
  }
  const blocks = root.querySelectorAll<HTMLElement>('.agent-chat-markdown pre')
  blocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains('agent-code-shell')) {
      return
    }
    const wrapper = document.createElement('div')
    wrapper.className = 'agent-code-shell'

    const toolbar = document.createElement('div')
    toolbar.className = 'agent-code-toolbar'

    const language = document.createElement('span')
    language.className = 'agent-code-language'
    const code = pre.querySelector('code')
    const className = code?.className || ''
    const match = className.match(/language-([\w-]+)/)
    language.textContent = (match?.[1] || 'text').toUpperCase()

    const copyButton = document.createElement('button')
    copyButton.type = 'button'
    copyButton.className = 'agent-code-copy'
    copyButton.textContent = copy.value.copy
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code?.textContent || pre.textContent || '')
        copyButton.textContent = copy.value.copied
        window.setTimeout(() => {
          copyButton.textContent = copy.value.copy
        }, 1500)
      } catch {
        copyButton.textContent = copy.value.copy
      }
    })

    toolbar.append(language, copyButton)
    pre.parentElement?.insertBefore(wrapper, pre)
    wrapper.append(toolbar, pre)
  })
}

watch(scrollContainerRef, (next, prev) => {
  prev?.removeEventListener('scroll', handleScroll)
  next?.addEventListener('scroll', handleScroll, { passive: true })
})

watch(
  [instanceUuid, explicitThreadId, () => props.client, () => props.accessToken, baseUrl, resolvedLocale],
  async () => {
    initializeTicket += 1
    const currentTicket = initializeTicket

    stopStreaming()
    shellError.value = null
    usage.value = null
    mobileSidebarOpen.value = false
    renamingSessionId.value = null
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

watch(
  () => messages.value.map(message => `${message.id}:${message.content.length}:${message.reasoning.length}:${message.toolCalls.length}:${message.streaming ? 1 : 0}`).join('|'),
  async () => {
    await nextTick()
    queueEnhancements()
    scrollToBottom(isStreaming.value ? 'auto' : 'smooth')
  },
)

onBeforeUnmount(() => {
  scrollContainerRef.value?.removeEventListener('scroll', handleScroll)
  streamAbortController.value?.abort()
  streamConnection.value?.close?.()
  if (codeEnhanceTimer && typeof window !== 'undefined') {
    window.clearTimeout(codeEnhanceTimer)
  }
})
</script>

<template>
  <div class="relative flex h-full min-h-0 w-full overflow-hidden bg-[#fcfcfc] font-['Geist','Inter','Segoe_UI',sans-serif] text-slate-900">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_52%)]" />
      <div class="absolute bottom-0 right-0 h-64 w-64 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.06),_transparent_58%)]" />
    </div>

    <aside
      v-if="showSidebar"
      class="relative z-10 hidden h-full w-[280px] shrink-0 flex-col bg-[#f9fafb]/92 px-4 pb-4 pt-5 backdrop-blur-xl md:flex"
    >
      <div class="flex items-center gap-3 px-2">
        <div class="flex size-10 items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
          <BotIcon class="size-4.5 text-slate-900" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-slate-900">{{ copy.brand }}</p>
          <p class="truncate text-xs text-slate-500">{{ copy.workstation }}</p>
        </div>
      </div>

      <button
        type="button"
        class="mt-6 flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-left text-white transition-all duration-150 hover:bg-black active:scale-[0.99]"
        :disabled="creatingSession"
        @click="handleNewSession"
      >
        <span class="flex items-center gap-2 text-sm font-medium">
          <PlusIcon class="size-4" />
          {{ copy.newChat }}
        </span>
        <span class="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/70">{{ copy.newChatHint }}</span>
      </button>

      <div class="agent-chat-scroll mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
        <div v-if="loadingSessions" class="px-2 py-3 text-sm text-slate-500">
          {{ copy.loadingSessions }}
        </div>

        <div v-else-if="sessionGroups.length === 0" class="px-2 py-4 text-sm leading-6 text-slate-500">
          {{ copy.noSessions }}
        </div>

        <div v-else class="space-y-6">
          <section v-for="group in sessionGroups" :key="group.key" class="space-y-2">
            <div class="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              {{ group.label }}
            </div>

            <button
              v-for="session in group.items"
              :key="session.uuid"
              type="button"
              class="group flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left transition-all duration-150 hover:bg-slate-100"
              :class="session.uuid === activeThreadId ? 'bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80' : 'text-slate-700'"
              @click="activateThread(session.uuid, { closeSidebar: true })"
            >
              <MessageSquareTextIcon class="size-3.5 shrink-0 text-slate-400" />
              <div class="min-w-0 flex-1">
                <template v-if="renamingSessionId === session.uuid">
                  <input
                    v-model="renamingTitle"
                    :placeholder="copy.renamePlaceholder"
                    class="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] font-medium outline-none ring-0 transition-colors focus:border-slate-300"
                    @blur="submitRename(session)"
                    @keydown.enter.prevent="submitRename(session)"
                    @keydown.esc.prevent="cancelRename"
                  >
                </template>
                <template v-else>
                  <p class="truncate text-[13px]" :class="session.uuid === activeThreadId ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'">
                    {{ session.title || copy.untitledSession }}
                  </p>
                </template>
              </div>

              <div class="flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-full text-slate-400 transition-all duration-150 hover:bg-slate-200 hover:text-slate-900 active:scale-95"
                  @click.stop="beginRename(session)"
                >
                  <Edit3Icon class="size-3.5" />
                </button>
                <button
                  type="button"
                  class="flex size-8 items-center justify-center rounded-full text-slate-400 transition-all duration-150 hover:bg-slate-200 hover:text-rose-600 active:scale-95"
                  @click.stop="deleteSession(session)"
                >
                  <Trash2Icon class="size-3.5" />
                </button>
              </div>
            </button>
          </section>
        </div>
      </div>
    </aside>

    <div class="relative z-10 flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 border-b border-white/50 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <button
              v-if="showSidebar"
              type="button"
              class="flex size-10 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95 md:hidden"
              @click="mobileSidebarOpen = true"
            >
              <MenuIcon class="size-4.5" />
            </button>

            <div class="flex min-w-0 items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                <BotIcon class="size-4" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ instanceName }}</p>
                <p class="truncate text-xs text-slate-500">
                  {{ isPinnedThreadMode ? copy.directThread : copy.sessionMode }}
                  <template v-if="activeThreadId">
                    · {{ shortenId(activeThreadId) }}
                  </template>
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="hidden rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:flex sm:items-center sm:gap-2">
              <SparklesIcon class="size-3.5 text-indigo-500" />
              <span>{{ copy.runtime }}</span>
            </div>

            <button type="button" class="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div class="min-w-0">
                <p class="truncate text-xs uppercase tracking-[0.14em] text-slate-400">{{ copy.runtime }}</p>
                <p class="truncate text-sm font-medium text-slate-900">{{ instanceVersionTag || copy.connected }}</p>
              </div>
              <ChevronDownIcon class="size-4 shrink-0 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div ref="scrollContainerRef" class="agent-chat-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-32 md:px-8">
        <div ref="messageFeedRef" class="mx-auto flex max-w-3xl flex-col gap-8 py-8">
          <div
            v-if="shellError"
            class="rounded-[24px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-700 shadow-[0_12px_30px_rgba(244,63,94,0.08)]"
          >
            <div class="flex items-start gap-3">
              <AlertCircleIcon class="mt-0.5 size-4 shrink-0" />
              <div class="min-w-0">
                <p class="font-semibold">{{ shellError }}</p>
              </div>
            </div>
          </div>

          <div
            v-if="showAuthFallbackNotice"
            class="rounded-[20px] border border-slate-200/80 bg-white/85 px-4 py-3 text-xs leading-6 text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
          >
            {{ copy.authFallback }}
          </div>

          <section
            v-if="showIntro"
            class="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/92 shadow-[0_20px_60px_rgba(15,23,42,0.06)]"
          >
            <div class="border-b border-slate-100 px-6 py-6 md:px-8">
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
                  <WandSparklesIcon class="size-5" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{{ copy.workstation }}</p>
                  <h2 class="text-xl font-semibold tracking-tight text-slate-950">{{ copy.introTitle }}</h2>
                </div>
              </div>

              <p class="mt-5 max-w-2xl text-[15px] leading-7 text-slate-600">
                {{ isPinnedThreadMode ? copy.introPinnedSubtitle : copy.introSubtitle }}
              </p>

              <div class="mt-6 rounded-[24px] bg-[#fcfcfc] px-5 py-4 ring-1 ring-slate-200/70">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex size-8 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                    <BotIcon class="size-4 text-slate-900" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">{{ instanceName }}</p>
                    <p class="mt-1 text-[15px] leading-7 text-slate-700">{{ conversationConfig.openingMessage }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-6 py-6 md:px-8">
              <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                <BrainCircuitIcon class="size-3.5" />
                {{ copy.suggestions }}
              </div>

              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  v-for="suggestion in visibleSuggestions"
                  :key="suggestion"
                  type="button"
                  class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:scale-95"
                  @click="handleSuggestionClick(suggestion)"
                >
                  {{ suggestion }}
                </button>
                <button
                  v-if="!visibleSuggestions.length && showSidebar"
                  type="button"
                  class="rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-sm text-white transition-all duration-150 hover:bg-black active:scale-95"
                  @click="handleNewSession"
                >
                  {{ copy.startConversation }}
                </button>
              </div>
            </div>
          </section>

          <div
            v-if="loadingMessages"
            class="rounded-[24px] border border-slate-200/70 bg-white/85 px-5 py-4 text-sm text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
          >
            {{ copy.loadingMessages }}
          </div>

          <template v-for="message in messages" :key="message.id">
            <div class="flex items-start gap-4 md:gap-5" :class="message.role === 'assistant' ? 'agent-stream-in' : ''">
              <div
                class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1"
                :class="message.role === 'user' ? 'bg-white text-slate-900 ring-slate-200/80' : 'bg-slate-950 text-white ring-slate-900/10'"
              >
                <UserIcon v-if="message.role === 'user'" class="size-4" />
                <BotIcon v-else class="size-4" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">{{ message.role === 'user' ? copy.you : instanceName }}</span>
                  <span class="text-xs text-slate-400">{{ formatTime(message.createdAt) }}</span>
                  <span
                    v-if="message.streaming"
                    class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
                  >
                    <span class="agent-chat-dots" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    {{ copy.waiting }}
                  </span>
                </div>

                <div v-if="message.role === 'user'" class="pt-3">
                  <p v-if="message.content" class="whitespace-pre-wrap text-[15px] leading-7 text-slate-900">
                    {{ message.content }}
                  </p>
                  <p v-else class="text-[15px] leading-7 text-slate-500">
                    {{ copy.attachmentOnlyLabel }}
                  </p>

                  <div v-if="message.attachments.length" class="mt-4 flex flex-wrap gap-2">
                    <span
                      v-for="attachment in message.attachments"
                      :key="attachment.id"
                      class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                    >
                      <span class="truncate max-w-[180px]">{{ attachment.name }}</span>
                    </span>
                  </div>
                </div>

                <div v-else class="space-y-3 pt-3">
                  <button
                    v-if="message.reasoning"
                    type="button"
                    class="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-150 hover:border-slate-300 hover:bg-slate-50"
                    @click="message.reasoningOpen = !message.reasoningOpen"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span
                        class="flex size-6 items-center justify-center rounded-full"
                        :class="message.streaming ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-600'"
                      >
                        <Loader2Icon v-if="message.streaming" class="size-3.5 animate-spin" />
                        <CheckCheckIcon v-else class="size-3.5" />
                      </span>
                      <span class="truncate text-xs font-medium text-slate-500">
                        {{ message.streaming ? copy.thinking : copy.analyzed }}
                      </span>
                    </span>
                    <ChevronDownIcon class="size-4 shrink-0 text-slate-400 transition-transform duration-300" :class="message.reasoningOpen ? 'rotate-180' : ''" />
                  </button>

                  <transition
                    enter-active-class="transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    enter-from-class="translate-y-1 opacity-0"
                    enter-to-class="translate-y-0 opacity-100"
                    leave-active-class="transition-all duration-200 ease-out"
                    leave-from-class="translate-y-0 opacity-100"
                    leave-to-class="-translate-y-1 opacity-0"
                  >
                    <div
                      v-if="message.reasoning && message.reasoningOpen"
                      class="rounded-[24px] border border-indigo-100 bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(99,102,241,0.08)]"
                    >
                      <div class="border-l-2 border-indigo-100 pl-4 font-mono text-[12px] leading-6 text-slate-600 whitespace-pre-wrap">
                        {{ message.reasoning }}
                      </div>
                    </div>
                  </transition>

                  <div v-if="message.toolCalls.length" class="flex flex-wrap gap-2">
                    <div
                      v-for="tool in message.toolCalls"
                      :key="tool.id"
                      class="rounded-full border bg-white px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                      :class="tool.status === 'error'
                        ? 'border-rose-200 text-rose-600'
                        : tool.status === 'success'
                          ? 'border-emerald-200 text-emerald-700'
                          : 'border-slate-200 text-slate-600'"
                    >
                      <div class="flex items-center gap-2 text-xs font-medium">
                        <component
                          :is="detectToolIcon(tool.name)"
                          class="size-3.5"
                          :class="tool.status === 'running' ? 'animate-pulse' : ''"
                        />
                        <span class="truncate max-w-[180px]">{{ tool.name }}</span>
                      </div>
                      <p v-if="tool.args" class="mt-1 max-w-[260px] truncate font-mono text-[11px] opacity-70">
                        {{ tool.args }}
                      </p>
                      <p v-if="tool.result" class="mt-1 max-w-[260px] truncate text-[11px] opacity-80">
                        {{ tool.result }}
                      </p>
                      <p v-if="tool.error" class="mt-1 max-w-[260px] truncate text-[11px] text-rose-600">
                        {{ tool.error }}
                      </p>
                    </div>
                  </div>

                  <div class="rounded-[28px] bg-white/92 px-6 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70 backdrop-blur-md">
                    <div
                      v-if="message.error"
                      class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    >
                      {{ message.error }}
                    </div>

                    <MessageResponse
                      v-if="message.content"
                      :content="message.content"
                      class="agent-chat-markdown"
                    />

                    <div v-else class="flex items-center gap-3 text-sm text-slate-500">
                      <span class="agent-chat-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      {{ copy.noContent }}
                    </div>
                  </div>

                  <div
                    v-if="message.sources.length"
                    class="overflow-hidden rounded-[22px] border border-slate-200 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                  >
                    <button
                      type="button"
                      class="flex w-full items-center justify-between px-4 py-3 text-left"
                      @click="message.sourcesOpen = !message.sourcesOpen"
                    >
                      <span class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{{ copy.sources }}</span>
                      <span class="flex items-center gap-2 text-xs text-slate-500">
                        {{ message.sourcesOpen ? copy.hideSources : copy.showSources }}
                        <ChevronDownIcon class="size-4 transition-transform duration-300" :class="message.sourcesOpen ? 'rotate-180' : ''" />
                      </span>
                    </button>

                    <div v-if="message.sourcesOpen" class="grid gap-2 px-4 pb-4">
                      <a
                        v-for="source in message.sources"
                        :key="`${source.title}-${source.url || ''}`"
                        :href="source.url || '#'"
                        :target="source.url ? '_blank' : undefined"
                        :rel="source.url ? 'noreferrer' : undefined"
                        class="rounded-2xl border border-slate-200 bg-[#fcfcfc] px-4 py-3 text-sm transition-all duration-150 hover:border-slate-300 hover:bg-white"
                      >
                        <p class="truncate font-medium text-slate-800">{{ source.title }}</p>
                        <p v-if="source.url" class="mt-1 truncate text-xs text-slate-500">{{ source.url }}</p>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div ref="bottomAnchorRef" class="h-px" />
        </div>
      </div>

      <div class="sticky bottom-0 z-20 mt-auto px-4 pb-4 md:px-8 md:pb-6">
        <div class="pointer-events-none absolute inset-x-0 bottom-full h-24 bg-gradient-to-t from-[#fcfcfc] via-[#fcfcfc]/88 to-transparent" />

        <div class="mx-auto max-w-3xl">
          <div v-if="usage" class="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span class="rounded-full bg-white px-3 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
              Prompt {{ usage.promptTokens ?? '-' }}
            </span>
            <span class="rounded-full bg-white px-3 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
              Completion {{ usage.completionTokens ?? '-' }}
            </span>
            <span class="rounded-full bg-white px-3 py-1 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/80">
              Total {{ usage.totalTokens ?? '-' }}
            </span>
          </div>

          <PromptInput
            class="w-full rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
            multiple
            global-drop
            @submit="handleSubmit"
            @error="handlePromptInputError"
          >
            <PromptInputAttachments class="w-full border-b border-slate-100 px-4 py-3">
              <template #default="{ file }">
                <PromptInputAttachment :file="file" class="rounded-full border-slate-200 bg-slate-50" />
              </template>
            </PromptInputAttachments>

            <PromptInputBody>
              <PromptInputTextarea
                :placeholder="copy.inputPlaceholder"
                class="min-h-[96px] max-h-[220px] resize-none border-0 bg-transparent px-4 pt-4 text-[15px] leading-7 text-slate-900 shadow-none outline-none focus-visible:ring-0"
              />
            </PromptInputBody>

            <PromptInputFooter class="border-t border-slate-100 px-3 py-3">
              <PromptInputTools class="gap-1">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                <PromptInputButton :title="copy.webSearchEnabled" :variant="useWebSearch ? 'default' : 'ghost'" @click="toggleWebSearch">
                  <GlobeIcon class="size-4" />
                  <span class="hidden sm:inline">{{ copy.webSearch }}</span>
                </PromptInputButton>

                <PromptInputSpeechButton class="[&>svg]:size-4">
                  <MicIcon class="size-4" />
                </PromptInputSpeechButton>

                <PromptInputButton :title="copy.mention" disabled>
                  <AtSignIcon class="size-4" />
                </PromptInputButton>
              </PromptInputTools>

              <div class="flex items-center gap-2">
                <span class="hidden text-[11px] text-slate-400 sm:block">{{ copy.inputHint }}</span>

                <button
                  v-if="isStreaming"
                  type="button"
                  class="flex size-11 items-center justify-center rounded-full bg-slate-950 text-white transition-all duration-150 hover:bg-black active:scale-95"
                  @click="stopStreaming"
                >
                  <SquareIcon class="size-4" />
                </button>

                <button
                  v-else
                  type="submit"
                  class="flex size-11 items-center justify-center rounded-full bg-slate-950 text-white transition-all duration-150 hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <ArrowUpIcon class="size-4" />
                </button>
              </div>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>

    <div v-if="mobileSidebarOpen && showSidebar" class="fixed inset-0 z-40 md:hidden">
      <button type="button" class="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" @click="mobileSidebarOpen = false" />

      <aside class="relative z-10 flex h-full w-[86vw] max-w-[320px] flex-col bg-[#f9fafb] px-4 pb-4 pt-5 shadow-[0_16px_60px_rgba(15,23,42,0.18)]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
              <BotIcon class="size-4.5 text-slate-900" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ copy.brand }}</p>
              <p class="truncate text-xs text-slate-500">{{ copy.workstation }}</p>
            </div>
          </div>

          <button
            type="button"
            class="flex size-10 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            @click="mobileSidebarOpen = false"
          >
            <XIcon class="size-4.5" />
          </button>
        </div>

        <button
          type="button"
          class="mt-6 flex w-full items-center justify-between rounded-xl bg-slate-900 px-4 py-3 text-left text-white transition-all duration-150 hover:bg-black active:scale-[0.99]"
          :disabled="creatingSession"
          @click="handleNewSession"
        >
          <span class="flex items-center gap-2 text-sm font-medium">
            <PlusIcon class="size-4" />
            {{ copy.newChat }}
          </span>
          <span class="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/70">{{ copy.newChatHint }}</span>
        </button>

        <div class="agent-chat-scroll mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <div v-if="loadingSessions" class="px-2 py-3 text-sm text-slate-500">
            {{ copy.loadingSessions }}
          </div>

          <div v-else-if="sessionGroups.length === 0" class="px-2 py-4 text-sm leading-6 text-slate-500">
            {{ copy.noSessions }}
          </div>

          <div v-else class="space-y-6">
            <section v-for="group in sessionGroups" :key="group.key" class="space-y-2">
              <div class="px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {{ group.label }}
              </div>

              <button
                v-for="session in group.items"
                :key="session.uuid"
                type="button"
                class="flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left transition-all duration-150 hover:bg-slate-100"
                :class="session.uuid === activeThreadId ? 'bg-white text-slate-950 shadow-[0_12px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80' : 'text-slate-700'"
                @click="activateThread(session.uuid, { closeSidebar: true })"
              >
                <MessageSquareTextIcon class="size-3.5 shrink-0 text-slate-400" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px]" :class="session.uuid === activeThreadId ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'">
                    {{ session.title || copy.untitledSession }}
                  </p>
                </div>
              </button>
            </section>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.agent-chat-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}

.agent-chat-scroll::-webkit-scrollbar {
  width: 6px;
}

.agent-chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.agent-chat-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.4);
}

.agent-stream-in {
  animation: agent-stream-in 120ms ease-out;
}

.agent-chat-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.agent-chat-dots span {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.35;
  animation: agent-dot-breathe 1.2s ease-in-out infinite;
}

.agent-chat-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.agent-chat-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes agent-stream-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes agent-dot-breathe {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

:deep(.agent-chat-markdown) {
  font-size: 15px;
  line-height: 1.75;
  color: #0f172a;
}

:deep(.agent-chat-markdown > *:first-child) {
  margin-top: 0;
}

:deep(.agent-chat-markdown > *:last-child) {
  margin-bottom: 0;
}

:deep(.agent-chat-markdown h1),
:deep(.agent-chat-markdown h2),
:deep(.agent-chat-markdown h3),
:deep(.agent-chat-markdown h4) {
  margin-top: 1.4em;
  margin-bottom: 0.6em;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #0f172a;
}

:deep(.agent-chat-markdown p + p),
:deep(.agent-chat-markdown ul + p),
:deep(.agent-chat-markdown ol + p),
:deep(.agent-chat-markdown p + ul),
:deep(.agent-chat-markdown p + ol),
:deep(.agent-chat-markdown pre + p) {
  margin-top: 1rem;
}

:deep(.agent-chat-markdown ul),
:deep(.agent-chat-markdown ol) {
  padding-left: 1.25rem;
}

:deep(.agent-chat-markdown li + li) {
  margin-top: 0.35rem;
}

:deep(.agent-chat-markdown p code),
:deep(.agent-chat-markdown li code) {
  border-radius: 10px;
  background: #f1f5f9;
  padding: 0.18rem 0.45rem;
  font-size: 0.92em;
  color: #0f172a;
}

:deep(.agent-chat-markdown a) {
  color: #334155;
  text-decoration: underline;
  text-decoration-color: rgba(100, 116, 139, 0.35);
  text-underline-offset: 3px;
}

:deep(.agent-chat-markdown blockquote) {
  margin-top: 1rem;
  border-left: 2px solid #e2e8f0;
  padding-left: 1rem;
  color: #475569;
}

:deep(.agent-chat-markdown pre) {
  margin-top: 1.15rem;
  overflow-x: auto;
  background: transparent !important;
  padding: 1rem;
  color: #e2e8f0;
}

:deep(.agent-code-shell) {
  overflow: hidden;
  border-radius: 20px;
  background: #0f172a;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
}

:deep(.agent-code-toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.96);
  padding: 0.8rem 1rem;
}

:deep(.agent-code-language) {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgba(226, 232, 240, 0.78);
}

:deep(.agent-code-copy) {
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.42rem 0.8rem;
  font-size: 0.72rem;
  color: #e2e8f0;
  opacity: 0.65;
  transition: opacity 150ms ease, background-color 150ms ease, transform 150ms ease;
}

:deep(.agent-code-shell:hover .agent-code-copy) {
  opacity: 1;
}

:deep(.agent-code-copy:hover) {
  background: rgba(255, 255, 255, 0.14);
}

:deep(.agent-code-copy:active) {
  transform: scale(0.95);
}
</style>
