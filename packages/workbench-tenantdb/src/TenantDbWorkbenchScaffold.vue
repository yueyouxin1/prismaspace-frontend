<script setup lang="ts">
import { WorkbenchSurface } from '@repo/workbench-core'
import type { WorkbenchSaveTrigger } from '@repo/workbench-core'
import { useI18n } from 'vue-i18n'

interface Props {
  resourceName: string
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  runVisible?: boolean
  saveVisible?: boolean
  publishVisible?: boolean
  runLabel?: string
  saveLabel?: string
  publishLabel?: string
  runDisabled?: boolean
  saveDisabled?: boolean
  publishDisabled?: boolean
  running?: boolean
  saving?: boolean
  publishing?: boolean
  autosaveEnabled?: boolean
  autosaveDebounceMs?: number
  canAutosave?: boolean
  isDirty?: boolean
  saveHandler?: (trigger: WorkbenchSaveTrigger) => Promise<void> | void
}

const { t } = useI18n()
withDefaults(defineProps<Props>(), {
  resourceDescription: '',
  updatedAt: null,
  workspaceInstanceUuid: null,
  latestPublishedInstanceUuid: null,
  runVisible: true,
  saveVisible: true,
  publishVisible: true,
  runLabel: '',
  saveLabel: '',
  publishLabel: '',
  runDisabled: false,
  saveDisabled: false,
  publishDisabled: false,
  running: false,
  saving: false,
  publishing: false,
  autosaveEnabled: true,
  autosaveDebounceMs: 1600,
  canAutosave: true,
  isDirty: false,
  saveHandler: undefined,
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'run'): void
  (event: 'save'): void
  (event: 'publish'): void
  (event: 'action', key: string): void
}>()
</script>

<template>
  <WorkbenchSurface
    :title="t('platform.workbench.scaffold.tenantdb.title')"
    :description="resourceDescription || t('platform.workbench.scaffold.tenantdb.description')"
    resource-type="tenantdb"
    :resource-name="resourceName"
    :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :run-action="{ visible: runVisible, label: runLabel || t('platform.workbench.actions.query'), disabled: runDisabled, loading: running }"
    :save-action="{ visible: saveVisible, label: saveLabel || t('platform.workbench.header.actions.save'), disabled: saveDisabled, loading: saving }"
    :publish-action="{ visible: publishVisible, label: publishLabel || t('platform.workbench.header.actions.publish'), disabled: publishDisabled, loading: publishing }"
    :autosave="{ enabled: autosaveEnabled, debounceMs: autosaveDebounceMs, canAutosave, isDirty }"
    :save-handler="saveHandler"
    @back="emit('back')"
    @run="emit('run')"
    @save="emit('save')"
    @publish="emit('publish')"
    @action="emit('action', $event)"
  >
    <slot />
  </WorkbenchSurface>
</template>
