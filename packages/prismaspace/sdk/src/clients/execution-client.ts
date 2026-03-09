import type {
  JsonResponse,
  JsonRecord,
  KnowledgeBaseExecutionRequest,
  KnowledgeBaseExecutionResponse,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface ExecutionClient {
  executeInstance: (instanceUuid: string, payload: JsonRecord) => Promise<JsonRecord>
  executeKnowledgeInstance: (instanceUuid: string, payload: KnowledgeBaseExecutionRequest) => Promise<KnowledgeBaseExecutionResponse>
}

export const createExecutionClient = (context: SdkContext): ExecutionClient => ({
  async executeInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<JsonRecord>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    }))
  },
  async executeKnowledgeInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<KnowledgeBaseExecutionResponse>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    }))
  },
})
