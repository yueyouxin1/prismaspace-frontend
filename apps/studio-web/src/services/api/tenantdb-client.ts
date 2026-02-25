import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  TenantTableRead,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const tenantdbApi = {
  async listTables(instanceUuid: string): Promise<TenantTableRead[]> {
    const response = await apiRequest<JsonResponse<TenantTableRead[]>>(`/api/v1/tenantdb/${instanceUuid}/tables`)
    return unwrap(response)
  },

  async getTable(instanceUuid: string, tableUuid: string): Promise<TenantTableRead> {
    const response = await apiRequest<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`)
    return unwrap(response)
  },
}
