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
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface ResourceClient {
  listWorkspaceResources: (workspaceUuid: string) => Promise<ResourceRead[]>
  createWorkspaceResource: (workspaceUuid: string, payload: ResourceCreateRequest) => Promise<ResourceRead>
  getResource: (resourceUuid: string) => Promise<ResourceDetailRead>
  updateResource: (resourceUuid: string, payload: ResourceUpdateRequest) => Promise<ResourceRead>
  deleteResource: (resourceUuid: string) => Promise<void>
  listResourceInstances: (resourceUuid: string) => Promise<ResourceInstanceSummaryRead[]>
  getInstance: (instanceUuid: string) => Promise<AnyInstanceRead>
  updateInstance: (instanceUuid: string, payload: Record<string, unknown>) => Promise<AnyInstanceRead>
  deleteInstance: (instanceUuid: string) => Promise<void>
  publishInstance: (instanceUuid: string, payload: InstancePublishRequest) => Promise<AnyInstanceRead>
  archiveInstance: (instanceUuid: string) => Promise<AnyInstanceRead>
  listProjectResourceRefs: (projectUuid: string) => Promise<ProjectResourceReferenceRead[]>
  addProjectResourceRef: (projectUuid: string, payload: ProjectResourceReferenceCreateRequest) => Promise<ProjectResourceReferenceRead>
  removeProjectResourceRef: (projectUuid: string, resourceUuid: string) => Promise<void>
  listInstanceRefs: (instanceUuid: string) => Promise<ReferenceRead[]>
  addInstanceRef: (instanceUuid: string, payload: ReferenceCreateRequest) => Promise<ReferenceRead>
  removeInstanceRef: (instanceUuid: string, targetInstanceUuid: string, sourceNodeUuid?: string) => Promise<void>
  listInstanceDependencies: (instanceUuid: string) => Promise<ResourceDependencyRead[]>
}

export const createResourceClient = (context: SdkContext): ResourceClient => ({
  async listWorkspaceResources(workspaceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ResourceRead[]>>(`/api/v1/workspaces/${workspaceUuid}/resources`))
  },
  async createWorkspaceResource(workspaceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ResourceRead>>(`/api/v1/workspaces/${workspaceUuid}/resources`, {
      method: 'POST',
      body: payload,
    }))
  },
  async getResource(resourceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ResourceDetailRead>>(`/api/v1/resources/${resourceUuid}`))
  },
  async updateResource(resourceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ResourceRead>>(`/api/v1/resources/${resourceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async deleteResource(resourceUuid) {
    await context.transport.request(`/api/v1/resources/${resourceUuid}`, { method: 'DELETE' })
  },
  async listResourceInstances(resourceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ResourceInstanceSummaryRead[]>>(`/api/v1/resources/${resourceUuid}/instances`))
  },
  async getInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}`))
  },
  async updateInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async deleteInstance(instanceUuid) {
    await context.transport.request(`/api/v1/instances/${instanceUuid}`, { method: 'DELETE' })
  },
  async publishInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}/publish`, {
      method: 'POST',
      body: payload,
    }))
  },
  async archiveInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<AnyInstanceRead>>(`/api/v1/instances/${instanceUuid}/archive`, {
      method: 'POST',
    }))
  },
  async listProjectResourceRefs(projectUuid) {
    return unwrap(await context.transport.request<JsonResponse<ProjectResourceReferenceRead[]>>(`/api/v1/projects/${projectUuid}/resources`))
  },
  async addProjectResourceRef(projectUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ProjectResourceReferenceRead>>(`/api/v1/projects/${projectUuid}/resources`, {
      method: 'POST',
      body: payload,
    }))
  },
  async removeProjectResourceRef(projectUuid, resourceUuid) {
    await context.transport.request(`/api/v1/projects/${projectUuid}/resources/${resourceUuid}`, {
      method: 'DELETE',
    })
  },
  async listInstanceRefs(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ReferenceRead[]>>(`/api/v1/instances/${instanceUuid}/refs`))
  },
  async addInstanceRef(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<ReferenceRead>>(`/api/v1/instances/${instanceUuid}/refs`, {
      method: 'POST',
      body: payload,
    }))
  },
  async removeInstanceRef(instanceUuid, targetInstanceUuid, sourceNodeUuid) {
    await context.transport.request(`/api/v1/instances/${instanceUuid}/refs/${targetInstanceUuid}`, {
      method: 'DELETE',
      query: sourceNodeUuid ? { source_node_uuid: sourceNodeUuid } : undefined,
    })
  },
  async listInstanceDependencies(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<ResourceDependencyRead[]>>(`/api/v1/instances/${instanceUuid}/dependencies`))
  },
})
