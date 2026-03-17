import type { VariableTreeNode } from '@prismaspace/editor'
import type { FormItem } from '@prismaspace/generator/form-generator'
import type {
  WorkflowGraphRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
} from '@prismaspace/contracts'
import type {
  WorkflowFormRuntimeContext,
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

export interface WorkflowNodeRegistry {
  registryId: string
  panel: {
    buildSchema: (context: WorkflowNodeRegistryContext) => FormItem[]
  }
  canvas?: {
    width?: number
  }
}
