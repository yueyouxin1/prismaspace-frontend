import type { Component } from 'vue'
import type { PrismaspaceClient } from '@prismaspace/sdk'

export interface ResourceWorkbenchCommonProps {
  client: PrismaspaceClient
  workspaceUuid: string
  resourceUuid: string
  projectUuid?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
  panel?: string
  onBack?: () => void
  onError?: (error: unknown) => void
}

export interface ResourceNavigationIntentBack {
  type: 'back'
}

export interface ResourceNavigationIntentRoute {
  type: 'route'
  to: string
  replace?: boolean
}

export interface ResourceNavigationIntentWorkbench {
  type: 'resource-workbench'
  workspaceUuid: string
  resourceUuid: string
  panel?: string
  projectUuid?: string | null
  replace?: boolean
}

export type ResourceNavigationIntent =
  | ResourceNavigationIntentBack
  | ResourceNavigationIntentRoute
  | ResourceNavigationIntentWorkbench

export interface ResourceWorkbenchRegistration {
  resourceType: string
  component: Component
}

export type ResourceWorkbenchRegistry = Record<string, Component>
