<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { uiappApi } from '@app/services/api/uiapp-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import type { JsonRecord, UiPageMetaRead } from '@app/services/api/contracts'
import { UiAppWorkbenchScaffold } from '@repo/workbench-uiapp'
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
  workspaceInstance?: JsonRecord | null
}>()

const pages = computed<UiPageMetaRead[]>(() => {
  const raw = props.workspaceInstance?.pages
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item): item is UiPageMetaRead => {
      return Boolean(item && typeof item === 'object' && 'page_uuid' in item && 'label' in item)
    })
    .map((item) => ({ ...item }))
})

const defaultPageUuid = computed(() => {
  const home = props.workspaceInstance?.home_page_uuid
  if (typeof home === 'string' && home) {
    return home
  }
  return pages.value[0]?.page_uuid ?? ''
})

const selectedPageUuid = ref('')
watch(
  defaultPageUuid,
  (value) => {
    selectedPageUuid.value = value
  },
  { immediate: true },
)

const pageQuery = useQuery({
  queryKey: computed(() => [...platformQueryKeys.resourceDetail(props.workspaceInstanceUuid ?? 'none'), 'uiapp-page', selectedPageUuid.value]),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid && selectedPageUuid.value)),
  queryFn: async () => uiappApi.getPageDetail(props.workspaceInstanceUuid as string, selectedPageUuid.value),
})
</script>

<template>
  <UiAppWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Pages</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <Button
            v-for="page in pages"
            :key="page.page_uuid"
            class="w-full justify-start"
            size="sm"
            :variant="selectedPageUuid === page.page_uuid ? 'default' : 'outline'"
            @click="selectedPageUuid = page.page_uuid"
          >
            {{ page.label }}
          </Button>
          <p v-if="!pages.length" class="text-xs text-muted-foreground">No page metadata in current workspace instance.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">Page Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="pageQuery.isLoading.value" class="text-sm text-muted-foreground">Loading page DSL...</div>
          <div v-else-if="pageQuery.data.value" class="space-y-2">
            <p class="text-sm font-medium">{{ pageQuery.data.value.label }} ({{ pageQuery.data.value.path }})</p>
            <pre class="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ JSON.stringify(pageQuery.data.value.data ?? [], null, 2) }}</pre>
          </div>
          <p v-else class="text-sm text-muted-foreground">Select a page to inspect.</p>
        </CardContent>
      </Card>
    </div>
  </UiAppWorkbenchScaffold>
</template>
