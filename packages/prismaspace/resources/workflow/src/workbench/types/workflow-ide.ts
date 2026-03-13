import type {
  ResourceRead,
  ServiceModuleRead,
  WorkflowEventRead,
  WorkflowExecutionResponse,
  WorkflowGraphRead,
  WorkflowParameterSchema,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
  WorkflowRead,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
} from '@prismaspace/contracts'

export interface WorkflowPaletteGroup {
  key: string
  label: string
  items: WorkflowNodeDefRead[]
}

export interface WorkflowResourceOption {
  value: string
  label: string
  description: string
  resourceType: string
  resourceUuid: string
  published: boolean
}

export interface WorkflowModelOption {
  value: string
  label: string
  description: string
  moduleName: string
  versionTag: string
}

export interface WorkflowValidationResult {
  is_valid: boolean
  errors: string[]
}

export interface WorkflowLatestExecution {
  mode: 'run' | 'debug'
  nodeId?: string | null
  response: WorkflowExecutionResponse
  finishedAt: string
}

export interface WorkflowFormRuntimeContext {
  resourceOptionsByType: Record<string, WorkflowResourceOption[]>
  modelOptions: WorkflowModelOption[]
}

export interface WorkflowVariableEntry {
  key: string
  nodeId: string
  nodeName: string
  category: 'workflow-input' | 'node-output'
  schema: WorkflowParameterSchema
  path: string
  refValue: {
    type: 'ref'
    content: {
      blockID: string
      path: string
      source?: string
    }
  }
}

export interface WorkflowWorkbenchSeed {
  resource: ResourceRead
  instance: WorkflowRead
  graph: WorkflowGraphRead
  nodeDefinitions: WorkflowNodeDefRead[]
  paletteGroups: WorkflowPaletteGroup[]
  resourceOptionsByType: Record<string, WorkflowResourceOption[]>
  modelOptions: WorkflowModelOption[]
}

export interface WorkflowRunBundle {
  summary: WorkflowRunSummaryRead
  detail?: WorkflowRunRead | null
  events?: WorkflowEventRead[]
}

export type WorkflowInstanceResource = Pick<
  ResourceRead,
  'uuid' | 'name' | 'description' | 'resource_type' | 'workspace_instance_uuid' | 'latest_published_instance_uuid'
>

export type WorkflowModelSource = Pick<ServiceModuleRead, 'name' | 'label' | 'versions'>
export type WorkflowNodeSelection = WorkflowNodeRead | null
