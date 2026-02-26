<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { IconEdit, IconExternalLink, IconPlus, IconSearch, IconTrash } from '@tabler/icons-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { trackEvent } from '@app/services/analytics/events'
import { resourceApi } from '@app/services/api/resource-client'
import { resourceTypeApi } from '@app/services/api/resource-type-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { usePlatformStore } from '@app/stores/platform'
import type { ResourceRead } from '@app/services/api/contracts'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui-shadcn/components/ui/table'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'

const store = usePlatformStore()
const router = useRouter()
const queryClient = useQueryClient()
const { t, locale } = useI18n()

const RESOURCE_NAME_MAX = 100
const TOOL_DESCRIPTION_MAX = 600

const searchText = ref('')
const selectedType = ref('all')
const selectedStatus = ref('all')

const createDialogOpen = ref(false)
const editDialogOpen = ref(false)
const deletingResourceUuid = ref('')

const createName = ref('')
const createType = ref('')
const createDescription = ref('')

const editTarget = ref<ResourceRead | null>(null)
const editName = ref('')
const editDescription = ref('')

const isCreatingTool = computed(() => createType.value === 'tool')

const createNameError = computed(() => {
  const trimmed = createName.value.trim()
  if (!trimmed) {
    return t('platform.pages.resources.create.validation.nameRequired')
  }
  if (trimmed.length > RESOURCE_NAME_MAX) {
    return t('platform.pages.resources.create.validation.nameTooLong', {
      max: RESOURCE_NAME_MAX,
    })
  }
  return ''
})

const createDescriptionError = computed(() => {
  const trimmed = createDescription.value.trim()
  if (isCreatingTool.value && !trimmed) {
    return t('platform.pages.resources.create.validation.toolDescriptionRequired')
  }
  if (trimmed.length > TOOL_DESCRIPTION_MAX) {
    return t('platform.pages.resources.create.validation.descriptionTooLong', {
      max: TOOL_DESCRIPTION_MAX,
    })
  }
  return ''
})

const canSubmitCreate = computed(() => {
  if (createMutation.isPending.value) {
    return false
  }
  if (!createType.value) {
    return false
  }
  return !createNameError.value && !createDescriptionError.value
})

onMounted(() => {
  void store.loadPlatformContext()
})

const workspaceUuid = computed(() => store.currentWorkspace?.uuid ?? null)

const resourcesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.workspaceResources(workspaceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => resourceApi.listWorkspaceResources(workspaceUuid.value as string),
})

const resourceTypesQuery = useQuery({
  queryKey: platformQueryKeys.resourceTypes,
  queryFn: async () => resourceTypeApi.listResourceTypes(),
})

const visibleResourceTypes = computed(() => {
  return resourceTypesQuery.data.value?.map((item) => item.name) ?? []
})

const statusOfResource = (resource: ResourceRead): 'workspace' | 'published' | 'unknown' => {
  if (resource.latest_published_instance_uuid) {
    return 'published'
  }
  if (resource.workspace_instance_uuid) {
    return 'workspace'
  }
  return 'unknown'
}

const filteredResources = computed(() => {
  const all = resourcesQuery.data.value ?? []
  const keyword = searchText.value.trim().toLowerCase()

  return all.filter((resource) => {
    const resourceStatus = statusOfResource(resource)

    const matchesKeyword =
      !keyword ||
      resource.name.toLowerCase().includes(keyword) ||
      (resource.description ?? '').toLowerCase().includes(keyword)

    const matchesType = selectedType.value === 'all' || resource.resource_type === selectedType.value
    const matchesStatus = selectedStatus.value === 'all' || resourceStatus === selectedStatus.value

    return matchesKeyword && matchesType && matchesStatus
  })
})

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const openWorkbench = async (resourceUuid: string): Promise<void> => {
  if (!workspaceUuid.value) {
    return
  }

  await router.push(`/studio/workspaces/${workspaceUuid.value}/resources/${resourceUuid}/editor`)
}

const openCreateDialog = (): void => {
  createDialogOpen.value = true
  createName.value = ''
  createDescription.value = ''
  createType.value = visibleResourceTypes.value[0] ?? ''
}

const openEditDialog = (resource: ResourceRead): void => {
  editTarget.value = resource
  editName.value = resource.name
  editDescription.value = resource.description ?? ''
  editDialogOpen.value = true
}

const closeEditDialog = (): void => {
  editDialogOpen.value = false
  editTarget.value = null
}

