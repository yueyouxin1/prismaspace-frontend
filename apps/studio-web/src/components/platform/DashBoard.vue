<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { useDashboardData } from '@app/composables/useDashboardData'
import { templateMarketMockItems } from '@app/data/saas/template-market-mock'
import { usePlatformStore } from '@app/stores/platform'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Progress } from '@repo/ui-shadcn/components/ui/progress'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const store = usePlatformStore()
const { t, locale } = useI18n()
const { metrics, recentProjects, recentResources, isLoading, projectsQuery, resourcesQuery, entitlementQuery } =
  useDashboardData()

onMounted(() => {
  void store.loadPlatformContext()
})

const refreshDashboard = async (): Promise<void> => {
  await Promise.all([
    store.loadPlatformContext(),
    projectsQuery.refetch(),
    resourcesQuery.refetch(),
    entitlementQuery.refetch(),
  ])
}

const quotaPercent = computed(() => {
  if (metrics.value.quotaGranted <= 0) {
    return 0
  }
  return Math.round((metrics.value.quotaConsumed / metrics.value.quotaGranted) * 100)
})

const numberFormatter = computed(() => new Intl.NumberFormat(locale.value))

const formatNumber = (value: number): string => numberFormatter.value.format(value)

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
</script>

<template>
  <PlatformShell
    :title="t('platform.dashboard.title')"
    :subtitle="t('platform.dashboard.subtitle')"
    :loading="isLoading"
    @refresh="refreshDashboard"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>{{ t('platform.dashboard.metrics.workspaces') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums">
              {{ formatNumber(metrics.workspaceCount) }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>{{ t('platform.dashboard.metrics.projects') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums">
              {{ formatNumber(metrics.projectCount) }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>{{ t('platform.dashboard.metrics.resources') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums">
              {{ formatNumber(metrics.resourceCount) }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>{{ t('platform.dashboard.metrics.quotaRemaining') }}</CardDescription>
            <CardTitle class="text-2xl font-semibold tabular-nums">
              {{ formatNumber(metrics.quotaRemaining) }}
            </CardTitle>
            <div class="space-y-2 pt-2">
              <Progress :model-value="quotaPercent" />
              <p class="text-muted-foreground text-xs">
                {{ t('platform.dashboard.metrics.quotaUsed', { value: quotaPercent }) }}
              </p>
            </div>
          </CardHeader>
        </Card>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="space-y-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>{{ t('platform.dashboard.recentProjects.title') }}</CardTitle>
                <Button as-child variant="outline" size="sm">
                  <RouterLink to="/projects">{{ t('platform.dashboard.viewAll') }}</RouterLink>
                </Button>
              </div>
              <CardDescription>{{ t('platform.dashboard.recentProjects.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <template v-if="isLoading">
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
              </template>
              <template v-else-if="recentProjects.length">
                <RouterLink
                  v-for="project in recentProjects"
                  :key="project.uuid"
                  to="/projects"
                  class="hover:bg-muted/60 flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ project.name }}</p>
                    <p class="text-muted-foreground text-xs">
                      {{ formatDate(project.updated_at) }}
                    </p>
                  </div>
                  <Badge variant="outline">{{ project.status }}</Badge>
                </RouterLink>
              </template>
              <p v-else class="text-muted-foreground text-sm">
                {{ t('platform.dashboard.empty.projects') }}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>{{ t('platform.dashboard.recentResources.title') }}</CardTitle>
                <Button as-child variant="outline" size="sm">
                  <RouterLink to="/resources">{{ t('platform.dashboard.viewAll') }}</RouterLink>
                </Button>
              </div>
              <CardDescription>{{ t('platform.dashboard.recentResources.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <template v-if="isLoading">
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
              </template>
              <template v-else-if="recentResources.length">
                <RouterLink
                  v-for="resource in recentResources"
                  :key="resource.uuid"
                  to="/resources"
                  class="hover:bg-muted/60 flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ resource.name }}</p>
                    <p class="text-muted-foreground text-xs">
                      {{ formatDate(resource.updated_at) }}
                    </p>
                  </div>
                  <Badge variant="secondary">{{ resource.resource_type }}</Badge>
                </RouterLink>
              </template>
              <p v-else class="text-muted-foreground text-sm">
                {{ t('platform.dashboard.empty.resources') }}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside class="space-y-4">
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle>{{ t('platform.dashboard.templateMarket.title') }}</CardTitle>
                <Badge variant="outline">{{ t('platform.dashboard.backendGap') }}</Badge>
              </div>
              <CardDescription>{{ t('platform.dashboard.templateMarket.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div
                v-for="item in templateMarketMockItems"
                :key="item.id"
                class="rounded-md border px-3 py-2"
              >
                <p class="text-sm font-medium">{{ item.title }}</p>
                <p class="text-muted-foreground text-xs">
                  {{ item.description }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1">
                  <Badge v-for="tag in item.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.dashboard.quotaCard.title') }}</CardTitle>
              <CardDescription>{{ t('platform.dashboard.quotaCard.description') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <p class="text-sm">
                {{ t('platform.dashboard.quotaCard.granted', { value: formatNumber(metrics.quotaGranted) }) }}
              </p>
              <p class="text-sm">
                {{ t('platform.dashboard.quotaCard.used', { value: formatNumber(metrics.quotaConsumed) }) }}
              </p>
              <p class="text-sm font-medium">
                {{ t('platform.dashboard.quotaCard.remaining', { value: formatNumber(metrics.quotaRemaining) }) }}
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  </PlatformShell>
</template>
