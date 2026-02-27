import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface WorkbenchRefItem {
  id: string | number
  targetInstanceUuid: string
  sourceNodeUuid?: string | null
  alias?: string | null
}

export interface WorkbenchRefsService<TItem extends WorkbenchRefItem, TCreatePayload> {
  list: (instanceUuid: string) => Promise<TItem[]>
  add?: (instanceUuid: string, payload: TCreatePayload) => Promise<TItem>
  remove?: (instanceUuid: string, targetInstanceUuid: string, sourceNodeUuid?: string) => Promise<void>
}

export interface UseWorkbenchRefsOptions<TItem extends WorkbenchRefItem, TCreatePayload> {
  sourceInstanceUuid: MaybeRefOrGetter<string | null | undefined>
  service: WorkbenchRefsService<TItem, TCreatePayload>
  enabled?: MaybeRefOrGetter<boolean>
}

export interface WorkbenchRefsController<TItem extends WorkbenchRefItem, TCreatePayload> {
  items: Ref<TItem[]>
  loading: Ref<boolean>
  submitting: Ref<boolean>
  error: Ref<string | null>
  refresh: () => Promise<void>
  addRef: (payload: TCreatePayload) => Promise<TItem | null>
  removeRef: (targetInstanceUuid: string, sourceNodeUuid?: string) => Promise<void>
}

export const useWorkbenchRefs = <TItem extends WorkbenchRefItem, TCreatePayload>(
  options: UseWorkbenchRefsOptions<TItem, TCreatePayload>,
): WorkbenchRefsController<TItem, TCreatePayload> => {
  const { t } = useI18n()
  const items = shallowRef<TItem[]>([])
  const loading = shallowRef(false)
  const submitting = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const enabled = computed(() => toValue(options.enabled) ?? true)

  const refresh = async (): Promise<void> => {
    const sourceInstanceUuid = toValue(options.sourceInstanceUuid)
    if (!enabled.value || !sourceInstanceUuid) {
      items.value = []
      return
    }

    loading.value = true
    error.value = null
    try {
      items.value = await options.service.list(sourceInstanceUuid)
    } catch (err) {
      items.value = []
      error.value = err instanceof Error ? err.message : t('platform.workbench.core.refs.loadFailed')
    } finally {
      loading.value = false
    }
  }

  const addRef = async (payload: TCreatePayload): Promise<TItem | null> => {
    const sourceInstanceUuid = toValue(options.sourceInstanceUuid)
    if (!enabled.value || !sourceInstanceUuid || !options.service.add) {
      return null
    }

    submitting.value = true
    error.value = null
    try {
      const created = await options.service.add(sourceInstanceUuid, payload)
      items.value = [created, ...items.value]
      return created
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('platform.workbench.core.refs.addFailed')
      return null
    } finally {
      submitting.value = false
    }
  }

  const removeRef = async (targetInstanceUuid: string, sourceNodeUuid?: string): Promise<void> => {
    const sourceInstanceUuid = toValue(options.sourceInstanceUuid)
    if (!enabled.value || !sourceInstanceUuid || !options.service.remove) {
      return
    }

    submitting.value = true
    error.value = null
    try {
      await options.service.remove(sourceInstanceUuid, targetInstanceUuid, sourceNodeUuid)
      items.value = items.value.filter((item) => {
        if (item.targetInstanceUuid !== targetInstanceUuid) {
          return true
        }
        if (sourceNodeUuid) {
          return item.sourceNodeUuid !== sourceNodeUuid
        }
        return false
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('platform.workbench.core.refs.removeFailed')
    } finally {
      submitting.value = false
    }
  }

  watch(
    [() => toValue(options.sourceInstanceUuid), enabled],
    () => {
      void refresh()
    },
    { immediate: true },
  )

  return {
    items,
    loading,
    submitting,
    error,
    refresh,
    addRef,
    removeRef,
  }
}
