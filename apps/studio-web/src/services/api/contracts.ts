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

export type AssetType = 'image' | 'video' | 'audio' | 'document' | 'other' | string
export type AssetStatus = 'pending' | 'active' | 'archived' | string

export interface AssetUploadTicketRead {
  asset_uuid: string
  upload_url: string
  form_data: Record<string, unknown>
  provider: string
  upload_key: string
  folder_uuid?: string | null
}

export interface AssetCreateTicketRequest {
  filename: string
  size_bytes: number
  mime_type: string
  folder_uuid?: string | null
  folder_id?: number | null
}

export interface AssetConfirmRequest {
  workspace_uuid: string
  asset_uuid: string
  upload_key: string
  name?: string
  folder_uuid?: string | null
  folder_id?: number | null
  force_ai_processing?: boolean
}

export interface AssetUpdateRequest {
  name?: string
  folder_uuid?: string | null
  folder_id?: number | null
}

export interface AssetQuery {
  workspace_uuid: string
  folder_uuid?: string | null
  folder_id?: number | null
  include_subfolders?: boolean
  type?: AssetType
  keyword?: string
  page?: number
  limit?: number
}

export interface AssetRead {
  uuid: string
  name: string
  url: string
  size: number
  type: AssetType
  status: AssetStatus
  created_at: string
  updated_at: string
  mime_type?: string | null
  folder_uuid?: string | null
  folder_id?: number | null
  ai_status?: string | null
  ai_meta?: JsonRecord | null
}

export interface PaginatedAssetsRead {
  items: AssetRead[]
  total: number
  page: number
  limit: number
}

export interface AssetFolderCreateRequest {
  name: string
  parent_uuid?: string | null
  parent_id?: number | null
}

export interface AssetFolderUpdateRequest {
  name?: string
  parent_uuid?: string | null
  parent_id?: number | null
}

export interface AssetFolderRead {
  id: number
  uuid: string
  name: string
  parent_uuid?: string | null
  parent_id?: number | null
  created_at: string
}

export interface AssetFolderTreeNodeRead extends AssetFolderRead {
  children: AssetFolderTreeNodeRead[]
}

export interface InstanceReadBase {
  uuid: string
  name: string
  description?: string | null
  version_tag: string
  status: string
  created_at: string
  updated_at?: string | null
  creator: CreatorInfo
}

export interface AnyInstanceRead extends InstanceReadBase {
  [key: string]: unknown
}

export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ToolSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'

export interface ToolParameterValueRefContent {
  blockID: string
  path: string
  source?: string
}

export type ToolParameterValue =
  | {
      type: 'literal'
      content: unknown
    }
  | {
      type: 'expr'
      content: string
    }
  | {
      type: 'ref'
      content: ToolParameterValueRefContent
    }

export interface ToolSchemaBlueprint {
  type: ToolSchemaType
  uid?: number
  description?: string
  enum?: unknown[]
  default?: unknown
  properties?: ToolParameterSchema[]
  items?: ToolSchemaBlueprint
}

export interface ToolParameterSchema extends ToolSchemaBlueprint {
  name: string
  required: boolean
  open: boolean
  role?: string
  label?: string
  value?: ToolParameterValue
  meta?: JsonRecord
}

export interface ToolInstanceRead extends InstanceReadBase {
  url?: string | null
  method: ToolHttpMethod
  inputs_schema: ToolParameterSchema[]
  outputs_schema: ToolParameterSchema[]
  llm_function_schema?: JsonRecord | null
}

export interface ToolInstanceUpdateRequest {
  visibility?: string
  url?: string | null
  method?: ToolHttpMethod
  inputs_schema?: ToolParameterSchema[]
  outputs_schema?: ToolParameterSchema[]
  llm_function_schema?: JsonRecord | null
}

export interface ToolExecutionRequest {
  meta?: {
    return_raw_response?: boolean
  }
  inputs: JsonRecord
}

export interface ToolExecutionResponse {
  success?: boolean
  error_message?: string | null
  data: JsonRecord
}

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

export interface UiAppMetadataRead extends InstanceReadBase {
  global_config: JsonRecord
  navigation?: JsonRecord | null
  home_page_uuid?: string | null
  pages: UiPageMetaRead[]
}

export type TenantDataType = 'text' | 'number' | 'integer' | 'boolean' | 'timestamp' | 'json'

export interface TenantColumnRead {
  uuid: string
  name: string
  label: string
  description?: string | null
  data_type: TenantDataType
  is_nullable: boolean
  is_unique: boolean
  is_indexed: boolean
  is_vector_enabled: boolean
  is_primary_key: boolean
  default_value?: unknown
}

export interface TenantColumnCreate {
  name: string
  label: string
  description?: string
  data_type: TenantDataType
  is_nullable?: boolean
  is_unique?: boolean
  is_indexed?: boolean
  is_vector_enabled?: boolean
  default_value?: unknown
}

export interface TenantColumnUpdate extends TenantColumnCreate {
  uuid: string
}

