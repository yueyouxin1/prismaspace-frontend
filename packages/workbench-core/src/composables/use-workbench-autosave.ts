import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref, type WatchStopHandle } from 'vue'

export interface WorkbenchAutosaveOptions<TValue> {
  getCurrent: () => TValue
  save: (value: TValue) => Promise<void>
  serialize?: (value: TValue) => string
  enabled?: MaybeRefOrGetter<boolean>
  debounceMs?: number
}

export interface WorkbenchAutosaveController<TValue> {
  dirty: Ref<boolean>
  saving: Ref<boolean>
  lastError: Ref<string | null>
  lastSavedAt: Ref<string | null>
  flush: () => Promise<void>
  resetBaseline: (value?: TValue) => void
  stop: () => void
}

const defaultSerializer = <TValue>(value: TValue): string => JSON.stringify(value)

export const useWorkbenchAutosave = <TValue>(
  options: WorkbenchAutosaveOptions<TValue>,
): WorkbenchAutosaveController<TValue> => {
  const serialize = options.serialize ?? defaultSerializer<TValue>
  const debounceMs = options.debounceMs ?? 800

  const baselineSnapshot = ref<string | null>(null)
  const currentSnapshot = ref('')
  const dirty = ref(false)
  const saving = ref(false)
  const lastError = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let stopWatching: WatchStopHandle | null = null

  const isEnabled = computed(() => toValue(options.enabled) ?? true)

  const clearTimer = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const resetBaseline = (value?: TValue): void => {
    const snapshot = serialize(value ?? options.getCurrent())
    baselineSnapshot.value = snapshot
    currentSnapshot.value = snapshot
    dirty.value = false
    lastError.value = null
    clearTimer()
  }

  const flush = async (): Promise<void> => {
    if (!isEnabled.value || saving.value || !dirty.value) {
      return
    }

    saving.value = true
    lastError.value = null
    clearTimer()

    try {
      const currentValue = options.getCurrent()
      await options.save(currentValue)
      const snapshot = serialize(currentValue)
      baselineSnapshot.value = snapshot
      currentSnapshot.value = snapshot
      dirty.value = false
      lastSavedAt.value = new Date().toISOString()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Autosave failed.'
    } finally {
      saving.value = false
    }
  }

  const scheduleFlush = (): void => {
    clearTimer()
    timer = setTimeout(() => {
      void flush()
    }, debounceMs)
  }

  resetBaseline(options.getCurrent())

  stopWatching = watch(
    () => serialize(options.getCurrent()),
    (snapshot) => {
      currentSnapshot.value = snapshot
      if (baselineSnapshot.value === null) {
        baselineSnapshot.value = snapshot
      }
      dirty.value = snapshot !== baselineSnapshot.value

      if (!dirty.value || !isEnabled.value) {
        clearTimer()
        return
      }
      scheduleFlush()
    },
  )

  const stop = (): void => {
    clearTimer()
    if (stopWatching) {
      stopWatching()
      stopWatching = null
    }
  }

  return {
    dirty,
    saving,
    lastError,
    lastSavedAt,
    flush,
    resetBaseline,
    stop,
  }
}
