# @repo/workbench-core

Shared primitives and types for immersive resource workbenches.

## WorkbenchSurface

`WorkbenchSurface` is the unified workbench container:
- unified header (`left` / `center` / `right` slots)
- base actions (`run` / `save` / `publish`)
- extra actions (`extraActions`) with default `more` placement
- autosave orchestration (`autosave` + `saveHandler`)

### Props (core)

- `runAction` / `saveAction` / `publishAction`
  - `visible`
  - `label`
  - `loadingLabel`
  - `disabled`
  - `loading`
- `extraActions[]`
  - `key`, `label`, `loadingLabel`, `icon`, `disabled`, `loading`, `placement: 'oneline' | 'more'`
- `autosave`
  - `enabled`
  - `debounceMs`
  - `canAutosave`
  - `isDirty`
- `saveHandler(trigger)`
  - `trigger: 'manual' | 'autosave'`

### Emits

- `back`
- `run`
- `save`
- `publish`
- `action` (extra action key)

## Examples

- Save only (without run): [`examples/save-only.example.vue`](./examples/save-only.example.vue)
- Run label overridden to "查询": [`examples/run-label-query.example.vue`](./examples/run-label-query.example.vue)
