import type {
  AgentMessageRead,
  AgentSessionClearContextRequest,
  AgentSessionCreateRequest,
  AgentSessionRead,
  AgentSessionUpdateRequest,
  JsonResponse,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface AgentSessionClient {
  createSession: (payload: AgentSessionCreateRequest) => Promise<AgentSessionRead>
  listSessions: (agentInstanceUuid: string, page?: number, limit?: number) => Promise<AgentSessionRead[]>
  deleteSession: (sessionUuid: string) => Promise<void>
  updateSession: (sessionUuid: string, payload: AgentSessionUpdateRequest) => Promise<AgentSessionRead>
  listMessages: (sessionUuid: string, cursor?: number, limit?: number) => Promise<AgentMessageRead[]>
  clearContext: (sessionUuid: string, payload?: AgentSessionClearContextRequest) => Promise<void>
}

export const createAgentSessionClient = (context: SdkContext): AgentSessionClient => ({
  async createSession(payload) {
    return unwrap(await context.transport.request<JsonResponse<AgentSessionRead>>('/api/v1/agent/sessions', {
      method: 'POST',
      body: payload,
    }))
  },
  async listSessions(agentInstanceUuid, page = 1, limit = 20) {
    return unwrap(await context.transport.request<JsonResponse<AgentSessionRead[]>>('/api/v1/agent/sessions', {
      query: {
        agent_instance_uuid: agentInstanceUuid,
        page,
        limit,
      },
    }))
  },
  async deleteSession(sessionUuid) {
    await context.transport.request(`/api/v1/agent/sessions/${sessionUuid}`, {
      method: 'DELETE',
    })
  },
  async updateSession(sessionUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AgentSessionRead>>(`/api/v1/agent/sessions/${sessionUuid}`, {
      method: 'PATCH',
      body: payload,
    }))
  },
  async listMessages(sessionUuid, cursor = 0, limit = 20) {
    return unwrap(await context.transport.request<JsonResponse<AgentMessageRead[]>>(`/api/v1/agent/sessions/${sessionUuid}/messages`, {
      query: { cursor, limit },
    }))
  },
  async clearContext(sessionUuid, payload = { mode: 'production' } as AgentSessionClearContextRequest) {
    await context.transport.request(`/api/v1/agent/sessions/${sessionUuid}/clear`, {
      method: 'POST',
      body: payload,
    })
  },
})
