<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { IconCirclePlusFilled } from '@tabler/icons-vue'
import { ChevronRight } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui-shadcn/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@repo/ui-shadcn/components/ui/sidebar'

interface NavChildItem {
  title: string
  path: string
}

interface NavItem {
  title: string
  path: string
  icon?: Component
  items?: NavChildItem[]
}

defineProps<{
  items: NavItem[]
  quickCreateLabel: string
  quickCreatePath: string
}>()

const route = useRoute()

const isItemActive = (path: string): boolean => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const activePath = computed(() => route.path)
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent class="flex flex-col gap-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            size="default"
            tooltip="Quick Create"
            class="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 justify-center px-3 py-5 text-center text-sm shadow-sm ring-1 ring-primary/30 duration-200 ease-linear focus-visible:ring-2"
          >
            <RouterLink :to="quickCreatePath" class="flex w-full items-center justify-center gap-2 text-center">
              <IconCirclePlusFilled />
              <span>{{ quickCreateLabel }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarMenu>
        <Collapsible
          v-for="item in items"
          :key="item.title"
          as-child
          :default-open="item.items?.some((child) => activePath.startsWith(child.path)) ?? false"
          class="group/collapsible"
        >
          <SidebarMenuItem v-if="item.items?.length">
            <CollapsibleTrigger as-child>
              <SidebarMenuButton :tooltip="item.title" :is-active="isItemActive(item.path)">
                <component :is="item.icon" v-if="item.icon" />
                <span>{{ item.title }}</span>
                <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem v-for="subItem in item.items" :key="subItem.title">
                  <SidebarMenuSubButton as-child :is-active="isItemActive(subItem.path)">
                    <RouterLink :to="subItem.path">
                      <span>{{ subItem.title }}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>

          <SidebarMenuItem v-else>
            <SidebarMenuButton as-child :tooltip="item.title" :is-active="isItemActive(item.path)">
              <RouterLink :to="item.path">
                <component :is="item.icon" v-if="item.icon" />
                <span>{{ item.title }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