export interface TenantTableRead {
  uuid: string
  name: string
  label: string
  description?: string | null
  columns: TenantColumnRead[]
}

export interface TenantTableCreateRequest {
  name: string
  label: string
  description?: string
  columns: TenantColumnCreate[]
}

export interface TenantTableUpdateRequest {
  name?: string
  label?: string
  description?: string
  columns?: Array<TenantColumnUpdate | TenantColumnCreate>
}

export type TenantDbExecutionAction = 'query' | 'get_one' | 'insert' | 'update' | 'delete' | 'raw_sql'
export type TenantDbFilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in' | 'not in'
export type TenantDbFilterTuple = [string, TenantDbFilterOperator, unknown]
export type TenantDbFilters = JsonRecord | TenantDbFilterTuple[]

export interface TenantDbExecutionParams {
  action: TenantDbExecutionAction
  table_name: string
  filters?: TenantDbFilters
  columns?: string[]
  payload?: JsonRecord | JsonRecord[]
  page?: number
  limit?: number
  order_by?: string
  raw_sql?: string
}

export interface TenantDbExecutionRequest {
  meta?: JsonRecord
  inputs: TenantDbExecutionParams
}

export interface TenantDbExecutionResponse {
  success: boolean
  data: JsonRecord[] | JsonRecord | number
  count?: number | null
  error_message?: string | null
}

export interface DocumentRead {
  uuid: string
  file_name: string
  source_uri: string
  file_type?: string | null
  file_size?: number | null
  status: DocumentProcessingStatus
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

export type DocumentProcessingStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'

export interface DocumentUpdateRequest {
  source_uri?: string
  file_name?: string
}

export interface BatchChunkUpdateRequest {
  updates: Record<string, string>
}

export interface DocumentTaskProgressRead {
  status: DocumentProcessingStatus
  message: string
  progress: number
  total: number
  error?: string | null
}

export type KnowledgeSearchStrategy = 'keyword' | 'semantic' | 'hybrid'

export interface RAGConfigRead {
  max_recall_num: number
  min_match_score: number
  search_strategy: KnowledgeSearchStrategy
  query_rewrite: boolean
  result_rerank: boolean
}

export interface KnowledgeBaseExecutionParams {
  query: string
  config: RAGConfigRead
}

export interface KnowledgeBaseExecutionRequest {
  meta?: JsonRecord
  inputs: KnowledgeBaseExecutionParams
}

export interface KnowledgeSearchResultChunkRead {
  uuid: string
  content: string
  score: number
  context?: JsonRecord | null
}

export interface KnowledgeGroupedSearchResultRead {
  instance_uuid: string
  chunks: KnowledgeSearchResultChunkRead[]
}

export interface KnowledgeBaseExecutionResponse {
  success: boolean
  data: KnowledgeGroupedSearchResultRead
  error_message?: string | null
}

export interface ParserPolicyConfigRead {
  parser_name: string
  allowed_mime_types: string[]
  params: JsonRecord
}

export interface ChunkerPolicyConfigRead {
  chunker_name: string
  params: JsonRecord
}

export interface KnowledgeBaseInstanceConfigRead {
  parser_policy?: ParserPolicyConfigRead | null
  chunker_policies: ChunkerPolicyConfigRead[]
}

export interface KnowledgeBaseInstanceRead extends InstanceReadBase {
  config: KnowledgeBaseInstanceConfigRead
  document_count: number
}

export interface KnowledgeBaseInstanceUpdateRequest {
  name?: string
  description?: string
  config?: KnowledgeBaseInstanceConfigRead
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

export type AgentDiversityMode = 'precise' | 'balanced' | 'creative' | 'custom'
export type AgentResponseFormatType = 'text' | 'json_object'

export interface AgentModelParamsRead {
  temperature: number
  top_p: number
  presence_penalty: number
  frequency_penalty: number
}

export interface AgentIoConfigRead {
  history_turns: number
  max_response_tokens: number
  enable_deep_thinking: boolean
  max_thinking_tokens?: number | null
  response_format?: {
    type?: string
    [key: string]: unknown
  } | null
}

export interface AgentConfigRead {
  diversity_mode: AgentDiversityMode
  model_params: AgentModelParamsRead
  io_config: AgentIoConfigRead
  [key: string]: unknown
}

export interface AgentInstanceRead extends InstanceReadBase {
  system_prompt: string
  llm_module_version_uuid?: string | null
  agent_config: AgentConfigRead
}

export interface ServiceModuleTypeRead {
  id: number
  name: string
  label: string
  description?: string | null
}

export interface ServiceModuleProviderRead {
  id: number
  name: string
  label: string
  description?: string | null
}

export interface ServiceModuleVersionRead {
  uuid: string
  version_tag: string
  description?: string | null
  attributes: JsonRecord
  config: JsonRecord
}

export interface ServiceModuleRead {
  name: string
  label: string
  provider_id: number
  versions: ServiceModuleVersionRead[]
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
