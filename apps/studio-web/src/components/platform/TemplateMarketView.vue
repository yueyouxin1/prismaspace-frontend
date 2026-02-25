<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { IconSearch } from '@tabler/icons-vue'
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
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Progress } from '@repo/ui-shadcn/components/ui/progress'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const store = usePlatformStore()
const { t, locale } = useI18n()
const { metrics, recentProjects, recentResources, isLoading, projectsQuery, resourcesQuery, entitlementQuery } =
  useDashboardData()

const searchKeyword = ref('')
const selectedCategory = ref('all')
const selectedTag = ref('all')

onMounted(() => {
  void store.loadPlatformContext()
})

const refreshPage = async (): Promise<void> => {
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
  }).format(new Date(value))
}

const categories = computed(() => ['all', ...new Set(templateMarketMockItems.map((item) => item.category))])
const tags = computed(() => ['all', ...new Set(templateMarketMockItems.flatMap((item) => item.tags))])

const filteredTemplates = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return templateMarketMockItems.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword))

    const matchesCategory = selectedCategory.value === 'all' || item.category === selectedCategory.value
    const matchesTag = selectedTag.value === 'all' || item.tags.includes(selectedTag.value)

    return matchesKeyword && matchesCategory && matchesTag
  })
})

const recommendedTemplates = computed(() => filteredTemplates.value.filter((item) => item.featured).slice(0, 4))
const latestTemplates = computed(() => {
  return [...filteredTemplates.value]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8)
})
</script>

