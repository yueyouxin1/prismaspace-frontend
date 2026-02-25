<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui-shadcn/components/ui/sidebar'

interface DocumentNavItem {
  name: string
  path: string
  icon?: Component
}

defineProps<{
  items: DocumentNavItem[]
  label: string
}>()

const route = useRoute()
</script>

<template>
  <SidebarGroup class="group-data-[collapsible=icon]:hidden">
    <SidebarGroupLabel>{{ label }}</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in items" :key="item.name">
        <SidebarMenuButton as-child :is-active="route.path.startsWith(item.path)">
          <RouterLink :to="item.path">
            <component :is="item.icon" v-if="item.icon" />
            <span>{{ item.name }}</span>
          </RouterLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>

