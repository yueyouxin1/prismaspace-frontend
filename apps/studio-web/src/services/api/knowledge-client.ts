import { apiRequest } from '@app/services/api/api-client'
import type {
  DocumentCreateRequest,
  DocumentRead,
  JsonResponse,
  PaginatedDocumentsRead,
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const knowledgeApi = {
  async listDocuments(instanceUuid: string, page = 1, limit = 20): Promise<PaginatedDocumentsRead> {
    const response = await apiRequest<JsonResponse<PaginatedDocumentsRead>>(`/api/v1/knowledge/${instanceUuid}/documents`, {
      query: { page, limit },
    })
    return unwrap(response)
  },

  async addDocument(instanceUuid: string, payload: DocumentCreateRequest): Promise<DocumentRead> {
    const response = await apiRequest<JsonResponse<DocumentRead>>(`/api/v1/knowledge/${instanceUuid}/documents`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async removeDocument(instanceUuid: string, documentUuid: string): Promise<void> {
    await apiRequest(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}`, {
      method: 'DELETE',
    })
  },
}
