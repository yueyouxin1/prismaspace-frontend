# @prismaspace/asset-hub

统一资产库能力包。

适用场景：

- 文件上传
- 文件选择
- 素材管理面板
- 工作台内嵌资产选择

## 公开导出

- `AssetPickerDialog`
- `AssetManagerPanel`
- `useAssetUploader`
- `AssetHubAdapter` 与相关类型

## 集成方式

此包通过 `adapter` 接入宿主的实际资产服务：

```ts
import type { AssetHubAdapter } from '@prismaspace/asset-hub'

const adapter: AssetHubAdapter = {
  createUploadTicket: async () => { /* ... */ },
  confirmUpload: async () => { /* ... */ },
  listAssets: async () => { /* ... */ },
  getAsset: async () => { /* ... */ },
  patchAsset: async () => { /* ... */ },
  deleteAsset: async () => { /* ... */ },
  createFolder: async () => { /* ... */ },
  listFolders: async () => { /* ... */ },
  listFolderTree: async () => { /* ... */ },
  patchFolder: async () => { /* ... */ },
  deleteFolder: async () => { /* ... */ },
}
```

## 备注

- 包本身不持有业务后端地址
- 所有资产操作都要求宿主显式提供 adapter
