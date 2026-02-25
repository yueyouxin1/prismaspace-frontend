import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  WorkspaceCreateRequest,
  WorkspaceRead,
  WorkspaceUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const workspaceApi = {
  async listWorkspaces(): Promise<WorkspaceRead[]> {
    const response = await apiRequest<JsonResponse<WorkspaceRead[]>>('/api/v1/workspaces')
    return unwrap(response)
  },

  async createWorkspace(payload: WorkspaceCreateRequest): Promise<WorkspaceRead> {
    const response = await apiRequest<JsonResponse<WorkspaceRead>>('/api/v1/workspaces', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async getWorkspace(workspaceUuid: string): Promise<WorkspaceRead> {
    const response = await apiRequest<JsonResponse<WorkspaceRead>>(`/api/v1/workspaces/${workspaceUuid}`)
    return unwrap(response)
  },

  async updateWorkspace(workspaceUuid: string, payload: WorkspaceUpdateRequest): Promise<WorkspaceRead> {
    const response = await apiRequest<JsonResponse<WorkspaceRead>>(`/api/v1/workspaces/${workspaceUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async archiveWorkspace(workspaceUuid: string): Promise<void> {
    await apiRequest(`/api/v1/workspaces/${workspaceUuid}`, {
      method: 'DELETE',
    })
  },
}

