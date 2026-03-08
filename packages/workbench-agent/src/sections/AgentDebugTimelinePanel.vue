<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import type { AgentStreamDebugEvent } from '../types/agent-ide'

const props = withDefaults(
  defineProps<{
    events: AgentStreamDebugEvent[]
    executing?: boolean
    maxItems?: number
  }>(),
  {
    executing: false,
    maxItems: 120,
  },
)

const emit = defineEmits<{
  (event: 'clear-events'): void
}>()

const { t } = useI18n()
const eventTypeFilter = ref('all')

const eventTypes = computed(() => {
  return Array.from(new Set(props.events.map(event => event.type))).sort()
})

const displayedEvents = computed(() => {
  const filtered = props.events.filter((event) => {
    return eventTypeFilter.value === 'all' || event.type === eventTypeFilter.value
  })
  const start = Math.max(0, filtered.length - props.maxItems)
  return filtered.slice(start)
})

const usageSummary = computed(() => {
  const usageEvent = [...props.events].reverse().find((event) => {
    if (event.type === 'usage') {
      return true
    }
    return event.type === 'CUSTOM' && event.payload?.name === 'ps.meta.usage'
  })
  const payload = usageEvent?.type === 'CUSTOM'
    ? ((usageEvent.payload?.value as Record<string, unknown> | undefined) ?? {})
    : (usageEvent?.payload ?? {})
  return {
    prompt: Number(payload.prompt_tokens ?? payload.promptTokens ?? 0),
    completion: Number(payload.completion_tokens ?? payload.completionTokens ?? 0),
    total: Number(payload.total_tokens ?? payload.totalTokens ?? 0),
  }
})

const formatTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleTimeString()
}

const formatPayload = (value?: Record<string, unknown> | null): string => {
  if (!value || !Object.keys(value).length) {
    return '{}'
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border bg-background p-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h4 class="text-sm font-semibold">{{ t('platform.workbench.agent.debugTimeline.title') }}</h4>
        <Badge variant="outline">{{ events.length }}</Badge>
        <Badge v-if="executing" class="bg-primary/10 text-primary hover:bg-primary/10">
          {{ t('platform.workbench.agent.debugTimeline.streaming') }}
        </Badge>
      </div>
      <Button
        size="sm"
        variant="ghost"
        :disabled="!events.length"
        @click="emit('clear-events')"
      >
        {{ t('platform.workbench.agent.debugTimeline.clear') }}
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-2 rounded-md border bg-muted/20 p-2 text-xs md:grid-cols-4">
      <div class="space-y-0.5">
        <p class="text-muted-foreground">{{ t('platform.workbench.agent.debugTimeline.promptTokens') }}</p>
        <p class="font-semibold">{{ usageSummary.prompt }}</p>
      </div>
      <div class="space-y-0.5">
        <p class="text-muted-foreground">{{ t('platform.workbench.agent.debugTimeline.completionTokens') }}</p>
        <p class="font-semibold">{{ usageSummary.completion }}</p>
      </div>
      <div class="space-y-0.5">
        <p class="text-muted-foreground">{{ t('platform.workbench.agent.debugTimeline.totalTokens') }}</p>
        <p class="font-semibold">{{ usageSummary.total }}</p>
      </div>
      <div class="space-y-0.5">
        <p class="text-muted-foreground">{{ t('platform.workbench.agent.debugTimeline.eventType') }}</p>
        <Select v-model="eventTypeFilter">
          <SelectTrigger class="h-7 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{{ t('platform.workbench.agent.debugTimeline.all') }}</SelectItem>
            <SelectItem
              v-for="eventType in eventTypes"
              :key="eventType"
              :value="eventType"
            >
              {{ eventType }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="min-h-0 flex-1 space-y-2 overflow-auto rounded-md border bg-muted/20 p-2">
      <p
        v-if="!displayedEvents.length"
        class="text-xs text-muted-foreground"
      >
        {{ t('platform.workbench.agent.debugTimeline.empty') }}
      </p>

      <article
        v-for="event in displayedEvents"
        :key="event.id"
        class="rounded border bg-background p-2"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <Badge variant="secondary">{{ event.type }}</Badge>
            <p class="text-xs text-muted-foreground">{{ formatTime(event.ts) }}</p>
          </div>
        </div>
        <div
          v-if="event.sessionId || event.runId || event.turnId || event.traceId || event.messageId"
          class="mb-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
        >
          <span v-if="event.sessionId">session: {{ event.sessionId }}</span>
          <span v-if="event.runId">run: {{ event.runId }}</span>
          <span v-if="event.turnId">turn: {{ event.turnId }}</span>
          <span v-if="event.traceId">trace: {{ event.traceId }}</span>
          <span v-if="event.messageId">message: {{ event.messageId }}</span>
        </div>
        <pre class="overflow-auto text-[11px] leading-4 text-muted-foreground">{{ formatPayload(event.payload) }}</pre>
      </article>
    </div>
  </div>
</template>
