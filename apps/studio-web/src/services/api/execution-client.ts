import { apiRequest } from '@app/services/api/api-client'
import type {
  JsonResponse,
  JsonRecord,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const executionApi = {
  async executeInstance(instanceUuid: string, payload: JsonRecord): Promise<JsonRecord> {
    const response = await apiRequest<JsonResponse<JsonRecord>>(`/api/v1/execute/instances/${instanceUuid}`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },
}
