import type {
  JsonRecord,
  TenantDataType,
  TenantDbFilterOperator,
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
