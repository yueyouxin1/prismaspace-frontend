# Resource Workbench Host/Package Boundary

## Host Responsibilities (`apps/studio-web/src/views/workbench/ResourceWorkbenchView.vue`)
- Work only as route container and package host.
- Resolve canonical workspace path from route + access scope.
- Load resource detail and decide target public package by `resource_type`.
- Pass stable explicit props into public workbench package:
  - `workspaceUuid`
  - `projectUuid` (optional, from route query)
  - `resourceUuid`
  - `workspaceInstanceUuid`
  - `latestPublishedInstanceUuid`
  - `client`
  - `onBack`
  - `onError`
- Render resource package entry component by `resource_type`.

## Host Forbidden Responsibilities
- No fixed top navigation/tabs.
- No fixed versions/metadata side panels.
- No fixed footer status bar.
- No resource-specific UI composition.
- No resource-specific query/mutation/save/run/publish orchestration.
- No hidden context bridge such as `useResourceWorkbenchContext`.

## Resource Package Responsibilities
- Each resource package owns its complete workbench UI and interaction model.
- Consume explicit props and the unified PrismaSpace client.
- Reuse non-UI capabilities when needed:
  - `useWorkbenchAutosave`
  - `useWorkbenchVersions`
  - `useWorkbenchRefs`
- Never require host visual shell to function.
- Must be mountable by any external Vue project, not only `studio-web`.

## Non-UI Shared Capability Rule
- Shared logic must remain headless (no visual rendering).
- Shared logic should expose minimal composable/service interface.
- UI layout decisions stay in resource package layer.

## Unified Header And Container Boundary
- `WorkbenchSurface` is the standard workbench container across resource packages.
- Header layout is fixed to `left` / `center` / `right` slots.
- Header must not show raw UUID/debug metadata by default.
- Base actions are standardized as `run` / `save` / `publish`.
- Extra actions should default to `More` menu unless explicitly marked `oneline`.
- `WorkbenchSurface` only orchestrates action dispatch and autosave timing.
- Resource packages own save payload construction, API calls, success/error handling, and dirty state updates.
