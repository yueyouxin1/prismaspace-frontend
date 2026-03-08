import { apiRequest } from '@app/services/api/api-client'
import type {
  AgentMessageRead,
  AgentSessionCreateRequest,
  AgentSessionRead,
  AgentSessionUpdateRequest,
  AgentSessionClearContextRequest,
  JsonResponse,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const agentSessionApi = {
  async createSession(payload: AgentSessionCreateRequest): Promise<AgentSessionRead> {
    const response = await apiRequest<JsonResponse<AgentSessionRead>>('/api/v1/agent/sessions', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async listSessions(agentInstanceUuid: string, page = 1, limit = 20): Promise<AgentSessionRead[]> {
    const response = await apiRequest<JsonResponse<AgentSessionRead[]>>('/api/v1/agent/sessions', {
      query: {
        agent_instance_uuid: agentInstanceUuid,
        page,
        limit,
      },
    })
    return unwrap(response)
  },

  async deleteSession(sessionUuid: string): Promise<void> {
    await apiRequest(`/api/v1/agent/sessions/${sessionUuid}`, {
      method: 'DELETE',
    })
  },

  async updateSession(sessionUuid: string, payload: AgentSessionUpdateRequest): Promise<AgentSessionRead> {
    const response = await apiRequest<JsonResponse<AgentSessionRead>>(`/api/v1/agent/sessions/${sessionUuid}`, {
      method: 'PATCH',
      body: payload,
    })
    return unwrap(response)
  },

  async listMessages(sessionUuid: string, cursor = 0, limit = 20): Promise<AgentMessageRead[]> {
    const response = await apiRequest<JsonResponse<AgentMessageRead[]>>(`/api/v1/agent/sessions/${sessionUuid}/messages`, {
      query: { cursor, limit },
    })
    return unwrap(response)
  },

  async clearContext(sessionUuid: string, payload: AgentSessionClearContextRequest = { mode: 'production' }): Promise<void> {
    await apiRequest(`/api/v1/agent/sessions/${sessionUuid}/clear`, {
      method: 'POST',
      body: payload,
    })
  },
}
