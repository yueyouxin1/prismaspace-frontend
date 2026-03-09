import type {
  JsonResponse,
  MsgResponse,
  TenantDbExecutionRequest,
  TenantDbExecutionResponse,
  TenantTableCreateRequest,
  TenantTableRead,
  TenantTableUpdateRequest,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface TenantDbClient {
  listTables: (instanceUuid: string) => Promise<TenantTableRead[]>
  getTable: (instanceUuid: string, tableUuid: string) => Promise<TenantTableRead>
  createTable: (instanceUuid: string, payload: TenantTableCreateRequest) => Promise<TenantTableRead>
  updateTable: (instanceUuid: string, tableUuid: string, payload: TenantTableUpdateRequest) => Promise<TenantTableRead>
  deleteTable: (instanceUuid: string, tableUuid: string) => Promise<void>
  execute: (instanceUuid: string, payload: TenantDbExecutionRequest) => Promise<TenantDbExecutionResponse>
}

export const createTenantDbClient = (context: SdkContext): TenantDbClient => ({
  async listTables(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<TenantTableRead[]>>(`/api/v1/tenantdb/${instanceUuid}/tables`))
  },
  async getTable(instanceUuid, tableUuid) {
    return unwrap(await context.transport.request<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`))
  },
  async createTable(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables`, {
      method: 'POST',
      body: payload,
    }))
  },
  async updateTable(instanceUuid, tableUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<TenantTableRead>>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async deleteTable(instanceUuid, tableUuid) {
    await context.transport.request<MsgResponse>(`/api/v1/tenantdb/${instanceUuid}/tables/${tableUuid}`, {
      method: 'DELETE',
    })
  },
  async execute(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<TenantDbExecutionResponse>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    }))
  },
})
