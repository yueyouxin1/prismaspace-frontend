import type { ParameterSchema } from '@repo/editor'

export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ToolResourceDraft {
  name: string
  description: string
}

export interface ToolInstanceDraft {
  uuid?: string | null
  url: string
  method: ToolHttpMethod
  inputsSchema: ParameterSchema[]
  outputsSchema: ParameterSchema[]
}

export interface ToolIdeSeed {
  resource: ToolResourceDraft
  instance: ToolInstanceDraft
}

export interface ToolIdeSavePayload {
  resource: ToolResourceDraft
  instance: ToolInstanceDraft
  hasResourceChanges: boolean
  hasInstanceChanges: boolean
}

export type ToolIdeSaveTrigger = 'manual' | 'autosave' | 'execute' | 'publish'

export interface ToolIdeSaveRequest {
  payload: ToolIdeSavePayload
  trigger: ToolIdeSaveTrigger
}

export interface ToolExecutePayload {
  inputs: Record<string, unknown>
  returnRawResponse: boolean
}

export interface ToolExecuteRequest {
  run: ToolExecutePayload
  save: ToolIdeSavePayload
}

export interface ToolPublishRequest {
  save: ToolIdeSavePayload
}

export interface ToolRunFeedback {
  success: boolean
  durationMs: number
  payload?: unknown
  errorMessage?: string
  at: string
}

export interface ToolRunField {
  name: string
  type: ParameterSchema['type']
  required: boolean
  description?: string
  role?: string
  defaultValue?: unknown
}
