import { assetClient } from '@app/core/client/prismaspace-client'
import type { AssetHubAdapter } from '@prismaspace/asset-hub'

export const studioAssetHubAdapter: AssetHubAdapter = {
  createUploadTicket: (workspaceUuid, payload) => assetClient.createUploadTicket(workspaceUuid, payload),
  confirmUpload: (payload) => assetClient.confirmUpload(payload),
  listAssets: (query) => assetClient.listAssets(query),
  getAsset: (assetUuid) => assetClient.getAsset(assetUuid),
  patchAsset: (assetUuid, payload) => assetClient.patchAsset(assetUuid, payload),
  deleteAsset: (assetUuid) => assetClient.deleteAsset(assetUuid),
  createFolder: (workspaceUuid, payload) => assetClient.createFolder(workspaceUuid, payload),
  listFolders: (workspaceUuid, parentUuid) => assetClient.listFolders(workspaceUuid, parentUuid),
  listFolderTree: (workspaceUuid) => assetClient.listFolderTree(workspaceUuid),
  patchFolder: (folderUuid, payload) => assetClient.patchFolder(folderUuid, payload),
  deleteFolder: (folderUuid) => assetClient.deleteFolder(folderUuid),
}
