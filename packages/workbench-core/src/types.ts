export type SupportedResourceType = 'uiapp' | 'agent' | 'workflow' | 'knowledge' | 'tenantdb' | 'tool'

export interface WorkbenchScaffoldProps {
  title: string
  description: string
  resourceName: string
  resourceType: SupportedResourceType | string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}
