<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconEdit,
  IconFileCode,
  IconPlus,
  IconSearch,
  IconTableMinus,
  IconTrash,
} from '@tabler/icons-vue'
import { emitBusinessError } from '@app/services/http/error-gateway'
import { tenantdbApi } from '@app/services/api/tenantdb-client'
import { platformQueryKeys } from '@app/services/api/query-keys'
import type {
  JsonRecord,
  TenantColumnCreate,
  TenantColumnRead,
  TenantColumnUpdate,
  TenantDataType,
  TenantDbExecutionRequest,
  TenantDbFilterOperator,
  TenantTableCreateRequest,
  TenantTableRead,
  TenantTableUpdateRequest,
} from '@app/services/api/contracts'
import { TenantDbWorkbenchScaffold } from '@repo/workbench-tenantdb'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'
import { Checkbox } from '@repo/ui-shadcn/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui-shadcn/components/ui/select'
import { Separator } from '@repo/ui-shadcn/components/ui/separator'
import { Skeleton } from '@repo/ui-shadcn/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui-shadcn/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui-shadcn/components/ui/tabs'
import { Textarea } from '@repo/ui-shadcn/components/ui/textarea'

const props = defineProps<{
  resourceName: string
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()

const queryClient = useQueryClient()

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const FILTER_OPERATORS: TenantDbFilterOperator[] = ['=', '!=', '>', '<', '>=', '<=', 'like', 'in', 'not in']
const DATA_TYPES: TenantDataType[] = ['text', 'number', 'integer', 'boolean', 'timestamp', 'json']
const SYSTEM_COLUMNS = new Set(['id', 'created_at'])
const PG_RESERVED_WORDS = new Set([
  'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'asc', 'asymmetric', 'authorization', 'binary',
  'both', 'case', 'cast', 'check', 'collate', 'column', 'concurrently', 'constraint', 'create', 'cross',
  'current_catalog', 'current_date', 'current_role', 'current_time', 'current_timestamp', 'current_user',
  'default', 'deferrable', 'desc', 'distinct', 'do', 'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign',
  'freeze', 'from', 'full', 'grant', 'group', 'having', 'ilike', 'in', 'initially', 'inner', 'intersect', 'into',
  'is', 'isnull', 'join', 'lateral', 'leading', 'left', 'like', 'limit', 'localtime', 'localtimestamp', 'natural',
  'not', 'notnull', 'null', 'offset', 'on', 'only', 'or', 'order', 'outer', 'overlaps', 'placing', 'primary',
  'references', 'returning', 'right', 'select', 'session_user', 'similar', 'some', 'symmetric', 'table',
  'tablesample', 'then', 'to', 'trailing', 'true', 'union', 'unique', 'user', 'using', 'variadic', 'verbose',
  'when', 'where', 'window', 'with',
])

interface TenantColumnDraft {
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

interface TenantTableDraft {
  name: string
  label: string
  description: string
  columns: TenantColumnDraft[]
}

interface TenantFilterDraft {
  id: string
  column: string
  operator: TenantDbFilterOperator
  value: string
}

interface TenantDataQueryState {
  page: number
  limit: number
  orderBy?: string
  columns?: string[]
  filters?: [string, TenantDbFilterOperator, unknown][]
}

interface TenantSchemaDiff {
  tableChanged: boolean
  added: string[]
  updated: string[]
  removed: string[]
}

interface QueryRowsResult {
  rows: JsonRecord[]
  count: number
}

interface SqlHistoryItem {
  id: string
  sql: string
  createdAt: string
  success: boolean
  rowCount: number
  errorMessage?: string
}

const createId = (): string => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const isSystemColumn = (column: Pick<TenantColumnRead, 'name'> | Pick<TenantColumnDraft, 'name'>): boolean =>
  SYSTEM_COLUMNS.has(column.name)

const formatValueText = (value: unknown): string => {
  if (value === undefined) {
    return ''
  }
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

const columnToDraft = (column: TenantColumnRead): TenantColumnDraft => ({
  uuid: column.uuid,
  name: column.name,
  label: column.label ?? column.name,
  description: column.description ?? '',
  data_type: column.data_type,
  is_nullable: column.is_nullable,
  is_unique: column.is_unique,
  is_indexed: column.is_indexed,
  is_vector_enabled: column.is_vector_enabled,
  default_value_text: formatValueText(column.default_value),
})

const createEmptyColumnDraft = (): TenantColumnDraft => ({
  name: '',
  label: '',
  description: '',
  data_type: 'text',
  is_nullable: true,
  is_unique: false,
  is_indexed: false,
  is_vector_enabled: false,
  default_value_text: '',
})

const createDefaultTableDraft = (): TenantTableDraft => ({
  name: '',
  label: '',
  description: '',
  columns: [createEmptyColumnDraft()],
})

const coerceBoolean = (value: string): boolean => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }
  throw new Error(`Boolean value "${value}" is invalid.`)
}

const parseValueByType = (
  rawValue: string,
  dataType: TenantDataType,
  nullable: boolean,
): unknown | undefined => {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return undefined
  }
  if (trimmed.toLowerCase() === 'null') {
    if (!nullable) {
      throw new Error('NULL is not allowed for non-nullable column.')
    }
    return null
  }
  if (dataType === 'text' || dataType === 'timestamp') {
    return rawValue
  }
  if (dataType === 'integer') {
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed)) {
      throw new Error(`Value "${rawValue}" must be an integer.`)
    }
    return parsed
  }
  if (dataType === 'number') {
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      throw new Error(`Value "${rawValue}" must be numeric.`)
    }
    return parsed
  }
  if (dataType === 'boolean') {
    return coerceBoolean(trimmed)
  }
  if (dataType === 'json') {
    try {
      return JSON.parse(rawValue)
    } catch {
      throw new Error('JSON value is invalid.')
    }
  }
  return rawValue
}

const validateIdentifier = (value: string, label: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return `${label} is required.`
  }
  if (trimmed.length > 63) {
    return `${label} must be <= 63 chars.`
  }
  if (!IDENTIFIER_REGEX.test(trimmed)) {
    return `${label} must match ^[a-zA-Z_][a-zA-Z0-9_]*$.`
  }
  if (PG_RESERVED_WORDS.has(trimmed.toLowerCase())) {
    return `${label} "${trimmed}" is a PostgreSQL reserved keyword.`
  }
  return null
}

