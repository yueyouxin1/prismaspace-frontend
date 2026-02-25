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
    title="TenantDB Workbench"
    description="Table and schema scaffold for TenantDB resources."
    resource-type="tenantdb"
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <slot />
  </WorkbenchSurface>
</template>
