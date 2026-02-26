import { apiRequest } from '@app/services/api/api-client'
import { executionApi } from '@app/services/api/execution-client'
import { connectApiSseStream } from '@app/services/http/sse'
import type {
  BatchChunkUpdateRequest,
  DocumentCreateRequest,
  DocumentRead,
  DocumentTaskProgressRead,
  DocumentUpdateRequest,
  DocumentProcessingStatus,
  JsonRecord,
  JsonResponse,
  KnowledgeBaseExecutionRequest,
  KnowledgeBaseExecutionResponse,
  KnowledgeBaseInstanceRead,
  KnowledgeBaseInstanceUpdateRequest,
  PaginatedDocumentsRead,
} from '@app/services/api/contracts'
import type { SseConnection } from '@repo/common'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface KnowledgeListDocumentFilters {
  status?: DocumentProcessingStatus | 'all'
  keyword?: string
}

export interface KnowledgeTaskProgressHandlers {
  onProgress?: (progress: DocumentTaskProgressRead) => void
  onPing?: () => void
  onServerError?: (message: string) => void
  onError?: (error: unknown) => void
}

const parseJson = <T>(raw: string): T | null => {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const knowledgeApi = {
  async listDocuments(
    instanceUuid: string,
    page = 1,
    limit = 20,
    filters: KnowledgeListDocumentFilters = {},
  ): Promise<PaginatedDocumentsRead> {
    const response = await apiRequest<JsonResponse<PaginatedDocumentsRead>>(`/api/v1/knowledge/${instanceUuid}/documents`, {
      query: {
        page,
        limit,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        keyword: filters.keyword?.trim() || undefined,
      },
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

  async updateDocument(
    instanceUuid: string,
    documentUuid: string,
    payload: DocumentUpdateRequest,
  ): Promise<DocumentRead> {
    const response = await apiRequest<JsonResponse<DocumentRead>>(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async updateChunks(instanceUuid: string, payload: BatchChunkUpdateRequest): Promise<JsonRecord> {
    const response = await apiRequest<JsonResponse<JsonRecord>>(`/api/v1/knowledge/${instanceUuid}/chunks`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async removeDocument(instanceUuid: string, documentUuid: string): Promise<void> {
    await apiRequest(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}`, {
      method: 'DELETE',
    })
  },

  async getInstance(instanceUuid: string): Promise<KnowledgeBaseInstanceRead> {
    const response = await apiRequest<JsonResponse<KnowledgeBaseInstanceRead>>(`/api/v1/instances/${instanceUuid}`)
    return unwrap(response)
  },

  async updateInstance(
    instanceUuid: string,
    payload: KnowledgeBaseInstanceUpdateRequest,
  ): Promise<KnowledgeBaseInstanceRead> {
    const response = await apiRequest<JsonResponse<KnowledgeBaseInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    })
    return unwrap(response)
  },

  async execute(
    instanceUuid: string,
    payload: KnowledgeBaseExecutionRequest,
  ): Promise<KnowledgeBaseExecutionResponse> {
    return executionApi.executeKnowledgeInstance(instanceUuid, payload)
  },

  async subscribeTaskProgress(taskId: string, handlers: KnowledgeTaskProgressHandlers = {}): Promise<SseConnection> {
    return connectApiSseStream({
      path: `/api/v1/knowledge/tasks/${taskId}/progress`,
      method: 'GET',
      autoReconnect: false,
      onEvent: (event) => {
        if (event.event === 'ping') {
          handlers.onPing?.()
          return
        }

        if (event.event === 'error') {
          const payload = parseJson<{ message?: string }>(event.data)
          handlers.onServerError?.(payload?.message || 'Knowledge task stream error.')
          return
        }

        if (event.event === 'progress' || !event.event) {
          const progress = parseJson<DocumentTaskProgressRead>(event.data)
          if (!progress) {
            handlers.onError?.(new Error('Failed to parse knowledge task progress payload.'))
            return
          }
          handlers.onProgress?.(progress)
        }
      },
      onError: (error) => {
        handlers.onError?.(error)
      },
    })
  },
}
