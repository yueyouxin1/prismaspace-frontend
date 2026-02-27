<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import { resourceApi } from '@app/services/api/resource-client'
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
  resourceDescription?: string
  updatedAt?: string | null
  workspaceInstanceUuid?: string | null
  latestPublishedInstanceUuid?: string | null
}>()
const router = useRouter()
const { t } = useI18n()

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
  throw new Error(t('platform.workbench.tenantdb.errors.booleanInvalid', { value }))
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
      throw new Error(t('platform.workbench.tenantdb.errors.nullNotAllowed'))
    }
    return null
  }
  if (dataType === 'text' || dataType === 'timestamp') {
    return rawValue
  }
  if (dataType === 'integer') {
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed)) {
      throw new Error(t('platform.workbench.tenantdb.errors.integerRequired', { value: rawValue }))
    }
    return parsed
  }
  if (dataType === 'number') {
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      throw new Error(t('platform.workbench.tenantdb.errors.numberRequired', { value: rawValue }))
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
      throw new Error(t('platform.workbench.tenantdb.errors.jsonInvalid'))
    }
  }
  return rawValue
}

const validateIdentifier = (value: string, label: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return t('platform.workbench.tenantdb.errors.identifierRequired', { label })
  }
  if (trimmed.length > 63) {
    return t('platform.workbench.tenantdb.errors.identifierLength', { label })
  }
  if (!IDENTIFIER_REGEX.test(trimmed)) {
    return t('platform.workbench.tenantdb.errors.identifierPattern', { label })
  }
  if (PG_RESERVED_WORDS.has(trimmed.toLowerCase())) {
    return t('platform.workbench.tenantdb.errors.identifierReservedKeyword', { label, value: trimmed })
  }
  return null
}

