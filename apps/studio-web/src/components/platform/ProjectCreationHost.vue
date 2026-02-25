<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { projectApi } from '@app/services/api/project-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { isHttpBusinessError } from '@app/services/http/business-error'
import { usePlatformStore } from '@app/stores/platform'
import { useProjectCreationStore, type ProjectMainApplicationType } from '@app/stores/project-creation'
import { Button } from '@repo/ui-shadcn/components/ui/button'
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

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const platformStore = usePlatformStore()
const creationStore = useProjectCreationStore()

const workspaceUuid = computed(() => platformStore.currentWorkspace?.uuid ?? null)
const createName = ref('')
const createDescription = ref('')
const createVisibility = ref<'private' | 'workspace' | 'public'>('workspace')
const mainApplicationType = ref<ProjectMainApplicationType>('uiapp')
const createError = ref('')

const resetForm = (): void => {
  createName.value = ''
  createDescription.value = ''
  createVisibility.value = 'workspace'
  mainApplicationType.value = creationStore.defaultMainApplicationType
  createError.value = ''
}

watch(
  () => creationStore.open,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

const normalizeSource = (source: unknown): 'sidebar' | 'template' | 'projects' | 'header' | 'unknown' => {
  if (source === 'sidebar' || source === 'template' || source === 'projects' || source === 'header') {
    return source
  }
  return 'unknown'
}

watch(
  () => route.fullPath,
  async () => {
    if (route.path !== '/projects') {
      return
    }

    const createQuery = Array.isArray(route.query.create) ? route.query.create[0] : route.query.create
    if (createQuery !== '1' && createQuery !== 'true') {
      return
    }

    const sourceQuery = Array.isArray(route.query.source) ? route.query.source[0] : route.query.source
    const templateQuery = Array.isArray(route.query.template) ? route.query.template[0] : route.query.template

    creationStore.openDialog({
      source: normalizeSource(sourceQuery),
      templateId: typeof templateQuery === 'string' ? templateQuery : null,
    })

    const nextQuery = { ...route.query }
    delete nextQuery.create
    delete nextQuery.source
    delete nextQuery.template
    await router.replace({ path: route.path, query: nextQuery })
  },
  { immediate: true },
)

const createProjectMutation = useMutation({
  mutationFn: async () => {
    const workspace = workspaceUuid.value
    if (!workspace) {
      throw new Error(t('platform.pages.projects.create.noWorkspace'))
    }

    return projectApi.createWorkspaceProject(workspace, {
      name: createName.value.trim(),
      description: createDescription.value.trim() || undefined,
      visibility: createVisibility.value,
      main_application_type: mainApplicationType.value,
    })
  },
  onSuccess: async (project) => {
    await queryClient.invalidateQueries({
      queryKey: platformQueryKeys.workspaceProjects(workspaceUuid.value),
    })
    creationStore.closeDialog()
    await router.push(`/projects/${project.uuid}`)
  },
  onError: (error) => {
    if (isHttpBusinessError(error)) {
      createError.value = error.message
      return
    }
    if (error instanceof Error && error.message) {
      createError.value = error.message
      return
    }
    createError.value = t('platform.pages.projects.create.failed')
  },
})

const closeDialog = (): void => {
  creationStore.closeDialog()
  createError.value = ''
}

const submitCreateProject = (): void => {
  createError.value = ''
  if (!createName.value.trim()) {
    createError.value = t('platform.pages.projects.create.nameRequired')
    return
  }
  if (!mainApplicationType.value) {
    createError.value = t('platform.pages.projects.create.mainTypeRequired')
    return
  }
  createProjectMutation.mutate()
}
</script>

<template>
  <Dialog
    :open="creationStore.open"
    @update:open="(open) => (open ? creationStore.openDialog() : closeDialog())"
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('platform.pages.projects.create.title') }}</DialogTitle>
        <DialogDescription>{{ t('platform.pages.projects.create.description') }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="project-main-type">{{ t('platform.pages.projects.create.mainTypeLabel') }}</Label>
          <Select v-model="mainApplicationType">
            <SelectTrigger id="project-main-type">
              <SelectValue :placeholder="t('platform.pages.projects.create.mainTypeLabel')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uiapp">{{ t('platform.pages.projects.filters.projectType.uiapp') }}</SelectItem>
              <SelectItem value="agent">{{ t('platform.pages.projects.filters.projectType.agent') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="project-name">{{ t('platform.pages.projects.create.nameLabel') }}</Label>
          <Input
            id="project-name"
            v-model="createName"
            :placeholder="t('platform.pages.projects.create.namePlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="project-description">{{ t('platform.pages.projects.create.descriptionLabel') }}</Label>
          <Input
            id="project-description"
            v-model="createDescription"
            :placeholder="t('platform.pages.projects.create.descriptionPlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="project-visibility">{{ t('platform.pages.projects.create.visibilityLabel') }}</Label>
          <Select v-model="createVisibility">
            <SelectTrigger id="project-visibility">
              <SelectValue :placeholder="t('platform.pages.projects.create.visibilityLabel')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{{ t('platform.pages.projects.filters.scope.private') }}</SelectItem>
              <SelectItem value="workspace">{{ t('platform.pages.projects.filters.scope.workspace') }}</SelectItem>
              <SelectItem value="public">{{ t('platform.pages.projects.filters.scope.public') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p v-if="creationStore.templateId" class="text-xs text-muted-foreground">
          {{ t('platform.pages.projects.create.templateHint', { id: creationStore.templateId }) }}
        </p>

        <p v-if="createError" class="text-sm text-destructive">
          {{ createError }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="createProjectMutation.isPending.value" @click="closeDialog">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="createProjectMutation.isPending.value" @click="submitCreateProject">
          {{
            createProjectMutation.isPending.value
              ? t('platform.pages.projects.create.submitting')
              : t('platform.pages.projects.create.submit')
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

