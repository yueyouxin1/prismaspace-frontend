<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { tenantdbApi } from '@app/services/api/tenantdb-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import type { TenantTableRead } from '@app/services/api/contracts'
import { TenantDbWorkbenchScaffold } from '@repo/workbench-tenantdb'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const selectedTableUuid = ref('')

const tablesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.tenantTables(props.workspaceInstanceUuid ?? 'none')),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid)),
  queryFn: async () => tenantdbApi.listTables(props.workspaceInstanceUuid as string),
})

watch(
  () => tablesQuery.data.value,
  (tables) => {
    if (!tables?.length) {
      selectedTableUuid.value = ''
      return
    }
    if (!selectedTableUuid.value || !tables.some((table) => table.uuid === selectedTableUuid.value)) {
      const firstTable = tables[0]
      if (firstTable) {
        selectedTableUuid.value = firstTable.uuid
      }
    }
  },
  { immediate: true },
)

const selectedTable = computed<TenantTableRead | null>(() => {
  return tablesQuery.data.value?.find((table) => table.uuid === selectedTableUuid.value) ?? null
})
</script>

<template>
  <TenantDbWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Tables</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button
            v-for="table in tablesQuery.data.value ?? []"
            :key="table.uuid"
            class="w-full justify-start"
            size="sm"
            :variant="selectedTableUuid === table.uuid ? 'default' : 'outline'"
            @click="selectedTableUuid = table.uuid"
          >
            {{ table.label || table.name }}
          </Button>
          <p v-if="!tablesQuery.data.value?.length" class="text-sm text-muted-foreground">No tables found.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Table Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="selectedTable" class="space-y-2">
            <p class="text-sm font-medium">{{ selectedTable.label || selectedTable.name }}</p>
            <div class="rounded-md border">
              <div
                v-for="column in selectedTable.columns"
                :key="column.uuid"
                class="flex items-center justify-between border-b px-3 py-2 text-xs last:border-0"
              >
                <span class="font-medium">{{ column.name }}</span>
                <span class="text-muted-foreground">{{ column.data_type }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-muted-foreground">Select a table to inspect schema.</p>
        </CardContent>
      </Card>
    </div>
  </TenantDbWorkbenchScaffold>
</template>