const validateTableDraft = (draft: TenantTableDraft): string[] => {
  const errors: string[] = []
  const tableNameError = validateIdentifier(draft.name, 'Table name')
  if (tableNameError) {
    errors.push(tableNameError)
  }
  if (!draft.label.trim()) {
    errors.push('Table label is required.')
  }
  if (!draft.columns.length) {
    errors.push('At least one user column is required.')
  }
  const columnNameSet = new Set<string>()
  draft.columns.forEach((column, index) => {
    const prefix = `Column #${index + 1}`
    const nameError = validateIdentifier(column.name, `${prefix} name`)
    if (nameError) {
      errors.push(nameError)
    }
    if (SYSTEM_COLUMNS.has(column.name.trim().toLowerCase())) {
      errors.push(`${prefix} name "${column.name}" is reserved by system.`)
    }
    const lowered = column.name.trim().toLowerCase()
    if (lowered && columnNameSet.has(lowered)) {
      errors.push(`${prefix} duplicates column name "${column.name}".`)
    }
    if (lowered) {
      columnNameSet.add(lowered)
    }
    if (!column.label.trim()) {
      errors.push(`${prefix} label is required.`)
    }
    if (column.default_value_text.trim()) {
      try {
        parseValueByType(column.default_value_text, column.data_type, column.is_nullable)
      } catch (error) {
        errors.push(`${prefix} default value invalid: ${error instanceof Error ? error.message : 'invalid value'}`)
      }
    }
  })
  return errors
}

const buildColumnPayload = (
  column: TenantColumnDraft,
): TenantColumnCreate | TenantColumnUpdate => {
  const defaultValueParsed = parseValueByType(column.default_value_text, column.data_type, column.is_nullable)
  const basePayload: TenantColumnCreate = {
    name: column.name.trim(),
    label: column.label.trim(),
    description: column.description.trim() || undefined,
    data_type: column.data_type,
    is_nullable: column.is_nullable,
    is_unique: column.is_unique,
    is_indexed: column.is_indexed,
    is_vector_enabled: column.is_vector_enabled,
    default_value: defaultValueParsed,
  }
  if (column.uuid) {
    return {
      ...basePayload,
      uuid: column.uuid,
    }
  }
  return basePayload
}

const buildTableCreatePayload = (draft: TenantTableDraft): TenantTableCreateRequest => ({
  name: draft.name.trim(),
  label: draft.label.trim(),
  description: draft.description.trim() || undefined,
  columns: draft.columns.map((column) => buildColumnPayload(column) as TenantColumnCreate),
})

const buildTableUpdatePayload = (draft: TenantTableDraft): TenantTableUpdateRequest => ({
  name: draft.name.trim(),
  label: draft.label.trim(),
  description: draft.description.trim() || undefined,
  columns: draft.columns.map((column) => buildColumnPayload(column)),
})

const buildSchemaDiff = (source: TenantTableRead | null, draft: TenantTableDraft | null): TenantSchemaDiff => {
  if (!source || !draft) {
    return {
      tableChanged: false,
      added: [],
      updated: [],
      removed: [],
    }
  }
  const sourceColumns = source.columns.filter((column) => !isSystemColumn(column))
  const sourceByUuid = new Map(sourceColumns.map((column) => [column.uuid, column]))
  const draftByUuid = new Map(
    draft.columns
      .filter((column) => Boolean(column.uuid))
      .map((column) => [column.uuid as string, column]),
  )

  const added = draft.columns
    .filter((column) => !column.uuid)
    .map((column) => column.name || '(unnamed)')

  const updated: string[] = []
  draft.columns.forEach((column) => {
    if (!column.uuid) {
      return
    }
    const sourceColumn = sourceByUuid.get(column.uuid)
    if (!sourceColumn) {
      return
    }
    const sourceDefault = formatValueText(sourceColumn.default_value)
    if (
      sourceColumn.name !== column.name
      || (sourceColumn.label ?? '') !== column.label
      || (sourceColumn.description ?? '') !== column.description
      || sourceColumn.data_type !== column.data_type
      || sourceColumn.is_nullable !== column.is_nullable
      || sourceColumn.is_unique !== column.is_unique
      || sourceColumn.is_indexed !== column.is_indexed
      || sourceColumn.is_vector_enabled !== column.is_vector_enabled
      || sourceDefault !== column.default_value_text
    ) {
      updated.push(sourceColumn.name)
    }
  })

  const removed = sourceColumns
    .filter((column) => !draftByUuid.has(column.uuid))
    .map((column) => column.name)

  return {
    tableChanged:
      source.name !== draft.name.trim()
      || (source.label ?? '') !== draft.label.trim()
      || (source.description ?? '') !== draft.description.trim(),
    added,
    updated,
    removed,
  }
}

const formatCell = (value: unknown): string => {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

const selectedTableUuid = ref('')
const tableSearchText = ref('')
const activeMainTab = ref<'data' | 'schema' | 'sql'>('data')

const schemaDraft = ref<TenantTableDraft | null>(null)
const selectedSchemaColumnId = ref<string>('')
const schemaErrorText = ref('')
const schemaConfirmDialogOpen = ref(false)
const schemaDeleteAcknowledge = ref(false)

const createTableDialogOpen = ref(false)
const createDraft = ref<TenantTableDraft>(createDefaultTableDraft())
const createErrorText = ref('')

const deleteTableDialogOpen = ref(false)
const deleteTableConfirmInput = ref('')

const dataFilterDrafts = ref<TenantFilterDraft[]>([])
const dataColumnDrafts = ref<string[]>([])
const dataOrderColumnDraft = ref('')
const dataOrderDirectionDraft = ref<'ASC' | 'DESC'>('DESC')
const dataLimitDraft = ref(25)

const appliedDataQuery = ref<TenantDataQueryState>({
  page: 1,
  limit: 25,
})

const insertDialogOpen = ref(false)
const insertRowInputs = ref<Record<string, string>>({})

const rowEditDialogOpen = ref(false)
const editingRow = ref<JsonRecord | null>(null)
const editRowInputs = ref<Record<string, string>>({})

const rowDeleteDialogOpen = ref(false)
const deleteRowTargetId = ref<string>('')
const deleteRowConfirmInput = ref('')

const inspectorRowIdInput = ref('')
const inspectorRowResult = ref<JsonRecord | null>(null)

const sqlText = ref('')
const sqlResultRows = ref<JsonRecord[]>([])
const sqlResultError = ref('')
const sqlHistory = ref<SqlHistoryItem[]>([])

const tablesQuery = useQuery({
  queryKey: computed(() => platformQueryKeys.tenantTables(props.workspaceInstanceUuid ?? 'none')),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid)),
  queryFn: async () => tenantdbApi.listTables(props.workspaceInstanceUuid as string),
})

const selectedTableQuery = useQuery({
  queryKey: computed(() =>
    platformQueryKeys.tenantTableDetail(props.workspaceInstanceUuid ?? 'none', selectedTableUuid.value || 'none')),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid && selectedTableUuid.value)),
  queryFn: async () => tenantdbApi.getTable(props.workspaceInstanceUuid as string, selectedTableUuid.value),
})

