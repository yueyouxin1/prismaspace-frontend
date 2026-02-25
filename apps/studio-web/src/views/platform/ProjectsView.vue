<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { IconAdjustmentsHorizontal, IconPlus, IconSearch, IconUserCircle } from '@tabler/icons-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { projectApi } from '@app/services/api/project-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { usePlatformStore } from '@app/stores/platform'
import { useProjectCreationStore } from '@app/stores/project-creation'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Checkbox } from '@repo/ui-shadcn/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

type ProjectTypeFilter = 'all' | 'uiapp' | 'agent' | 'unset'
type VisibilityFilter = 'all' | 'private' | 'workspace' | 'public'
type DisplayRule = 'updated' | 'created'
type TimeOrder = 'desc' | 'asc'

const COVER_GRADIENTS: [string, ...string[]] = [
  'from-cyan-500/70 to-blue-500/70',
  'from-emerald-500/70 to-teal-500/70',
  'from-amber-500/70 to-orange-500/70',
  'from-rose-500/70 to-pink-500/70',
  'from-violet-500/70 to-indigo-500/70',
  'from-slate-500/70 to-zinc-500/70',
]

const store = usePlatformStore()
const creationStore = useProjectCreationStore()
const router = useRouter()
const { t, locale } = useI18n()

const searchText = ref('')
const projectTypeFilter = ref<ProjectTypeFilter>('all')
const visibilityFilter = ref<VisibilityFilter>('all')
const statusFilter = ref('all')
const onlyMine = ref(false)
const displayRule = ref<DisplayRule>('updated')
const timeOrder = ref<TimeOrder>('desc')

onMounted(() => {
  void store.loadPlatformContext()
})

const workspaceUuid = computed(() => store.currentWorkspace?.uuid ?? null)
const mainTypeQuery = computed(() => (projectTypeFilter.value === 'all' ? undefined : projectTypeFilter.value))

const projectsQuery = useQuery({
  queryKey: computed(() => [
    ...platformQueryKeys.workspaceProjects(workspaceUuid.value),
    `main-type:${mainTypeQuery.value ?? 'all'}`,
  ]),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => {
    const workspace = workspaceUuid.value as string
    return projectApi.listWorkspaceProjects(
      workspace,
      mainTypeQuery.value ? { main_application_type: mainTypeQuery.value } : undefined,
    )
  },
})

const statusOptions = computed(() => {
  const options = new Set<string>(['all'])
  for (const project of projectsQuery.data.value ?? []) {
    options.add(project.status)
  }
  return Array.from(options)
})

const filteredProjects = computed(() => {
  let list = [...(projectsQuery.data.value ?? [])]
  const keyword = searchText.value.trim().toLowerCase()

  if (keyword) {
    list = list.filter((project) => {
      return (
        project.name.toLowerCase().includes(keyword) ||
        (project.description ?? '').toLowerCase().includes(keyword) ||
        (project.creator.nick_name ?? project.creator.uuid).toLowerCase().includes(keyword)
      )
    })
  }

  if (visibilityFilter.value !== 'all') {
    list = list.filter((project) => project.visibility === visibilityFilter.value)
  }

  if (statusFilter.value !== 'all') {
    list = list.filter((project) => project.status === statusFilter.value)
  }

  if (onlyMine.value && store.user?.uuid) {
    list = list.filter((project) => project.creator.uuid === store.user?.uuid)
  }

  list.sort((a, b) => {
    const dateA = Date.parse(displayRule.value === 'updated' ? a.updated_at : a.created_at)
    const dateB = Date.parse(displayRule.value === 'updated' ? b.updated_at : b.created_at)
    return timeOrder.value === 'desc' ? dateB - dateA : dateA - dateB
  })

  return list
})

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const creatorName = (nickName: string | null | undefined, uuid: string): string => {
  return nickName?.trim() || uuid
}

