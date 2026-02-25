<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { projectApi } from '@app/services/api/project-client'
import { resourceApi } from '@app/services/api/resource-client'
import { isHttpBusinessError } from '@app/services/http/business-error'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui-shadcn/components/ui/tabs'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.projectId ?? ''))
const envJsonText = ref('{}')
const envError = ref('')

const projectQuery = useQuery({
  queryKey: computed(() => ['project', projectId.value]),
  enabled: computed(() => Boolean(projectId.value)),
  queryFn: async () => projectApi.getProject(projectId.value),
})

const envConfigQuery = useQuery({
  queryKey: computed(() => ['project', projectId.value, 'env-config']),
  enabled: computed(() => Boolean(projectId.value)),
  queryFn: async () => projectApi.getProjectEnvConfig(projectId.value),
})

const refsQuery = useQuery({
  queryKey: computed(() => ['project', projectId.value, 'refs']),
  enabled: computed(() => Boolean(projectId.value)),
  queryFn: async () => resourceApi.listProjectResourceRefs(projectId.value),
})

const dependencyQuery = useQuery({
  queryKey: computed(() => ['project', projectId.value, 'dependency-graph']),
  enabled: computed(() => Boolean(projectId.value)),
  queryFn: async () => projectApi.getProjectDependencyGraph(projectId.value),
})

watch(
  () => envConfigQuery.data.value?.env_config,
  (envConfig) => {
    envJsonText.value = JSON.stringify(envConfig ?? {}, null, 2)
    envError.value = ''
  },
  { immediate: true },
)

const saveEnvMutation = useMutation({
  mutationFn: async () => {
    const parsed = JSON.parse(envJsonText.value) as Record<string, unknown>
    return projectApi.updateProjectEnvConfig(projectId.value, { env_config: parsed })
  },
  onSuccess: async () => {
    envError.value = ''
    await envConfigQuery.refetch()
  },
  onError: (error) => {
    if (error instanceof SyntaxError) {
      envError.value = t('platform.pages.projectDetail.envConfig.invalidJson')
      return
    }
    if (isHttpBusinessError(error)) {
      envError.value = error.message
      return
    }
    envError.value = t('platform.pages.projectDetail.envConfig.saveFailed')
  },
})

const clearEnvMutation = useMutation({
  mutationFn: async () => projectApi.clearProjectEnvConfig(projectId.value),
  onSuccess: async () => {
    envJsonText.value = '{}'
    envError.value = ''
    await envConfigQuery.refetch()
  },
  onError: (error) => {
    if (isHttpBusinessError(error)) {
      envError.value = error.message
      return
    }
    envError.value = t('platform.pages.projectDetail.envConfig.clearFailed')
  },
})

const dependencyNodes = computed(() => dependencyQuery.data.value?.nodes ?? [])
const dependencyEdges = computed(() => dependencyQuery.data.value?.edges ?? [])

const nodeByInstance = computed(() => {
  const map = new Map<string, { name?: string | null; resource_type?: string | null; node_tags: string[] }>()
  for (const node of dependencyNodes.value) {
    map.set(node.instance_uuid, {
      name: node.name,
      resource_type: node.resource_type,
      node_tags: node.node_tags ?? [],
    })
  }
  return map
})

const analysisMetrics = computed(() => {
  const explicitCount = refsQuery.data.value?.length ?? 0
  const implicitCount = dependencyNodes.value.filter((node) => (node.node_tags ?? []).includes('implicit')).length
  const edgeCount = dependencyEdges.value.length
  const latestChange = projectQuery.data.value?.updated_at ?? null
  return { explicitCount, implicitCount, edgeCount, latestChange }
})

const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return '-'
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const creatorName = computed(() => {
  const creator = projectQuery.data.value?.creator
  if (!creator) {
    return '-'
  }
  return creator.nick_name?.trim() || creator.uuid
})

const projectTypeLabel = (type: string | null | undefined): string => {
  if (type === 'uiapp') {
    return t('platform.pages.projects.filters.projectType.uiapp')
  }
  if (type === 'agent') {
    return t('platform.pages.projects.filters.projectType.agent')
  }
  return t('platform.pages.projects.filters.projectType.unset')
}

const backToProjects = async (): Promise<void> => {
  await router.push('/projects')
}

const refreshPage = async (): Promise<void> => {
  await Promise.all([
    projectQuery.refetch(),
    envConfigQuery.refetch(),
    refsQuery.refetch(),
    dependencyQuery.refetch(),
  ])
}

const loading = computed(() => {
  return (
    projectQuery.isLoading.value ||
    envConfigQuery.isLoading.value ||
    refsQuery.isLoading.value ||
    dependencyQuery.isLoading.value
  )
})
</script>

