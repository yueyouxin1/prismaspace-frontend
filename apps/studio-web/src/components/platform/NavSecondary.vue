<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui-shadcn/components/ui/sidebar'

interface NavItem {
  title: string
  path: string
  icon?: Component
  action?: 'open-settings'
}

defineProps<{
  items: NavItem[]
}>()

const emit = defineEmits<{
  (e: 'open-settings'): void
}>()

const route = useRoute()
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem
          v-for="item in items"
          :key="item.title"
        >
          <SidebarMenuButton
            v-if="item.action === 'open-settings'"
            @click="emit('open-settings')"
          >
            <component :is="item.icon" v-if="item.icon" />
            {{ item.title }}
          </SidebarMenuButton>
          <SidebarMenuButton v-else as-child :is-active="route.path.startsWith(item.path)">
            <RouterLink :to="item.path">
              <component :is="item.icon" v-if="item.icon" />
              {{ item.title }}
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>

