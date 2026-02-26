export type AgentDiversityMode = 'precise' | 'balanced' | 'creative' | 'custom'
export type AgentResponseFormatType = 'text' | 'json_object'

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

export interface AgentEditableConfig {
  diversityMode: AgentDiversityMode
  modelParams: AgentEditableModelParams
  ioConfig: AgentEditableIoConfig
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

export interface AgentWorkbenchMessage {
  uuid: string
  role: string
  content?: string | null
  createdAt?: string
  meta?: Record<string, unknown> | null
  toolCalls?: Record<string, unknown>[] | null
}

