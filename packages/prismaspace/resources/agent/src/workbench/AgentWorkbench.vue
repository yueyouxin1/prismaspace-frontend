<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import type { PrismaspaceClient } from '@prismaspace/sdk'
import { prismaspaceQueryKeys } from '@prismaspace/resources-core'
import type {
  AnyInstanceRead,
  ReferenceRead,
  ServiceModuleProviderRead,
} from '@prismaspace/contracts'
import AgentIdeWorkbench from './AgentIdeWorkbench.vue'
import type {
  AgentIdeSeed,
  AgentInstancePatchPayload,
  AgentModelOption,
  AgentReferenceBinding,
  AgentResourceCatalogItem,
} from './types/agent-ide'

const props = defineProps<{
  client: PrismaspaceClient
  workspaceUuid: string
  resourceUuid: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  onBack?: () => void
  onError?: (error: unknown) => void
}>()

const { t } = useI18n()

const workspaceUuid = computed(() => props.workspaceUuid)
const resourceUuid = computed(() => props.resourceUuid)
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? null)

const lastSavedAt = ref<string | null>(null)
const inlineError = ref<string | null>(null)
const syncingBindings = ref(false)

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

const resourceDetailQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.resourceDetail(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value)),
  queryFn: async () => props.client.resource.getResource(resourceUuid.value),
})

const workspaceResourcesQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.workspaceResources(workspaceUuid.value)),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => props.client.resource.listWorkspaceResources(workspaceUuid.value),
})

const refsQuery = useQuery({
  queryKey: computed(() => ['agent', instanceUuid.value ?? 'none', 'refs']),
  enabled: computed(() => Boolean(instanceUuid.value)),
  queryFn: async () => props.client.resource.listInstanceRefs(instanceUuid.value as string),
})

const modelCatalogQuery = useQuery({
  queryKey: computed(() => prismaspaceQueryKeys.serviceModulesAvailable(workspaceUuid.value, 'llm')),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => {
    const [providers, modules] = await Promise.all([
      props.client.serviceModule.listModuleProviders(),
      props.client.serviceModule.listAvailableModules(workspaceUuid.value, 'llm'),
    ])
    return { providers, modules }
  },
})

const providerMap = computed(() => {
  const map = new Map<number, ServiceModuleProviderRead>()
  ;(modelCatalogQuery.data.value?.providers ?? []).forEach((provider) => {
    map.set(provider.id, provider)
  })
  return map
})

const modelOptions = computed<AgentModelOption[]>(() => {
  const modules = modelCatalogQuery.data.value?.modules ?? []
  const options: AgentModelOption[] = []
  modules.forEach((module) => {
    const provider = providerMap.value.get(module.provider_id)
    module.versions.forEach((version) => {
      options.push({
        modelUuid: version.uuid,
        displayName: `${module.label} · ${version.version_tag}`,
        provider: provider?.name ?? 'unknown',
        providerLabel: provider?.label ?? provider?.name ?? 'Unknown',
        moduleName: module.name,
        moduleLabel: module.label,
        versionTag: version.version_tag,
        description: version.description,
      })
    })
  })
  return options
})

const toAgentSeed = (resourceName: string, instance: AnyInstanceRead | null | undefined): AgentIdeSeed | null => {
  if (!instance || typeof instance !== 'object') {
    return null
  }
  const raw = instance as Record<string, unknown>
  if (typeof raw.system_prompt !== 'string') {
    return null
  }
  return {
    resourceName,
    systemPrompt: raw.system_prompt,
    llmModuleVersionUuid: typeof raw.llm_module_version_uuid === 'string' ? raw.llm_module_version_uuid : null,
    agentConfig: asRecord(raw.agent_config),
  }
}

const ideSeed = computed(() => {
  return toAgentSeed(
    resourceDetailQuery.data.value?.name ?? '',
    resourceDetailQuery.data.value?.workspace_instance,
  )
})

const saveMutation = useMutation({
  mutationFn: async (payload: AgentInstancePatchPayload) => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return props.client.resource.updateInstance(instanceUuid.value, payload as Record<string, unknown>)
  },
  onSuccess: async () => {
    inlineError.value = null
    lastSavedAt.value = new Date().toISOString()
    await resourceDetailQuery.refetch()
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.saveFailed')
    props.onError?.(error)
  },
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    await props.client.resource.publishInstance(instanceUuid.value, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onSuccess: async () => {
    inlineError.value = null
    await resourceDetailQuery.refetch()
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.publishFailed')
    props.onError?.(error)
  },
})

