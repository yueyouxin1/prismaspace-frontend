import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  MsgResponse,
  TenantDbExecutionRequest,
  TenantDbExecutionResponse,
  TenantTableCreateRequest,
  TenantTableRead,
  TenantTableUpdateRequest,
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

  async createTable(instanceUuid: string, payload: TenantTableCreateRequest): Promise<TenantTableRead> {
    const response = await apiRequest<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async updateTable(
    instanceUuid: string,
    tableUuid: string,
    payload: TenantTableUpdateRequest,
  ): Promise<TenantTableRead> {
    const response = await apiRequest<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteTable(instanceUuid: string, tableUuid: string): Promise<void> {
    await apiRequest<MsgResponse>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`, {
      method: 'DELETE',
    })
  },

  async execute(instanceUuid: string, payload: TenantDbExecutionRequest): Promise<TenantDbExecutionResponse> {
    const response = await apiRequest<JsonResponse<TenantDbExecutionResponse>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },
}
