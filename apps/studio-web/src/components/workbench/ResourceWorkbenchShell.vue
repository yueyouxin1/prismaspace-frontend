<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { IconArrowLeft, IconRefresh } from '@tabler/icons-vue'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'

interface WorkbenchPanelLink {
  key: string
  label: string
  to: string
}

withDefaults(
  defineProps<{
    resourceName: string
    resourceType: string
    workspaceLabel?: string
    loading?: boolean
    panels?: WorkbenchPanelLink[]
    activePanel?: string
  }>(),
  {
    workspaceLabel: '',
    loading: false,
    panels: () => [],
    activePanel: 'editor',
  },
)

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'refresh'): void
}>()
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div class="flex h-14 items-center justify-between px-4 md:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" class="gap-1" @click="emit('back')">
            <IconArrowLeft class="size-4" />
            Back
          </Button>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ resourceName }}</p>
            <p class="truncate text-xs text-muted-foreground">
              {{ workspaceLabel || '-' }}
            </p>
          </div>
          <Badge variant="secondary">{{ resourceType }}</Badge>
          <Badge v-if="loading" variant="outline">Syncing...</Badge>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" class="gap-1" @click="emit('refresh')">
            <IconRefresh class="size-4" />
            Refresh
          </Button>
        </div>
      </div>
      <div v-if="panels.length" class="flex items-center gap-1 border-t px-4 py-2 md:px-6">
        <RouterLink
          v-for="panel in panels"
          :key="panel.key"
          :to="panel.to"
          class="rounded-md px-3 py-1.5 text-sm transition-colors"
          :class="activePanel === panel.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
        >
          {{ panel.label }}
        </RouterLink>
      </div>
    </header>

    <main class="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside class="border-r bg-muted/20 p-3">
        <slot name="left" />
      </aside>
      <section class="min-w-0 border-r p-4 md:p-6">
        <slot />
      </section>
      <aside class="bg-muted/10 p-3">
        <slot name="right" />
      </aside>
    </main>

    <footer class="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground md:px-6">
      <slot name="footer" />
    </footer>
  </div>
</template>
