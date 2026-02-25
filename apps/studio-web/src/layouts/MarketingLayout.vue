<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { usePlatformStore } from '@app/stores/platform'

const store = usePlatformStore()
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <RouterLink to="/" class="text-base font-semibold tracking-wide">
          PrismaSpace
        </RouterLink>
        <nav class="flex items-center gap-2">
          <RouterLink to="/" class="px-3 py-1.5 text-sm text-muted-foreground">首页</RouterLink>
          <RouterLink to="/pricing" class="px-3 py-1.5 text-sm text-muted-foreground">定价</RouterLink>
          <RouterLink to="/components" class="px-3 py-1.5 text-sm text-muted-foreground">组件演示</RouterLink>
          <Button size="sm" as="a" :href="store.isAuthenticated ? '/projects?create=1&source=header' : '/auth/sign-in'">
            开始创建
          </Button>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      <slot />
    </main>
    <footer class="mt-12 border-t">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-xs text-muted-foreground md:px-8">
        <span>© 2026 PrismaSpace</span>
        <div class="flex items-center gap-4">
          <RouterLink to="/auth/sign-up">注册</RouterLink>
          <RouterLink to="/pricing">订阅</RouterLink>
        </div>
      </div>
    </footer>
  </div>
</template>
