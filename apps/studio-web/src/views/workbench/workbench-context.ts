import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { AnyInstanceRead, ResourceDetailRead } from '@app/services/api/contracts'

export interface ResourceWorkbenchContextValue {
  workspaceUuid: ComputedRef<string>
  projectUuid: ComputedRef<string | null>
  resourceUuid: ComputedRef<string>
  panel: ComputedRef<string>
  resource: ComputedRef<ResourceDetailRead | null>
  workspaceInstanceUuid: ComputedRef<string | null>
  latestPublishedInstanceUuid: ComputedRef<string | null>
  workspaceInstance: ComputedRef<AnyInstanceRead | null>
  refresh: () => Promise<void>
}

const RESOURCE_WORKBENCH_CONTEXT_KEY: InjectionKey<ResourceWorkbenchContextValue> = Symbol('resource-workbench-context')

export const provideResourceWorkbenchContext = (context: ResourceWorkbenchContextValue): void => {
  provide(RESOURCE_WORKBENCH_CONTEXT_KEY, context)
}

export const useResourceWorkbenchContext = (): ResourceWorkbenchContextValue => {
  const context = inject(RESOURCE_WORKBENCH_CONTEXT_KEY)
  if (!context) {
    throw new Error('Resource workbench context is not available.')
  }
  return context
}
