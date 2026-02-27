import type {
  JsonRecord,
  TenantColumnRead,
  TenantDataType,
  TenantDbFilterOperator,
  TenantTableRead,
} from '@app/services/api/contracts'

export interface TenantColumnDraft {
  uuid?: string
  name: string
  label: string
  description: string
  data_type: TenantDataType
  is_nullable: boolean
  is_unique: boolean
  is_indexed: boolean
  is_vector_enabled: boolean
  default_value_text: string
}

export interface TenantSchemaDiffSummary {
  tableChanged: boolean
  added: string[]
  updated: string[]
  removed: string[]
}

export interface TenantDataFilterDraft {
  id: string
  column: string
  operator: TenantDbFilterOperator
  value: string
}

export interface TenantDataQueryApplied {
  page: number
  limit: number
  order_by?: string
  columns?: string[]
  filters?: JsonRecord | [string, TenantDbFilterOperator, unknown][]
}

export type TenantWorkspaceTab = 'data' | 'sql'

export type TenantExplorerNodeKind = 'table' | 'column'

export interface TenantExplorerNode {
  kind: TenantExplorerNodeKind
  tableUuid: string
  tableName: string
  label?: string | null
  column?: TenantColumnRead
}

export type TenantTableContextAction = 'query' | 'schema' | 'insert' | 'delete'

export interface TenantQueryDialogState {
  open: boolean
  limit: number
  orderColumn: string
  orderDirection: 'ASC' | 'DESC'
  columns: string[]
  filters: TenantDataFilterDraft[]
}

export interface TenantSchemaDialogState {
  open: boolean
  selectedColumnId: string
  deleteAcknowledge: boolean
  errorText: string
}

export interface TenantTableDraft {
  name: string
  label: string
  description: string
  columns: TenantColumnDraft[]
}

export interface TenantExplorerActionPayload {
  tableUuid: string
  action: TenantTableContextAction
}

export interface TenantPageState {
  rows: JsonRecord[]
  totalCount: number
  pageCount: number
  visibleColumns: string[]
  currentPage: number
  canPreviousPage: boolean
  canNextPage: boolean
}

export interface TenantSqlState {
  text: string
  rows: JsonRecord[]
  columns: string[]
  error: string
}

export interface TenantWorkspaceViewModel {
  selectedTable: TenantTableRead | null
  activeTab: TenantWorkspaceTab
  loadingRows: boolean
  pageState: TenantPageState
  tablesLoading: boolean
  selectedTableUuid: string
  tableSearchText: string
  appliedQuery: TenantDataQueryApplied
  sql: TenantSqlState
}
