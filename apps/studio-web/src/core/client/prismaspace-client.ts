import { createClient } from '@prismaspace/sdk'
import { apiContextStorage } from '@app/services/api/context-storage'
import { usePlatformStore } from '@app/stores/platform'

const resolveBaseUrl = (): string => {
  const base = import.meta.env.APP_API_BASE_URL
  if (typeof base !== 'string') {
    return ''
  }
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export const prismaspaceClient = createClient({
  baseUrl: resolveBaseUrl(),
  getAccessToken: () => apiContextStorage.getAccessToken(),
  getWorkspaceUuid: () => apiContextStorage.getWorkspaceUuid(),
  locale: 'zh-CN',
  onUnauthorized: () => {
    try {
      usePlatformStore().markSessionExpired()
    } catch {
      // Ignore store access before app bootstrap.
    }
  },
})

export const resourceClient = prismaspaceClient.resource
export const toolClient = prismaspaceClient.tool
export const agentClient = prismaspaceClient.agent
export const workflowClient = prismaspaceClient.workflow
export const knowledgeClient = prismaspaceClient.knowledge
export const tenantdbClient = prismaspaceClient.tenantdb
export const uiappClient = prismaspaceClient.uiapp
export const assetClient = prismaspaceClient.asset
export const serviceModuleClient = prismaspaceClient.serviceModule
export const executionClient = prismaspaceClient.execution
