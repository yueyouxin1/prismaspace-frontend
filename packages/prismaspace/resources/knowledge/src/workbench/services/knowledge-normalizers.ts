import type {
  KnowledgeChunkItem,
  KnowledgeChunkStatus,
  KnowledgeDocumentItem,
  KnowledgeDocumentStatus,
  KnowledgeSourceType,
} from '../types/knowledge-ide'

const normalizeStatus = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim().toLowerCase()
  return normalized || fallback
}

export const normalizeDocumentStatus = (value: unknown): KnowledgeDocumentStatus => {
  const normalized = normalizeStatus(value, 'pending')
  if (normalized === 'pending' || normalized === 'uploading' || normalized === 'processing' || normalized === 'completed' || normalized === 'failed') {
    return normalized
  }
  return normalized
}

export const normalizeChunkStatus = (value: unknown): KnowledgeChunkStatus => {
  const normalized = normalizeStatus(value, 'completed')
  if (normalized === 'pending' || normalized === 'completed' || normalized === 'failed') {
    return normalized
  }
  return normalized
}

export const detectKnowledgeSourceType = (input: { source_uri?: string | null; file_name?: string | null }): KnowledgeSourceType => {
  const uri = String(input.source_uri || '').toLowerCase()
  const fileName = String(input.file_name || '').toLowerCase()
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    if (uri.includes('/web/') || uri.includes('html') || uri.includes('page=')) {
      return 'web'
    }
    return 'uri'
  }
  if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return 'local'
  }
  return 'local'
}

export const normalizeDocumentItem = (input: Partial<KnowledgeDocumentItem>): KnowledgeDocumentItem => {
  return {
    uuid: String(input.uuid || ''),
    file_name: String(input.file_name || 'Untitled'),
    source_uri: String(input.source_uri || ''),
    file_type: input.file_type ?? null,
    file_size: typeof input.file_size === 'number' ? input.file_size : null,
    status: normalizeDocumentStatus(input.status),
    error_message: input.error_message ?? null,
    chunk_count: typeof input.chunk_count === 'number' ? input.chunk_count : 0,
    created_at: String(input.created_at || new Date().toISOString()),
  }
}

export const normalizeChunkItem = (input: Partial<KnowledgeChunkItem>): KnowledgeChunkItem => {
  const content = String(input.content || '')
  return {
    uuid: String(input.uuid || ''),
    content,
    token_count: typeof input.token_count === 'number' && Number.isFinite(input.token_count)
      ? Math.max(0, Math.round(input.token_count))
      : content.length,
    status: normalizeChunkStatus(input.status),
    error_message: input.error_message ?? null,
    context: input.context ?? null,
    payload: input.payload ?? null,
  }
}
