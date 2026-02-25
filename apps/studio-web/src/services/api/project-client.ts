import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  ProjectCreateRequest,
  ProjectDependencyGraphRead,
  ProjectEnvConfigRead,
  ProjectEnvConfigUpdateRequest,
  ProjectRead,
  ProjectUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface WorkspaceProjectListQuery extends Record<string, string | number | boolean | null | undefined> {
  main_application_type?: 'uiapp' | 'agent' | 'unset'
}

export const projectApi = {
  async listWorkspaceProjects(workspaceUuid: string, query?: WorkspaceProjectListQuery): Promise<ProjectRead[]> {
    const response = await apiRequest<JsonResponse<ProjectRead[]>>(`/api/v1/workspaces/${workspaceUuid}/projects`, {
      query,
    })
    return unwrap(response)
  },

  async createWorkspaceProject(workspaceUuid: string, payload: ProjectCreateRequest): Promise<ProjectRead> {
    const response = await apiRequest<JsonResponse<ProjectRead>>(`/api/v1/workspaces/${workspaceUuid}/projects`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async getProject(projectUuid: string): Promise<ProjectRead> {
    const response = await apiRequest<JsonResponse<ProjectRead>>(`/api/v1/projects/${projectUuid}`)
    return unwrap(response)
  },

  async updateProject(projectUuid: string, payload: ProjectUpdateRequest): Promise<ProjectRead> {
    const response = await apiRequest<JsonResponse<ProjectRead>>(`/api/v1/projects/${projectUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteProject(projectUuid: string): Promise<void> {
    await apiRequest(`/api/v1/projects/${projectUuid}`, {
      method: 'DELETE',
    })
  },

  async getProjectEnvConfig(projectUuid: string): Promise<ProjectEnvConfigRead> {
    const response = await apiRequest<JsonResponse<ProjectEnvConfigRead>>(`/api/v1/projects/${projectUuid}/env-config`)
    return unwrap(response)
  },

  async updateProjectEnvConfig(projectUuid: string, payload: ProjectEnvConfigUpdateRequest): Promise<ProjectEnvConfigRead> {
    const response = await apiRequest<JsonResponse<ProjectEnvConfigRead>>(`/api/v1/projects/${projectUuid}/env-config`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async clearProjectEnvConfig(projectUuid: string): Promise<void> {
    await apiRequest(`/api/v1/projects/${projectUuid}/env-config`, {
      method: 'DELETE',
    })
  },

  async getProjectDependencyGraph(projectUuid: string): Promise<ProjectDependencyGraphRead> {
    const response = await apiRequest<JsonResponse<ProjectDependencyGraphRead>>(
      `/api/v1/projects/${projectUuid}/dependency-graph`,
    )
    return unwrap(response)
  },
}
