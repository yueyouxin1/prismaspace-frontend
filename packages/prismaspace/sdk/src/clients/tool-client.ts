import type {
  JsonResponse,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolInstanceRead,
  ToolInstanceUpdateRequest,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface ToolClient {
  getToolInstance: (instanceUuid: string) => Promise<ToolInstanceRead>
  updateToolInstance: (instanceUuid: string, payload: ToolInstanceUpdateRequest) => Promise<ToolInstanceRead>
  executeToolInstance: (instanceUuid: string, payload: ToolExecutionRequest) => Promise<ToolExecutionResponse>
}

export const createToolClient = (context: SdkContext): ToolClient => ({
  async getToolInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ToolInstanceRead>>(`/api/v1/instances/${instanceUuid}`))
  },
  async updateToolInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ToolInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async executeToolInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ToolExecutionResponse>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    }))
  },
})
