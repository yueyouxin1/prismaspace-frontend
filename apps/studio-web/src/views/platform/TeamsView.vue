<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { usePlatformStore } from '@app/stores/platform'
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

const teams = computed(() => store.teams)

const refreshPage = async (): Promise<void> => {
  await store.loadPlatformContext()
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.teams.title')"
    :subtitle="t('platform.pages.teams.subtitle')"
    :loading="store.loading"
    @refresh="refreshPage"
  >
    <div class="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('platform.pages.teams.listTitle') }}</CardTitle>
          <CardDescription>{{ t('platform.pages.teams.listDescription') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="team in teams"
            :key="team.uuid"
            class="rounded-md border px-3 py-2"
          >
            <p class="text-sm font-medium">{{ team.name }}</p>
            <p class="text-muted-foreground text-xs">{{ team.uuid }}</p>
          </div>
          <p v-if="!teams.length" class="text-muted-foreground text-sm">
            {{ t('platform.pages.teams.empty') }}
          </p>
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
</template>

