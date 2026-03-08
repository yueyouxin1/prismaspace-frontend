export type AgentDiversityMode = 'precise' | 'balanced' | 'creative' | 'custom'
export type AgentResponseFormatType = 'text' | 'json_object'
export type AgentKnowledgeCallMode = 'on_demand' | 'always'
export type RightViewMode = 'session' | 'chat' | 'debug'

export interface AgentEditableModelParams {
  temperature: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
}

export interface AgentEditableIoConfig {
  historyTurns: number
  maxResponseTokens: number
  enableDeepThinking: boolean
  maxThinkingTokens: number | null
  responseFormatType: AgentResponseFormatType
}

export interface AgentEditableDeepMemoryConfig {
  enabled: boolean
  enableVectorRecall: boolean
  maxRecallTurns: number
  minMatchScore: number
  enableSummarization: boolean
  maxSummaryTurns: number
  summaryScope: 'user' | 'session'
}

export interface AgentEditableRagConfig {
  enabled: boolean
  showSource: boolean
  callMode: AgentKnowledgeCallMode
}

export interface AgentEditableSkillConfig {
  enablePlugins: boolean
  enableWorkflow: boolean
}

export interface AgentEditableMemoryUiConfig {
  variableKeys: string[]
  enableFileBox: boolean
  enableDatabaseMemory: boolean
}

export interface AgentEditableConversationConfig {
  openingMessage: string
  presetQuestions: string[]
  showAllPresetQuestions: boolean
}

export interface AgentEditableUiConfig {
  skill: AgentEditableSkillConfig
  memory: AgentEditableMemoryUiConfig
  conversation: AgentEditableConversationConfig
}

export interface AgentEditableConfig {
  diversityMode: AgentDiversityMode
  modelParams: AgentEditableModelParams
  ioConfig: AgentEditableIoConfig
  deepMemoryConfig: AgentEditableDeepMemoryConfig
  ragConfig: AgentEditableRagConfig
  uiConfig: AgentEditableUiConfig
}

export interface AgentIdeSeed {
  resourceName: string
  systemPrompt: string
  llmModuleVersionUuid: string | null
  agentConfig: Record<string, unknown>
}

export interface AgentInstancePatchPayload {
  system_prompt?: string
  llm_module_version_uuid?: string | null
  agent_config?: Record<string, unknown>
}

export interface AgentModelOption {
  modelUuid: string
  displayName: string
  provider: string
  providerLabel: string
  moduleName: string
  moduleLabel: string
  versionTag: string
  description?: string | null
}

export interface AgentSessionSummary {
  uuid: string
  title?: string | null
  messageCount?: number
  updatedAt?: string
}

export interface AgentResourceCatalogItem {
  resourceUuid: string
  name: string
  description?: string | null
  resourceType: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}

export interface AgentReferenceBinding {
  id: number
  sourceNodeUuid?: string | null
  alias?: string | null
  targetInstanceUuid: string
  targetResourceName: string
  targetResourceType: string
  targetVersionTag: string
}

export interface AgentWorkbenchMessage {
  uuid: string
  role: string
  content?: string | null
  reasoning?: string | null
  streaming?: boolean
  createdAt?: string
  meta?: Record<string, unknown> | null
  toolCalls?: Record<string, unknown>[] | null
  references?: Array<{
    title: string
    url?: string | null
  }> | null
}

export interface AgentStreamDebugEvent {
  id: string
  type: string
  ts: string
  sessionId?: string | null
  runId?: string | null
  turnId?: string | null
  traceId?: string | null
  messageId?: string | null
  level?: 'info' | 'warn' | 'error'
  payload?: Record<string, unknown> | null
}