const filteredTables = computed(() => {
  const text = tableSearchText.value.trim().toLowerCase()
  const tables = tablesQuery.data.value ?? []
  if (!text) {
    return tables
  }
  return tables.filter((table) =>
    table.name.toLowerCase().includes(text)
    || (table.label ?? '').toLowerCase().includes(text)
    || (table.description ?? '').toLowerCase().includes(text),
  )
})

const selectedTable = computed(() => selectedTableQuery.data.value ?? null)
const editableColumns = computed(() => selectedTable.value?.columns.filter((column) => !isSystemColumn(column)) ?? [])
const systemColumns = computed(() => selectedTable.value?.columns.filter((column) => isSystemColumn(column)) ?? [])

const schemaDiff = computed(() => buildSchemaDiff(selectedTable.value, schemaDraft.value))
const hasSchemaChanges = computed(() => {
  const diff = schemaDiff.value
  return diff.tableChanged || diff.added.length > 0 || diff.updated.length > 0 || diff.removed.length > 0
})

const dataQuerySignature = computed(() => JSON.stringify(appliedDataQuery.value))

const rowsQuery = useQuery({
  queryKey: computed(() =>
    platformQueryKeys.tenantTableRows(
      props.workspaceInstanceUuid ?? 'none',
      selectedTableUuid.value || 'none',
      dataQuerySignature.value,
    )),
  enabled: computed(() => Boolean(props.workspaceInstanceUuid && selectedTable.value)),
  queryFn: async (): Promise<QueryRowsResult> => {
    const table = selectedTable.value
    if (!table) {
      return { rows: [], count: 0 }
    }
    const payload: TenantDbExecutionRequest = {
      inputs: {
        action: 'query',
        table_name: table.name,
        page: appliedDataQuery.value.page,
        limit: appliedDataQuery.value.limit,
        order_by: appliedDataQuery.value.orderBy,
        columns: appliedDataQuery.value.columns?.length ? appliedDataQuery.value.columns : undefined,
        filters: appliedDataQuery.value.filters?.length ? appliedDataQuery.value.filters : undefined,
      },
    }
    const result = await tenantdbApi.execute(props.workspaceInstanceUuid as string, payload)
    if (!Array.isArray(result.data)) {
      return {
        rows: [],
        count: 0,
      }
    }
    return {
      rows: result.data,
      count: result.count ?? result.data.length,
    }
  },
})

const dataRows = computed(() => rowsQuery.data.value?.rows ?? [])
const dataTotalCount = computed(() => rowsQuery.data.value?.count ?? 0)
const dataPageCount = computed(() => Math.max(1, Math.ceil(dataTotalCount.value / Math.max(1, appliedDataQuery.value.limit))))

const dataVisibleColumns = computed(() => {
  const table = selectedTable.value
  if (!table) {
    return []
  }
  if (appliedDataQuery.value.columns?.length) {
    const columnSet = new Set(appliedDataQuery.value.columns)
    return table.columns.map((column) => column.name).filter((name) => columnSet.has(name))
  }
  return table.columns.map((column) => column.name)
})

const sqlResultColumns = computed(() => {
  const first = sqlResultRows.value[0]
  if (!first) {
    return []
  }
  return Object.keys(first)
})

watch(
  () => tablesQuery.data.value,
  (tables) => {
    if (!tables?.length) {
      selectedTableUuid.value = ''
      return
    }
    if (!selectedTableUuid.value || !tables.some((table) => table.uuid === selectedTableUuid.value)) {
      selectedTableUuid.value = tables[0]?.uuid ?? ''
    }
  },
  { immediate: true },
)

watch(
  selectedTable,
  (table) => {
    if (!table) {
      schemaDraft.value = null
      selectedSchemaColumnId.value = ''
      return
    }
    schemaDraft.value = {
      name: table.name,
      label: table.label ?? table.name,
      description: table.description ?? '',
      columns: table.columns.filter((column) => !isSystemColumn(column)).map((column) => columnToDraft(column)),
    }
    selectedSchemaColumnId.value = schemaDraft.value.columns[0]?.uuid ?? schemaDraft.value.columns[0]?.name ?? ''
    schemaErrorText.value = ''

    const availableColumns = table.columns.map((column) => column.name)
    dataColumnDrafts.value = availableColumns
    dataOrderColumnDraft.value = availableColumns[0] ?? ''
    dataFilterDrafts.value = []
    dataLimitDraft.value = 25
    appliedDataQuery.value = {
      page: 1,
      limit: 25,
      columns: undefined,
      orderBy: undefined,
      filters: undefined,
    }

    sqlText.value = `SELECT * FROM ${table.name} ORDER BY id DESC LIMIT 50;`
    sqlResultRows.value = []
    sqlResultError.value = ''
    inspectorRowResult.value = null
    inspectorRowIdInput.value = ''
  },
  { immediate: true },
)

const invalidateTenantQueries = async (): Promise<void> => {
  const instanceUuid = props.workspaceInstanceUuid
  if (!instanceUuid) {
    return
  }
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: platformQueryKeys.tenantTables(instanceUuid),
    }),
    selectedTableUuid.value
      ? queryClient.invalidateQueries({
          queryKey: platformQueryKeys.tenantTableDetail(instanceUuid, selectedTableUuid.value),
        })
      : Promise.resolve(),
    selectedTableUuid.value
      ? queryClient.invalidateQueries({
          queryKey: ['tenantdb', instanceUuid, selectedTableUuid.value, 'rows'],
        })
      : Promise.resolve(),
  ])
}

