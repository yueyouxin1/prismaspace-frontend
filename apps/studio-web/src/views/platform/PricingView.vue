<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { platformQueryKeys } from '@app/services/api/query-keys'
import { productApi } from '@app/services/api/product-client'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'

const { t, locale } = useI18n()

const productsQuery = useQuery({
  queryKey: platformQueryKeys.productsPublic,
  queryFn: () => productApi.listPublicProducts(),
})

const products = computed(() => productsQuery.data.value ?? [])

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: currency || 'USD',
  })

const formatPrice = (amount: number | string, currency: string): string => {
  const numeric = typeof amount === 'number' ? amount : Number(amount)
  return currencyFormatter(currency).format(Number.isFinite(numeric) ? numeric : 0)
}

const firstPriceLabel = (prices: Array<{ amount: number | string; currency: string }>): string | null => {
  const price = prices[0]
  if (!price) {
    return null
  }
  return formatPrice(price.amount, price.currency)
}

const refreshPage = async (): Promise<void> => {
  await productsQuery.refetch()
}
</script>

<template>
  <PlatformShell
    :title="t('platform.pages.pricing.title')"
    :subtitle="t('platform.pages.pricing.subtitle')"
    :loading="productsQuery.isLoading.value"
    @refresh="refreshPage"
  >
    <div class="grid gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3">
      <template v-if="productsQuery.isLoading.value">
        <Card v-for="index in 3" :key="index">
          <CardHeader>
            <Skeleton class="h-6 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton class="h-5 w-full" />
            <Skeleton class="mt-2 h-5 w-5/6" />
          </CardContent>
        </Card>
      </template>

      <Card v-for="product in products" v-else :key="product.id">
        <CardHeader>
          <div class="flex items-center justify-between gap-2">
            <CardTitle>{{ product.label }}</CardTitle>
            <Badge v-if="product.plan_tier" variant="outline">{{ product.plan_tier }}</Badge>
          </div>
          <CardDescription>{{ product.description || '-' }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-2">
          <p v-if="firstPriceLabel(product.prices)" class="text-sm font-medium">
            {{
              t('platform.pages.pricing.priceFrom', {
                value: firstPriceLabel(product.prices),
              })
            }}
          </p>
          <p class="text-muted-foreground text-xs">
            {{ t('platform.pages.pricing.entitlementCount', { value: product.entitlements.length }) }}
          </p>
        </CardContent>
      </Card>

      <p v-if="!productsQuery.isLoading.value && !products.length" class="text-muted-foreground text-sm">
        {{ t('platform.pages.pricing.empty') }}
      </p>
    </div>
  </PlatformShell>
</template>
