import type {
  JsonResponse,
  ServiceModuleProviderRead,
  ServiceModuleRead,
  ServiceModuleTypeRead,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface ServiceModuleClient {
  listModuleTypes: () => Promise<ServiceModuleTypeRead[]>
  listModuleProviders: () => Promise<ServiceModuleProviderRead[]>
  listAvailableModules: (workspaceUuid: string, moduleType: string) => Promise<ServiceModuleRead[]>
}

export const createServiceModuleClient = (context: SdkContext): ServiceModuleClient => ({
  async listModuleTypes() {
    return unwrap(await context.transport.request<JsonResponse<ServiceModuleTypeRead[]>>('/api/v1/service-module-types'))
  },
  async listModuleProviders() {
    return unwrap(await context.transport.request<JsonResponse<ServiceModuleProviderRead[]>>('/api/v1/service-module-providers'))
  },
  async listAvailableModules(workspaceUuid, moduleType) {
    return unwrap(await context.transport.request<JsonResponse<ServiceModuleRead[]>>('/api/v1/service-modules/me/available', {
      query: {
        workspace_uuid: workspaceUuid,
        type: moduleType,
      },
    }))
  },
})
