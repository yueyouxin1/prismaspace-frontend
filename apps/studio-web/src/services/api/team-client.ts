import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  TeamCreateRequest,
  TeamMemberRead,
  TeamRead,
  TeamUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const teamApi = {
  async listTeams(): Promise<TeamRead[]> {
    const response = await apiRequest<JsonResponse<TeamRead[]>>('/api/v1/teams')
    return unwrap(response)
  },

  async createTeam(payload: TeamCreateRequest): Promise<TeamRead> {
    const response = await apiRequest<JsonResponse<TeamRead>>('/api/v1/teams', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async getTeam(teamUuid: string): Promise<TeamRead> {
    const response = await apiRequest<JsonResponse<TeamRead>>(`/api/v1/teams/${teamUuid}`)
    return unwrap(response)
  },

  async updateTeam(teamUuid: string, payload: TeamUpdateRequest): Promise<TeamRead> {
    const response = await apiRequest<JsonResponse<TeamRead>>(`/api/v1/teams/${teamUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteTeam(teamUuid: string): Promise<void> {
    await apiRequest(`/api/v1/teams/${teamUuid}`, {
      method: 'DELETE',
    })
  },

  async listTeamMembers(teamUuid: string): Promise<TeamMemberRead[]> {
    const response = await apiRequest<JsonResponse<TeamMemberRead[]>>(`/api/v1/teams/${teamUuid}/members`)
    return unwrap(response)
  },

  async removeTeamMember(teamUuid: string, memberUuid: string): Promise<void> {
    await apiRequest(`/api/v1/teams/${teamUuid}/members/${memberUuid}`, {
      method: 'DELETE',
    })
  },
}

