<script setup lang="ts">
import { ChevronsUpDown } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@repo/ui-shadcn/components/ui/sidebar'

interface WorkspaceOption {
  uuid: string
  name: string
  badge?: string
}

const props = defineProps<{
  workspaces: WorkspaceOption[]
  activeWorkspaceUuid?: string | null
  title: string
}>()

const emit = defineEmits<{
  (event: 'select-workspace', workspaceUuid: string): void
}>()

const { isMobile } = useSidebar()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div
              class="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
            >
              {{
                workspaces.find((workspace) => workspace.uuid === activeWorkspaceUuid)?.name.slice(0, 2).toUpperCase() ??
                  '--'
              }}
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">
                {{ workspaces.find((workspace) => workspace.uuid === activeWorkspaceUuid)?.name ?? title }}
              </span>
              <span class="truncate text-xs text-muted-foreground">
                {{ workspaces.find((workspace) => workspace.uuid === activeWorkspaceUuid)?.badge ?? '-' }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            {{ title }}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="workspace in workspaces"
            :key="workspace.uuid"
            class="gap-2 p-2"
            @click="emit('select-workspace', workspace.uuid)"
          >
            <div class="flex size-6 items-center justify-center rounded-sm border text-xs font-semibold">
              {{ workspace.name.slice(0, 1).toUpperCase() }}
            </div>
            <span class="truncate">{{ workspace.name }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
