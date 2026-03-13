import type {
  JsonResponse,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowEventRead,
  WorkflowNodeDefRead,
  WorkflowRead,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
  WorkflowUpdateRequest,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface WorkflowClient {
  listNodeDefinitions: () => Promise<WorkflowNodeDefRead[]>
  getWorkflowInstance: (instanceUuid: string) => Promise<WorkflowRead>
  updateWorkflowInstance: (instanceUuid: string, payload: WorkflowUpdateRequest) => Promise<WorkflowRead>
  execute: (instanceUuid: string, payload: WorkflowExecutionRequest) => Promise<WorkflowExecutionResponse>
  executeAsync: (instanceUuid: string, payload: WorkflowExecutionRequest) => Promise<WorkflowRunSummaryRead>
  debugNode: (instanceUuid: string, nodeId: string, payload: WorkflowExecutionRequest) => Promise<WorkflowExecutionResponse>
  validate: (instanceUuid: string) => Promise<{ is_valid: boolean; errors: string[] }>
  listRuns: (instanceUuid: string, limit?: number) => Promise<WorkflowRunSummaryRead[]>
  getRun: (runId: string) => Promise<WorkflowRunRead>
  listRunEvents: (runId: string, limit?: number) => Promise<WorkflowEventRead[]>
  cancelRun: (runId: string) => Promise<{ run_id: string; accepted: boolean; local_cancelled: boolean }>
}

export const createWorkflowClient = (context: SdkContext): WorkflowClient => ({
  async listNodeDefinitions() {
    return unwrap(await context.transport.request<JsonResponse<WorkflowNodeDefRead[]>>('/api/v1/workflow/nodes'))
  },
  async getWorkflowInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRead>>(`/api/v1/instances/${instanceUuid}`))
  },
  async updateWorkflowInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async execute(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    }))
  },
  async executeAsync(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunSummaryRead>>(`/api/v1/workflow/${instanceUuid}/async`, {
      method: 'POST',
      body: payload,
    }))
  },
  async debugNode(instanceUuid, nodeId, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/nodes/${nodeId}/debug`, {
      method: 'POST',
      body: payload,
    }))
  },
  async validate(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<{ is_valid: boolean; errors: string[] }>>(`/api/v1/workflow/${instanceUuid}/validate`, {
      method: 'POST',
    }))
  },
  async listRuns(instanceUuid, limit = 20) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunSummaryRead[]>>(`/api/v1/workflow/${instanceUuid}/runs`, {
      query: { limit },
    }))
  },
  async getRun(runId) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowRunRead>>(`/api/v1/workflow/runs/${runId}`))
  },
  async listRunEvents(runId, limit = 1000) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowEventRead[]>>(`/api/v1/workflow/runs/${runId}/events`, {
      query: { limit },
    }))
  },
  async cancelRun(runId) {
    return unwrap(await context.transport.request<JsonResponse<{ run_id: string; accepted: boolean; local_cancelled: boolean }>>(`/api/v1/workflow/runs/${runId}/cancel`, {
      method: 'POST',
    }))
  },
})