const visibilityLabel = (visibility: string): string => {
  if (visibility === 'private') {
    return t('platform.pages.projects.filters.scope.private')
  }
  if (visibility === 'workspace') {
    return t('platform.pages.projects.filters.scope.workspace')
  }
  if (visibility === 'public') {
    return t('platform.pages.projects.filters.scope.public')
  }
  return visibility
}

const projectTypeLabel = (type: string | null | undefined): string => {
  if (type === 'uiapp') {
    return t('platform.pages.projects.filters.projectType.uiapp')
  }
  if (type === 'agent') {
    return t('platform.pages.projects.filters.projectType.agent')
  }
  return t('platform.pages.projects.filters.projectType.unset')
}

const statusLabel = (status: string): string => status.replace(/_/g, ' ')

const coverClass = (seed: string): string => {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }
  const normalized = Math.abs(hash) % COVER_GRADIENTS.length
  return COVER_GRADIENTS[normalized] ?? COVER_GRADIENTS[0]
}

const openCreateDialog = (): void => {
  creationStore.openDialog({ source: 'projects' })
}

const openProjectDetail = async (projectUuid: string): Promise<void> => {
  await router.push(`/projects/${projectUuid}`)
}

const refreshPage = async (): Promise<void> => {
  await Promise.all([store.loadPlatformContext(), projectsQuery.refetch()])
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.projects.title')"
    :subtitle="t('platform.pages.projects.subtitle')"
    :loading="projectsQuery.isLoading.value"
    @refresh="refreshPage"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold">
            {{ t('platform.pages.projects.marketTitle') }}
          </h2>
          <p class="text-muted-foreground text-sm">
            {{ t('platform.pages.projects.marketSubtitle') }}
          </p>
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div class="relative min-w-[240px]">
            <IconSearch class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              v-model="searchText"
              class="h-11 pl-9"
              :placeholder="t('platform.pages.projects.searchPlaceholder')"
            />
          </div>
          <Button class="h-11 gap-2" @click="openCreateDialog">
            <IconPlus class="size-4" />
            {{ t('platform.pages.projects.actions.newProject') }}
          </Button>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border bg-card p-3 md:p-4">
        <div class="grid grid-cols-1 gap-2 md:grid-cols-[220px_220px_220px_auto] md:items-center">
          <Select v-model="projectTypeFilter">
            <SelectTrigger class="h-11">
              <SelectValue :placeholder="t('platform.pages.projects.filters.projectType.label')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('platform.pages.projects.filters.projectType.all') }}</SelectItem>
              <SelectItem value="uiapp">{{ t('platform.pages.projects.filters.projectType.uiapp') }}</SelectItem>
              <SelectItem value="agent">{{ t('platform.pages.projects.filters.projectType.agent') }}</SelectItem>
              <SelectItem value="unset">{{ t('platform.pages.projects.filters.projectType.unset') }}</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="visibilityFilter">
            <SelectTrigger class="h-11">
              <SelectValue :placeholder="t('platform.pages.projects.filters.scope.label')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('platform.pages.projects.filters.scope.all') }}</SelectItem>
              <SelectItem value="private">{{ t('platform.pages.projects.filters.scope.private') }}</SelectItem>
              <SelectItem value="workspace">{{ t('platform.pages.projects.filters.scope.workspace') }}</SelectItem>
              <SelectItem value="public">{{ t('platform.pages.projects.filters.scope.public') }}</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="statusFilter">
            <SelectTrigger class="h-11">
              <SelectValue :placeholder="t('platform.pages.projects.filters.status.label')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="status in statusOptions" :key="status" :value="status">
                {{ status === 'all' ? t('platform.pages.projects.filters.status.all') : statusLabel(status) }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div class="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" class="h-11 gap-2">
                  <IconAdjustmentsHorizontal class="size-4" />
                  {{ t('platform.pages.projects.filters.advanced') }}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-80 p-3">
                <div class="space-y-3">
                  <label class="flex items-center gap-2 text-sm">
                    <Checkbox :model-value="onlyMine" @update:model-value="onlyMine = Boolean($event)" />
                    <span>{{ t('platform.pages.projects.filters.onlyMine') }}</span>
                  </label>

                  <div class="space-y-2">
                    <p class="text-xs font-medium text-muted-foreground">
                      {{ t('platform.pages.projects.filters.displayRule.label') }}
                    </p>
                    <div class="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        :variant="displayRule === 'updated' ? 'default' : 'outline'"
                        @click="displayRule = 'updated'"
                      >
                        {{ t('platform.pages.projects.filters.displayRule.updated') }}
                      </Button>
                      <Button
                        size="sm"
                        :variant="displayRule === 'created' ? 'default' : 'outline'"
                        @click="displayRule = 'created'"
                      >
                        {{ t('platform.pages.projects.filters.displayRule.created') }}
                      </Button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <p class="text-xs font-medium text-muted-foreground">
                      {{ t('platform.pages.projects.filters.timeOrder.label') }}
                    </p>
                    <div class="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        :variant="timeOrder === 'desc' ? 'default' : 'outline'"
                        @click="timeOrder = 'desc'"
                      >
                        {{ t('platform.pages.projects.filters.timeOrder.desc') }}
                      </Button>
                      <Button
                        size="sm"
                        :variant="timeOrder === 'asc' ? 'default' : 'outline'"
                        @click="timeOrder = 'asc'"
                      >
                        {{ t('platform.pages.projects.filters.timeOrder.asc') }}
                      </Button>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      <section>
        <div v-if="projectsQuery.isLoading.value" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton class="h-52 rounded-xl" />
          <Skeleton class="h-52 rounded-xl" />
          <Skeleton class="h-52 rounded-xl" />
        </div>

        <div v-else-if="filteredProjects.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="project in filteredProjects"
            :key="project.uuid"
            class="group flex cursor-pointer flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40"
            role="button"
            tabindex="0"
            @click="openProjectDetail(project.uuid)"
            @keyup.enter="openProjectDetail(project.uuid)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 space-y-2">
                <h3 class="truncate text-base font-semibold">{{ project.name }}</h3>
                <p class="text-muted-foreground line-clamp-2 min-h-[2.6rem] text-sm">
                  {{ project.description || t('platform.pages.projects.noDescription') }}
                </p>
                <div class="flex flex-wrap gap-1">
                  <Badge variant="secondary">{{ projectTypeLabel(project.main_application_type) }}</Badge>
                  <Badge variant="outline">{{ visibilityLabel(project.visibility) }}</Badge>
                  <Badge variant="outline">{{ statusLabel(project.status) }}</Badge>
                </div>
              </div>

              <div class="relative size-14 shrink-0 overflow-hidden rounded-xl border bg-muted">
                <img
                  v-if="project.avatar"
                  :src="project.avatar"
                  :alt="project.name"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  :class="['flex h-full w-full items-center justify-center bg-gradient-to-br text-white', coverClass(project.uuid)]"
                >
                  <span class="text-sm font-semibold">
                    {{ project.name.slice(0, 1).toUpperCase() }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between gap-2 text-sm">
              <div class="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <IconUserCircle class="size-4 shrink-0" />
                <span class="truncate">
                  {{ creatorName(project.creator.nick_name, project.creator.uuid) }}
                </span>
              </div>
              <span class="shrink-0 text-muted-foreground">
                {{ t('platform.pages.projects.updatedAt', { value: formatDate(project.updated_at) }) }}
              </span>
            </div>
          </article>
        </div>

        <div v-else class="rounded-xl border border-dashed p-10 text-center">
          <p class="text-sm font-medium">
            {{ t('platform.pages.projects.empty') }}
          </p>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ t('platform.pages.projects.emptyHint') }}
          </p>
          <Button class="mt-4 gap-2" @click="openCreateDialog">
            <IconPlus class="size-4" />
            {{ t('platform.pages.projects.actions.newProject') }}
          </Button>
        </div>
      </section>
    </div>
  </PlatformShell>
</template>

