import type { FormItem } from '@prismaspace/generator/form-generator'
import { endNodeRegistry } from './nodes/end-node-registry'
import { startNodeRegistry } from './nodes/start-node-registry'
import { buildFallbackNodePanelSchema } from './fallback-node-registry'
import type {
  WorkflowNodeRegistry,
  WorkflowNodeRegistryContext,
} from './types'

const workflowNodeRegistries: WorkflowNodeRegistry[] = [
  startNodeRegistry,
  endNodeRegistry,
]

const workflowNodeRegistryMap = new Map(
  workflowNodeRegistries.map(registry => [registry.registryId, registry] as const),
)

export const getWorkflowNodeRegistry = (
  registryId: string,
): WorkflowNodeRegistry | undefined => workflowNodeRegistryMap.get(registryId)

export const resolveWorkflowNodePanelSchema = (
  context: WorkflowNodeRegistryContext,
): FormItem[] => {
  const registry = getWorkflowNodeRegistry(context.selectedNode.data.registryId)
  if (registry) {
    return registry.panel.buildSchema(context)
  }
  return buildFallbackNodePanelSchema(context)
}

export type {
  WorkflowNodeRegistry,
  WorkflowNodeRegistryContext,
} from './types'
