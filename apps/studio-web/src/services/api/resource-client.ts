import { apiRequest } from '@app/services/api/api-client'
import type {
  AnyInstanceRead,
  InstancePublishRequest,
  JsonResponse,
  ProjectResourceReferenceCreateRequest,
  ProjectResourceReferenceRead,
  ReferenceCreateRequest,
  ReferenceRead,
  ResourceCreateRequest,
  ResourceDependencyRead,
  ResourceDetailRead,
  ResourceInstanceSummaryRead,
  ResourceRead,
  ResourceUpdateRequest,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const resourceApi = {
  async listWorkspaceResources(workspaceUuid: string): Promise<ResourceRead[]> {
    const response = await apiRequest<JsonResponse<ResourceRead[]>>(`/api/v1/workspaces/${workspaceUuid}/resources`)
    return unwrap(response)
  },

  async createWorkspaceResource(workspaceUuid: string, payload: ResourceCreateRequest): Promise<ResourceRead> {
    const response = await apiRequest<JsonResponse<ResourceRead>>(`/api/v1/workspaces/${workspaceUuid}/resources`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async getResource(resourceUuid: string): Promise<ResourceDetailRead> {
    const response = await apiRequest<JsonResponse<ResourceDetailRead>>(`/api/v1/resources/${resourceUuid}`)
    return unwrap(response)
  },

  async updateResource(resourceUuid: string, payload: ResourceUpdateRequest): Promise<ResourceRead> {
    const response = await apiRequest<JsonResponse<ResourceRead>>(`/api/v1/resources/${resourceUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteResource(resourceUuid: string): Promise<void> {
    await apiRequest(`/api/v1/resources/${resourceUuid}`, {
      method: 'DELETE',
    })
  },

  async listResourceInstances(resourceUuid: string): Promise<ResourceInstanceSummaryRead[]> {
    const response = await apiRequest<JsonResponse<ResourceInstanceSummaryRead[]>>(`/api/v1/resources/${resourceUuid}/instances`)
    return unwrap(response)
  },

  async getInstance(instanceUuid: string): Promise<AnyInstanceRead> {
    const response = await apiRequest<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}`)
    return unwrap(response)
  },

  async updateInstance(instanceUuid: string, payload: Record<string, unknown>): Promise<AnyInstanceRead> {
    const response = await apiRequest<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteInstance(instanceUuid: string): Promise<void> {
    await apiRequest(`/api/v1/instances/${instanceUuid}`, {
      method: 'DELETE',
    })
  },

  async publishInstance(instanceUuid: string, payload: InstancePublishRequest): Promise<AnyInstanceRead> {
    const response = await apiRequest<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}/publish`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async archiveInstance(instanceUuid: string): Promise<AnyInstanceRead> {
    const response = await apiRequest<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}/archive`, {
      method: 'POST',
    })
    return unwrap(response)
  },

  async listProjectResourceRefs(projectUuid: string): Promise<ProjectResourceReferenceRead[]> {
    const response = await apiRequest<JsonResponse<ProjectResourceReferenceRead[]>>(`/api/v1/projects/${projectUuid}/resources`)
    return unwrap(response)
  },

  async addProjectResourceRef(projectUuid: string, payload: ProjectResourceReferenceCreateRequest): Promise<ProjectResourceReferenceRead> {
    const response = await apiRequest<JsonResponse<ProjectResourceReferenceRead>>(`/api/v1/projects/${projectUuid}/resources`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async removeProjectResourceRef(projectUuid: string, resourceUuid: string): Promise<void> {
    await apiRequest(`/api/v1/projects/${projectUuid}/resources/${resourceUuid}`, {
      method: 'DELETE',
    })
  },

  async listInstanceRefs(instanceUuid: string): Promise<ReferenceRead[]> {
    const response = await apiRequest<JsonResponse<ReferenceRead[]>>(`/api/v1/instances/${instanceUuid}/refs`)
    return unwrap(response)
  },

  async addInstanceRef(instanceUuid: string, payload: ReferenceCreateRequest): Promise<ReferenceRead> {
    const response = await apiRequest<JsonResponse<ReferenceRead>>(`/api/v1/instances/${instanceUuid}/refs`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async removeInstanceRef(instanceUuid: string, targetInstanceUuid: string, sourceNodeUuid?: string): Promise<void> {
    await apiRequest(`/api/v1/instances/${instanceUuid}/refs/${targetInstanceUuid}`, {
      method: 'DELETE',
      query: sourceNodeUuid ? { source_node_uuid: sourceNodeUuid } : undefined,
    })
  },

  async listInstanceDependencies(instanceUuid: string): Promise<ResourceDependencyRead[]> {
    const response = await apiRequest<JsonResponse<ResourceDependencyRead[]>>(`/api/v1/instances/${instanceUuid}/dependencies`)
    return unwrap(response)
  },
}
