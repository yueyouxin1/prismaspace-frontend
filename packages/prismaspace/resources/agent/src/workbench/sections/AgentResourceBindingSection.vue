<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Link2Icon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-vue-next'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import type { AgentReferenceBinding, AgentResourceCatalogItem } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    sourceNodeUuid: string
    resources: AgentResourceCatalogItem[]
    bindings: AgentReferenceBinding[]
    resourceTypeLabelMap?: Record<string, string>
    allowedResourceTypes?: string[]
    readonly?: boolean
    syncing?: boolean
  }>(),
  {
    resourceTypeLabelMap: () => ({}),
    allowedResourceTypes: () => [],
    readonly: false,
    syncing: false,
  },
)

const emit = defineEmits<{
  (event: 'add-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
  (event: 'remove-binding', payload: { sourceNodeUuid: string, targetInstanceUuid: string }): void
}>()

const { t } = useI18n()

const keyword = ref('')
const typeFilter = ref('all')
const selectedTargetInstanceUuid = ref('')

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const selectableResources = computed(() => {
  const allowed = new Set(props.allowedResourceTypes)
  return props.resources
    .filter(resource => Boolean(resource.latestPublishedInstanceUuid))
    .filter((resource) => {
      if (!allowed.size) {
        return true
      }
      return allowed.has(resource.resourceType)
    })
})

const selectableTypes = computed(() => {
  const options = Array.from(new Set(selectableResources.value.map(item => item.resourceType))).sort()
  return options
})

watch(
  selectableTypes,
  (types) => {
    if (typeFilter.value !== 'all' && !types.includes(typeFilter.value)) {
      typeFilter.value = 'all'
    }
  },
)

const filteredResources = computed(() => {
  return selectableResources.value.filter((resource) => {
    const byType = typeFilter.value === 'all' || resource.resourceType === typeFilter.value
    if (!byType) {
      return false
    }
    if (!normalizedKeyword.value) {
      return true
    }
    const haystack = `${resource.name} ${resource.description ?? ''} ${resource.resourceType}`.toLowerCase()
    return haystack.includes(normalizedKeyword.value)
  })
})

const boundInstanceSet = computed(() => {
  return new Set(props.bindings.map(binding => binding.targetInstanceUuid))
})

const optionsForAdd = computed(() => {
  return filteredResources.value.filter(
    item => item.latestPublishedInstanceUuid && !boundInstanceSet.value.has(item.latestPublishedInstanceUuid),
  )
})

watch(
  optionsForAdd,
  (options) => {
    if (!selectedTargetInstanceUuid.value || options.some(item => item.latestPublishedInstanceUuid === selectedTargetInstanceUuid.value)) {
      return
    }
    selectedTargetInstanceUuid.value = ''
  },
)

const handleAddBinding = (): void => {
  const targetInstanceUuid = selectedTargetInstanceUuid.value
  if (!targetInstanceUuid || props.readonly) {
    return
  }
  emit('add-binding', {
    sourceNodeUuid: props.sourceNodeUuid,
    targetInstanceUuid,
  })
  selectedTargetInstanceUuid.value = ''
}

const formatResourceType = (resourceType: string): string => {
  return props.resourceTypeLabelMap?.[resourceType] ?? resourceType
}
</script>

<template>
  <div class="space-y-3 rounded-lg border bg-card p-3">
    <div class="space-y-1">
      <h4 class="text-sm font-semibold">{{ title }}</h4>
      <p class="text-xs text-muted-foreground">{{ description }}</p>
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px]">
      <div class="relative">
        <SearchIcon class="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
        <Input v-model="keyword" class="pl-8" :disabled="readonly || syncing" :placeholder="t('platform.workbench.agent.bindings.searchResource')" />
      </div>
      <Select v-model="typeFilter" :disabled="readonly || syncing">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('platform.workbench.agent.bindings.allTypes') }}</SelectItem>
          <SelectItem
            v-for="resourceType in selectableTypes"
            :key="resourceType"
            :value="resourceType"
          >
            {{ formatResourceType(resourceType) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
      <Select
        v-model="selectedTargetInstanceUuid"
        :disabled="readonly || syncing || !optionsForAdd.length"
      >
        <SelectTrigger>
          <SelectValue :placeholder="t('platform.workbench.agent.bindings.pickResource')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="resource in optionsForAdd"
            :key="resource.latestPublishedInstanceUuid ?? resource.resourceUuid"
            :value="resource.latestPublishedInstanceUuid!"
          >
            {{ resource.name }} · {{ formatResourceType(resource.resourceType) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        :disabled="readonly || syncing || !selectedTargetInstanceUuid"
        @click="handleAddBinding"
      >
        <PlusIcon class="mr-1 size-3.5" />
        {{ t('platform.workbench.agent.bindings.add') }}
      </Button>
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground">
        {{ t('platform.workbench.agent.bindings.boundCount', { count: bindings.length }) }}
      </p>
      <div v-if="!bindings.length" class="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
        {{ t('platform.workbench.agent.bindings.empty') }}
      </div>
      <div v-else class="space-y-2">
        <article
          v-for="binding in bindings"
          :key="`${binding.sourceNodeUuid ?? 'node'}-${binding.targetInstanceUuid}`"
          class="rounded-md border bg-background p-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-1">
                <Link2Icon class="size-3.5 text-muted-foreground" />
                <p class="truncate text-sm font-medium">{{ binding.targetResourceName }}</p>
              </div>
              <Badge variant="outline">{{ formatResourceType(binding.targetResourceType) }}</Badge>
              <p class="truncate text-[11px] text-muted-foreground">{{ binding.targetInstanceUuid }}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              :disabled="readonly || syncing"
              @click="emit('remove-binding', { sourceNodeUuid: props.sourceNodeUuid, targetInstanceUuid: binding.targetInstanceUuid })"
            >
              <Trash2Icon class="size-4 text-destructive" />
            </Button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
