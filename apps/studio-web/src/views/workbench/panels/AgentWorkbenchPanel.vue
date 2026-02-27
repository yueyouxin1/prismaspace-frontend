<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { agentApi } from '@app/services/api/agent-client'
import { chatApi } from '@app/services/api/chat-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { resourceApi } from '@app/services/api/resource-client'
import { serviceModuleApi } from '@app/services/api/service-module-client'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { useResourceWorkbenchContext } from '@app/views/workbench/workbench-context'
import type {
  AnyInstanceRead,
  ChatMessageRead,
  ServiceModuleProviderRead,
} from '@app/services/api/contracts'
import {
  AgentIdeWorkbench,
  type AgentIdeSeed,
  type AgentInstancePatchPayload,
  type AgentModelOption,
} from '@repo/workbench-agent'

const props = defineProps<{
  resourceName: string
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()
const router = useRouter()
const { t } = useI18n()

const workbenchContext = useResourceWorkbenchContext()
const workspaceUuid = computed(() => workbenchContext.workspaceUuid.value)
const resourceUuid = computed(() => workbenchContext.resourceUuid.value)
const instanceUuid = computed(() => props.workspaceInstanceUuid ?? workbenchContext.workspaceInstanceUuid.value)

const activeSessionUuid = ref<string | null>(null)
const lastSavedAt = ref<string | null>(null)
const inlineError = ref<string | null>(null)

const resourceDetailQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.resourceDetail(resourceUuid.value)),
  enabled: computed(() => Boolean(resourceUuid.value)),
  queryFn: async () => resourceApi.getResource(resourceUuid.value),
})

const sessionsQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.chatSessions(instanceUuid.value ?? 'none', 1, 50)),
  enabled: computed(() => Boolean(instanceUuid.value)),
  queryFn: async () => chatApi.listSessions(instanceUuid.value as string, 1, 50),
})

watch(
  () => sessionsQuery.data.value,
  (sessions) => {
    if (!sessions?.length) {
      activeSessionUuid.value = null
      return
    }
    const stillExists = activeSessionUuid.value
      ? sessions.some(session => session.uuid === activeSessionUuid.value)
      : false
    if (!stillExists) {
      activeSessionUuid.value = sessions[0]?.uuid ?? null
    }
  },
  { immediate: true },
)

const messagesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.chatMessages(activeSessionUuid.value ?? 'none', 0, 100)),
  enabled: computed(() => Boolean(activeSessionUuid.value)),
  queryFn: async () => chatApi.listMessages(activeSessionUuid.value as string, 0, 100),
})

const modelCatalogQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.serviceModulesAvailable(workspaceUuid.value, 'llm')),
  enabled: computed(() => Boolean(workspaceUuid.value)),
  queryFn: async () => {
    const [providers, modules] = await Promise.all([
      serviceModuleApi.listModuleProviders(),
      serviceModuleApi.listAvailableModules(workspaceUuid.value, 'llm'),
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

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

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
    resourceDetailQuery.data.value?.name ?? props.resourceName,
    resourceDetailQuery.data.value?.workspace_instance,
  )
})

const saveMutation = useMutation({
  mutationFn: async (payload: AgentInstancePatchPayload) => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return resourceApi.updateInstance(instanceUuid.value, payload as Record<string, unknown>)
  },
  onSuccess: async () => {
    inlineError.value = null
    lastSavedAt.value = new Date().toISOString()
    await Promise.all([
      resourceDetailQuery.refetch(),
      workbenchContext.refresh(),
    ])
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.saveFailed')
    emitBusinessError(error)
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
    await resourceApi.publishInstance(instanceUuid.value, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onSuccess: async () => {
    inlineError.value = null
    await Promise.all([
      resourceDetailQuery.refetch(),
      workbenchContext.refresh(),
    ])
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.publishFailed')
    emitBusinessError(error)
  },
})

const createSessionMutation = useMutation({
  mutationFn: async () => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    return chatApi.createSession({
      agent_instance_uuid: instanceUuid.value,
    })
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.createSessionFailed')
    emitBusinessError(error)
  },
})

const ensureSessionUuid = async (): Promise<string> => {
  if (activeSessionUuid.value) {
    return activeSessionUuid.value
  }
  const created = await createSessionMutation.mutateAsync()
  activeSessionUuid.value = created.uuid
  await sessionsQuery.refetch()
  return created.uuid
}

const executeMutation = useMutation({
  mutationFn: async (inputText: string) => {
    if (!instanceUuid.value) {
      throw new Error(t('platform.workbench.errors.noWorkspaceInstance'))
    }
    const sessionUuid = await ensureSessionUuid()
    return agentApi.execute(instanceUuid.value, {
      inputs: {
        input_query: inputText,
        session_uuid: sessionUuid,
      },
    })
  },
  onSuccess: async () => {
    inlineError.value = null
    await Promise.all([
      sessionsQuery.refetch(),
      messagesQuery.refetch(),
    ])
  },
  onError: (error) => {
    inlineError.value = error instanceof Error ? error.message : t('platform.workbench.agent.executeFailed')
    emitBusinessError(error)
  },
})

const handleSave = async (payload: AgentInstancePatchPayload): Promise<void> => {
  await saveMutation.mutateAsync(payload)
}

const handleCreateSession = async (): Promise<void> => {
  const session = await createSessionMutation.mutateAsync()
  activeSessionUuid.value = session.uuid
  inlineError.value = null
  await sessionsQuery.refetch()
}

const handleSelectSession = (sessionUuid: string): void => {
  activeSessionUuid.value = sessionUuid
  inlineError.value = null
}

const handleSendMessage = async (text: string): Promise<void> => {
  await executeMutation.mutateAsync(text)
}

const handlePublish = async (): Promise<void> => {
  if (!instanceUuid.value) {
    return
  }
  await publishMutation.mutateAsync()
}

const sessionItems = computed(() => {
  return (sessionsQuery.data.value ?? []).map(session => ({
    uuid: session.uuid,
    title: session.title,
    messageCount: session.message_count,
    updatedAt: session.updated_at,
  }))
})

const messageItems = computed(() => {
  return (messagesQuery.data.value ?? []).map((message: ChatMessageRead) => ({
    uuid: message.uuid,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    meta: message.meta as Record<string, unknown> | null,
    toolCalls: message.tool_calls as Record<string, unknown>[] | null,
  }))
})

watch(
  () => resourceDetailQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)

watch(
  () => modelCatalogQuery.error.value,
  (error) => {
    if (error) {
      emitBusinessError(error)
    }
  },
)
</script>

<template>
  <AgentIdeWorkbench
    :seed="ideSeed"
    :resource-description="resourceDescription"
    :updated-at="lastSavedAt ?? resourceDetailQuery.data.value?.updated_at ?? updatedAt ?? null"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :model-options="modelOptions"
    :sessions="sessionItems"
    :active-session-uuid="activeSessionUuid"
    :messages="messageItems"
    :loading="resourceDetailQuery.isLoading.value"
    :saving="saveMutation.isPending.value"
    :models-loading="modelCatalogQuery.isLoading.value"
    :loading-sessions="sessionsQuery.isLoading.value"
    :loading-messages="messagesQuery.isLoading.value"
    :creating-session="createSessionMutation.isPending.value"
    :executing="executeMutation.isPending.value"
    :publishing="publishMutation.isPending.value"
    :last-saved-at="lastSavedAt"
    :error-message="inlineError"
    @back="router.push('/resources')"
    @save="handleSave"
    @publish="handlePublish"
    @create-session="handleCreateSession"
    @select-session="handleSelectSession"
    @send-message="handleSendMessage"
  />
</template>
