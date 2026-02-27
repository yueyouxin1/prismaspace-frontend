<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { uiappApi } from '@app/services/api/uiapp-client'
import { resourceApi } from '@app/services/api/resource-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { emitBusinessError } from '@app/services/http/error-gateway'
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
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  workspaceInstance?: JsonRecord | null
}>()
const router = useRouter()
const { t } = useI18n()

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

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return resourceApi.publishInstance(props.workspaceInstanceUuid, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onError: (error) => emitBusinessError(error),
})

watch(
  () => pageQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)
</script>

<template>
  <UiAppWorkbenchScaffold
    :resource-name="resourceName"
    :resource-description="resourceDescription"
    :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-disabled="true"
    :publish-disabled="!workspaceInstanceUuid || publishMutation.isPending.value"
    :publishing="publishMutation.isPending.value"
    @back="router.push('/resources')"
    @publish="publishMutation.mutate()"
  >
    <div class="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">{{ t('platform.workbench.uiapp.pages') }}</CardTitle>
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
          <p v-if="!pages.length" class="text-xs text-muted-foreground">{{ t('platform.workbench.uiapp.noPages') }}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">{{ t('platform.workbench.uiapp.pageDetail') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="pageQuery.isLoading.value" class="text-sm text-muted-foreground">{{ t('platform.workbench.uiapp.loadingPageDsl') }}</div>
          <div v-else-if="pageQuery.data.value" class="space-y-2">
            <p class="text-sm font-medium">{{ pageQuery.data.value.label }} ({{ pageQuery.data.value.path }})</p>
            <pre class="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{{ JSON.stringify(pageQuery.data.value.data ?? [], null, 2) }}</pre>
          </div>
          <p v-else class="text-sm text-muted-foreground">{{ t('platform.workbench.uiapp.selectPage') }}</p>
        </CardContent>
      </Card>
    </div>
  </UiAppWorkbenchScaffold>
</template>
