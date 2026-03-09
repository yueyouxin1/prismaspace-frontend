import type {
  JsonResponse,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowNodeDefRead,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface WorkflowClient {
  listNodeDefinitions: () => Promise<WorkflowNodeDefRead[]>
  execute: (instanceUuid: string, payload: WorkflowExecutionRequest) => Promise<WorkflowExecutionResponse>
  validate: (instanceUuid: string) => Promise<{ is_valid: boolean; errors: string[] }>
}

export const createWorkflowClient = (context: SdkContext): WorkflowClient => ({
  async listNodeDefinitions() {
    return unwrap(await context.transport.request<JsonResponse<WorkflowNodeDefRead[]>>('/api/v1/workflow/nodes'))
  },
  async execute(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<WorkflowExecutionResponse>>(`/api/v1/workflow/${instanceUuid}/execute`, {
      method: 'POST',
      body: payload,
    }))
  },
  async validate(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<{ is_valid: boolean; errors: string[] }>>(`/api/v1/workflow/${instanceUuid}/validate`, {
      method: 'POST',
    }))
  },
})
