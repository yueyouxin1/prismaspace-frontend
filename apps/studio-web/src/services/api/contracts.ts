export interface JsonResponse<T> {
  data: T
  msg: string
  status: number
}

export interface MsgResponse {
  msg: string
}

export type JsonRecord = Record<string, unknown>

export interface CreatorInfo {
  uuid: string
  nick_name?: string | null
  avatar?: string | null
}

export interface UserRead {
  uuid: string
  email?: string | null
  phone_number?: string | null
  nick_name?: string | null
  avatar?: string | null
  status: string
  user_type: string
}

export interface UserCreateRequest {
  email?: string
  phone_number?: string
  nick_name?: string
  avatar?: string
  password?: string
}

export interface TokenRequest {
  grant_type: 'password' | 'verification_code' | 'oauth_wechat'
  identifier?: string
  password?: string
  code?: string
  oauth_code?: string
}

export interface TokenRead {
  access_token: string
  token_type: string
}

export interface TeamRead {
  uuid: string
  name: string
  avatar?: string | null
}

export interface TeamCreateRequest {
  name: string
  avatar?: string
}

export interface TeamUpdateRequest {
  name: string
  avatar?: string
}

export interface RoleSummaryRead {
  uuid: string
  name: string
  label: string
  description?: string | null
  role_type: string
}

export interface TeamMemberRead {
  uuid: string
  user: UserRead
  role: RoleSummaryRead
}

export interface OwnerInfo {
  uuid: string
  type: 'user' | 'team'
  name: string
  avatar?: string | null
}

export interface WorkspaceRead {
  uuid: string
  name: string
  avatar?: string | null
  status: string
  owner: OwnerInfo
}

export interface WorkspaceCreateRequest {
  name: string
  avatar?: string
  owner_team_uuid: string
}

export interface WorkspaceUpdateRequest {
  name: string
  avatar?: string
}

export interface ProjectRead {
  uuid: string
  name: string
  description?: string | null
  avatar?: string | null
  status: string
  visibility: string
  creator: CreatorInfo
  main_resource_uuid?: string | null
  main_resource_name?: string | null
  main_application_type?: 'uiapp' | 'agent' | null
  created_at: string
  updated_at: string
}

export interface ProjectCreateRequest {
  name: string
  description?: string
  avatar?: string
  visibility?: 'private' | 'workspace' | 'public'
  main_application_type: 'uiapp' | 'agent'
}

export interface ProjectUpdateRequest {
  name: string
  description?: string
  avatar?: string
  visibility?: 'private' | 'workspace' | 'public'
}

export interface ProjectEnvConfigRead {
  env_config: JsonRecord
}

export interface ProjectEnvConfigUpdateRequest {
  env_config: JsonRecord
}

export interface ProjectDependencyNodeRead {
  resource_uuid: string
  instance_uuid: string
  name?: string | null
  resource_type?: string | null
  declared: boolean
  external: boolean
  node_tags: string[]
}

export interface ProjectDependencyEdgeRead {
  source_instance_uuid: string
  target_instance_uuid: string
  alias?: string | null
  relation_type: string
  relation_path?: string | null
}

export interface ProjectDependencyGraphRead {
  nodes: ProjectDependencyNodeRead[]
  edges: ProjectDependencyEdgeRead[]
}

export interface ResourceCreateRequest {
  name: string
  resource_type: string
  description?: string
}

export interface ResourceUpdateRequest {
  name: string
  description?: string
  avatar?: string
}

export interface ResourceRead {
  uuid: string
  name: string
  description?: string | null
  avatar?: string | null
  resource_type: string
  workspace_instance_uuid?: string | null
  latest_published_instance_uuid?: string | null
  creator: CreatorInfo
  created_at: string
  updated_at: string
}

export interface ResourceDetailRead extends ResourceRead {
  workspace_instance?: AnyInstanceRead | null
}

export type AnyInstanceRead = JsonRecord

export interface InstancePublishRequest {
  version_tag: string
  version_notes?: string
}

export interface ProjectResourceReferenceCreateRequest {
  resource_uuid: string
  alias?: string
  options?: JsonRecord
}

export interface ProjectResourceReferenceRead {
  id: number
  resource_uuid: string
  resource_name: string
  resource_type: string
  workspace_instance_uuid?: string | null
  latest_published_instance_uuid?: string | null
  creator?: CreatorInfo | null
  alias?: string | null
  options?: JsonRecord | null
  created_at: string
}

export interface ReferenceCreateRequest {
  target_instance_uuid: string
  source_node_uuid?: string
  alias?: string
  options?: JsonRecord
}

export interface ReferenceRead {
  id: number
  source_node_uuid?: string | null
  alias?: string | null
  options?: JsonRecord | null
  source_instance_uuid: string
  target_instance_uuid: string
  target_resource_name: string
  target_resource_type: string
  target_version_tag: string
}

