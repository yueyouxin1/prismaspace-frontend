# Asset Library Boundary

## Positioning
- Asset Library is the unified upload infrastructure and lifecycle management center for files.
- Asset Library is **not** part of Resource system.
- Asset Library does **not** belong to `studio/workbench` route host.

## Responsibilities
- Provide a unified upload chain for all frontend uploads:
  - `ticket -> direct upload -> confirm`
- Provide reusable upload/pick capabilities through `@repo/asset-hub`:
  - `useAssetUploader`
  - `AssetPickerDialog`
- Provide independent management panel:
  - `AssetManagerPanel`
  - folder tree management, list, batch operation, inspector.

## Non-Responsibilities
- Do not host resource-specific workbench UI.
- Do not carry Resource instance semantics.
- Do not share route/container with Resource Workbench host.

## Integration Rules
- Any business module needing file upload must use Asset Library chain and adapter.
- Knowledge module supports dual source modes:
  - Local upload/pick from Asset Library (default)
  - Direct remote URL (`source_uri`)
- Workspace context is required for all asset operations.

## Routing Rules
- Platform route: `/assets`
- Sidebar primary navigation includes "素材库 / Asset Library".
- Resource Workbench routes remain resource-only.
