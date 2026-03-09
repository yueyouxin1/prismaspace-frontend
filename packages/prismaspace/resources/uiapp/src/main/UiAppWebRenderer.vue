<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'

const props = defineProps<{
  client: PrismaspaceClient
  appInstanceUuid: string
  pageUuid?: string | null
}>()

const instanceQuery = useQuery({
  queryKey: computed(() => ['uiapp-renderer', props.appInstanceUuid, 'instance']),
  enabled: computed(() => Boolean(props.appInstanceUuid)),
  queryFn: async () => props.client.resource.getInstance(props.appInstanceUuid),
})

const resolvedPageUuid = computed(() => {
  if (props.pageUuid) {
    return props.pageUuid
  }
  const raw = instanceQuery.data.value as Record<string, unknown> | null | undefined
  const home = raw?.home_page_uuid
  if (typeof home === 'string' && home) {
    return home
  }
  const pages = raw?.pages
  if (Array.isArray(pages) && pages.length > 0) {
    const first = pages[0] as Record<string, unknown> | undefined
    return typeof first?.page_uuid === 'string' ? first.page_uuid : ''
  }
  return ''
})

const pageQuery = useQuery({
  queryKey: computed(() => [...prismaspaceQueryKeys.resourceDetail(props.appInstanceUuid), 'renderer-page', resolvedPageUuid.value]),
  enabled: computed(() => Boolean(props.appInstanceUuid && resolvedPageUuid.value)),
  queryFn: async () => props.client.uiapp.getPageDetail(props.appInstanceUuid, resolvedPageUuid.value),
})
</script>

<template>
  <Card class="h-full min-h-[320px]">
    <CardHeader>
      <CardTitle>{{ pageQuery.data.value?.label ?? 'UiApp Web Renderer' }}</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="pageQuery.isLoading.value" class="text-sm text-muted-foreground">
        Loading page...
      </div>
      <div v-else-if="pageQuery.data.value" class="space-y-2">
        <p class="text-sm text-muted-foreground">{{ pageQuery.data.value.path }}</p>
        <pre class="max-h-[60vh] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ JSON.stringify(pageQuery.data.value.data ?? [], null, 2) }}</pre>
      </div>
      <div v-else class="text-sm text-muted-foreground">
        No page selected.
      </div>
    </CardContent>
  </Card>
</template>
