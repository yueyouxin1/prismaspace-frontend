import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ProjectCreationSource = 'sidebar' | 'template' | 'projects' | 'header' | 'unknown'
export type ProjectMainApplicationType = 'uiapp' | 'agent'

interface OpenProjectCreationOptions {
  source?: ProjectCreationSource
  templateId?: string | null
  defaultMainApplicationType?: ProjectMainApplicationType
}

export const useProjectCreationStore = defineStore('project-creation', () => {
  const open = ref(false)
  const source = ref<ProjectCreationSource>('unknown')
  const templateId = ref<string | null>(null)
  const defaultMainApplicationType = ref<ProjectMainApplicationType>('uiapp')

  const openDialog = (options: OpenProjectCreationOptions = {}): void => {
    source.value = options.source ?? 'unknown'
    templateId.value = options.templateId ?? null
    defaultMainApplicationType.value = options.defaultMainApplicationType ?? 'uiapp'
    open.value = true
  }

  const closeDialog = (): void => {
    open.value = false
    source.value = 'unknown'
    templateId.value = null
    defaultMainApplicationType.value = 'uiapp'
  }

  return {
    open,
    source,
    templateId,
    defaultMainApplicationType,
    openDialog,
    closeDialog,
  }
})

