<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CheckIcon, EraserIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-vue-next'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import type { AgentSessionSummary } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    sessions: AgentSessionSummary[]
    activeSessionUuid?: string | null
    loadingSessions?: boolean
    creatingSession?: boolean
    deletingSessionUuid?: string | null
    clearingSessionUuid?: string | null
    renamingSessionUuid?: string | null
  }>(),
  {
    activeSessionUuid: null,
    loadingSessions: false,
    creatingSession: false,
    deletingSessionUuid: null,
    clearingSessionUuid: null,
    renamingSessionUuid: null,
  },
)

const emit = defineEmits<{
  (event: 'create-session'): void
  (event: 'select-session', sessionUuid: string): void
  (event: 'delete-session', sessionUuid: string): void
  (event: 'clear-session-context', sessionUuid: string): void
  (event: 'rename-session', payload: { sessionUuid: string, title: string }): void
}>()

const { t } = useI18n()
const keyword = ref('')
const editingSessionUuid = ref<string | null>(null)
const draftTitle = ref('')

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

const filteredSessions = computed(() => {
  if (!normalizedKeyword.value) {
    return props.sessions
  }
  return props.sessions.filter((session) => {
    const title = (session.title ?? '').toLowerCase()
    return title.includes(normalizedKeyword.value) || session.uuid.toLowerCase().includes(normalizedKeyword.value)
  })
})

watch(
  () => props.activeSessionUuid,
  (sessionUuid) => {
    if (!sessionUuid || editingSessionUuid.value !== sessionUuid) {
      return
    }
    const session = props.sessions.find(item => item.uuid === sessionUuid)
    if (!session) {
      editingSessionUuid.value = null
      draftTitle.value = ''
    }
  },
)

const formatTime = (value?: string): string => {
  if (!value) {
    return t('platform.workbench.agent.sessionManager.unknownTime')
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

const beginRename = (session: AgentSessionSummary): void => {
  editingSessionUuid.value = session.uuid
  draftTitle.value = session.title || t('platform.workbench.agent.chat.untitledSession')
}

const cancelRename = (): void => {
  editingSessionUuid.value = null
  draftTitle.value = ''
}

const submitRename = (sessionUuid: string): void => {
  const value = draftTitle.value.trim()
  if (!value) {
    return
  }
  emit('rename-session', {
    sessionUuid,
    title: value,
  })
  cancelRename()
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border bg-background p-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.sessionManager.title') }}</h4>
        <Badge variant="outline">{{ sessions.length }}</Badge>
      </div>
      <Button
        size="sm"
        variant="outline"
        :disabled="creatingSession"
        @click="emit('create-session')"
      >
        <PlusIcon class="mr-1 size-3.5" />
        {{ creatingSession ? t('platform.workbench.agent.chat.creatingSession') : t('platform.workbench.agent.chat.newSession') }}
      </Button>
    </div>

    <div class="relative">
      <SearchIcon class="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
      <Input
        v-model="keyword"
        class="pl-8"
        :placeholder="t('platform.workbench.agent.sessionManager.searchPlaceholder')"
      />
    </div>

    <div class="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
      <p v-if="loadingSessions" class="text-xs text-muted-foreground">
        {{ t('platform.workbench.agent.chat.loadingSessions') }}
      </p>

      <p
        v-else-if="!filteredSessions.length"
        class="rounded-md border border-dashed p-3 text-xs text-muted-foreground"
      >
        {{ t('platform.workbench.agent.sessionManager.empty') }}
      </p>

      <button
        v-for="session in filteredSessions"
        :key="session.uuid"
        type="button"
        class="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
        :class="activeSessionUuid === session.uuid ? 'border-primary bg-primary/5' : 'border-border'"
        @click="emit('select-session', session.uuid)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <div v-if="editingSessionUuid === session.uuid" class="flex items-center gap-1" @click.stop>
              <Input
                v-model="draftTitle"
                class="h-7"
                @keydown.enter.prevent="submitRename(session.uuid)"
              />
              <Button
                size="icon"
                variant="ghost"
                :disabled="renamingSessionUuid === session.uuid"
                @click="submitRename(session.uuid)"
              >
                <CheckIcon class="size-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" @click="cancelRename">
                <XIcon class="size-4" />
              </Button>
            </div>
            <p v-else class="truncate text-sm font-medium">
              {{ session.title || t('platform.workbench.agent.chat.untitledSession') }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t('platform.workbench.agent.sessionManager.messageCount', { count: session.messageCount ?? 0 }) }}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ formatTime(session.updatedAt) }}
            </p>
          </div>
          <div class="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              :disabled="clearingSessionUuid === session.uuid || deletingSessionUuid === session.uuid || renamingSessionUuid === session.uuid"
              @click.stop="beginRename(session)"
            >
              <PencilIcon class="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              :disabled="clearingSessionUuid === session.uuid || deletingSessionUuid === session.uuid || renamingSessionUuid === session.uuid"
              @click.stop="emit('clear-session-context', session.uuid)"
            >
              <EraserIcon class="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              :disabled="deletingSessionUuid === session.uuid || clearingSessionUuid === session.uuid || renamingSessionUuid === session.uuid"
              @click.stop="emit('delete-session', session.uuid)"
            >
              <Trash2Icon class="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
