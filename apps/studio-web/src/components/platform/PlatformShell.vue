<script setup lang="ts">
import {ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlatformTheme } from "@app/core/theme"
import AppSidebar from '@app/components/platform/AppSidebar.vue'
import SiteHeader from '@app/components/platform/SiteHeader.vue'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Label } from '@prismaspace/ui-shadcn/components/ui/label'
import { SidebarInset, SidebarProvider } from '@prismaspace/ui-shadcn/components/ui/sidebar'
import { Switch } from '@prismaspace/ui-shadcn/components/ui/switch'

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
const { themes, selectedTheme, isDarkMode, setTheme } = usePlatformTheme()
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

