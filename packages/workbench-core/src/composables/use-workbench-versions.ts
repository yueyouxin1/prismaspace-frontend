import { computed, shallowRef, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface WorkbenchVersionItem {
  uuid: string
  versionTag: string
  status: string
  createdAt: string
}

export interface WorkbenchVersionsService<TItem extends WorkbenchVersionItem> {
  list: (resourceUuid: string) => Promise<TItem[]>
}

export interface UseWorkbenchVersionsOptions<TItem extends WorkbenchVersionItem> {
  resourceUuid: MaybeRefOrGetter<string | null | undefined>
  service: WorkbenchVersionsService<TItem>
  enabled?: MaybeRefOrGetter<boolean>
}

export interface WorkbenchVersionsController<TItem extends WorkbenchVersionItem> {
  items: Ref<TItem[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  workspaceVersion: ComputedRef<TItem | null>
  latestPublishedVersion: ComputedRef<TItem | null>
  refresh: () => Promise<void>
}

const isPublished = (status: string): boolean => status.toLowerCase() === 'published'
const isWorkspace = (status: string): boolean => status.toLowerCase() === 'workspace'

export const useWorkbenchVersions = <TItem extends WorkbenchVersionItem>(
  options: UseWorkbenchVersionsOptions<TItem>,
): WorkbenchVersionsController<TItem> => {
  const { t } = useI18n()
  const items = shallowRef<TItem[]>([])
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const enabled = computed(() => toValue(options.enabled) ?? true)

  const refresh = async (): Promise<void> => {
    const resourceUuid = toValue(options.resourceUuid)
    if (!enabled.value || !resourceUuid) {
      items.value = []
      return
    }

    loading.value = true
    error.value = null
    try {
      items.value = await options.service.list(resourceUuid)
    } catch (err) {
      items.value = []
      error.value = err instanceof Error ? err.message : t('platform.workbench.core.versions.loadFailed')
    } finally {
      loading.value = false
    }
  }

  watch(
    [() => toValue(options.resourceUuid), enabled],
    () => {
      void refresh()
    },
    { immediate: true },
  )

  const workspaceVersion = computed(() => items.value.find((item) => isWorkspace(item.status)) ?? null)
  const latestPublishedVersion = computed(() => {
    return items.value.find((item) => isPublished(item.status)) ?? null
  })

  return {
    items,
    loading,
    error,
    workspaceVersion,
    latestPublishedVersion,
    refresh,
  }
}
