<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { usePlatformStore } from '@app/stores/platform'
import { studioAssetHubAdapter } from '@app/services/asset-hub/adapter'
import { AssetManagerPanel } from '@repo/asset-hub'

const { t } = useI18n()
const store = usePlatformStore()
const panelVersion = ref(0)

onMounted(() => {
  void store.loadPlatformContext()
})

const workspaceUuid = computed(() => store.currentWorkspaceId)

const refreshPage = async (): Promise<void> => {
  await store.loadPlatformContext()
  panelVersion.value += 1
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.assets.title')"
    :subtitle="t('platform.pages.assets.subtitle')"
    :loading="false"
    @refresh="refreshPage"
  >
    <div class="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
      <AssetManagerPanel
        v-if="workspaceUuid"
        :key="`${workspaceUuid}-${panelVersion}`"
        :workspace-uuid="workspaceUuid"
        :adapter="studioAssetHubAdapter"
      />

      <div v-else class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {{ t('platform.header.noWorkspace') }}
      </div>
    </div>
  </PlatformShell>
</template>
