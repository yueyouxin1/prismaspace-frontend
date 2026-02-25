import { apiRequest } from '@app/services/api/api-client'
import type {
  AgentExecutionRequest,
  AgentExecutionResponse,
  JsonResponse,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const agentApi = {
  async execute(instanceUuid: string, payload: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const response = await apiRequest<JsonResponse<AgentExecutionResponse>>(`/api/v1/agent/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },
}
