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
    title="Knowledge Workbench"
    description="Document and retrieval scaffold for Knowledge resources."
    resource-type="knowledge"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <slot />
  </WorkbenchSurface>
</template>
