<script setup lang="ts">
import { WorkbenchSurface } from '../src'
</script>

<template>
  <WorkbenchSurface
    title="Query Run Demo"
    description="Override run action label."
    resource-type="tenantdb"
    resource-name="TenantDB"
    :run-action="{ visible: true, label: '查询', loadingLabel: '查询中...', disabled: false }"
    :save-action="{ visible: true, label: '保存' }"
    :publish-action="{ visible: true, label: '发布' }"
  >
    <div class="rounded-md border p-4 text-sm">
      Header run action now shows "查询".
    </div>
  </WorkbenchSurface>
</template>