<template>
  <PlatformShell
    :title="t('platform.templateMarket.title')"
    :subtitle="t('platform.templateMarket.subtitle')"
    :loading="isLoading"
    @refresh="refreshPage"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section class="rounded-xl border bg-card p-4 md:p-6">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold">
              {{ t('platform.templateMarket.marketHeadline') }}
            </h2>
            <p class="text-muted-foreground text-sm">
              {{ t('platform.templateMarket.marketSubline') }}
            </p>
          </div>
          <Badge variant="outline">
            {{ t('platform.templateMarket.backendGapBadge') }}
          </Badge>
        </div>
        <p class="text-muted-foreground mt-3 text-xs md:text-sm">
          {{ t('platform.templateMarket.backendGapDescription') }}
        </p>
        <div class="mt-4 space-y-4">
          <div class="relative">
            <IconSearch class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              v-model="searchKeyword"
              :placeholder="t('platform.templateMarket.searchPlaceholder')"
              class="pl-9"
            />
          </div>
          <div class="space-y-3">
            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {{ t('platform.templateMarket.filterCategories') }}
              </p>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="category in categories"
                  :key="category"
                  size="sm"
                  :variant="selectedCategory === category ? 'default' : 'outline'"
                  :aria-pressed="selectedCategory === category"
                  @click="selectedCategory = category"
                >
                  {{ category === 'all' ? t('platform.templateMarket.allCategories') : category }}
                </Button>
              </div>
            </div>
            <div class="space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {{ t('platform.templateMarket.filterTags') }}
              </p>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="tag in tags"
                  :key="tag"
                  size="sm"
                  :variant="selectedTag === tag ? 'secondary' : 'outline'"
                  :aria-pressed="selectedTag === tag"
                  @click="selectedTag = tag"
                >
                  {{ tag === 'all' ? t('platform.templateMarket.allTags') : tag }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.templateMarket.recommendedTitle') }}</CardTitle>
              <CardDescription>{{ t('platform.templateMarket.recommendedDescription') }}</CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="recommendedTemplates.length" class="grid gap-4 lg:grid-cols-2">
                <article
                  v-for="template in recommendedTemplates"
                  :key="template.id"
                  class="overflow-hidden rounded-lg border"
                >
                  <div :class="['h-28 bg-gradient-to-br', template.coverGradient]" />
                  <div class="space-y-3 p-4">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-base font-semibold">{{ template.title }}</p>
                        <p class="text-muted-foreground truncate text-xs">{{ template.author.name }}</p>
                      </div>
                      <Badge :variant="template.author.type === 'official' ? 'default' : 'secondary'">
                        {{
                          template.author.type === 'official'
                            ? t('platform.templateMarket.authorOfficial')
                            : t('platform.templateMarket.authorCommunity')
                        }}
                      </Badge>
                    </div>
                    <p class="text-muted-foreground text-sm">
                      {{ template.description }}
                    </p>
                    <div class="flex flex-wrap gap-1">
                      <Badge variant="outline">{{ template.category }}</Badge>
                      <Badge v-for="tag in template.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
                    </div>
                    <div class="text-muted-foreground flex flex-wrap gap-3 text-xs">
                      <span>{{ t('platform.templateMarket.updatedAt', { value: formatDate(template.updatedAt) }) }}</span>
                      <span>{{ t('platform.templateMarket.usage', { value: formatNumber(template.usageCount) }) }}</span>
                      <span>{{ t('platform.templateMarket.likes', { value: formatNumber(template.likeCount) }) }}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <Button as-child size="sm">
                        <RouterLink :to="`/projects?create=1&source=template&template=${template.id}`">
                          {{ t('platform.templateMarket.createFromTemplate') }}
                        </RouterLink>
                      </Button>
                      <Button as-child size="sm" variant="outline">
                        <RouterLink :to="`/components?template=${template.id}`">
                          {{ t('platform.templateMarket.viewDetails') }}
                        </RouterLink>
                      </Button>
                    </div>
                  </div>
                </article>
              </div>
              <p v-else class="text-muted-foreground text-sm">
                {{ t('platform.templateMarket.empty') }}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.templateMarket.latestTitle') }}</CardTitle>
              <CardDescription>{{ t('platform.templateMarket.latestDescription') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <article
                v-for="template in latestTemplates"
                :key="template.id"
                class="hover:bg-muted/40 flex flex-col gap-3 rounded-lg border p-3 transition-colors md:flex-row md:items-center md:justify-between"
              >
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-sm font-semibold">{{ template.title }}</p>
                    <Badge variant="outline">{{ template.category }}</Badge>
                  </div>
                  <p class="text-muted-foreground text-sm">
                    {{ template.description }}
                  </p>
                  <div class="text-muted-foreground flex flex-wrap gap-3 text-xs">
                    <span>{{ t('platform.templateMarket.updatedAt', { value: formatDate(template.updatedAt) }) }}</span>
                    <span>{{ t('platform.templateMarket.usage', { value: formatNumber(template.usageCount) }) }}</span>
                    <span>{{ t('platform.templateMarket.likes', { value: formatNumber(template.likeCount) }) }}</span>
                  </div>
                </div>
                <div class="flex shrink-0 gap-2">
                  <Button as-child size="sm">
                    <RouterLink :to="`/projects?create=1&source=template&template=${template.id}`">
                      {{ t('platform.templateMarket.createFromTemplate') }}
                    </RouterLink>
                  </Button>
                  <Button as-child size="sm" variant="outline">
                    <RouterLink :to="`/components?template=${template.id}`">
                      {{ t('platform.templateMarket.viewDetails') }}
                    </RouterLink>
                  </Button>
                </div>
              </article>
              <p v-if="!latestTemplates.length" class="text-muted-foreground text-sm">
                {{ t('platform.templateMarket.empty') }}
              </p>
            </CardContent>
          </Card>
        </div>

        <aside class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.templateMarket.workbenchTitle') }}</CardTitle>
              <CardDescription>{{ t('platform.templateMarket.workbenchDescription') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <template v-if="isLoading">
                <Skeleton class="h-16 w-full" />
                <Skeleton class="h-16 w-full" />
                <Skeleton class="h-16 w-full" />
              </template>
              <template v-else>
                <div class="rounded-md border p-3">
                  <p class="text-muted-foreground text-xs">{{ t('platform.templateMarket.workbenchProjects') }}</p>
                  <p class="text-lg font-semibold">{{ formatNumber(metrics.projectCount) }}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-muted-foreground text-xs">{{ t('platform.templateMarket.workbenchResources') }}</p>
                  <p class="text-lg font-semibold">{{ formatNumber(metrics.resourceCount) }}</p>
                </div>
                <div class="space-y-2 rounded-md border p-3">
                  <p class="text-muted-foreground text-xs">{{ t('platform.templateMarket.workbenchQuota') }}</p>
                  <p class="text-lg font-semibold">{{ formatNumber(metrics.quotaRemaining) }}</p>
                  <Progress :model-value="quotaPercent" />
                  <p class="text-muted-foreground text-xs">
                    {{ t('platform.templateMarket.workbenchQuotaUsed', { value: quotaPercent }) }}
                  </p>
                </div>
              </template>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.templateMarket.recentProjectsTitle') }}</CardTitle>
              <CardDescription>{{ t('platform.templateMarket.recentProjectsDescription') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <RouterLink
                v-for="project in recentProjects.slice(0, 3)"
                :key="project.uuid"
                to="/projects"
                class="hover:bg-muted/50 flex justify-between rounded-md border px-3 py-2 text-sm transition-colors"
              >
                <span class="truncate">{{ project.name }}</span>
                <span class="text-muted-foreground text-xs">{{ formatDate(project.updated_at) }}</span>
              </RouterLink>
              <p v-if="!recentProjects.length" class="text-muted-foreground text-sm">
                {{ t('platform.dashboard.empty.projects') }}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t('platform.templateMarket.recentResourcesTitle') }}</CardTitle>
              <CardDescription>{{ t('platform.templateMarket.recentResourcesDescription') }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2">
              <RouterLink
                v-for="resource in recentResources.slice(0, 3)"
                :key="resource.uuid"
                to="/resources"
                class="hover:bg-muted/50 flex justify-between rounded-md border px-3 py-2 text-sm transition-colors"
              >
                <span class="truncate">{{ resource.name }}</span>
                <span class="text-muted-foreground text-xs">{{ formatDate(resource.updated_at) }}</span>
              </RouterLink>
              <p v-if="!recentResources.length" class="text-muted-foreground text-sm">
                {{ t('platform.dashboard.empty.resources') }}
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  </PlatformShell>
</template>
