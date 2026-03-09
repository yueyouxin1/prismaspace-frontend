import { computed, onMounted, watch, type ComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlatformStore } from '@app/stores/platform'

export interface UseResourceWorkbenchRouteGuardOptions {
  supportedPanels: readonly string[]
}

export interface ResourceWorkbenchRouteGuardResult {
  workspaceUuid: ComputedRef<string>
  resourceUuid: ComputedRef<string>
  projectUuid: ComputedRef<string | null>
  panel: ComputedRef<string>
  shellLoading: ComputedRef<boolean>
}

export const useResourceWorkbenchRouteGuard = (
  options: UseResourceWorkbenchRouteGuardOptions,
): ResourceWorkbenchRouteGuardResult => {
  const route = useRoute()
  const router = useRouter()
  const store = usePlatformStore()

  const workspaceUuid = computed(() => String(route.params.workspaceUuid ?? ''))
  const resourceUuid = computed(() => String(route.params.resourceUuid ?? ''))
  const projectUuid = computed(() => {
    const raw = route.query.projectUuid
    const value = Array.isArray(raw) ? raw[0] : raw
    return typeof value === 'string' && value ? value : null
  })
  const panel = computed(() => {
    const raw = String(route.params.panel ?? 'editor')
    return options.supportedPanels.includes(raw) ? raw : 'editor'
  })

  onMounted(async () => {
    await store.loadPlatformContext()
  })

  watch(
    () => route.params.panel,
    async (nextPanel) => {
      if (!options.supportedPanels.includes(String(nextPanel ?? ''))) {
        await router.replace(`/studio/workspaces/${workspaceUuid.value}/resources/${resourceUuid.value}/editor`)
      }
    },
    { immediate: true },
  )

  watch(
    [workspaceUuid, () => store.workspaces.length],
    ([nextWorkspaceUuid]) => {
      const selected = store.currentWorkspace?.uuid
      if (
        nextWorkspaceUuid
        && selected !== nextWorkspaceUuid
        && store.workspaces.some((workspace) => workspace.uuid === nextWorkspaceUuid)
      ) {
        store.switchWorkspace(nextWorkspaceUuid)
      }
    },
    { immediate: true },
  )

  return {
    workspaceUuid,
    resourceUuid,
    projectUuid,
    panel,
    shellLoading: computed(() => store.loading),
  }
}
