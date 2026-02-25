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
    title="Agent Workbench"
    description="Execution and conversation scaffold for Agent resources."
    resource-type="agent"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <slot />
  </WorkbenchSurface>
</template>
