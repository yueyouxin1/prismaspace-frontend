import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  ToolExecutionRequest,
  ToolExecutionResponse,
  ToolInstanceRead,
  ToolInstanceUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const toolApi = {
  async getToolInstance(instanceUuid: string): Promise<ToolInstanceRead> {
    const response = await apiRequest<JsonResponse<ToolInstanceRead>>(`/api/v1/instances/${instanceUuid}`)
    return unwrap(response)
  },

  async updateToolInstance(instanceUuid: string, payload: ToolInstanceUpdateRequest): Promise<ToolInstanceRead> {
    const response = await apiRequest<JsonResponse<ToolInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async executeToolInstance(instanceUuid: string, payload: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    const response = await apiRequest<JsonResponse<ToolExecutionResponse>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },
}
