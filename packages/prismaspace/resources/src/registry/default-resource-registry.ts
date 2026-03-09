import { AgentWorkbench } from '@prismaspace/agent/workbench'
import { KnowledgeWorkbench } from '@prismaspace/knowledge/workbench'
import { TenantDbWorkbench } from '@prismaspace/tenantdb/workbench'
import { ToolWorkbench } from '@prismaspace/tool/workbench'
import { UiAppWorkbench } from '@prismaspace/uiapp/workbench'
import { WorkflowWorkbench } from '@prismaspace/workflow/workbench'
import type { ResourceWorkbenchRegistry } from '../types'

export const defaultResourceWorkbenchRegistry: ResourceWorkbenchRegistry = {
  agent: AgentWorkbench,
  knowledge: KnowledgeWorkbench,
  tenantdb: TenantDbWorkbench,
  tool: ToolWorkbench,
  uiapp: UiAppWorkbench,
  workflow: WorkflowWorkbench,
}
