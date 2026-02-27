export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'other' | string
export type AssetStatus = 'pending' | 'active' | 'archived' | string

export interface AssetUploadTicket {
  asset_uuid: string
  upload_url: string
  form_data: Record<string, unknown>
  provider: string
  upload_key: string
  folder_uuid?: string | null
}

export interface AssetCreateTicketRequest {
  filename: string
  size_bytes: number
  mime_type: string
  folder_uuid?: string | null
  folder_id?: number | null
}

export interface AssetConfirmRequest {
  workspace_uuid: string
  asset_uuid: string
  upload_key: string
  name?: string
  folder_uuid?: string | null
  folder_id?: number | null
  force_ai_processing?: boolean
}

export interface AssetUpdateRequest {
  name?: string
  folder_uuid?: string | null
  folder_id?: number | null
}

export interface AssetQuery {
  workspace_uuid: string
  folder_uuid?: string | null
  folder_id?: number | null
  include_subfolders?: boolean
  type?: AssetType
  keyword?: string
  page?: number
  limit?: number
}

export interface AssetRead {
  uuid: string
  name: string
  url: string
  size: number
  type: AssetType
  status: AssetStatus
  created_at: string
  updated_at: string
  mime_type?: string | null
  folder_uuid?: string | null
  folder_id?: number | null
  ai_status?: string | null
  ai_meta?: Record<string, unknown> | null
}

export interface PaginatedAssetsRead {
  items: AssetRead[]
  total: number
  page: number
  limit: number
}

export interface AssetFolderCreateRequest {
  name: string
  parent_uuid?: string | null
  parent_id?: number | null
}

export interface AssetFolderUpdateRequest {
  name?: string
  parent_uuid?: string | null
  parent_id?: number | null
}

export interface AssetFolderRead {
  id: number
  uuid: string
  name: string
  parent_uuid?: string | null
  parent_id?: number | null
  created_at: string
}

export interface AssetFolderTreeNodeRead extends AssetFolderRead {
  children: AssetFolderTreeNodeRead[]
}

export interface AssetHubAdapter {
  createUploadTicket(workspaceUuid: string, payload: AssetCreateTicketRequest): Promise<AssetUploadTicket>
  confirmUpload(payload: AssetConfirmRequest): Promise<AssetRead>
  listAssets(query: AssetQuery): Promise<PaginatedAssetsRead>
  getAsset(assetUuid: string): Promise<AssetRead>
  patchAsset(assetUuid: string, payload: AssetUpdateRequest): Promise<AssetRead>
  deleteAsset(assetUuid: string): Promise<void>

  createFolder(workspaceUuid: string, payload: AssetFolderCreateRequest): Promise<AssetFolderRead>
  listFolders(workspaceUuid: string, parentUuid?: string | null): Promise<AssetFolderRead[]>
  listFolderTree(workspaceUuid: string): Promise<AssetFolderTreeNodeRead[]>
  patchFolder(folderUuid: string, payload: AssetFolderUpdateRequest): Promise<AssetFolderRead>
  deleteFolder(folderUuid: string): Promise<void>
}

export type UploadPhase = 'ticket' | 'uploading' | 'confirm'

export interface HttpBusinessLikeError {
  status: number
  code: string
  message: string
  actionText?: string
}

export interface AssetUploadError extends HttpBusinessLikeError {
  phase: UploadPhase
  cause?: unknown
}

export interface UploadTask {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'confirming' | 'success' | 'failed' | 'cancelled'
  progress: number
  result?: AssetRead
  error?: AssetUploadError
  abortController?: AbortController
}
