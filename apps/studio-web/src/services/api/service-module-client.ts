import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  ServiceModuleProviderRead,
  ServiceModuleRead,
  ServiceModuleTypeRead,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const serviceModuleApi = {
  async listModuleTypes(): Promise<ServiceModuleTypeRead[]> {
    const response = await apiRequest<JsonResponse<ServiceModuleTypeRead[]>>('/api/v1/service-module-types')
    return unwrap(response)
  },

  async listModuleProviders(): Promise<ServiceModuleProviderRead[]> {
    const response = await apiRequest<JsonResponse<ServiceModuleProviderRead[]>>('/api/v1/service-module-providers')
    return unwrap(response)
  },

  async listAvailableModules(workspaceUuid: string, moduleType: string): Promise<ServiceModuleRead[]> {
    const response = await apiRequest<JsonResponse<ServiceModuleRead[]>>('/api/v1/service-modules/me/available', {
      query: {
        workspace_uuid: workspaceUuid,
        type: moduleType,
      },
    })
    return unwrap(response)
  },
}