const createTableMutation = useMutation({
  mutationFn: async (payload: TenantTableCreateRequest) => {
    if (!props.workspaceInstanceUuid) {
      throw new Error('Workspace instance uuid is missing.')
    }
    return tenantdbApi.createTable(props.workspaceInstanceUuid, payload)
  },
  onSuccess: async (createdTable) => {
    await invalidateTenantQueries()
    selectedTableUuid.value = createdTable.uuid
    createTableDialogOpen.value = false
    createErrorText.value = ''
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const updateTableMutation = useMutation({
  mutationFn: async (payload: TenantTableUpdateRequest) => {
    if (!props.workspaceInstanceUuid || !selectedTableUuid.value) {
      throw new Error('Missing tenantdb table context.')
    }
    return tenantdbApi.updateTable(props.workspaceInstanceUuid, selectedTableUuid.value, payload)
  },
  onSuccess: async () => {
    schemaConfirmDialogOpen.value = false
    schemaDeleteAcknowledge.value = false
    schemaErrorText.value = ''
    await invalidateTenantQueries()
    await selectedTableQuery.refetch()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const deleteTableMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid || !selectedTableUuid.value) {
      throw new Error('Missing tenantdb table context.')
    }
    return tenantdbApi.deleteTable(props.workspaceInstanceUuid, selectedTableUuid.value)
  },
  onSuccess: async () => {
    deleteTableDialogOpen.value = false
    deleteTableConfirmInput.value = ''
    await invalidateTenantQueries()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const insertRowMutation = useMutation({
  mutationFn: async (payload: JsonRecord) => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error('Missing tenantdb table context.')
    }
    return tenantdbApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        action: 'insert',
        table_name: selectedTable.value.name,
        payload,
      },
    })
  },
  onSuccess: async () => {
    insertDialogOpen.value = false
    await invalidateTenantQueries()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const updateRowMutation = useMutation({
  mutationFn: async ({ rowId, payload }: { rowId: string; payload: JsonRecord }) => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error('Missing tenantdb table context.')
    }
    return tenantdbApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        action: 'update',
        table_name: selectedTable.value.name,
        filters: {
          id: rowId,
        },
        payload,
      },
    })
  },
  onSuccess: async () => {
    rowEditDialogOpen.value = false
    editingRow.value = null
    await invalidateTenantQueries()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const deleteRowMutation = useMutation({
  mutationFn: async (rowId: string) => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error('Missing tenantdb table context.')
    }
    return tenantdbApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        action: 'delete',
        table_name: selectedTable.value.name,
        filters: {
          id: rowId,
        },
      },
    })
  },
  onSuccess: async () => {
    rowDeleteDialogOpen.value = false
    deleteRowTargetId.value = ''
    deleteRowConfirmInput.value = ''
    await invalidateTenantQueries()
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const inspectRowMutation = useMutation({
  mutationFn: async (rowId: string): Promise<JsonRecord | null> => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error('Missing tenantdb table context.')
    }
    const result = await tenantdbApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        action: 'get_one',
        table_name: selectedTable.value.name,
        filters: {
          id: rowId,
        },
      },
    })
    if (!result.data || Array.isArray(result.data) || typeof result.data !== 'object') {
      return null
    }
    return result.data
  },
  onSuccess: (result) => {
    inspectorRowResult.value = result
  },
  onError: (error) => {
    emitBusinessError(error)
  },
})

const sqlMutation = useMutation({
  mutationFn: async (rawSql: string): Promise<JsonRecord[]> => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error('Missing tenantdb table context.')
    }
    const response = await tenantdbApi.execute(props.workspaceInstanceUuid, {
      inputs: {
        action: 'raw_sql',
        table_name: selectedTable.value.name,
        raw_sql: rawSql,
      },
    })
    if (!Array.isArray(response.data)) {
      return []
    }
    return response.data
  },
  onSuccess: (rows, sql) => {
    sqlResultRows.value = rows
    sqlResultError.value = ''
    sqlHistory.value = [
      {
        id: createId(),
        sql,
        createdAt: new Date().toISOString(),
        success: true,
        rowCount: rows.length,
      },
      ...sqlHistory.value,
    ].slice(0, 20)
  },
  onError: (error, sql) => {
    sqlResultRows.value = []
    sqlResultError.value = error instanceof Error ? error.message : 'SQL execution failed.'
    sqlHistory.value = [
      {
        id: createId(),
        sql,
        createdAt: new Date().toISOString(),
        success: false,
        rowCount: 0,
        errorMessage: sqlResultError.value,
      },
      ...sqlHistory.value,
    ].slice(0, 20)
    emitBusinessError(error)
  },
})

const openCreateTableDialog = (): void => {
  createDraft.value = createDefaultTableDraft()
  createErrorText.value = ''
  createTableDialogOpen.value = true
}

const addColumnToCreateDraft = (): void => {
  createDraft.value.columns.push(createEmptyColumnDraft())
}

const removeColumnFromCreateDraft = (index: number): void => {
  createDraft.value.columns.splice(index, 1)
  if (!createDraft.value.columns.length) {
    createDraft.value.columns.push(createEmptyColumnDraft())
  }
}

const submitCreateTable = async (): Promise<void> => {
  const validationErrors = validateTableDraft(createDraft.value)
  if (validationErrors.length) {
    createErrorText.value = validationErrors.join(' ')
    return
  }
  try {
    const payload = buildTableCreatePayload(createDraft.value)
    await createTableMutation.mutateAsync(payload)
  } catch (error) {
    createErrorText.value = error instanceof Error ? error.message : 'Failed to build create payload.'
  }
}

const addSchemaColumn = (): void => {
  if (!schemaDraft.value) {
    return
  }
  const nextColumn = createEmptyColumnDraft()
  schemaDraft.value.columns.push(nextColumn)
  selectedSchemaColumnId.value = nextColumn.name || createId()
}

const removeSchemaColumn = (index: number): void => {
  if (!schemaDraft.value) {
    return
  }
  schemaDraft.value.columns.splice(index, 1)
  if (!schemaDraft.value.columns.length) {
    const nextColumn = createEmptyColumnDraft()
    schemaDraft.value.columns.push(nextColumn)
  }
  const current = schemaDraft.value.columns[0]
  selectedSchemaColumnId.value = current ? (current.uuid ?? current.name) : ''
}

const openSchemaSaveConfirm = (): void => {
  if (!schemaDraft.value) {
    return
  }
  const validationErrors = validateTableDraft(schemaDraft.value)
  if (validationErrors.length) {
    schemaErrorText.value = validationErrors.join(' ')
    return
  }
  if (!hasSchemaChanges.value) {
    schemaErrorText.value = 'No schema changes to save.'
    return
  }
  schemaErrorText.value = ''
  schemaDeleteAcknowledge.value = false
  schemaConfirmDialogOpen.value = true
}

const submitSchemaUpdate = async (): Promise<void> => {
  if (!schemaDraft.value) {
    return
  }
  if (schemaDiff.value.removed.length > 0 && !schemaDeleteAcknowledge.value) {
    schemaErrorText.value = 'Column deletions detected. Please confirm destructive changes.'
    return
  }
  try {
    const payload = buildTableUpdatePayload(schemaDraft.value)
    await updateTableMutation.mutateAsync(payload)
  } catch (error) {
    schemaErrorText.value = error instanceof Error ? error.message : 'Failed to build update payload.'
  }
}

const openDeleteTableDialog = (): void => {
  deleteTableDialogOpen.value = true
  deleteTableConfirmInput.value = ''
}

const submitDeleteTable = async (): Promise<void> => {
  if (!selectedTable.value) {
    return
  }
  if (deleteTableConfirmInput.value !== selectedTable.value.name) {
    schemaErrorText.value = 'Delete confirmation table name does not match.'
    return
  }
  await deleteTableMutation.mutateAsync()
}

const toggleDataColumn = (name: string, checked: boolean): void => {
  const next = new Set(dataColumnDrafts.value)
  if (checked) {
    next.add(name)
  } else {
    next.delete(name)
  }
  dataColumnDrafts.value = Array.from(next)
}

