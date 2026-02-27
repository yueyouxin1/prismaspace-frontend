import { apiRequest } from '@app/services/api/api-client'
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
} from '@app/services/api/contracts'

const unwrap = <T>(response: JsonResponse<T>): T => response.data

export const assetApi = {
  async createUploadTicket(workspaceUuid: string, payload: AssetCreateTicketRequest): Promise<AssetUploadTicketRead> {
    const response = await apiRequest<JsonResponse<AssetUploadTicketRead>>(
      `/api/v1/assets/upload/ticket?workspace_uuid=${workspaceUuid}`,
      {
        method: 'POST',
        body: payload,
      },
    )
    return unwrap(response)
  },

  async confirmUpload(payload: AssetConfirmRequest): Promise<AssetRead> {
    const response = await apiRequest<JsonResponse<AssetRead>>('/api/v1/assets/upload/confirm', {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async listAssets(query: AssetQuery): Promise<PaginatedAssetsRead> {
    const response = await apiRequest<JsonResponse<PaginatedAssetsRead>>('/api/v1/assets', {
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
    })
    return unwrap(response)
  },

  async getAsset(assetUuid: string): Promise<AssetRead> {
    const response = await apiRequest<JsonResponse<AssetRead>>(`/api/v1/assets/${assetUuid}`)
    return unwrap(response)
  },

  async patchAsset(assetUuid: string, payload: AssetUpdateRequest): Promise<AssetRead> {
    const response = await apiRequest<JsonResponse<AssetRead>>(`/api/v1/assets/${assetUuid}`, {
      method: 'PATCH',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteAsset(assetUuid: string): Promise<void> {
    await apiRequest(`/api/v1/assets/${assetUuid}`, {
      method: 'DELETE',
    })
  },

  async createFolder(workspaceUuid: string, payload: AssetFolderCreateRequest): Promise<AssetFolderRead> {
    const response = await apiRequest<JsonResponse<AssetFolderRead>>(`/api/v1/assets/folders?workspace_uuid=${workspaceUuid}`, {
      method: 'POST',
      body: payload,
    })
    return unwrap(response)
  },

  async listFolders(workspaceUuid: string, parentUuid?: string | null): Promise<AssetFolderRead[]> {
    const response = await apiRequest<JsonResponse<AssetFolderRead[]>>('/api/v1/assets/folders', {
      query: {
        workspace_uuid: workspaceUuid,
        parent_uuid: parentUuid ?? undefined,
      },
    })
    return unwrap(response)
  },

  async listFolderTree(workspaceUuid: string): Promise<AssetFolderTreeNodeRead[]> {
    const response = await apiRequest<JsonResponse<AssetFolderTreeNodeRead[]>>('/api/v1/assets/folders/tree', {
      query: {
        workspace_uuid: workspaceUuid,
      },
    })
    return unwrap(response)
  },

  async patchFolder(folderUuid: string, payload: AssetFolderUpdateRequest): Promise<AssetFolderRead> {
    const response = await apiRequest<JsonResponse<AssetFolderRead>>(`/api/v1/assets/folders/${folderUuid}`, {
      method: 'PATCH',
      body: payload,
    })
    return unwrap(response)
  },

  async deleteFolder(folderUuid: string): Promise<void> {
    await apiRequest(`/api/v1/assets/folders/${folderUuid}`, {
      method: 'DELETE',
    })
  },
}
