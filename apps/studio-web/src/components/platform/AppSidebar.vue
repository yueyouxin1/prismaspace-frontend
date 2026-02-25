<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  IconBriefcase,
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconUsers,
} from '@tabler/icons-vue'
import NavDocuments from '@app/components/platform/NavDocuments.vue'
import NavMain from '@app/components/platform/NavMain.vue'
import NavSecondary from '@app/components/platform/NavSecondary.vue'
import NavUser from '@app/components/platform/NavUser.vue'
import WorkspaceSwitcher from '@app/components/platform/WorkspaceSwitcher.vue'
import { usePlatformStore } from '@app/stores/platform'
import { useI18n } from 'vue-i18n'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@repo/ui-shadcn/components/ui/sidebar'

const emit = defineEmits<{
  (e: 'open-settings'): void
}>()

const { t } = useI18n()
const store = usePlatformStore()

onMounted(() => {
  void store.loadPlatformContext()
})

const workspaceOptions = computed(() => {
  return store.workspaces.map((workspace) => ({
    uuid: workspace.uuid,
    name: workspace.name,
    badge: workspace.uuid === store.currentWorkspaceId ? t('platform.sidebar.current') : '',
  }))
})

const navMain = computed(() => [
  {
    title: t('platform.nav.dashboard'),
    path: '/',
    icon: IconDashboard,
  },
  {
    title: t('platform.nav.projects'),
    path: '/projects',
    icon: IconFolder,
  },
  {
    title: t('platform.nav.resources'),
    path: '/resources',
    icon: IconBriefcase,
  },
  {
    title: t('platform.nav.teams'),
    path: '/teams',
    icon: IconUsers,
  },
  {
    title: t('platform.nav.workspaces'),
    path: '/workspaces',
    icon: IconListDetails,
  },
  {
    title: t('platform.nav.pricing'),
    path: '/pricing',
    icon: IconChartBar,
  },
])

const navSecondary = computed(() => [
  {
    title: t('platform.nav.settings'),
    path: '/settings/team',
    icon: IconSettings,
    action: 'open-settings' as const,
  },
  {
    title: t('platform.nav.help'),
    path: '/components',
    icon: IconHelp,
  },
  {
    title: t('platform.nav.search'),
    path: '/projects',
    icon: IconSearch,
  },
])

const documentLinks = computed(() => [
  {
    name: t('platform.nav.entitlements'),
    path: '/entitlements',
    icon: IconChartBar,
  },
  {
    name: t('platform.nav.settingsTeam'),
    path: '/settings/team',
    icon: IconUsers,
  },
  {
    name: t('platform.nav.componentDemos'),
    path: '/components',
    icon: IconFolder,
  },
])

const userViewModel = computed(() => ({
  name: store.user?.nick_name || store.user?.email || 'User',
  email: store.user?.email || '-',
  avatar: store.user?.avatar || undefined,
}))

const onSelectWorkspace = (workspaceUuid: string): void => {
  store.switchWorkspace(workspaceUuid)
}
</script>

<template>
  <Sidebar collapsible="offcanvas">
    <SidebarHeader>
      <WorkspaceSwitcher
        :workspaces="workspaceOptions"
        :active-workspace-uuid="store.currentWorkspaceId"
        :title="t('platform.sidebar.workspaces')"
        @select-workspace="onSelectWorkspace"
      />
    </SidebarHeader>
    <SidebarContent>
      <NavMain
        :items="navMain"
        :quick-create-label="t('platform.nav.quickCreate')"
        quick-create-path="/projects?create=1&source=sidebar"
      />
      <NavDocuments :items="documentLinks" :label="t('platform.sidebar.shortcuts')" />
      <NavSecondary
        :items="navSecondary"
        class="mt-auto"
        @open-settings="emit('open-settings')"
      />
    </SidebarContent>
    <SidebarFooter>
      <NavUser :user="userViewModel" />
    </SidebarFooter>
  </Sidebar>
</template>