const createMutation = useMutation({
  mutationFn: async () => {
    if (!workspaceUuid.value) {
      throw new Error('No workspace selected.')
    }

    const resourceType = createType.value || visibleResourceTypes.value[0]
    if (!resourceType) {
      throw new Error('No resource type available.')
    }

    const name = createName.value.trim()
    const description = createDescription.value.trim()
    if (!name) {
      throw new Error('Resource name is required.')
    }
    if (isCreatingTool.value && !description) {
      throw new Error('Tool description is required.')
    }

    return resourceApi.createWorkspaceResource(workspaceUuid.value, {
      name,
      description: description || undefined,
      resource_type: resourceType,
    })
  },
  onSuccess: async (createdResource) => {
    createDialogOpen.value = false
    await queryClient.invalidateQueries({
      queryKey: platformQueryKeys.workspaceResources(workspaceUuid.value),
    })
    await queryClient.invalidateQueries({
      queryKey: platformQueryKeys.resourceDetail(createdResource.uuid),
    })

    if (createdResource.resource_type === 'tool' && workspaceUuid.value) {
      trackEvent('tool_created', {
        workspace: workspaceUuid.value,
        resource: createdResource.uuid,
      })
      await router.push(`/studio/workspaces/${workspaceUuid.value}/resources/${createdResource.uuid}/editor`)
      return
    }

    await resourcesQuery.refetch()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const updateMutation = useMutation({
  mutationFn: async () => {
    if (!editTarget.value) {
      throw new Error('No edit target.')
    }

    return resourceApi.updateResource(editTarget.value.uuid, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
    })
  },
  onSuccess: async () => {
    closeEditDialog()
    await resourcesQuery.refetch()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const deleteMutation = useMutation({
  mutationFn: async (resourceUuid: string) => {
    return resourceApi.deleteResource(resourceUuid)
  },
  onSuccess: async () => {
    deletingResourceUuid.value = ''
    await resourcesQuery.refetch()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const deleteResource = async (resourceUuid: string): Promise<void> => {
  deletingResourceUuid.value = resourceUuid
  await deleteMutation.mutateAsync(resourceUuid)
}

const submitCreate = async (): Promise<void> => {
  if (!canSubmitCreate.value) {
    return
  }
  await createMutation.mutateAsync()
}

const submitEdit = async (): Promise<void> => {
  await updateMutation.mutateAsync()
}

const refreshPage = async (): Promise<void> => {
  await Promise.all([store.loadPlatformContext(), resourcesQuery.refetch(), resourceTypesQuery.refetch()])
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.resources.title')"
    :subtitle="t('platform.pages.resources.subtitle')"
    :loading="resourcesQuery.isLoading.value"
    @refresh="refreshPage"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <section class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 class="text-xl font-semibold">{{ t('platform.pages.resources.listTitle') }}</h2>
          <p class="text-muted-foreground text-sm">{{ t('platform.pages.resources.listDescription') }}</p>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div class="relative min-w-[260px]">
            <IconSearch class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchText" class="h-11 pl-9" :placeholder="t('platform.pages.resources.searchPlaceholder')" />
          </div>
          <Button class="h-11 gap-2" @click="openCreateDialog">
            <IconPlus class="size-4" />
            {{ t('platform.pages.resources.actions.newResource') }}
          </Button>
        </div>
      </section>

      <section class="space-y-3 rounded-xl border bg-card p-3 md:p-4">
        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            :variant="selectedType === 'all' ? 'default' : 'outline'"
            @click="selectedType = 'all'"
          >
            {{ t('platform.pages.resources.allTypes') }}
          </Button>
          <Button
            v-for="typeName in visibleResourceTypes"
            :key="typeName"
            size="sm"
            :variant="selectedType === typeName ? 'default' : 'outline'"
            @click="selectedType = typeName"
          >
            {{ typeName }}
          </Button>
        </div>

        <div class="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr]">
          <Select v-model="selectedStatus">
            <SelectTrigger class="h-10">
              <SelectValue :placeholder="t('platform.pages.resources.filters.statusLabel')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('platform.pages.resources.filters.statusAll') }}</SelectItem>
              <SelectItem value="workspace">{{ t('platform.pages.resources.filters.statusWorkspace') }}</SelectItem>
              <SelectItem value="published">{{ t('platform.pages.resources.filters.statusPublished') }}</SelectItem>
              <SelectItem value="unknown">{{ t('platform.pages.resources.filters.statusUnknown') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.resources.table.title') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.resources.table.description') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <template v-if="resourcesQuery.isLoading.value">
            <div class="space-y-2">
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
              <Skeleton class="h-10 w-full" />
            </div>
          </template>

          <template v-else-if="filteredResources.length">
            <div class="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{{ t('platform.pages.resources.table.columns.resource') }}</TableHead>
                    <TableHead>{{ t('platform.pages.resources.table.columns.type') }}</TableHead>
                    <TableHead>{{ t('platform.pages.resources.table.columns.status') }}</TableHead>
                    <TableHead>{{ t('platform.pages.resources.table.columns.updatedAt') }}</TableHead>
                    <TableHead class="text-right">{{ t('platform.pages.resources.table.columns.actions') }}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="resource in filteredResources"
                    :key="resource.uuid"
                    class="cursor-pointer"
                    @click="openWorkbench(resource.uuid)"
                  >
                    <TableCell class="max-w-[420px]">
                      <div class="min-w-0">
                        <p class="truncate font-medium">{{ resource.name }}</p>
                        <p class="truncate text-xs text-muted-foreground">{{ resource.description || '-' }}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{{ resource.resource_type }}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{{ statusOfResource(resource) }}</Badge>
                    </TableCell>
                    <TableCell class="text-sm text-muted-foreground">{{ formatDate(resource.updated_at) }}</TableCell>
                    <TableCell>
                      <div class="flex justify-end gap-2" @click.stop>
                        <Button size="sm" variant="outline" class="gap-1" @click="openWorkbench(resource.uuid)">
                          <IconExternalLink class="size-3.5" />
                          {{ t('platform.pages.resources.actions.openWorkbench') }}
                        </Button>
                        <Button size="icon" variant="outline" @click="openEditDialog(resource)">
                          <IconEdit class="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          :disabled="deleteMutation.isPending.value && deletingResourceUuid === resource.uuid"
                          @click="deleteResource(resource.uuid)"
                        >
                          <IconTrash class="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </template>

          <p v-else class="text-sm text-muted-foreground">{{ t('platform.pages.resources.empty') }}</p>
        </CardContent>
      </Card>
    </div>

    <Dialog :open="createDialogOpen" @update:open="createDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{
              isCreatingTool
                ? t('platform.pages.resources.create.toolTitle')
                : t('platform.pages.resources.create.title')
            }}
          </DialogTitle>
          <DialogDescription>
            {{
              isCreatingTool
                ? t('platform.pages.resources.create.toolDescription')
                : t('platform.pages.resources.create.description')
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="resource-create-name">{{ t('platform.pages.resources.form.name') }}</Label>
              <span class="text-xs text-muted-foreground">{{ createName.length }}/{{ RESOURCE_NAME_MAX }}</span>
            </div>
            <Input
              id="resource-create-name"
              v-model="createName"
              :maxlength="RESOURCE_NAME_MAX"
              :placeholder="t('platform.pages.resources.form.namePlaceholder')"
            />
            <p v-if="createNameError" class="text-xs text-destructive">{{ createNameError }}</p>
          </div>
          <div class="space-y-2">
            <Label for="resource-create-type">{{ t('platform.pages.resources.form.type') }}</Label>
            <Select v-model="createType">
              <SelectTrigger id="resource-create-type">
                <SelectValue :placeholder="t('platform.pages.resources.form.typePlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="typeName in visibleResourceTypes" :key="typeName" :value="typeName">
                  {{ typeName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="resource-create-description">
                {{
                  isCreatingTool
                    ? `${t('platform.pages.resources.form.description')} *`
                    : t('platform.pages.resources.form.description')
                }}
              </Label>
              <span class="text-xs text-muted-foreground">{{ createDescription.length }}/{{ TOOL_DESCRIPTION_MAX }}</span>
            </div>
            <Textarea
              id="resource-create-description"
              v-model="createDescription"
              class="min-h-24"
              :maxlength="TOOL_DESCRIPTION_MAX"
              :placeholder="t('platform.pages.resources.form.descriptionPlaceholder')"
            />
            <p v-if="createDescriptionError" class="text-xs text-destructive">{{ createDescriptionError }}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="createMutation.isPending.value" @click="createDialogOpen = false">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="!canSubmitCreate" @click="submitCreate">
            {{ createMutation.isPending.value ? t('platform.pages.resources.actions.creating') : t('platform.pages.resources.actions.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="editDialogOpen" @update:open="editDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.pages.resources.edit.title') }}</DialogTitle>
          <DialogDescription>{{ t('platform.pages.resources.edit.description') }}</DialogDescription>
        </DialogHeader>

        <div class="space-y-3">
          <div class="space-y-2">
            <Label for="resource-edit-name">{{ t('platform.pages.resources.form.name') }}</Label>
            <Input id="resource-edit-name" v-model="editName" :placeholder="t('platform.pages.resources.form.namePlaceholder')" />
          </div>
          <div class="space-y-2">
            <Label for="resource-edit-description">{{ t('platform.pages.resources.form.description') }}</Label>
            <Textarea
              id="resource-edit-description"
              v-model="editDescription"
              class="min-h-24"
              :placeholder="t('platform.pages.resources.form.descriptionPlaceholder')"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="updateMutation.isPending.value" @click="closeEditDialog">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="updateMutation.isPending.value || !editName.trim()" @click="submitEdit">
            {{ updateMutation.isPending.value ? t('platform.pages.resources.actions.saving') : t('platform.pages.resources.actions.save') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PlatformShell>
</template>
