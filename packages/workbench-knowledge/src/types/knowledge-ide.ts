export type KnowledgeDocumentStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | string

export interface KnowledgeDocumentItem {
  uuid: string
  file_name: string
  source_uri: string
  file_type?: string | null
  file_size?: number | null
  status: KnowledgeDocumentStatus
  error_message?: string | null
  chunk_count: number
  created_at: string
}

export interface KnowledgeTaskProgress {
  status: KnowledgeDocumentStatus
  message: string
  progress: number
  total: number
  error?: string | null
}

export interface KnowledgeDocumentSourcePayload {
  sourceUri: string
  fileName?: string
}

export interface KnowledgeDocumentReplacePayload {
  documentUuid: string
  sourceUri: string
  fileName?: string
}

export interface KnowledgeExplorerSummary {
  total: number
  processing: number
  failed: number
}

export type KnowledgeSearchStrategy = 'keyword' | 'semantic' | 'hybrid'

export interface KnowledgeRagConfig {
  max_recall_num: number
  min_match_score: number
  search_strategy: KnowledgeSearchStrategy
  query_rewrite: boolean
  result_rerank: boolean
}

export interface KnowledgeSearchRequest {
  query: string
  config: KnowledgeRagConfig
}

export interface KnowledgeSearchResultChunk {
  uuid: string
  content: string
  score: number
  context?: Record<string, unknown> | null
}

export interface KnowledgeSearchResult {
  instance_uuid: string
  chunks: KnowledgeSearchResultChunk[]
}

export interface ParserPolicyConfig {
  parser_name: string
  allowed_mime_types: string[]
  params: Record<string, unknown>
}

export interface ChunkerPolicyConfig {
  chunker_name: string
  params: Record<string, unknown>
}

export interface KnowledgeInstanceConfig {
  parser_policy?: ParserPolicyConfig | null
  chunker_policies: ChunkerPolicyConfig[]
}
