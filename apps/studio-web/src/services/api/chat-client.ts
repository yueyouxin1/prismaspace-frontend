import { apiRequest } from '@app/services/api/api-client'
import type {
  ChatMessageRead,
  ChatSessionCreateRequest,
  ChatSessionRead,
  ContextClearRequest,
  JsonResponse,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const chatApi = {
  async createSession(payload: ChatSessionCreateRequest): Promise<ChatSessionRead> {
    const response = await apiRequest<JsonResponse<ChatSessionRead>>('/api/v1/chat/sessions', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async listSessions(agentInstanceUuid: string, page = 1, limit = 20): Promise<ChatSessionRead[]> {
    const response = await apiRequest<JsonResponse<ChatSessionRead[]>>('/api/v1/chat/sessions', {
      query: {
        agent_instance_uuid: agentInstanceUuid,
        page,
        limit,
      },
    })
    return unwrap(response)
  },

  async deleteSession(sessionUuid: string): Promise<void> {
    await apiRequest(`/api/v1/chat/sessions/${sessionUuid}`, {
      method: 'DELETE',
    })
  },

  async listMessages(sessionUuid: string, cursor = 0, limit = 20): Promise<ChatMessageRead[]> {
    const response = await apiRequest<JsonResponse<ChatMessageRead[]>>(`/api/v1/chat/sessions/${sessionUuid}/messages`, {
      query: { cursor, limit },
    })
    return unwrap(response)
  },

  async clearContext(sessionUuid: string, payload: ContextClearRequest = { mode: 'production' }): Promise<void> {
    await apiRequest(`/api/v1/chat/sessions/${sessionUuid}/clear`, {
      method: 'POST',
      body: payload,
    })
  },
}
