import type {
  AssetConfirmRequest,
  AssetCreateTicketRequest,
  AssetFolderCreateRequest,
  AssetFolderRead,
  AssetFolderTreeNodeRead,
  AssetFolderUpdateRequest,
  AssetQuery,
  AssetRead,
  AssetUpdateRequest,
  AssetUploadTicketRead,
  JsonResponse,
  PaginatedAssetsRead,
} from '@prismaspace/contracts'
import type { SdkContext } from './types'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export interface AssetClient {
  createUploadTicket: (workspaceUuid: string, payload: AssetCreateTicketRequest) => Promise<AssetUploadTicketRead>
  confirmUpload: (payload: AssetConfirmRequest) => Promise<AssetRead>
  listAssets: (query: AssetQuery) => Promise<PaginatedAssetsRead>
  getAsset: (assetUuid: string) => Promise<AssetRead>
  patchAsset: (assetUuid: string, payload: AssetUpdateRequest) => Promise<AssetRead>
  deleteAsset: (assetUuid: string) => Promise<void>
  createFolder: (workspaceUuid: string, payload: AssetFolderCreateRequest) => Promise<AssetFolderRead>
  listFolders: (workspaceUuid: string, parentUuid?: string | null) => Promise<AssetFolderRead[]>
  listFolderTree: (workspaceUuid: string) => Promise<AssetFolderTreeNodeRead[]>
  patchFolder: (folderUuid: string, payload: AssetFolderUpdateRequest) => Promise<AssetFolderRead>
  deleteFolder: (folderUuid: string) => Promise<void>
}

export const createAssetClient = (context: SdkContext): AssetClient => ({
  async createUploadTicket(workspaceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AssetUploadTicketRead>>('/api/v1/assets/upload/ticket', {
      method: 'POST',
      query: { workspace_uuid: workspaceUuid },
      body: payload,
    }))
  },
  async confirmUpload(payload) {
    return unwrap(await context.transport.request<JsonResponse<AssetRead>>('/api/v1/assets/upload/confirm', {
      method: 'POST',
      body: payload,
    }))
  },
  async listAssets(query) {
    return unwrap(await context.transport.request<JsonResponse<PaginatedAssetsRead>>('/api/v1/assets', {
      query: {
        workspace_uuid: query.workspace_uuid,
        folder_uuid: query.folder_uuid ?? undefined,
        folder_id: query.folder_id ?? undefined,
        include_subfolders: query.include_subfolders ?? undefined,
        type: query.type ?? undefined,
        keyword: query.keyword?.trim() || undefined,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    }))
  },
  async getAsset(assetUuid) {
    return unwrap(await context.transport.request<JsonResponse<AssetRead>>(`/api/v1/assets/${assetUuid}`))
  },
  async patchAsset(assetUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AssetRead>>(`/api/v1/assets/${assetUuid}`, {
      method: 'PATCH',
      body: payload,
    }))
  },
  async deleteAsset(assetUuid) {
    await context.transport.request(`/api/v1/assets/${assetUuid}`, { method: 'DELETE' })
  },
  async createFolder(workspaceUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AssetFolderRead>>('/api/v1/assets/folders', {
      method: 'POST',
      query: { workspace_uuid: workspaceUuid },
      body: payload,
    }))
  },
  async listFolders(workspaceUuid, parentUuid) {
    return unwrap(await context.transport.request<JsonResponse<AssetFolderRead[]>>('/api/v1/assets/folders', {
      query: {
        workspace_uuid: workspaceUuid,
        parent_uuid: parentUuid ?? undefined,
      },
    }))
  },
  async listFolderTree(workspaceUuid) {
    return unwrap(await context.transport.request<JsonResponse<AssetFolderTreeNodeRead[]>>('/api/v1/assets/folders/tree', {
      query: { workspace_uuid: workspaceUuid },
    }))
  },
  async patchFolder(folderUuid, payload) {
    return unwrap(await context.transport.request<JsonResponse<AssetFolderRead>>(`/api/v1/assets/folders/${folderUuid}`, {
      method: 'PATCH',
      body: payload,
    }))
  },
  async deleteFolder(folderUuid) {
    await context.transport.request(`/api/v1/assets/folders/${folderUuid}`, { method: 'DELETE' })
  },
})