const validateTableDraft = (draft: TenantTableDraft): string[] => {
  const errors: string[] = []
  const tableNameError = validateIdentifier(draft.name, t('platform.workbench.tenantdb.tableName'))
  if (tableNameError) {
    errors.push(tableNameError)
  }
  if (!draft.label.trim()) {
    errors.push(t('platform.workbench.tenantdb.errors.tableLabelRequired'))
  }
  if (!draft.columns.length) {
    errors.push(t('platform.workbench.tenantdb.errors.atLeastOneColumn'))
  }
  const columnNameSet = new Set<string>()
  draft.columns.forEach((column, index) => {
    const prefix = t('platform.workbench.tenantdb.columnIndex', { index: index + 1 })
    const nameError = validateIdentifier(column.name, t('platform.workbench.tenantdb.columnNameWithPrefix', { prefix }))
    if (nameError) {
      errors.push(nameError)
    }
    if (SYSTEM_COLUMNS.has(column.name.trim().toLowerCase())) {
      errors.push(t('platform.workbench.tenantdb.errors.columnReserved', { prefix, value: column.name }))
    }
    const lowered = column.name.trim().toLowerCase()
    if (lowered && columnNameSet.has(lowered)) {
      errors.push(t('platform.workbench.tenantdb.errors.columnDuplicate', { prefix, value: column.name }))
    }
    if (lowered) {
      columnNameSet.add(lowered)
    }
    if (!column.label.trim()) {
      errors.push(t('platform.workbench.tenantdb.errors.columnLabelRequired', { prefix }))
    }
    if (column.default_value_text.trim()) {
      try {
        parseValueByType(column.default_value_text, column.data_type, column.is_nullable)
      } catch (error) {
        errors.push(
          t('platform.workbench.tenantdb.errors.columnDefaultInvalid', {
            prefix,
            message: error instanceof Error ? error.message : t('platform.workbench.tenantdb.errors.invalidValue'),
          }),
        )
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
    .map((column) => column.name || t('platform.workbench.tenantdb.unnamed'))

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
    return t('platform.workbench.tenantdb.valueNull')
  }
  if (value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return t('platform.workbench.tenantdb.valueObject')
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

const sqlText = ref('')
const sqlResultRows = ref<JsonRecord[]>([])
const sqlResultError = ref('')

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
      throw new Error(t('platform.workbench.tenantdb.errors.workspaceInstanceMissing'))
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
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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

const sqlMutation = useMutation({
  mutationFn: async (rawSql: string): Promise<JsonRecord[]> => {
    if (!props.workspaceInstanceUuid || !selectedTable.value) {
      throw new Error(t('platform.workbench.tenantdb.errors.tableContextMissing'))
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
  },
  onError: (error, sql) => {
    sqlResultRows.value = []
    sqlResultError.value = error instanceof Error ? error.message : t('platform.workbench.tenantdb.errors.sqlExecutionFailed')
    emitBusinessError(error)
  },
})

const buildPublishVersionTag = (): string => {
  const now = new Date()
  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
}

const publishMutation = useMutation({
  mutationFn: async () => {
    if (!props.workspaceInstanceUuid) {
      throw new Error(t('platform.workbench.tenantdb.errors.noWorkspaceInstance'))
    }
    return resourceApi.publishInstance(props.workspaceInstanceUuid, {
      version_tag: buildPublishVersionTag(),
    })
  },
  onError: (error) => {
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
    createErrorText.value = error instanceof Error ? error.message : t('platform.workbench.tenantdb.errors.createPayloadFailed')
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
    schemaErrorText.value = t('platform.workbench.tenantdb.errors.noSchemaChanges')
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
    schemaErrorText.value = t('platform.workbench.tenantdb.errors.schemaDeleteAckRequired')
    return
  }
  try {
    const payload = buildTableUpdatePayload(schemaDraft.value)
    await updateTableMutation.mutateAsync(payload)
  } catch (error) {
    schemaErrorText.value = error instanceof Error ? error.message : t('platform.workbench.tenantdb.errors.updatePayloadFailed')
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
    schemaErrorText.value = t('platform.workbench.tenantdb.errors.deleteTableConfirmMismatch')
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
    emitBusinessError(new Error(t('platform.workbench.tenantdb.errors.rowIdMissing')))
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
    emitBusinessError(new Error(t('platform.workbench.tenantdb.errors.rowIdMissing')))
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
    emitBusinessError(new Error(t('platform.workbench.tenantdb.errors.rowDeleteConfirmMismatch')))
    return
  }
  await deleteRowMutation.mutateAsync(deleteRowTargetId.value)
}

const runSql = async (): Promise<void> => {
  const sql = sqlText.value.trim()
  if (!sql) {
    return
  }
  if (!/^select/i.test(sql)) {
    sqlResultError.value = t('platform.workbench.tenantdb.errors.rawSqlSelectOnly')
    return
  }
  await sqlMutation.mutateAsync(sql)
}

const handleHeaderSave = (): void => {
  openSchemaSaveConfirm()
}

const handleHeaderRun = (): void => {
  void runSql()
}

const handleHeaderPublish = (): void => {
  if (publishMutation.isPending.value) {
    return
  }
  publishMutation.mutate()
}

</script>

<template>
  <TenantDbWorkbenchScaffold
    :resource-name="resourceName"
    :resource-description="resourceDescription"
    :updated-at="updatedAt"
    :workspace-instance-uuid="workspaceInstanceUuid"
    :latest-published-instance-uuid="latestPublishedInstanceUuid"
    :save-disabled="!hasSchemaChanges || updateTableMutation.isPending.value"
    :publish-disabled="!workspaceInstanceUuid || publishMutation.isPending.value"
    :run-disabled="!selectedTable || sqlMutation.isPending.value"
    :running="sqlMutation.isPending.value"
    :saving="updateTableMutation.isPending.value"
    :publishing="publishMutation.isPending.value"
    @back="router.push('/resources')"
    @save="handleHeaderSave"
    @run="handleHeaderRun"
    @publish="handleHeaderPublish"
  >
    <Card v-if="!workspaceInstanceUuid">
      <CardHeader>
        <CardTitle>{{ t('platform.workbench.tenantdb.instanceUnavailableTitle') }}</CardTitle>
      </CardHeader>
      <CardContent class="text-sm text-muted-foreground">
        {{ t('platform.workbench.tenantdb.instanceUnavailableDescription') }}
      </CardContent>
    </Card>

    <div v-else class="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card class="h-fit">
        <CardHeader class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="flex items-center gap-2 text-base">
                <IconDatabase class="size-4" />
                {{ t('platform.workbench.tenantdb.databaseExplorer') }}
              </CardTitle>
              <CardDescription>{{ t('platform.workbench.tenantdb.manageTableInventory') }}</CardDescription>
            </div>
            <Button size="sm" class="gap-1" @click="openCreateTableDialog">
              <IconPlus class="size-4" />
              {{ t('platform.workbench.tenantdb.table') }}
            </Button>
          </div>
          <div class="relative">
            <IconSearch class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="tableSearchText" class="pl-9" :placeholder="t('platform.workbench.tenantdb.searchTable')" />
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
            <p v-if="!filteredTables.length" class="text-xs text-muted-foreground">{{ t('platform.workbench.tenantdb.noTableFound') }}</p>
          </template>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle class="text-base">
                {{ selectedTable?.label || selectedTable?.name || t('platform.workbench.tenantdb.noTableSelected') }}
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
                {{ t('platform.workbench.tenantdb.dropTable') }}
              </Button>
            </div>
          </div>
          <Tabs v-model="activeMainTab" class="w-full">
            <TabsList class="grid w-full grid-cols-3">
              <TabsTrigger value="data">{{ t('platform.workbench.tenantdb.tabs.data') }}</TabsTrigger>
              <TabsTrigger value="schema">{{ t('platform.workbench.tenantdb.tabs.schema') }}</TabsTrigger>
              <TabsTrigger value="sql">{{ t('platform.workbench.tenantdb.tabs.sql') }}</TabsTrigger>
            </TabsList>

            <TabsContent value="data" class="space-y-4">
              <Card>
                <CardHeader class="space-y-3">
                  <CardTitle class="text-sm">{{ t('platform.workbench.tenantdb.queryBuilder') }}</CardTitle>
                  <div class="grid gap-2 md:grid-cols-4">
                    <div class="space-y-1">
                      <Label>{{ t('platform.workbench.tenantdb.limit') }}</Label>
                      <Select
                        :model-value="String(dataLimitDraft)"
                        @update:model-value="(value) => (dataLimitDraft = Number(value))"
                      >
                        <SelectTrigger>
                          <SelectValue :placeholder="t('platform.workbench.tenantdb.rowsPerPage')" />
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
                      <Label>{{ t('platform.workbench.tenantdb.orderBy') }}</Label>
                      <Select v-model="dataOrderColumnDraft">
                        <SelectTrigger>
                          <SelectValue :placeholder="t('platform.workbench.tenantdb.none')" />
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
                      <Label>{{ t('platform.workbench.tenantdb.direction') }}</Label>
                      <Select v-model="dataOrderDirectionDraft">
                        <SelectTrigger>
                          <SelectValue :placeholder="t('platform.workbench.tenantdb.direction')" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASC">ASC</SelectItem>
                          <SelectItem value="DESC">DESC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div class="flex items-end gap-2">
                      <Button class="w-full" :disabled="!selectedTable" @click="applyDataQuery">{{ t('platform.workbench.tenantdb.applyQuery') }}</Button>
                      <Button
                        variant="outline"
                        class="w-full"
                        :disabled="!selectedTable"
                        @click="openInsertRowDialog"
                      >
                        {{ t('platform.workbench.tenantdb.insertRow') }}
                      </Button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <Label>{{ t('platform.workbench.tenantdb.projectionColumns') }}</Label>
                    <div class="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        @click="dataColumnDrafts = (selectedTable?.columns ?? []).map((column) => column.name)"
                      >
                        {{ t('platform.workbench.tenantdb.all') }}
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
                      <Label>{{ t('platform.workbench.tenantdb.filters') }}</Label>
                      <Button size="sm" variant="outline" class="gap-1" @click="addFilterDraft">
                        <IconPlus class="size-3.5" />
                        {{ t('platform.workbench.tenantdb.add') }}
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
                            <SelectValue :placeholder="t('platform.workbench.tenantdb.column')" />
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
                            <SelectValue :placeholder="t('platform.workbench.tenantdb.operator')" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem v-for="operator in FILTER_OPERATORS" :key="operator" :value="operator">
                              {{ operator }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Input v-model="filter.value" :placeholder="t('platform.workbench.tenantdb.value')" />
                        <Button size="icon" variant="outline" @click="removeFilterDraft(filter.id)">
                          <IconTrash class="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p v-else class="text-xs text-muted-foreground">{{ t('platform.workbench.tenantdb.noFiltersHint') }}</p>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div class="flex items-center justify-between gap-2">
                    <CardTitle class="text-sm">{{ t('platform.workbench.tenantdb.rows') }}</CardTitle>
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{{ t('platform.workbench.tenantdb.count', { count: dataTotalCount }) }}</span>
                      <span>{{ t('platform.workbench.tenantdb.page', { page: appliedDataQuery.page, total: dataPageCount }) }}</span>
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
                            <TableHead class="text-right">{{ t('platform.workbench.tenantdb.actions') }}</TableHead>
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
                              {{ t('platform.workbench.tenantdb.noDataReturned') }}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">
                        {{ t('platform.workbench.tenantdb.paginationHint') }}
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
                <AlertTitle>{{ t('platform.workbench.tenantdb.schemaValidationFailed') }}</AlertTitle>
                <AlertDescription>{{ schemaErrorText }}</AlertDescription>
              </Alert>

              <Card v-if="schemaDraft">
                <CardHeader class="space-y-3">
                  <CardTitle class="text-sm">{{ t('platform.workbench.tenantdb.tableMetadata') }}</CardTitle>
                  <div class="grid gap-2 md:grid-cols-3">
                    <div class="space-y-1">
                      <Label>{{ t('platform.workbench.tenantdb.tableName') }}</Label>
                      <Input v-model="schemaDraft.name" class="font-mono" />
                    </div>
                    <div class="space-y-1">
                      <Label>{{ t('platform.workbench.tenantdb.label') }}</Label>
                      <Input v-model="schemaDraft.label" />
                    </div>
                    <div class="space-y-1">
                      <Label>{{ t('platform.workbench.tenantdb.description') }}</Label>
                      <Input v-model="schemaDraft.description" />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card v-if="schemaDraft">
                <CardHeader class="space-y-3">
                  <div class="flex items-center justify-between">
                    <CardTitle class="text-sm">{{ t('platform.workbench.tenantdb.columnDefinitions') }}</CardTitle>
                    <Button size="sm" variant="outline" class="gap-1" @click="addSchemaColumn">
                      <IconPlus class="size-4" />
                      {{ t('platform.workbench.tenantdb.column') }}
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
                        :placeholder="t('platform.workbench.tenantdb.columnNamePlaceholder')"
                        @focus="selectedSchemaColumnId = column.uuid ?? column.name"
                      />
                      <Input v-model="column.label" :placeholder="t('platform.workbench.tenantdb.label')" @focus="selectedSchemaColumnId = column.uuid ?? column.name" />
                      <Select v-model="column.data_type">
                        <SelectTrigger>
                          <SelectValue :placeholder="t('platform.workbench.tenantdb.type')" />
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
                        {{ t('platform.workbench.tenantdb.nullable') }}
                      </label>
                      <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                        <Checkbox
                          :model-value="column.is_unique"
                          @update:model-value="column.is_unique = Boolean($event)"
                        />
                        {{ t('platform.workbench.tenantdb.unique') }}
                      </label>
                      <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                        <Checkbox
                          :model-value="column.is_indexed"
                          @update:model-value="column.is_indexed = Boolean($event)"
                        />
                        {{ t('platform.workbench.tenantdb.indexed') }}
                      </label>
                      <Button size="icon" variant="outline" @click="removeSchemaColumn(index)">
                        <IconTrash class="size-3.5" />
                      </Button>
                    </div>
                    <div class="grid gap-2 md:grid-cols-[1fr_1fr]">
                      <Input
                        v-model="column.default_value_text"
                        class="font-mono"
                        :placeholder="t('platform.workbench.tenantdb.defaultValueTypeAware')"
                      />
                      <Input v-model="column.description" :placeholder="t('platform.workbench.tenantdb.description')" />
                    </div>
                  </div>

                  <Separator />

                  <div class="flex items-center justify-between">
                    <div class="text-xs text-muted-foreground">
                      {{ t('platform.workbench.tenantdb.diffSummary', { added: schemaDiff.added.length, updated: schemaDiff.updated.length, removed: schemaDiff.removed.length }) }}
                    </div>
                    <Button
                      :disabled="!hasSchemaChanges || updateTableMutation.isPending.value"
                      @click="openSchemaSaveConfirm"
                    >
                      {{ updateTableMutation.isPending.value ? t('platform.workbench.header.actions.saving') : t('platform.workbench.tenantdb.saveSchema') }}
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
                    {{ t('platform.workbench.tenantdb.sqlConsoleTitle') }}
                  </CardTitle>
                  <CardDescription>{{ t('platform.workbench.tenantdb.sqlConsoleDescription') }}</CardDescription>
                </CardHeader>
                <CardContent class="space-y-3">
                  <Textarea v-model="sqlText" class="min-h-36 font-mono text-xs" :placeholder="t('platform.workbench.tenantdb.sqlPlaceholder')" />
                  <div class="flex items-center justify-between">
                    <Button :disabled="sqlMutation.isPending.value || !selectedTable" @click="runSql">
                      {{ sqlMutation.isPending.value ? t('platform.workbench.header.actions.running') : t('platform.workbench.tenantdb.runSql') }}
                    </Button>
                    <span class="text-xs text-muted-foreground">{{ t('platform.workbench.tenantdb.resultMaxRows') }}</span>
                  </div>
                  <p v-if="sqlResultError" class="text-xs text-destructive">{{ sqlResultError }}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle class="text-sm">{{ t('platform.workbench.tenantdb.sqlResult') }}</CardTitle>
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
                            {{ t('platform.workbench.tenantdb.noSqlRows') }}
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

    </div>

    <Dialog :open="createTableDialogOpen" @update:open="createTableDialogOpen = $event">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.createTable') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.tenantdb.createDialogDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="grid gap-2 md:grid-cols-3">
            <div class="space-y-1">
              <Label>{{ t('platform.workbench.tenantdb.name') }}</Label>
              <Input v-model="createDraft.name" class="font-mono" :placeholder="t('platform.workbench.tenantdb.tableNameExample')" />
            </div>
            <div class="space-y-1">
              <Label>{{ t('platform.workbench.tenantdb.label') }}</Label>
              <Input v-model="createDraft.label" :placeholder="t('platform.workbench.tenantdb.tableLabelExample')" />
            </div>
            <div class="space-y-1">
              <Label>{{ t('platform.workbench.tenantdb.description') }}</Label>
              <Input v-model="createDraft.description" :placeholder="t('platform.workbench.tenantdb.optional')" />
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label>{{ t('platform.workbench.tenantdb.initialColumns') }}</Label>
              <Button size="sm" variant="outline" class="gap-1" @click="addColumnToCreateDraft">
                <IconPlus class="size-3.5" />
                {{ t('platform.workbench.tenantdb.add') }}
              </Button>
            </div>
            <div
              v-for="(column, index) in createDraft.columns"
              :key="`create-col-${index}`"
              class="space-y-2 rounded-md border p-3"
            >
              <div class="grid gap-2 md:grid-cols-[1fr_1fr_140px_120px_120px_120px_auto]">
                <Input v-model="column.name" class="font-mono" :placeholder="t('platform.workbench.tenantdb.columnNamePlaceholder')" />
                <Input v-model="column.label" :placeholder="t('platform.workbench.tenantdb.label')" />
                <Select v-model="column.data_type">
                  <SelectTrigger>
                    <SelectValue :placeholder="t('platform.workbench.tenantdb.type')" />
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
                  {{ t('platform.workbench.tenantdb.nullable') }}
                </label>
                <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                  <Checkbox
                    :model-value="column.is_unique"
                    @update:model-value="column.is_unique = Boolean($event)"
                  />
                  {{ t('platform.workbench.tenantdb.unique') }}
                </label>
                <label class="flex items-center gap-1 rounded-md border px-2 text-xs">
                  <Checkbox
                    :model-value="column.is_indexed"
                    @update:model-value="column.is_indexed = Boolean($event)"
                  />
                  {{ t('platform.workbench.tenantdb.indexed') }}
                </label>
                <Button size="icon" variant="outline" @click="removeColumnFromCreateDraft(index)">
                  <IconTrash class="size-3.5" />
                </Button>
              </div>
              <div class="grid gap-2 md:grid-cols-[1fr_1fr]">
                <Input
                  v-model="column.default_value_text"
                  class="font-mono"
                  :placeholder="t('platform.workbench.tenantdb.defaultValue')"
                />
                <Input v-model="column.description" :placeholder="t('platform.workbench.tenantdb.description')" />
              </div>
            </div>
          </div>

          <Alert v-if="createErrorText" variant="destructive">
            <AlertTitle>{{ t('platform.workbench.tenantdb.createValidationFailed') }}</AlertTitle>
            <AlertDescription>{{ createErrorText }}</AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="createTableDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="createTableMutation.isPending.value" @click="submitCreateTable">
            {{ createTableMutation.isPending.value ? t('platform.workbench.tenantdb.creating') : t('platform.workbench.tenantdb.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="schemaConfirmDialogOpen" @update:open="schemaConfirmDialogOpen = $event">
      <DialogContent class="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.confirmSchemaSync') }}</DialogTitle>
          <DialogDescription>
            {{ t('platform.workbench.tenantdb.confirmSchemaSyncDescription') }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 text-sm">
          <p>{{ t('platform.workbench.tenantdb.schemaChanged') }}: <strong>{{ schemaDiff.tableChanged ? t('platform.workbench.tenantdb.yes') : t('platform.workbench.tenantdb.no') }}</strong></p>
          <p>{{ t('platform.workbench.tenantdb.addedColumns') }}: <strong>{{ schemaDiff.added.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
          <p>{{ t('platform.workbench.tenantdb.updatedColumns') }}: <strong>{{ schemaDiff.updated.join(', ') || t('platform.workbench.tenantdb.none') }}</strong></p>
          <p class="text-destructive">
            {{ t('platform.workbench.tenantdb.removedColumns') }}: <strong>{{ schemaDiff.removed.join(', ') || t('platform.workbench.tenantdb.none') }}</strong>
          </p>
          <label
            v-if="schemaDiff.removed.length"
            class="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs"
          >
            <Checkbox :model-value="schemaDeleteAcknowledge" @update:model-value="schemaDeleteAcknowledge = Boolean($event)" />
            <span>{{ t('platform.workbench.tenantdb.destructiveDeleteConfirm') }}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="schemaConfirmDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="updateTableMutation.isPending.value" @click="submitSchemaUpdate">
            {{ updateTableMutation.isPending.value ? t('platform.workbench.header.actions.saving') : t('platform.workbench.tenantdb.confirmSave') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="deleteTableDialogOpen" @update:open="deleteTableDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.deleteTable') }}</DialogTitle>
          <DialogDescription>
            {{ t('platform.workbench.tenantdb.deleteTableDescription') }}
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <p class="text-sm">
            {{ t('platform.workbench.tenantdb.confirmTarget') }}: <span class="font-mono">{{ selectedTable?.name }}</span>
          </p>
          <Input v-model="deleteTableConfirmInput" class="font-mono" :placeholder="t('platform.workbench.tenantdb.typeTableNameHere')" />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="deleteTableDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button
            variant="destructive"
            :disabled="deleteTableMutation.isPending.value"
            @click="submitDeleteTable"
          >
            {{ deleteTableMutation.isPending.value ? t('platform.workbench.tenantdb.deleting') : t('platform.workbench.tenantdb.deleteTable') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="insertDialogOpen" @update:open="insertDialogOpen = $event">
      <DialogContent class="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.insertRowTitle') }}</DialogTitle>
          <DialogDescription>{{ t('platform.workbench.tenantdb.insertRowDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 md:grid-cols-2">
          <div v-for="column in editableColumns" :key="column.uuid" class="space-y-1">
            <Label class="font-mono text-xs">{{ column.name }} ({{ column.data_type }})</Label>
            <Input v-model="insertRowInputs[column.name]" class="font-mono" :placeholder="column.is_nullable ? t('platform.workbench.tenantdb.optional') : t('platform.workbench.tenantdb.required')" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="insertDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="insertRowMutation.isPending.value" @click="submitInsertRow">
            {{ insertRowMutation.isPending.value ? t('platform.workbench.tenantdb.inserting') : t('platform.workbench.tenantdb.insert') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="rowEditDialogOpen" @update:open="rowEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.editRowTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('platform.workbench.tenantdb.rowId') }}: <span class="font-mono">{{ editingRow ? String(editingRow.id ?? '') : '-' }}</span>
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 md:grid-cols-2">
          <div v-for="column in editableColumns" :key="column.uuid" class="space-y-1">
            <Label class="font-mono text-xs">{{ column.name }} ({{ column.data_type }})</Label>
            <Input v-model="editRowInputs[column.name]" class="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="rowEditDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="updateRowMutation.isPending.value" @click="submitEditRow">
            {{ updateRowMutation.isPending.value ? t('platform.workbench.tenantdb.updating') : t('platform.workbench.tenantdb.update') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="rowDeleteDialogOpen" @update:open="rowDeleteDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('platform.workbench.tenantdb.deleteRow') }}</DialogTitle>
          <DialogDescription>
            {{ t('platform.workbench.tenantdb.deleteRowDescription', { id: deleteRowTargetId }) }}
          </DialogDescription>
        </DialogHeader>
        <Input v-model="deleteRowConfirmInput" class="font-mono" :placeholder="t('platform.workbench.tenantdb.rowIdPlaceholder')" />
        <DialogFooter>
          <Button variant="outline" @click="rowDeleteDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button variant="destructive" :disabled="deleteRowMutation.isPending.value" @click="submitDeleteRow">
            {{ deleteRowMutation.isPending.value ? t('platform.workbench.tenantdb.deleting') : t('platform.workbench.tenantdb.deleteRow') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </TenantDbWorkbenchScaffold>
</template>
