<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ResourceWorkbenchHost } from '@prismaspace/resources/host'
import { prismaspaceClient } from '@app/core/client/prismaspace-client'
import { useResourceWorkbenchRouteGuard } from '@app/composables/useResourceWorkbenchRouteGuard'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { Skeleton } from '@prismaspace/ui-shadcn/components/ui/skeleton'

const SUPPORTED_PANELS = ['editor', 'run', 'versions', 'refs'] as const

const router = useRouter()
const {
  workspaceUuid,
  resourceUuid,
  projectUuid,
  panel,
  shellLoading,
} = useResourceWorkbenchRouteGuard({
  supportedPanels: SUPPORTED_PANELS,
})
</script>

<template>
  <div class="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
    <div class="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <template v-if="shellLoading">
        <div class="space-y-4 p-4 md:p-6">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-52 w-full" />
        </div>
      </template>

      <ResourceWorkbenchHost
        v-else-if="workspaceUuid && resourceUuid"
        class="min-h-0 flex-1 overflow-hidden"
        :client="prismaspaceClient"
        :workspace-uuid="workspaceUuid"
        :resource-uuid="resourceUuid"
        :project-uuid="projectUuid"
        :panel="panel"
        :on-back="() => router.push('/resources')"
        :on-error="emitBusinessError"
      />

      <div v-else class="p-4 md:p-6">
        <div class="rounded-lg border p-4 text-sm text-muted-foreground">
          Missing workspace or resource route params.
        </div>
      </div>
    </div>
  </div>
</template>
