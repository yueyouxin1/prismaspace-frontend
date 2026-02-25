<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useColorMode, useStorage } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import AppSidebar from '@app/components/platform/AppSidebar.vue'
import SiteHeader from '@app/components/platform/SiteHeader.vue'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { SidebarInset, SidebarProvider } from '@repo/ui-shadcn/components/ui/sidebar'
import { Switch } from '@repo/ui-shadcn/components/ui/switch'

type ThemeName =
  | 'default'
  | 'stone'
  | 'zinc'
  | 'gray'
  | 'slate'
  | 'red'
  | 'rose'
  | 'orange'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'violet'

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
const isSettingsOpen = ref(false)
const selectedTheme = useStorage<ThemeName>('dashboard-theme', 'default')
const colorMode = useColorMode()

const themes: Array<{ value: ThemeName; label: string; description: string }> = [
  { value: 'default', label: 'Neutral', description: 'Official default palette.' },
  { value: 'stone', label: 'Stone', description: 'Stone base color.' },
  { value: 'zinc', label: 'Zinc', description: 'Zinc base color.' },
  { value: 'gray', label: 'Gray', description: 'Gray base color.' },
  { value: 'slate', label: 'Slate', description: 'Slate base color.' },
  { value: 'red', label: 'Red', description: 'Red base color.' },
  { value: 'rose', label: 'Rose', description: 'Rose base color.' },
  { value: 'orange', label: 'Orange', description: 'Orange base color.' },
  { value: 'green', label: 'Green', description: 'Green base color.' },
  { value: 'blue', label: 'Blue', description: 'Blue base color.' },
  { value: 'yellow', label: 'Yellow', description: 'Yellow base color.' },
  { value: 'violet', label: 'Violet', description: 'Violet base color.' },
]

const isDarkMode = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.value = value ? 'dark' : 'light'
  },
})

watch(
  selectedTheme,
  (theme) => {
    if (theme === 'default') {
      delete document.documentElement.dataset.theme
      return
    }
    document.documentElement.dataset.theme = theme
  },
  { immediate: true },
)
</script>

<template>
  <SidebarProvider
    :style="{
      '--sidebar-width': 'calc(var(--spacing) * 72)',
      '--header-height': 'calc(var(--spacing) * 12)',
    }"
  >
    <AppSidebar variant="inset" @open-settings="isSettingsOpen = true" />
    <SidebarInset>
      <SiteHeader
        :title="props.title"
        :subtitle="props.subtitle"
        :loading="props.loading"
        @refresh="emit('refresh')"
      />
      <Dialog :open="isSettingsOpen" @update:open="isSettingsOpen = $event">
        <DialogContent class="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{{ t('platform.settings.title') }}</DialogTitle>
            <DialogDescription>
              {{ t('platform.settings.description') }}
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-6">
            <div class="space-y-3">
              <Label>{{ t('platform.settings.theme') }}</Label>
              <div class="grid gap-2">
                <Button
                  v-for="theme in themes"
                  :key="theme.value"
                  :variant="selectedTheme === theme.value ? 'default' : 'outline'"
                  class="justify-between"
                  @click="selectedTheme = theme.value"
                >
                  <span>{{ theme.label }}</span>
                  <span class="text-muted-foreground text-xs">{{ theme.description }}</span>
                </Button>
              </div>
            </div>
            <div class="rounded-lg border p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-medium">
                    {{ t('platform.settings.darkMode') }}
                  </p>
                  <p class="text-muted-foreground text-xs">
                    {{ t('platform.settings.darkModeHint') }}
                  </p>
                </div>
                <Switch :model-value="isDarkMode" @update:model-value="isDarkMode = !!$event" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div class="flex flex-1 flex-col">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

