import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowNodeDefRead,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const workflowApi = {
  async listNodeDefinitions(): Promise<WorkflowNodeDefRead[]> {
    const response = await apiRequest<JsonResponse<WorkflowNodeDefRead[]>>('/api/v1/workflow/nodes')
    return unwrap(response)
  },

  async execute(instanceUuid: string, payload: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse> {
    const response = await apiRequest<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async validate(instanceUuid: string): Promise<{ is_valid: boolean; errors: string[] }> {
    const response = await apiRequest<JsonResponse<{ is_valid: boolean; errors: string[] }>>(`/api/v1/workflow/${instanceUuid}/validate`, {
      method: 'POST',
    })
    return unwrap(response)
  },
}
