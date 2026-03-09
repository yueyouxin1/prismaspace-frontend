import { connectSseStream, type SseConnection } from '@prismaspace/common'
import type {
  BatchChunkUpdateRequest,
  DocumentCreateRequest,
  DocumentProcessingStatus,
  DocumentRead,
  DocumentTaskProgressRead,
  DocumentUpdateRequest,
  JsonRecord,
  JsonResponse,
  KnowledgeBaseExecutionRequest,
  KnowledgeBaseExecutionResponse,
  KnowledgeBaseInstanceRead,
  KnowledgeBaseInstanceUpdateRequest,
  PaginatedDocumentChunksRead,
  PaginatedDocumentsRead,
} from '@prismaspace/contracts'
import type { ExecutionClient } from './execution-client'
import type { SdkContext } from './types'

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

export interface KnowledgeClient {
  listDocuments: (instanceUuid: string, page?: number, limit?: number, filters?: KnowledgeListDocumentFilters) => Promise<PaginatedDocumentsRead>
  addDocument: (instanceUuid: string, payload: DocumentCreateRequest) => Promise<DocumentRead>
  listDocumentChunks: (instanceUuid: string, documentUuid: string, page?: number, limit?: number) => Promise<PaginatedDocumentChunksRead>
  updateDocument: (instanceUuid: string, documentUuid: string, payload: DocumentUpdateRequest) => Promise<DocumentRead>
  updateChunks: (instanceUuid: string, payload: BatchChunkUpdateRequest) => Promise<JsonRecord>
  removeDocument: (instanceUuid: string, documentUuid: string) => Promise<void>
  getInstance: (instanceUuid: string) => Promise<KnowledgeBaseInstanceRead>
  updateInstance: (instanceUuid: string, payload: KnowledgeBaseInstanceUpdateRequest) => Promise<KnowledgeBaseInstanceRead>
  execute: (instanceUuid: string, payload: KnowledgeBaseExecutionRequest) => Promise<KnowledgeBaseExecutionResponse>
  subscribeTaskProgress: (taskId: string, handlers?: KnowledgeTaskProgressHandlers) => Promise<SseConnection>
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

export const createKnowledgeClient = (context: SdkContext, executionClient: ExecutionClient): KnowledgeClient => ({
  async listDocuments(instanceUuid, page = 1, limit = 20, filters = {}) {
    return unwrap(await context.transport.request<JsonResponse<PaginatedDocumentsRead>>(`/api/v1/knowledge/${instanceUuid}/documents`, {
      query: {
        page,
        limit,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        keyword: filters.keyword?.trim() || undefined,
      },
    }))
  },
  async addDocument(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<DocumentRead>>(`/api/v1/knowledge/${instanceUuid}/documents`, {
      method: 'POST',
      body: payload,
    }))
  },
  async listDocumentChunks(instanceUuid, documentUuid, page = 1, limit = 200) {
    return unwrap(await context.transport.request<JsonResponse<PaginatedDocumentChunksRead>>(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}/chunks`, {
      query: { page, limit },
    }))
  },
  async updateDocument(instanceUuid, documentUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<DocumentRead>>(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async updateChunks(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<JsonRecord>>(`/api/v1/knowledge/${instanceUuid}/chunks`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async removeDocument(instanceUuid, documentUuid) {
    await context.transport.request(`/api/v1/knowledge/${instanceUuid}/documents/${documentUuid}`, {
      method: 'DELETE',
    })
  },
  async getInstance(instanceUuid) {
    return unwrap(await context.transport.request<JsonResponse<KnowledgeBaseInstanceRead>>(`/api/v1/instances/${instanceUuid}`))
  },
  async updateInstance(instanceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<KnowledgeBaseInstanceRead>>(`/api/v1/instances/${instanceUuid}`, {
      method: 'PUT',
      body: payload,
    }))
  },
  async execute(instanceUuid, payload) {
    return executionClient.executeKnowledgeInstance(instanceUuid, payload)
  },
  async subscribeTaskProgress(taskId, handlers = {}) {
    return connectSseStream({
      url: context.transport.buildUrl(`/api/v1/knowledge/tasks/${taskId}/progress`),
      method: 'GET',
      headers: context.transport.buildHeaders(),
      fetcher: context.transport.fetchImpl,
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
})
