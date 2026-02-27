# Resource Workbench Host/Package Boundary

## Host Responsibilities (`apps/studio-web/src/views/workbench/ResourceWorkbenchView.vue`)
- Work only as route container and context bridge.
- Resolve canonical workspace path from route + access scope.
- Load resource detail and bridge core context:
  - `workspaceUuid`
  - `projectUuid` (optional, from route query)
  - `resourceUuid`
  - `panel`
  - `workspaceInstanceUuid`
  - `latestPublishedInstanceUuid`
  - `workspaceInstance`
- Provide context via `useResourceWorkbenchContext`.
- Render resource package entry component by `resource_type`.

## Host Forbidden Responsibilities
- No fixed top navigation/tabs.
- No fixed versions/metadata side panels.
- No fixed footer status bar.
- No resource-specific UI composition.

## Resource Package Responsibilities
- Each resource package owns its complete workbench UI and interaction model.
- Consume host-bridged context on demand.
- Reuse non-UI capabilities when needed:
  - `useWorkbenchAutosave`
  - `useWorkbenchVersions`
  - `useWorkbenchRefs`
- Never require host visual shell to function.

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
