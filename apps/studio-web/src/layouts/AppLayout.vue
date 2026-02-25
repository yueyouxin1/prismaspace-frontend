<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { usePlatformStore } from '@app/stores/platform'

const route = useRoute()
const store = usePlatformStore()

const navItems = [
  { path: '/', label: '首页' },
  { path: '/console', label: '控制台' },
  { path: '/projects', label: '项目' },
  { path: '/pricing', label: '订阅' },
  { path: '/billing/invoices', label: '账单' },
  { path: '/settings/team', label: '团队设置' },
]

const workspaceName = computed(() => store.currentWorkspace?.name ?? 'Unknown Workspace')
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b bg-card/60 backdrop-blur">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-sm font-semibold tracking-wide">
            PrismaSpace
          </RouterLink>
          <nav class="hidden items-center gap-2 md:flex">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="rounded px-3 py-1.5 text-sm"
              :class="route.path.startsWith(item.path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <span class="hidden text-xs text-muted-foreground md:inline">{{ workspaceName }}</span>
          <Button size="sm" as="a" href="/projects?create=1&source=header">
            新建
          </Button>
          <Button size="sm" variant="outline" @click="store.signOut()">退出</Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      <slot />
    </main>
  </div>
</template>
