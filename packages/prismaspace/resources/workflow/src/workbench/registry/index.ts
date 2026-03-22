import type { FormItem } from '@prismaspace/generator/form-generator'
import { agentNodeRegistry } from './nodes/agent-node-registry'
import { branchNodeRegistry } from './nodes/branch-node-registry'
import { endNodeRegistry } from './nodes/end-node-registry'
import { interruptNodeRegistry } from './nodes/interrupt-node-registry'
import { llmNodeRegistry } from './nodes/llm-node-registry'
import { loopNodeRegistry } from './nodes/loop-node-registry'
import { outputNodeRegistry } from './nodes/output-node-registry'
import { setVariableNodeRegistry } from './nodes/set-variable-node-registry'
import { startNodeRegistry } from './nodes/start-node-registry'
import { toolNodeRegistry } from './nodes/tool-node-registry'
import { workflowNodeRegistry } from './nodes/workflow-node-registry'
import { buildFallbackNodePanelSchema } from './fallback-node-registry'
import type {
  WorkflowNodeRegistry,
  WorkflowNodeRegistryContext,
} from './types'

const workflowNodeRegistries: WorkflowNodeRegistry[] = [
  agentNodeRegistry,
  branchNodeRegistry,
  startNodeRegistry,
  endNodeRegistry,
  interruptNodeRegistry,
  llmNodeRegistry,
  loopNodeRegistry,
  outputNodeRegistry,
  setVariableNodeRegistry,
  toolNodeRegistry,
  workflowNodeRegistry,
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
