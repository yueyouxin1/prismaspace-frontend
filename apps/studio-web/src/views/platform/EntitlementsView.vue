<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { entitlementApi } from '@app/services/api/entitlement-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { usePlatformStore } from '@app/stores/platform'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Progress } from '@repo/ui-shadcn/components/ui/progress'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const store = usePlatformStore()
const { t } = useI18n()

onMounted(() => {
  void store.loadPlatformContext()
})

const entitlementOwnerKey = computed(() => {
  const workspace = store.currentWorkspace
  if (!workspace) {
    return 'none'
  }
  return workspace.owner.type === 'team' ? `team:${workspace.owner.uuid}` : 'me'
})

const entitlementsQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.entitlements(entitlementOwnerKey.value)),
  enabled: computed(() => entitlementOwnerKey.value !== 'none'),
  queryFn: async () => {
    const workspace = store.currentWorkspace
    if (!workspace) {
      return []
    }

    if (workspace.owner.type === 'team') {
      return entitlementApi.listTeamEntitlements(workspace.owner.uuid)
    }
    return entitlementApi.listMyEntitlements()
  },
})

const entitlements = computed(() => entitlementsQuery.data.value ?? [])

const parseNumeric = (value: number | string | undefined): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const usageRate = (granted: number | string, used: number | string): number => {
  const grantedValue = parseNumeric(granted)
  const usedValue = parseNumeric(used)
  if (grantedValue <= 0) {
    return 0
  }
  return Math.min(100, Math.round((usedValue / grantedValue) * 100))
}

const refreshPage = async (): Promise<void> => {
  await Promise.all([store.loadPlatformContext(), entitlementsQuery.refetch()])
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.entitlements.title')"
    :subtitle="t('platform.pages.entitlements.subtitle')"
    :loading="entitlementsQuery.isLoading.value"
    @refresh="refreshPage"
  >
    <div class="space-y-4 p-4 md:p-6">
      <template v-if="entitlementsQuery.isLoading.value">
        <Card>
          <CardHeader>
            <Skeleton class="h-6 w-1/2" />
            <Skeleton class="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-8 w-full" />
          </CardContent>
        </Card>
      </template>

      <Card v-for="entitlement in entitlements" v-else :key="entitlement.id">
        <CardHeader>
          <CardTitle>{{ entitlement.feature.label }}</CardTitle>
          <CardDescription>
            {{ entitlement.source_product_name }} · {{ entitlement.status }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <Progress :model-value="usageRate(entitlement.granted_quota, entitlement.consumed_usage)" />
          <p class="text-sm">
            {{
              t('platform.pages.entitlements.usage', {
                used: parseNumeric(entitlement.consumed_usage),
                total: parseNumeric(entitlement.granted_quota),
              })
            }}
          </p>
        </CardContent>
      </Card>

      <p v-if="!entitlementsQuery.isLoading.value && !entitlements.length" class="text-muted-foreground text-sm">
        {{ t('platform.pages.entitlements.empty') }}
      </p>
    </div>
  </PlatformShell>
</template>

