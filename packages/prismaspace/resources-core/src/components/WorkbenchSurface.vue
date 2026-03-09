<script setup lang="ts">
import { useSlots } from 'vue'
import { useWorkbenchAutosave } from '../composables/use-workbench-autosave'
import type {
  WorkbenchSaveTrigger,
  WorkbenchSurfaceProps,
} from '../types'
import WorkbenchHeaderNav from './WorkbenchHeaderNav.vue'

const props = withDefaults(defineProps<WorkbenchSurfaceProps>(), {
  saveStatusText: '',
  saveStatusVariant: 'outline',
  runAction: () => ({}),
  saveAction: () => ({}),
  publishAction: () => ({}),
  extraActions: () => [],
  autosave: () => ({}),
  saveHandler: undefined,
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'run'): void
  (event: 'save'): void
  (event: 'publish'): void
  (event: 'action', key: string): void
}>()

const slots = useSlots()

const runSaveCallback = async (trigger: WorkbenchSaveTrigger): Promise<void> => {
  if (!props.saveHandler) {
    return
  }
  await props.saveHandler(trigger)
}

useWorkbenchAutosave({
  enabled: () => props.autosave?.enabled ?? false,
  debounceMs: () => props.autosave?.debounceMs,
  canAutosave: () => props.autosave?.canAutosave ?? true,
  isDirty: () => props.autosave?.isDirty ?? false,
  save: async () => {
    await runSaveCallback('autosave')
  },
})

const handleSave = (): void => {
  emit('save')
  void runSaveCallback('manual')
}
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
    <WorkbenchHeaderNav
      class="sticky top-0 z-20 shrink-0"
      :title="title"
      :description="description"
      :resource-name="resourceName"
      :updated-at="updatedAt"
      :save-status-text="saveStatusText"
      :save-status-variant="saveStatusVariant"
      :run-action="runAction"
      :save-action="saveAction"
      :publish-action="publishAction"
      :extra-actions="extraActions"
      @back="emit('back')"
      @run="emit('run')"
      @save="handleSave"
      @publish="emit('publish')"
      @action="emit('action', $event)"
    >
      <template v-if="slots.left" #left>
        <slot name="left" />
      </template>
      <template v-if="slots.center" #center>
        <slot name="center" />
      </template>
      <template v-if="slots.right" #right>
        <slot name="right" />
      </template>
    </WorkbenchHeaderNav>
    <main class="min-h-0 flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