<template>
  <PlatformShell
    :title="projectQuery.data.value?.name || t('platform.pages.projectDetail.title')"
    :subtitle="t('platform.pages.projectDetail.subtitle')"
    :loading="loading"
    @refresh="refreshPage"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div class="flex items-center justify-between">
        <Button variant="outline" @click="backToProjects">
          {{ t('platform.pages.projectDetail.back') }}
        </Button>
      </div>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('platform.pages.projectDetail.basic.title') }}</CardTitle>
            <CardDescription>{{ t('platform.pages.projectDetail.basic.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {{ projectTypeLabel(projectQuery.data.value?.main_application_type) }}
              </Badge>
              <Badge variant="outline">{{ projectQuery.data.value?.status || '-' }}</Badge>
              <Badge variant="outline">{{ projectQuery.data.value?.visibility || '-' }}</Badge>
            </div>
            <div class="text-sm">
              <p class="text-muted-foreground">{{ t('platform.pages.projectDetail.basic.descriptionLabel') }}</p>
              <p>{{ projectQuery.data.value?.description || '-' }}</p>
            </div>
            <div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div>
                <p class="text-muted-foreground">{{ t('platform.pages.projectDetail.basic.creator') }}</p>
                <p>{{ creatorName }}</p>
              </div>
              <div>
                <p class="text-muted-foreground">{{ t('platform.pages.projectDetail.basic.updatedAt') }}</p>
                <p>{{ formatDate(projectQuery.data.value?.updated_at) }}</p>
              </div>
              <div>
                <p class="text-muted-foreground">{{ t('platform.pages.projectDetail.basic.mainResourceName') }}</p>
                <p>{{ projectQuery.data.value?.main_resource_name || '-' }}</p>
              </div>
              <div>
                <p class="text-muted-foreground">{{ t('platform.pages.projectDetail.basic.mainResourceUuid') }}</p>
                <p class="truncate">{{ projectQuery.data.value?.main_resource_uuid || '-' }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ t('platform.pages.projectDetail.analytics.title') }}</CardTitle>
            <CardDescription>{{ t('platform.pages.projectDetail.analytics.description') }}</CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-2 gap-3">
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">{{ t('platform.pages.projectDetail.analytics.explicitResources') }}</p>
              <p class="text-lg font-semibold">{{ analysisMetrics.explicitCount }}</p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">{{ t('platform.pages.projectDetail.analytics.implicitDependencies') }}</p>
              <p class="text-lg font-semibold">{{ analysisMetrics.implicitCount }}</p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">{{ t('platform.pages.projectDetail.analytics.edgeCount') }}</p>
              <p class="text-lg font-semibold">{{ analysisMetrics.edgeCount }}</p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">{{ t('platform.pages.projectDetail.analytics.latestChange') }}</p>
              <p class="text-sm font-medium">{{ formatDate(analysisMetrics.latestChange) }}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.projectDetail.envConfig.title') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.projectDetail.envConfig.description') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Textarea
            v-model="envJsonText"
            class="min-h-[180px] font-mono text-xs"
            :placeholder="t('platform.pages.projectDetail.envConfig.placeholder')"
          />
          <p v-if="envError" class="text-sm text-destructive">{{ envError }}</p>
          <div class="flex items-center gap-2">
            <Button :disabled="saveEnvMutation.isPending.value" @click="saveEnvMutation.mutate()">
              {{ t('platform.pages.projectDetail.envConfig.save') }}
            </Button>
            <Button variant="outline" :disabled="clearEnvMutation.isPending.value" @click="clearEnvMutation.mutate()">
              {{ t('platform.pages.projectDetail.envConfig.clear') }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.projectDetail.dependencies.title') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.projectDetail.dependencies.description') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="list" class="space-y-4">
            <TabsList>
              <TabsTrigger value="list">{{ t('platform.pages.projectDetail.dependencies.listView') }}</TabsTrigger>
              <TabsTrigger value="relation">{{ t('platform.pages.projectDetail.dependencies.relationView') }}</TabsTrigger>
            </TabsList>

            <TabsContent value="list" class="space-y-2">
              <div
                v-for="node in dependencyNodes"
                :key="node.instance_uuid"
                class="rounded-md border p-3"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium">{{ node.name || node.instance_uuid }}</p>
                  <Badge variant="outline">{{ node.resource_type || '-' }}</Badge>
                  <Badge
                    v-for="tag in node.node_tags"
                    :key="`${node.instance_uuid}-${tag}`"
                    variant="secondary"
                  >
                    {{ tag }}
                  </Badge>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">{{ node.instance_uuid }}</p>
              </div>
              <p v-if="!dependencyNodes.length" class="text-sm text-muted-foreground">
                {{ t('platform.pages.projectDetail.dependencies.empty') }}
              </p>
            </TabsContent>

            <TabsContent value="relation" class="space-y-2">
              <div
                v-for="edge in dependencyEdges"
                :key="`${edge.source_instance_uuid}-${edge.target_instance_uuid}-${edge.alias}`"
                class="rounded-md border p-3 text-sm"
              >
                <p class="font-medium">
                  {{ nodeByInstance.get(edge.source_instance_uuid)?.name || edge.source_instance_uuid }}
                  →
                  {{ nodeByInstance.get(edge.target_instance_uuid)?.name || edge.target_instance_uuid }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ edge.relation_type }} / {{ edge.relation_path || '-' }} / {{ edge.alias || '-' }}
                </p>
              </div>
              <p v-if="!dependencyEdges.length" class="text-sm text-muted-foreground">
                {{ t('platform.pages.projectDetail.dependencies.empty') }}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
</template>

