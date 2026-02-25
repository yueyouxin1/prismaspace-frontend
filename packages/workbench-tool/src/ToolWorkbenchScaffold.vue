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
    title="Tool Workbench"
    description="Execution parameter scaffold for Tool resources."
    resource-type="tool"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <slot />
  </WorkbenchSurface>
</template>
