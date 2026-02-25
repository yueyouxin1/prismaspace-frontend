<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { usePlatformStore } from '@app/stores/platform'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'

const store = usePlatformStore()
const { t } = useI18n()

onMounted(() => {
  void store.loadPlatformContext()
})

const workspaces = computed(() => store.workspaces)

const refreshPage = async (): Promise<void> => {
  await store.loadPlatformContext()
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.workspaces.title')"
    :subtitle="t('platform.pages.workspaces.subtitle')"
    :loading="store.loading"
    @refresh="refreshPage"
  >
    <div class="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.workspaces.listTitle') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.workspaces.listDescription') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="workspace in workspaces"
            :key="workspace.uuid"
            class="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ workspace.name }}</p>
              <p class="text-muted-foreground text-xs">{{ workspace.uuid }}</p>
            </div>
            <Badge variant="outline">{{ workspace.status }}</Badge>
          </div>
          <p v-if="!workspaces.length" class="text-muted-foreground text-sm">
            {{ t('platform.pages.workspaces.empty') }}
          </p>
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
</template>

