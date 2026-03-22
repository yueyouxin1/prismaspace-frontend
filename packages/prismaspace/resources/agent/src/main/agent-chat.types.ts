import type { AgentSessionRead } from '@prismaspace/contracts'

export type MessageRole = 'user' | 'assistant' | 'system'
export type ToolStatus = 'running' | 'success' | 'error'

export interface AttachmentSummary {
  id: string
  name: string
  size?: number
  type?: string
}

export interface SourceSummary {
  title: string
  url?: string | null
}

export interface ToolCallView {
  id: string
  name: string
  args: string
  status: ToolStatus
  result?: string
  error?: string
}

export interface DisplayMessage {
  id: string
  role: MessageRole
  content: string
  reasoning: string
  createdAt: string
  streaming: boolean
  reasoningOpen: boolean
  sources: SourceSummary[]
  toolCalls: ToolCallView[]
  attachments: AttachmentSummary[]
  error?: string | null
  runId?: string | null
}

export interface SessionGroup {
  key: string
  label: string
  items: AgentSessionRead[]
}
