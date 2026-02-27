import { assetApi } from '@app/services/api/asset-client'
import type { AssetHubAdapter } from '@repo/asset-hub'

export const studioAssetHubAdapter: AssetHubAdapter = {
  createUploadTicket: (workspaceUuid, payload) => assetApi.createUploadTicket(workspaceUuid, payload),
  confirmUpload: (payload) => assetApi.confirmUpload(payload),
  listAssets: (query) => assetApi.listAssets(query),
  getAsset: (assetUuid) => assetApi.getAsset(assetUuid),
  patchAsset: (assetUuid, payload) => assetApi.patchAsset(assetUuid, payload),
  deleteAsset: (assetUuid) => assetApi.deleteAsset(assetUuid),
  createFolder: (workspaceUuid, payload) => assetApi.createFolder(workspaceUuid, payload),
  listFolders: (workspaceUuid, parentUuid) => assetApi.listFolders(workspaceUuid, parentUuid),
  listFolderTree: (workspaceUuid) => assetApi.listFolderTree(workspaceUuid),
  patchFolder: (folderUuid, payload) => assetApi.patchFolder(folderUuid, payload),
  deleteFolder: (folderUuid) => assetApi.deleteFolder(folderUuid),
}
