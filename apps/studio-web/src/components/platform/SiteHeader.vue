<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconRefresh } from '@tabler/icons-vue'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import { SidebarTrigger } from '@repo/ui-shadcn/components/ui/sidebar'
import { usePlatformStore } from '@app/stores/platform'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    loading?: boolean
  }>(),
  {
    subtitle: '',
    loading: false,
  },
)

const emit = defineEmits<{
  (event: 'refresh'): void
}>()

const { t } = useI18n()
const store = usePlatformStore()

const workspaceLabel = computed(() => store.currentWorkspace?.name ?? t('platform.header.noWorkspace'))
</script>

<template>
  <header class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
    <div class="flex w-full items-center gap-2 px-4 lg:px-6">
      <SidebarTrigger class="-ml-1" />
      <Separator
        orientation="vertical"
        class="mx-1 data-[orientation=vertical]:h-4"
      />
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">
          {{ props.title }}
        </p>
        <p v-if="props.subtitle" class="truncate text-xs text-muted-foreground">
          {{ props.subtitle }}
        </p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <Badge variant="outline">
          {{ workspaceLabel }}
        </Badge>
        <Button size="sm" variant="outline" :disabled="props.loading" @click="emit('refresh')">
          <IconRefresh />
          {{ t('common.refresh') }}
        </Button>
      </div>
    </div>
  </header>
</template>

