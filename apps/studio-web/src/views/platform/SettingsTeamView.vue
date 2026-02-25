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

const currentTeamName = computed(() => store.currentTeam?.name ?? t('platform.pages.settingsTeam.noTeam'))
const currentWorkspaceName = computed(() => store.currentWorkspace?.name ?? t('platform.pages.settingsTeam.noWorkspace'))

const refreshPage = async (): Promise<void> => {
  await store.loadPlatformContext()
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.settingsTeam.title')"
    :subtitle="t('platform.pages.settingsTeam.subtitle')"
    :loading="store.loading"
    @refresh="refreshPage"
  >
    <div class="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.settingsTeam.scopeTitle') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.settingsTeam.scopeDescription') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <div class="flex items-center justify-between rounded-md border px-3 py-2">
            <span class="text-sm">{{ t('platform.pages.settingsTeam.currentTeam') }}</span>
            <Badge variant="outline">{{ currentTeamName }}</Badge>
          </div>
          <div class="flex items-center justify-between rounded-md border px-3 py-2">
            <span class="text-sm">{{ t('platform.pages.settingsTeam.currentWorkspace') }}</span>
            <Badge variant="outline">{{ currentWorkspaceName }}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
</template>