export interface ResourceDependencyRead {
  resource_uuid: string
  instance_uuid: string
  alias?: string | null
}

export interface ResourceTypeRead {
  id: number
  name: string
  label: string
  description?: string | null
  is_application: boolean
  meta_policy?: JsonRecord | null
  allowed_visibilities: string[]
  allowed_channels: string[]
  requires_approval: boolean
}

export interface ResourceInstanceSummaryRead {
  uuid: string
  version_tag: string
  status: 'workspace' | 'draft' | 'published' | 'archived' | 'pending_approval' | string
  created_at: string
}

export interface UiPageMetaRead {
  page_uuid: string
  path: string
  label: string
  icon?: string | null
  display_order: number
  config: JsonRecord
}

export interface UiPageDetailRead extends UiPageMetaRead {
  data: JsonRecord[]
}

export interface UiPageCreateRequest extends UiPageDetailRead {}

export interface UiPageUpdateRequest {
  path?: string
  label?: string
  icon?: string
  display_order?: number
  config?: JsonRecord
  data?: JsonRecord[]
}

export interface UiAppMetadataRead {
  uuid: string
  version_tag: string
  status: string
  created_at: string
  creator: CreatorInfo
  global_config: JsonRecord
  navigation?: JsonRecord | null
  home_page_uuid?: string | null
  pages: UiPageMetaRead[]
}

export interface TenantColumnRead {
  uuid: string
  name: string
  label: string
  description?: string | null
  data_type: string
  is_nullable: boolean
  is_unique: boolean
  is_indexed: boolean
  is_vector_enabled: boolean
  is_primary_key: boolean
  default_value?: unknown
}

export interface TenantTableRead {
  uuid: string
  name: string
  label: string
  description?: string | null
  columns: TenantColumnRead[]
}

export interface DocumentRead {
  uuid: string
  file_name: string
  source_uri: string
  file_type?: string | null
  file_size?: number | null
  status: string
  error_message?: string | null
  chunk_count: number
  created_at: string
}

export interface PaginatedDocumentsRead {
  items: DocumentRead[]
  total: number
  page: number
  limit: number
}

export interface DocumentCreateRequest {
  source_uri: string
  file_name?: string
}

export interface WorkflowNodeDefRead {
  id: number
  node_uid: string
  category: string
  label: string
  icon?: string | null
  description?: string | null
  display_order: number
  node: JsonRecord
  forms: JsonRecord[]
  is_active: boolean
}

export interface WorkflowExecutionRequest {
  inputs?: JsonRecord
  context?: JsonRecord
  metadata?: JsonRecord
}

export interface WorkflowExecutionResponse {
  success?: boolean
  error?: string | null
  data: JsonRecord
}

export interface AgentExecutionRequest {
  inputs: {
    input_query: string
    session_uuid?: string
    history?: JsonRecord[]
  }
  context?: JsonRecord
  metadata?: JsonRecord
}

export interface AgentExecutionResponse {
  success?: boolean
  error?: string | null
  data: {
    agent_result?: JsonRecord | null
    session_uuid?: string | null
    trace_id?: string | null
  }
}

export interface ChatSessionRead {
  uuid: string
  title?: string | null
  agent_instance_uuid: string
  message_count: number
  updated_at: string
  created_at: string
}

export interface ChatMessageRead {
  uuid: string
  role: string
  content?: string | null
  meta?: JsonRecord | null
  tool_calls?: JsonRecord[] | null
  tool_call_id?: string | null
  trace_id?: string | null
  created_at: string
}

export interface ChatSessionCreateRequest {
  agent_instance_uuid: string
  title?: string
}

export interface ContextClearRequest {
  mode?: 'production' | 'debug'
}

export interface FeatureRead {
  name: string
  label: string
  type: string
  service_module_version_name?: string | null
}

export interface EntitlementBalanceRead {
  id: number
  granted_quota: number | string
  consumed_usage: number | string
  remaining_quota?: number | string
  status: string
  start_date: string
  end_date?: string | null
  feature: FeatureRead
  source_product_name: string
  source_product_type: string
}

export interface PriceRead {
  id: number
  amount: number | string
  currency: string
  billing_cycle?: string | null
  unit?: string | null
  unit_count: number
  is_active: boolean
}

export interface ProductEntitlementRead {
  id: number
  quota: number
  is_resettable: boolean
  feature: FeatureRead
}

export interface ProductReadFull {
  id: number
  name: string
  label: string
  description?: string | null
  type: string
  is_active: boolean
  is_purchasable: boolean
  plan_tier?: string | null
  prices: PriceRead[]
  entitlements: ProductEntitlementRead[]
}
