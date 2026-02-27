<script setup lang="ts">
import { ref } from 'vue'
import { WorkbenchSurface } from '../src'

const dirty = ref(false)
const saving = ref(false)

const saveHandler = async (): Promise<void> => {
  saving.value = true
  await new Promise(resolve => setTimeout(resolve, 400))
  dirty.value = false
  saving.value = false
}
</script>

<template>
  <WorkbenchSurface
    title="Save Only Demo"
    description="Only expose save action."
    resource-type="tool"
    resource-name="Demo"
    :run-action="{ visible: false }"
    :save-action="{ visible: true, label: '保存', loadingLabel: '保存中...', loading: saving }"
    :publish-action="{ visible: false }"
    :autosave="{ enabled: true, debounceMs: 1000, canAutosave: !saving, isDirty: dirty }"
    :save-handler="saveHandler"
  >
    <div class="rounded-md border p-4 text-sm">
      <button class="rounded border px-2 py-1" @click="dirty = true">
        Make Dirty
      </button>
    </div>
  </WorkbenchSurface>
</template>
