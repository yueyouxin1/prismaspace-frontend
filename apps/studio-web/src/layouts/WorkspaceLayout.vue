<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const links = [
  { path: '/account/profile', label: '个人资料' },
  { path: '/account/security', label: '安全设置' },
  { path: '/settings/team', label: '团队设置' },
  { path: '/settings/workspace', label: '工作空间设置' },
  { path: '/billing/usage', label: '用量与配额' },
  { path: '/billing/payment-methods', label: '支付方式' },
  { path: '/billing/invoices', label: '账单与发票' },
]
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <div class="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_minmax(0,1fr)] md:px-8">
      <aside class="rounded-xl border bg-card p-3">
        <p class="px-2 pb-2 text-xs font-semibold text-muted-foreground">
          设置中心
        </p>
        <nav class="space-y-1">
          <RouterLink
            v-for="item in links"
            :key="item.path"
            :to="item.path"
            class="block rounded-md px-2 py-2 text-sm"
            :class="route.path === item.path ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </aside>
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>