const addFilterDraft = (): void => {
  const firstColumn = selectedTable.value?.columns[0]?.name ?? ''
  dataFilterDrafts.value.push({
    id: createId(),
    column: firstColumn,
    operator: '=',
    value: '',
  })
}

const removeFilterDraft = (id: string): void => {
  dataFilterDrafts.value = dataFilterDrafts.value.filter((filter) => filter.id !== id)
}

const parseFilterValue = (column: TenantColumnRead | undefined, rawValue: string, operator: TenantDbFilterOperator): unknown => {
  if (!column) {
    return rawValue
  }
  if (operator === 'in' || operator === 'not in') {
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => parseValueByType(item, column.data_type, true))
      .filter((item) => item !== undefined)
  }
  const parsed = parseValueByType(rawValue, column.data_type, true)
  return parsed ?? rawValue
}

const applyDataQuery = (): void => {
  if (!selectedTable.value) {
    return
  }
  const table = selectedTable.value
  const tableColumnMap = new Map(table.columns.map((column) => [column.name, column]))
  try {
    const filters = dataFilterDrafts.value
      .filter((filter) => filter.column && filter.value.trim())
      .map((filter) => {
        const column = tableColumnMap.get(filter.column)
        return [filter.column, filter.operator, parseFilterValue(column, filter.value, filter.operator)] as [string, TenantDbFilterOperator, unknown]
      })

    const selectedColumns = dataColumnDrafts.value.filter((name) => tableColumnMap.has(name))
    appliedDataQuery.value = {
      page: 1,
      limit: dataLimitDraft.value,
      columns: selectedColumns.length === table.columns.length ? undefined : selectedColumns,
      orderBy: dataOrderColumnDraft.value ? `${dataOrderColumnDraft.value} ${dataOrderDirectionDraft.value}` : undefined,
      filters: filters.length ? filters : undefined,
    }
  } catch (error) {
    emitBusinessError(error)
  }
}

const gotoPreviousPage = (): void => {
  if (appliedDataQuery.value.page <= 1) {
    return
  }
  appliedDataQuery.value = {
    ...appliedDataQuery.value,
    page: appliedDataQuery.value.page - 1,
  }
}

const gotoNextPage = (): void => {
  if (appliedDataQuery.value.page >= dataPageCount.value) {
    return
  }
  appliedDataQuery.value = {
    ...appliedDataQuery.value,
    page: appliedDataQuery.value.page + 1,
  }
}

const buildRowInputMap = (row?: JsonRecord): Record<string, string> => {
  const result: Record<string, string> = {}
  editableColumns.value.forEach((column) => {
    result[column.name] = row ? formatCell(row[column.name]) : ''
  })
  return result
}

const openInsertRowDialog = (): void => {
  insertRowInputs.value = buildRowInputMap()
  insertDialogOpen.value = true
}

const submitInsertRow = async (): Promise<void> => {
  const payload: JsonRecord = {}
  for (const column of editableColumns.value) {
    const rawValue = insertRowInputs.value[column.name] ?? ''
    const parsed = parseValueByType(rawValue, column.data_type, column.is_nullable)
    if (parsed === undefined) {
      continue
    }
    payload[column.name] = parsed
  }
  await insertRowMutation.mutateAsync(payload)
}

const openEditRowDialog = (row: JsonRecord): void => {
  editingRow.value = row
  editRowInputs.value = buildRowInputMap(row)
  rowEditDialogOpen.value = true
}

const submitEditRow = async (): Promise<void> => {
  const row = editingRow.value
  if (!row) {
    return
  }
  const rowId = String(row.id ?? '')
  if (!rowId) {
    emitBusinessError(new Error('Selected row has no id field.'))
    return
  }
  const payload: JsonRecord = {}
  for (const column of editableColumns.value) {
    const rawValue = editRowInputs.value[column.name] ?? ''
    const parsed = parseValueByType(rawValue, column.data_type, column.is_nullable)
    if (parsed === undefined) {
      continue
    }
    payload[column.name] = parsed
  }
  await updateRowMutation.mutateAsync({
    rowId,
    payload,
  })
}

const openDeleteRowDialog = (row: JsonRecord): void => {
  const rowId = String(row.id ?? '')
  if (!rowId) {
    emitBusinessError(new Error('Selected row has no id field.'))
    return
  }
  deleteRowTargetId.value = rowId
  deleteRowConfirmInput.value = ''
  rowDeleteDialogOpen.value = true
}

const submitDeleteRow = async (): Promise<void> => {
  if (!deleteRowTargetId.value) {
    return
  }
  if (deleteRowConfirmInput.value !== deleteRowTargetId.value) {
    emitBusinessError(new Error('Row delete confirmation does not match row id.'))
    return
  }
  await deleteRowMutation.mutateAsync(deleteRowTargetId.value)
}

const runInspectorGetOne = async (): Promise<void> => {
  const rowId = inspectorRowIdInput.value.trim()
  if (!rowId) {
    return
  }
  await inspectRowMutation.mutateAsync(rowId)
}

const runSql = async (): Promise<void> => {
  const sql = sqlText.value.trim()
  if (!sql) {
    return
  }
  if (!/^select/i.test(sql)) {
    sqlResultError.value = 'Only SELECT is allowed by backend raw_sql.'
    return
  }
  await sqlMutation.mutateAsync(sql)
}

