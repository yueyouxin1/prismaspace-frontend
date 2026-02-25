import { apiRequest } from '@app/services/api/api-client'
import type { JsonResponse, ResourceTypeRead } from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const resourceTypeApi = {
  async listResourceTypes(): Promise<ResourceTypeRead[]> {
    const response = await apiRequest<JsonResponse<ResourceTypeRead[]>>('/api/v1/resource-types')
    return unwrap(response)
  },
}
