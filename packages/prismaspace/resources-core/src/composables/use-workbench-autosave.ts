import { computed, onBeforeUnmount, toValue, watch, type MaybeRefOrGetter, type Ref, ref } from 'vue'

export interface WorkbenchAutosaveOptions {
  enabled?: MaybeRefOrGetter<boolean>
  debounceMs?: MaybeRefOrGetter<number | undefined>
  canAutosave?: MaybeRefOrGetter<boolean>
  isDirty?: MaybeRefOrGetter<boolean>
  save: () => Promise<void> | void
}

export interface WorkbenchAutosaveController {
  pending: Ref<boolean>
  flush: () => Promise<void>
  cancel: () => void
}

const DEFAULT_DEBOUNCE_MS = 1600

export const useWorkbenchAutosave = (
  options: WorkbenchAutosaveOptions,
): WorkbenchAutosaveController => {
  const pending = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const enabled = computed(() => Boolean(toValue(options.enabled) ?? false))
  const canAutosave = computed(() => Boolean(toValue(options.canAutosave) ?? true))
  const isDirty = computed(() => Boolean(toValue(options.isDirty) ?? false))
  const debounceMs = computed(() => {
    const value = toValue(options.debounceMs)
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      return DEFAULT_DEBOUNCE_MS
    }
    return value
  })

  const cancel = (): void => {
    if (!timer) {
      pending.value = false
      return
    }
    clearTimeout(timer)
    timer = null
    pending.value = false
  }

  const flush = async (): Promise<void> => {
    if (!enabled.value || !canAutosave.value || !isDirty.value) {
      cancel()
      return
    }
    cancel()
    await options.save()
  }

  const schedule = (): void => {
    cancel()
    if (!enabled.value || !canAutosave.value || !isDirty.value) {
      return
    }
    pending.value = true
    timer = setTimeout(() => {
      timer = null
      pending.value = false
      void options.save()
    }, debounceMs.value)
  }

  watch([enabled, canAutosave, isDirty, debounceMs], () => {
    schedule()
  }, { immediate: true })

  onBeforeUnmount(() => {
    cancel()
  })

  return {
    pending,
    flush,
    cancel,
  }
}
