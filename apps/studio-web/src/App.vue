<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@app/layouts/AppLayout.vue'
import AuthLayout from '@app/layouts/AuthLayout.vue'
import BlankLayout from '@app/layouts/BlankLayout.vue'
import GlobalFeedbackHost from '@app/components/platform/GlobalFeedbackHost.vue'
import ProjectCreationHost from '@app/components/platform/ProjectCreationHost.vue'
import MarketingLayout from '@app/layouts/MarketingLayout.vue'
import WorkspaceLayout from '@app/layouts/WorkspaceLayout.vue'

const route = useRoute()

const layoutComponent = computed(() => {
  if (route.meta.layout === 'console' || route.meta.layout === 'app') {
    return AppLayout
  }

  if (route.meta.layout === 'settings' || route.meta.layout === 'workspace') {
    return WorkspaceLayout
  }

  if (route.meta.layout === 'marketing') {
    return MarketingLayout
  }

  if (route.meta.layout === 'auth') {
    return AuthLayout
  }

  return BlankLayout
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="layoutComponent">
      <component :is="Component" />
    </component>
  </RouterView>
  <GlobalFeedbackHost />
  <ProjectCreationHost />
</template>
