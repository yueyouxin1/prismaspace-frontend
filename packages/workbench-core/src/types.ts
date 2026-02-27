export type SupportedResourceType = 'uiapp' | 'agent' | 'workflow' | 'knowledge' | 'tenantdb' | 'tool'

export interface WorkbenchScaffoldProps {
  title: string
  description: string
  resourceName: string
  updatedAt?: string | null
  resourceType: SupportedResourceType | string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}

export type WorkbenchSaveTrigger = 'manual' | 'autosave'

export interface WorkbenchHeaderActionConfig {
  visible?: boolean
  label?: string
  loadingLabel?: string
  disabled?: boolean
  loading?: boolean
}

export type WorkbenchExtraActionPlacement = 'oneline' | 'more'

export interface WorkbenchExtraAction {
  key: string
  label: string
  loadingLabel?: string
  icon?: unknown
  disabled?: boolean
  loading?: boolean
  placement?: WorkbenchExtraActionPlacement
}

export interface WorkbenchAutosaveConfig {
  enabled?: boolean
  debounceMs?: number
  canAutosave?: boolean
  isDirty?: boolean
}

export interface WorkbenchSurfaceProps extends WorkbenchScaffoldProps {
  saveStatusText?: string
  saveStatusVariant?: 'outline' | 'secondary' | 'destructive' | 'default'
  runAction?: WorkbenchHeaderActionConfig
  saveAction?: WorkbenchHeaderActionConfig
  publishAction?: WorkbenchHeaderActionConfig
  extraActions?: WorkbenchExtraAction[]
  autosave?: WorkbenchAutosaveConfig
  saveHandler?: (trigger: WorkbenchSaveTrigger) => Promise<void> | void
}