const handleSave = async (payload: AgentInstancePatchPayload): Promise<void> => {
  await saveMutation.mutateAsync(payload)
}

const handlePublish = async (): Promise<void> => {
  await publishMutation.mutateAsync()
}

const resourceCatalog = computed<AgentResourceCatalogItem[]>(() => {
  return (workspaceResourcesQuery.data.value ?? []).map(resource => ({
    resourceUuid: resource.uuid,
    name: resource.name,
    description: resource.description,
    resourceType: resource.resource_type,
    workspaceInstanceUuid: resource.workspace_instance_uuid,
    latestPublishedInstanceUuid: resource.latest_published_instance_uuid,
  }))
})

const bindingItems = computed<AgentReferenceBinding[]>(() => {
  return (refsQuery.data.value ?? []).map((binding: ReferenceRead) => ({
    id: binding.id,
    sourceNodeUuid: binding.source_node_uuid,
    alias: binding.alias,
    targetInstanceUuid: binding.target_instance_uuid,
    targetResourceName: binding.target_resource_name,
    targetResourceType: binding.target_resource_type,
    targetVersionTag: binding.target_version_tag,
  }))
})

const handleAddBinding = async (payload: { sourceNodeUuid: string, targetInstanceUuid: string }): Promise<void> => {
  if (!instanceUuid.value || syncingBindings.value) {
    return
  }
  const exists = bindingItems.value.some(item => item.sourceNodeUuid === payload.sourceNodeUuid && item.targetInstanceUuid === payload.targetInstanceUuid)
  if (exists) {
    return
  }
  syncingBindings.value = true
  try {
    await props.client.resource.addInstanceRef(instanceUuid.value, {
      target_instance_uuid: payload.targetInstanceUuid,
      source_node_uuid: payload.sourceNodeUuid,
    })
    await refsQuery.refetch()
    inlineError.value = null
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.core.refs.addFailed')
    props.onError?.(error)
  } finally {
    syncingBindings.value = false
  }
}

const handleRemoveBinding = async (payload: { sourceNodeUuid: string, targetInstanceUuid: string }): Promise<void> => {
  if (!instanceUuid.value || syncingBindings.value) {
    return
  }
  syncingBindings.value = true
  try {
    await props.client.resource.removeInstanceRef(instanceUuid.value, payload.targetInstanceUuid, payload.sourceNodeUuid)
    await refsQuery.refetch()
    inlineError.value = null
  } catch (error) {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.core.refs.removeFailed')
    props.onError?.(error)
  } finally {
    syncingBindings.value = false
  }
}

watch(() => resourceDetailQuery.error.value, (error) => { if (error) props.onError?.(error) })
watch(() => modelCatalogQuery.error.value, (error) => { if (error) props.onError?.(error) })
watch(() => workspaceResourcesQuery.error.value, (error) => { if (error) props.onError?.(error) })
watch(() => refsQuery.error.value, (error) => { if (error) props.onError?.(error) })
</script>

<template>
  <AgentIdeWorkbench
    :client="client"
    :seed="ideSeed"
    :resource-description="resourceDetailQuery.data.value?.description ?? ''"
    :updated-at="lastSavedAt ?? resourceDetailQuery.data.value?.updated_at ?? null"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :model-options="modelOptions"
    :resources="resourceCatalog"
    :bindings="bindingItems"
    :loading="resourceDetailQuery.isLoading.value"
    :saving="saveMutation.isPending.value"
    :models-loading="modelCatalogQuery.isLoading.value"
    :loading-bindings="refsQuery.isLoading.value"
    :syncing-bindings="syncingBindings"
    :publishing="publishMutation.isPending.value"
    :last-saved-at="lastSavedAt"
    :error-message="inlineError"
    @back="props.onBack?.()"
    @save="handleSave"
    @publish="handlePublish"
    @add-binding="handleAddBinding"
    @remove-binding="handleRemoveBinding"
  />
</template>