const formatTimestamp = (value: string): string => {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('en-US', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}
</script>

<template>
  <TenantDbWorkbenchScaffold
    :resource-name="resourceName"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
  >
    <Card v-if="!workspaceInstanceUuid">
      <CardHeader>
        <CardTitle>TenantDB instance is not available</CardTitle>
      </CardHeader>
      <CardContent class="text-sm text-muted-foreground">
        Current resource does not expose a workspace instance uuid.
      </CardContent>
    </Card>

    <div v-else class="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <Card class="h-fit">
        <CardHeader class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2 text-base">
                <IconDatabase class="size-4" />
                Database Explorer
              </CardTitle>
              <CardDescription>Manage table inventory</CardDescription>
            </div>
            <Button size="sm" class="gap-1" @click="openCreateTableDialog">
              <IconPlus class="size-4" />
              Table
            </Button>
          </div>
          <div class="relative">
            <IconSearch class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="tableSearchText" class="pl-9" placeholder="Search table..." />
          </div>
        </CardHeader>
        <CardContent class="space-y-2">
          <template v-if="tablesQuery.isLoading.value">
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
            <Skeleton class="h-9 w-full" />
          </template>
          <template v-else>
            <Button
              v-for="table in filteredTables"
              :key="table.uuid"
              size="sm"
              class="h-9 w-full justify-between"
              :variant="selectedTableUuid === table.uuid ? 'default' : 'outline'"
              @click="selectedTableUuid = table.uuid"
            >
              <span class="truncate text-left font-mono">{{ table.name }}</span>
              <Badge variant="secondary" class="ml-2">
                {{ table.columns.length }}
              </Badge>
            </Button>
            <p v-if="!filteredTables.length" class="text-xs text-muted-foreground">No table found.</p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle class="text-base">
                {{ selectedTable?.label || selectedTable?.name || 'No table selected' }}
              </CardTitle>
              <CardDescription v-if="selectedTable" class="font-mono">
                {{ selectedTable.name }}
              </CardDescription>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="gap-1"
                :disabled="!selectedTable"
                @click="openDeleteTableDialog"
              >
                <IconTableMinus class="size-4" />
                Drop Table
              </Button>
            </div>
          </div>
          <Tabs v-model="activeMainTab" class="w-full">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="sql">SQL</TabsTrigger>
            </TabsList>

            <TabsContent value="data" class="space-y-4">
              <Card>
                <CardHeader class="space-y-3">
                  <CardTitle class="text-sm">Query Builder</CardTitle>
                  <div class="grid gap-2 md:grid-cols-4">
                    <div class="space-y-1">
                      <Label>Limit</Label>
                      <Select
                        :model-value="String(dataLimitDraft)"
                        @update:model-value="(value) => (dataLimitDraft = Number(value))"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rows per page" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="space-y-1">
                      <Label>Order by</Label>
                      <Select v-model="dataOrderColumnDraft">
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="column in selectedTable?.columns ?? []"
                            :key="column.uuid"
                            :value="column.name"
                          >
                            {{ column.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="space-y-1">
                      <Label>Direction</Label>
                      <Select v-model="dataOrderDirectionDraft">
                        <SelectTrigger>
                          <SelectValue placeholder="Direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASC">ASC</SelectItem>
                          <SelectItem value="DESC">DESC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="flex items-end gap-2">
                      <Button class="w-full" :disabled="!selectedTable" @click="applyDataQuery">Apply Query</Button>
                      <Button
                        variant="outline"
                        class="w-full"
                        :disabled="!selectedTable"
                        @click="openInsertRowDialog"
                      >
                        Insert Row
                      </Button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label>Projection Columns</Label>
                    <div class="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        @click="dataColumnDrafts = (selectedTable?.columns ?? []).map((column) => column.name)"
                      >
                        All
                      </Button>
                      <label
                        v-for="column in selectedTable?.columns ?? []"
                        :key="column.uuid"
                        class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                      >
                        <Checkbox
                          :model-value="dataColumnDrafts.includes(column.name)"
                          @update:model-value="toggleDataColumn(column.name, Boolean($event))"
                        />
                        <span class="font-mono">{{ column.name }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <Label>Filters</Label>
                      <Button size="sm" variant="outline" class="gap-1" @click="addFilterDraft">
                        <IconPlus class="size-3.5" />
                        Add
                      </Button>
                    </div>
                    <div v-if="dataFilterDrafts.length" class="space-y-2">
                      <div
                        v-for="filter in dataFilterDrafts"
                        :key="filter.id"
                        class="grid gap-2 rounded-md border p-2 md:grid-cols-[1fr_120px_1fr_auto]"
                      >
                        <Select v-model="filter.column">
                          <SelectTrigger>
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              v-for="column in selectedTable?.columns ?? []"
                              :key="column.uuid"
                              :value="column.name"
                            >
                              {{ column.name }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select v-model="filter.operator">
                          <SelectTrigger>
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem v-for="operator in FILTER_OPERATORS" :key="operator" :value="operator">
                              {{ operator }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input v-model="filter.value" placeholder="Value" />
                        <Button size="icon" variant="outline" @click="removeFilterDraft(filter.id)">
                          <IconTrash class="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p v-else class="text-xs text-muted-foreground">No filters. Query returns all rows.</p>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div class="flex items-center justify-between gap-2">
                    <CardTitle class="text-sm">Rows</CardTitle>
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Count: {{ dataTotalCount }}</span>
                      <span>Page {{ appliedDataQuery.page }} / {{ dataPageCount }}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent class="space-y-3">
                  <template v-if="rowsQuery.isLoading.value">
                    <Skeleton class="h-10 w-full" />
                    <Skeleton class="h-10 w-full" />
                    <Skeleton class="h-10 w-full" />
                  </template>
                  <template v-else>
                    <div class="overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead v-for="columnName in dataVisibleColumns" :key="columnName" class="font-mono">
                              {{ columnName }}
                            </TableHead>
                            <TableHead class="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow v-for="(row, rowIndex) in dataRows" :key="String(row.id ?? rowIndex)">
                            <TableCell
                              v-for="columnName in dataVisibleColumns"
                              :key="`${String(row.id ?? rowIndex)}:${columnName}`"
                              class="max-w-[240px] truncate font-mono text-xs"
                            >
                              {{ formatCell(row[columnName]) }}
                            </TableCell>
                            <TableCell>
                              <div class="flex justify-end gap-2">
                                <Button size="icon" variant="outline" @click="openEditRowDialog(row)">
                                  <IconEdit class="size-3.5" />
                                </Button>
                                <Button size="icon" variant="outline" @click="openDeleteRowDialog(row)">
                                  <IconTrash class="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow v-if="!dataRows.length">
                            <TableCell :col-span="Math.max(1, dataVisibleColumns.length + 1)" class="text-center text-sm text-muted-foreground">
                              No data returned.
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">
                        Backend query action with pagination and filter tuples.
                      </span>
                      <div class="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          :disabled="appliedDataQuery.page <= 1"
                          @click="gotoPreviousPage"
                        >
                          <IconChevronLeft class="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          :disabled="appliedDataQuery.page >= dataPageCount"
                          @click="gotoNextPage"
                        >
                          <IconChevronRight class="size-4" />
                        </Button>
                      </div>
                    </div>
                  </template>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schema" class="space-y-4">
              <Alert v-if="schemaErrorText" variant="destructive">
                <AlertTitle>Schema validation failed</AlertTitle>
                <AlertDescription>{{ schemaErrorText }}</AlertDescription>
              </Alert>

              <Card v-if="schemaDraft">
                <CardHeader class="space-y-3">
                  <CardTitle class="text-sm">Table Metadata</CardTitle>
                  <div class="grid gap-2 md:grid-cols-3">
                    <div class="space-y-1">
                      <Label>Table Name</Label>
                      <Input v-model="schemaDraft.name" class="font-mono" />
                    </div>
                    <div class="space-y-1">
                      <Label>Label</Label>
                      <Input v-model="schemaDraft.label" />
                    </div>
                    <div class="space-y-1">
                      <Label>Description</Label>
                      <Input v-model="schemaDraft.description" />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card v-if="schemaDraft">
                <CardHeader class="space-y-3">
                  <div class="flex items-center justify-between">
                    <CardTitle class="text-sm">Column Definitions</CardTitle>
                    <Button size="sm" variant="outline" class="gap-1" @click="addSchemaColumn">
                      <IconPlus class="size-4" />
                      Column
                    </Button>
                  </div>
                </CardHeader>
                <CardContent class="space-y-2">
                  <div
                    v-for="(column, index) in schemaDraft.columns"
                    :key="column.uuid ?? `new-${index}`"
                    class="space-y-2 rounded-md border p-3"
                  >
                    <div class="grid gap-2 md:grid-cols-[1fr_1fr_140px_120px_120px_120px_auto]">
                      <Input
                        v-model="column.name"
                        class="font-mono"
                        placeholder="column_name"
                        @focus="selectedSchemaColumnId = column.uuid ?? column.name"
                      />
                      <Input v-model="column.label" placeholder="Label" @focus="selectedSchemaColumnId = column.uuid ?? column.name" />
                      <Select v-model="column.data_type">
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="dataType in DATA_TYPES" :key="dataType" :value="dataType">
                            {{ dataType }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                        <Checkbox
                          :model-value="column.is_nullable"
                          @update:model-value="column.is_nullable = Boolean($event)"
                        />
                        Nullable
                      </label>
                      <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                        <Checkbox
                          :model-value="column.is_unique"
                          @update:model-value="column.is_unique = Boolean($event)"
                        />
                        Unique
                      </label>
                      <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                        <Checkbox
                          :model-value="column.is_indexed"
                          @update:model-value="column.is_indexed = Boolean($event)"
                        />
                        Indexed
                      </label>
                      <Button size="icon" variant="outline" @click="removeSchemaColumn(index)">
                        <IconTrash class="size-3.5" />
                      </Button>
                    </div>
                    <div class="grid gap-2 md:grid-cols-[1fr_1fr]">
                      <Input
                        v-model="column.default_value_text"
                        class="font-mono"
                        placeholder="Default value (type aware)"
                      />
                      <Input v-model="column.description" placeholder="Description" />
                    </div>
                  </div>

                  <Separator />

                  <div class="flex items-center justify-between">
                    <div class="text-xs text-muted-foreground">
                      Diff: +{{ schemaDiff.added.length }} / ~{{ schemaDiff.updated.length }} / -{{ schemaDiff.removed.length }}
                    </div>
                    <Button
                      :disabled="!hasSchemaChanges || updateTableMutation.isPending.value"
                      @click="openSchemaSaveConfirm"
                    >
                      {{ updateTableMutation.isPending.value ? 'Saving...' : 'Save Schema' }}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sql" class="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle class="flex items-center gap-2 text-sm">
                    <IconFileCode class="size-4" />
                    SQL Console (SELECT only)
                  </CardTitle>
                  <CardDescription>Uses raw_sql action via /execute endpoint. Backend timeout and row cap still enforced.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-3">
                  <Textarea v-model="sqlText" class="min-h-36 font-mono text-xs" placeholder="SELECT * FROM your_table LIMIT 50;" />
                  <div class="flex items-center justify-between">
                    <Button :disabled="sqlMutation.isPending.value || !selectedTable" @click="runSql">
                      {{ sqlMutation.isPending.value ? 'Running...' : 'Run SQL' }}
                    </Button>
                    <span class="text-xs text-muted-foreground">Result max rows from backend: 500</span>
                  </div>
                  <p v-if="sqlResultError" class="text-xs text-destructive">{{ sqlResultError }}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle class="text-sm">SQL Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead v-for="columnName in sqlResultColumns" :key="columnName" class="font-mono">
                            {{ columnName }}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="(row, index) in sqlResultRows" :key="index">
                          <TableCell
                            v-for="columnName in sqlResultColumns"
                            :key="`${index}-${columnName}`"
                            class="max-w-[280px] truncate font-mono text-xs"
                          >
                            {{ formatCell(row[columnName]) }}
                          </TableCell>
                        </TableRow>
                        <TableRow v-if="!sqlResultRows.length">
                          <TableCell class="text-center text-sm text-muted-foreground">
                            No SQL rows yet.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      <Card class="h-fit">
        <CardHeader>
          <CardTitle class="text-base">Inspector</CardTitle>
          <CardDescription>Context, diff summary, and guarded operations</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">Current Table</p>
            <p class="font-mono text-sm">{{ selectedTable?.name || '-' }}</p>
            <p class="text-xs text-muted-foreground">{{ selectedTable?.description || 'No description' }}</p>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">System Columns</p>
            <div v-if="systemColumns.length" class="space-y-1">
              <div
                v-for="column in systemColumns"
                :key="column.uuid"
                class="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
              >
                <span class="font-mono">{{ column.name }}</span>
                <span>{{ column.data_type }}</span>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground">No system columns info.</p>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">Schema Diff</p>
            <div class="rounded-md border p-2 text-xs">
              <p>Table meta changed: {{ schemaDiff.tableChanged ? 'yes' : 'no' }}</p>
              <p>Added: {{ schemaDiff.added.length }}</p>
              <p>Updated: {{ schemaDiff.updated.length }}</p>
              <p>Removed: {{ schemaDiff.removed.length }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">Get One Row</p>
            <div class="flex gap-2">
              <Input v-model="inspectorRowIdInput" placeholder="id" class="font-mono" />
              <Button
                size="sm"
                variant="outline"
                :disabled="inspectRowMutation.isPending.value || !selectedTable"
                @click="runInspectorGetOne"
              >
                {{ inspectRowMutation.isPending.value ? 'Loading...' : 'Fetch' }}
              </Button>
            </div>
            <pre class="max-h-48 overflow-auto rounded-md border bg-muted/20 p-2 text-xs">{{ inspectorRowResult ? JSON.stringify(inspectorRowResult, null, 2) : 'No row fetched.' }}</pre>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">SQL History</p>
            <div class="max-h-48 space-y-1 overflow-auto">
              <div
                v-for="history in sqlHistory"
                :key="history.id"
                class="rounded-md border p-2 text-xs"
              >
                <div class="flex items-center justify-between gap-2">
                  <Badge :variant="history.success ? 'secondary' : 'destructive'">
                    {{ history.success ? 'OK' : 'ERR' }}
                  </Badge>
                  <span class="text-muted-foreground">{{ formatTimestamp(history.createdAt) }}</span>
                </div>
                <p class="mt-1 line-clamp-2 font-mono">{{ history.sql }}</p>
                <p class="mt-1 text-muted-foreground">Rows: {{ history.rowCount }}</p>
                <p v-if="history.errorMessage" class="mt-1 text-destructive">{{ history.errorMessage }}</p>
              </div>
              <p v-if="!sqlHistory.length" class="text-xs text-muted-foreground">No SQL history.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog :open="createTableDialogOpen" @update:open="createTableDialogOpen = $event">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
          <DialogDescription>DDL create with strict identifier validation and type-safe defaults.</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="grid gap-2 md:grid-cols-3">
            <div class="space-y-1">
              <Label>Name</Label>
              <Input v-model="createDraft.name" class="font-mono" placeholder="orders" />
            </div>
            <div class="space-y-1">
              <Label>Label</Label>
              <Input v-model="createDraft.label" placeholder="Orders" />
            </div>
            <div class="space-y-1">
              <Label>Description</Label>
              <Input v-model="createDraft.description" placeholder="Optional" />
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label>Initial Columns</Label>
              <Button size="sm" variant="outline" class="gap-1" @click="addColumnToCreateDraft">
                <IconPlus class="size-3.5" />
                Add
              </Button>
            </div>
            <div
              v-for="(column, index) in createDraft.columns"
              :key="`create-col-${index}`"
              class="space-y-2 rounded-md border p-3"
            >
              <div class="grid gap-2 md:grid-cols-[1fr_1fr_140px_120px_120px_120px_auto]">
                <Input v-model="column.name" class="font-mono" placeholder="column_name" />
                <Input v-model="column.label" placeholder="Label" />
                <Select v-model="column.data_type">
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="dataType in DATA_TYPES" :key="dataType" :value="dataType">
                      {{ dataType }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                  <Checkbox
                    :model-value="column.is_nullable"
                    @update:model-value="column.is_nullable = Boolean($event)"
                  />
                  Nullable
                </label>
                <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                  <Checkbox
                    :model-value="column.is_unique"
                    @update:model-value="column.is_unique = Boolean($event)"
                  />
                  Unique
                </label>
                <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                  <Checkbox
                    :model-value="column.is_indexed"
                    @update:model-value="column.is_indexed = Boolean($event)"
                  />
                  Indexed
                </label>
                <Button size="icon" variant="outline" @click="removeColumnFromCreateDraft(index)">
                  <IconTrash class="size-3.5" />
                </Button>
              </div>
              <div class="grid gap-2 md:grid-cols-[1fr_1fr]">
                <Input
                  v-model="column.default_value_text"
                  class="font-mono"
                  placeholder="Default value"
                />
                <Input v-model="column.description" placeholder="Description" />
              </div>
            </div>
          </div>

          <Alert v-if="createErrorText" variant="destructive">
            <AlertTitle>Create validation failed</AlertTitle>
            <AlertDescription>{{ createErrorText }}</AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="createTableDialogOpen = false">Cancel</Button>
          <Button :disabled="createTableMutation.isPending.value" @click="submitCreateTable">
            {{ createTableMutation.isPending.value ? 'Creating...' : 'Create' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="schemaConfirmDialogOpen" @update:open="schemaConfirmDialogOpen = $event">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Confirm Schema Sync</DialogTitle>
          <DialogDescription>
            Backend uses full column-list sync. Missing existing columns in payload will be dropped.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 text-sm">
          <p>Table metadata changed: <strong>{{ schemaDiff.tableChanged ? 'Yes' : 'No' }}</strong></p>
          <p>Added columns: <strong>{{ schemaDiff.added.join(', ') || 'None' }}</strong></p>
          <p>Updated columns: <strong>{{ schemaDiff.updated.join(', ') || 'None' }}</strong></p>
          <p class="text-destructive">
            Removed columns: <strong>{{ schemaDiff.removed.join(', ') || 'None' }}</strong>
          </p>
          <label
            v-if="schemaDiff.removed.length"
            class="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs"
          >
            <Checkbox :model-value="schemaDeleteAcknowledge" @update:model-value="schemaDeleteAcknowledge = Boolean($event)" />
            <span>I confirm destructive column deletion.</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="schemaConfirmDialogOpen = false">Cancel</Button>
          <Button :disabled="updateTableMutation.isPending.value" @click="submitSchemaUpdate">
            {{ updateTableMutation.isPending.value ? 'Saving...' : 'Confirm Save' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="deleteTableDialogOpen" @update:open="deleteTableDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Table</DialogTitle>
          <DialogDescription>
            This drops table schema and data. Type table name to confirm.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <p class="text-sm">
            Confirm target: <span class="font-mono">{{ selectedTable?.name }}</span>
          </p>
          <Input v-model="deleteTableConfirmInput" class="font-mono" placeholder="Type table name here" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteTableDialogOpen = false">Cancel</Button>
          <Button
            variant="destructive"
            :disabled="deleteTableMutation.isPending.value"
            @click="submitDeleteTable"
          >
            {{ deleteTableMutation.isPending.value ? 'Deleting...' : 'Delete Table' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="insertDialogOpen" @update:open="insertDialogOpen = $event">
      <DialogContent class="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Insert Row</DialogTitle>
          <DialogDescription>Values are type-coerced before calling TenantDB insert action.</DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 md:grid-cols-2">
          <div v-for="column in editableColumns" :key="column.uuid" class="space-y-1">
            <Label class="font-mono text-xs">{{ column.name }} ({{ column.data_type }})</Label>
            <Input v-model="insertRowInputs[column.name]" class="font-mono" :placeholder="column.is_nullable ? 'optional' : 'required'" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="insertDialogOpen = false">Cancel</Button>
          <Button :disabled="insertRowMutation.isPending.value" @click="submitInsertRow">
            {{ insertRowMutation.isPending.value ? 'Inserting...' : 'Insert' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="rowEditDialogOpen" @update:open="rowEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Edit Row</DialogTitle>
          <DialogDescription>
            Row id: <span class="font-mono">{{ editingRow ? String(editingRow.id ?? '') : '-' }}</span>
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 md:grid-cols-2">
          <div v-for="column in editableColumns" :key="column.uuid" class="space-y-1">
            <Label class="font-mono text-xs">{{ column.name }} ({{ column.data_type }})</Label>
            <Input v-model="editRowInputs[column.name]" class="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="rowEditDialogOpen = false">Cancel</Button>
          <Button :disabled="updateRowMutation.isPending.value" @click="submitEditRow">
            {{ updateRowMutation.isPending.value ? 'Updating...' : 'Update' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="rowDeleteDialogOpen" @update:open="rowDeleteDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Row</DialogTitle>
          <DialogDescription>
            Type row id <span class="font-mono">{{ deleteRowTargetId }}</span> to confirm deletion.
          </DialogDescription>
        </DialogHeader>
        <Input v-model="deleteRowConfirmInput" class="font-mono" placeholder="row id" />
        <DialogFooter>
          <Button variant="outline" @click="rowDeleteDialogOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="deleteRowMutation.isPending.value" @click="submitDeleteRow">
            {{ deleteRowMutation.isPending.value ? 'Deleting...' : 'Delete Row' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </TenantDbWorkbenchScaffold>
</template>
