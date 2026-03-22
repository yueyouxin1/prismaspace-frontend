import type { VariableTreeNode } from '@prismaspace/editor'
import type { FormItem } from '@prismaspace/generator/form-generator'
import type {
  AnyInstanceRead,
  WorkflowGraphRead,
  WorkflowNodeDefRead,
  WorkflowNodeDataRead,
  WorkflowNodeRead,
  WorkflowParameterSchema,
} from '@prismaspace/contracts'
import type {
  WorkflowFormRuntimeContext,
  WorkflowNodeRuntimeState,
  WorkflowVariableEntry,
} from '../types/workflow-ide'

export interface WorkflowNodeRegistryContext {
  selectedNode: WorkflowNodeRead
  selectedNodeDefinition?: WorkflowNodeDefRead | null
  graph: WorkflowGraphRead
  formContext: WorkflowFormRuntimeContext
  variableEntries: WorkflowVariableEntry[]
  valueRefTree: VariableTreeNode[]
}

export interface WorkflowNodePortDescriptor {
  id: string
  label: string
  schema?: WorkflowParameterSchema | null
}

export interface WorkflowNodeCanvasSummaryLine {
  label: string
  value: string
}

export interface WorkflowNodeCanvasResultPreview {
  label: string
  content: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

export interface WorkflowNodeCanvasContext {
  node: WorkflowNodeRead
  graph: WorkflowGraphRead
  runState?: WorkflowNodeRuntimeState | null
}

export interface WorkflowNodeHydrationContext {
  node: WorkflowNodeRead
  instance: AnyInstanceRead
  formContext: WorkflowFormRuntimeContext
}

export interface WorkflowNodeRegistry {
  registryId: string
  panel: {
    buildSchema: (context: WorkflowNodeRegistryContext) => FormItem[]
  }
  canvas?: {
    width?: number
    getInputPorts?: (context: WorkflowNodeCanvasContext) => WorkflowNodePortDescriptor[]
    getOutputPorts?: (context: WorkflowNodeCanvasContext) => WorkflowNodePortDescriptor[]
    getSummaryLines?: (context: WorkflowNodeCanvasContext) => WorkflowNodeCanvasSummaryLine[]
    getResultPreview?: (context: WorkflowNodeCanvasContext) => WorkflowNodeCanvasResultPreview | null
  }
  hydrate?: {
    resolveInstanceUuid?: (nodeData: WorkflowNodeDataRead) => string | null
    applyInstance?: (context: WorkflowNodeHydrationContext) => Partial<WorkflowNodeDataRead> | null
  }
  faultTolerance?: {
    visible?: boolean
  }
}
