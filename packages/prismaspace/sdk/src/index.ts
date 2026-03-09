import {
  createAgentClient,
  createAgentSessionClient,
  createAssetClient,
  createExecutionClient,
  createKnowledgeClient,
  createResourceClient,
  createServiceModuleClient,
  createTenantDbClient,
  createToolClient,
  createUiAppClient,
  createWorkflowClient,
  type SdkContext,
} from './clients'
import { createTransport, type ClientOptions } from './transport'

export * from './clients'
export * from './errors'
export * from './transport'

export interface PrismaspaceClient {
  config: {
    locale: string
  }
  resource: ReturnType<typeof createResourceClient>
  tool: ReturnType<typeof createToolClient>
  agent: ReturnType<typeof createAgentClient>
  workflow: ReturnType<typeof createWorkflowClient>
  knowledge: ReturnType<typeof createKnowledgeClient>
  tenantdb: ReturnType<typeof createTenantDbClient>
  uiapp: ReturnType<typeof createUiAppClient>
  asset: ReturnType<typeof createAssetClient>
  serviceModule: ReturnType<typeof createServiceModuleClient>
  agentSession: ReturnType<typeof createAgentSessionClient>
  execution: ReturnType<typeof createExecutionClient>
}

export const createClient = (options: ClientOptions): PrismaspaceClient => {
  const transport = createTransport(options)
  const context: SdkContext = {
    transport,
    config: {
      locale: transport.config.locale,
    },
  }

  const execution = createExecutionClient(context)

  return {
    config: context.config,
    resource: createResourceClient(context),
    tool: createToolClient(context),
    agent: createAgentClient(context),
    workflow: createWorkflowClient(context),
    knowledge: createKnowledgeClient(context, execution),
    tenantdb: createTenantDbClient(context),
    uiapp: createUiAppClient(context),
    asset: createAssetClient(context),
    serviceModule: createServiceModuleClient(context),
    agentSession: createAgentSessionClient(context),
    execution,
  }
}
