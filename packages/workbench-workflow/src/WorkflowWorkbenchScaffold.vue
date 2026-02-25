<script setup lang="ts">
import { WorkbenchSurface } from '@repo/workbench-core'

interface Props {
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}

defineProps<Props>()
</script>

<template>
  <WorkbenchSurface
    title="Workflow Workbench"
    description="Graph validation and run scaffold for Workflow resources."
    resource-type="workflow"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <slot />
  </WorkbenchSurface>
</template>
