<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <header class="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5 md:px-8">
      <RouterLink to="/" class="text-sm font-semibold">
        PrismaSpace
      </RouterLink>
      <RouterLink to="/pricing" class="text-sm text-muted-foreground">
        查看定价
      </RouterLink>
    </header>
    <main class="mx-auto flex w-full max-w-4xl items-center justify-center px-4 py-8 md:px-8">
      <slot />
    </main>
  </div>
</template>
