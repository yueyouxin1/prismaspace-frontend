<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  WorkflowEventRead,
  WorkflowGraphRead,
  WorkflowNodeDataRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
  WorkflowParameterSchema,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
} from '@prismaspace/contracts'
import { FormGenerator, type FieldRendererDefinition, type FieldOption } from '@prismaspace/generator/form-generator'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@prismaspace/ui-shadcn/components/ui/tabs'
import { Textarea } from '@prismaspace/ui-shadcn/components/ui/textarea'
import WorkflowParameterSchemaEditorField from './fields/WorkflowParameterSchemaEditorField.vue'
import WorkflowOptionSelectField from './fields/WorkflowOptionSelectField.vue'
import WorkflowJsonValueField from './fields/WorkflowJsonValueField.vue'
import WorkflowVariableExplorer from './WorkflowVariableExplorer.vue'
import type {
  WorkflowFormRuntimeContext,
  WorkflowLatestExecution,
  WorkflowValidationResult,
} from '../types/workflow-ide'
import {
  buildFormItemsFromParameterSchemas,
  buildGeneratorSchema,
  buildWorkflowVariableEntries,
  cloneJson,
  formatJson,
  parseJsonArray,
  parseJsonObject,
} from '../utils/workflow-helpers'

const props = withDefaults(defineProps<{
  selectedNode: WorkflowNodeRead | null
  selectedNodeDefinition?: WorkflowNodeDefRead | null
  graph: WorkflowGraphRead
  workflowInputSchemas?: WorkflowParameterSchema[]
  formContext: WorkflowFormRuntimeContext
  validationResult?: WorkflowValidationResult | null
  validating?: boolean
  runInputText: string
  debugInputText: string
  latestExecution?: WorkflowLatestExecution | null
  running?: boolean
  debugging?: boolean
  runs: WorkflowRunSummaryRead[]
  selectedRunId?: string | null
  selectedRun?: WorkflowRunRead | null
  selectedRunEvents?: WorkflowEventRead[]
  loadingRunDetail?: boolean
  loadingRunEvents?: boolean
}>(), {
  selectedNodeDefinition: null,
  workflowInputSchemas: () => [],
  validationResult: null,
  validating: false,
  latestExecution: null,
  running: false,
  debugging: false,
  selectedRunId: null,
  selectedRun: null,
  selectedRunEvents: () => [],
  loadingRunDetail: false,
  loadingRunEvents: false,
})

const emit = defineEmits<{
  (event: 'update-node-data', value: WorkflowNodeDataRead): void
  (event: 'update:run-input-text', value: string): void
  (event: 'update:debug-input-text', value: string): void
  (event: 'validate'): void
  (event: 'run'): void
  (event: 'run-async'): void
  (event: 'debug-node'): void
  (event: 'select-run', runId: string): void
  (event: 'cancel-run', runId: string): void
}>()

const activeTab = ref<'node' | 'runs' | 'raw'>('node')
const draftNodeData = ref<WorkflowNodeDataRead | null>(null)
const inputSchemaText = ref('[]')
const outputSchemaText = ref('[]')
const schemaError = ref('')
const syncingFromProps = ref(false)
const runFormModel = ref<Record<string, unknown>>({})
const debugFormModel = ref<Record<string, unknown>>({})
const syncingRunForm = ref(false)
const syncingDebugForm = ref(false)

const generatorSchema = computed(() => buildGeneratorSchema(props.selectedNodeDefinition?.forms ?? []))
const workflowRunFormSchema = computed(() => buildFormItemsFromParameterSchemas(props.workflowInputSchemas ?? [], 'workflow-run'))
const nodeDebugFormSchema = computed(() => buildFormItemsFromParameterSchemas(props.selectedNode?.data.inputs ?? [], 'node-debug'))
const variableEntries = computed(() => buildWorkflowVariableEntries(props.graph, props.selectedNode?.id ?? null))

const optionFieldRenderer: FieldRendererDefinition = {
  component: WorkflowOptionSelectField,
  getProps: (ctx) => {
    const resourceType = String(ctx.item.props?.resource_type ?? '')
    const options: FieldOption[] = (resourceType
      ? props.formContext.resourceOptionsByType[resourceType] ?? []
      : props.formContext.modelOptions
    ).map(option => ({
      value: option.value,
      label: option.label,
      description: option.description,
    }))
    return {
      fieldProps: {
        placeholder: resourceType ? '选择资源实例' : '选择模型版本',
      },
      options,
    }
  },
}

const parameterSchemaFieldRenderer: FieldRendererDefinition = {
  component: WorkflowParameterSchemaEditorField,
  getProps: (ctx) => ({
    fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
    variableEntries: variableEntries.value,
  }),
}

const jsonFieldRenderer: FieldRendererDefinition = {
  component: WorkflowJsonValueField,
  getProps: (ctx) => ({
    fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
  }),
}

const fieldRenderers = computed<Record<string, FieldRendererDefinition>>(() => ({
  resource_selector: optionFieldRenderer,
  model_selector: optionFieldRenderer,
  parameter_schema: parameterSchemaFieldRenderer,
  workflow_json: jsonFieldRenderer,
}))

const safeParseObject = (text: string): Record<string, unknown> => {
  const trimmed = text.trim()
  if (!trimmed) {
    return {}
  }
  try {
    return parseJsonObject(trimmed)
  } catch {
    return {}
  }
}

watch(
  () => props.selectedNode,
  (node) => {
    syncingFromProps.value = true
    draftNodeData.value = node ? cloneJson(node.data) : null
    inputSchemaText.value = formatJson(node?.data.inputs ?? [])
    outputSchemaText.value = formatJson(node?.data.outputs ?? [])
    schemaError.value = ''
    queueMicrotask(() => {
      syncingFromProps.value = false
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => props.runInputText,
  (value) => {
    syncingRunForm.value = true
    runFormModel.value = safeParseObject(value)
    queueMicrotask(() => {
      syncingRunForm.value = false
    })
  },
  { immediate: true },
)

watch(
  () => props.debugInputText,
  (value) => {
    syncingDebugForm.value = true
    debugFormModel.value = safeParseObject(value)
    queueMicrotask(() => {
      syncingDebugForm.value = false
    })
  },
  { immediate: true },
)

watch(
  draftNodeData,
  (value) => {
    if (!value || syncingFromProps.value) {
      return
    }
    emit('update-node-data', cloneJson(value))
  },
  { deep: true },
)

watch(
  runFormModel,
  (value) => {
    if (syncingRunForm.value) {
      return
    }
    emit('update:run-input-text', formatJson(value))
  },
  { deep: true },
)

watch(
  debugFormModel,
  (value) => {
    if (syncingDebugForm.value) {
      return
    }
    emit('update:debug-input-text', formatJson(value))
  },
  { deep: true },
)

const applySchemaDrafts = (): void => {
  if (!draftNodeData.value) {
    return
  }
  try {
    draftNodeData.value.inputs = parseJsonArray(inputSchemaText.value)
    draftNodeData.value.outputs = parseJsonArray(outputSchemaText.value)
    schemaError.value = ''
  } catch (error) {
    schemaError.value = error instanceof Error ? error.message : 'Schema JSON 解析失败。'
  }
}

const latestExecutionText = computed(() => {
  if (!props.latestExecution) {
    return ''
  }
  return formatJson(props.latestExecution.response.data)
})

const selectedRunText = computed(() => formatJson(props.selectedRun))
</script>

<template>
  <Tabs v-model="activeTab" class="flex h-full min-h-0 flex-col">
    <div class="border-b px-4 py-3">
      <TabsList class="grid w-full grid-cols-3">
        <TabsTrigger value="node">节点</TabsTrigger>
        <TabsTrigger value="runs">运行</TabsTrigger>
        <TabsTrigger value="raw">原始</TabsTrigger>
      </TabsList>
    </div>

    <TabsContent value="node" class="mt-0 min-h-0 flex-1 overflow-auto">
      <div class="space-y-4 p-4">
        <Card v-if="!selectedNode">
          <CardContent class="p-6 text-sm text-muted-foreground">
            在画布中选择一个节点后，可在这里编辑名称、Schema、配置表单和依赖绑定。
          </CardContent>
        </Card>

        <template v-else-if="draftNodeData">
          <Card>
            <CardHeader class="space-y-2">
              <CardTitle class="flex items-center justify-between gap-3">
                <span class="truncate">{{ selectedNode.data.name }}</span>
                <Badge variant="outline">{{ selectedNode.data.registryId }}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">节点名称</label>
                <Input v-model="draftNodeData.name" placeholder="输入节点名称" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">节点描述</label>
                <Textarea v-model="draftNodeData.description" class="min-h-20" placeholder="输入节点描述" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>节点配置</CardTitle>
            </CardHeader>
            <CardContent>
              <FormGenerator
                v-if="draftNodeData && generatorSchema.length"
                v-model="draftNodeData"
                :schema="generatorSchema"
                :field-renderers="fieldRenderers"
              />
              <p v-else class="text-sm text-muted-foreground">
                当前节点没有表单定义，可直接编辑 inputs / outputs Schema。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>端口与 Schema</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium">Inputs Schema</label>
                <Textarea v-model="inputSchemaText" class="min-h-36 font-mono text-xs" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium">Outputs Schema</label>
                <Textarea v-model="outputSchemaText" class="min-h-36 font-mono text-xs" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-muted-foreground">使用后端 ParameterSchema 数组 JSON 直接编辑端口定义。</p>
                <Button size="sm" @click="applySchemaDrafts">应用 Schema</Button>
              </div>
              <p v-if="schemaError" class="text-xs text-destructive">{{ schemaError }}</p>
            </CardContent>
          </Card>
        </template>
      </div>
    </TabsContent>

    <TabsContent value="runs" class="mt-0 min-h-0 flex-1 overflow-auto">
      <div class="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Validate / Run / Debug</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" :disabled="validating" @click="emit('validate')">
                {{ validating ? '校验中...' : '校验工作流' }}
              </Button>
              <Button :disabled="running" @click="emit('run')">
                {{ running ? '执行中...' : '执行工作流' }}
              </Button>
              <Button variant="outline" :disabled="running" @click="emit('run-async')">
                后台运行
              </Button>
              <Button variant="secondary" :disabled="!selectedNode || debugging" @click="emit('debug-node')">
                {{ debugging ? '调试中...' : '调试选中节点' }}
              </Button>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Run Inputs JSON</label>
              <Textarea
                :model-value="runInputText"
                class="min-h-24 font-mono text-xs"
                @update:model-value="emit('update:run-input-text', String($event ?? '{}'))"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium">Debug Inputs JSON</label>
              <Textarea
                :model-value="debugInputText"
                class="min-h-24 font-mono text-xs"
                @update:model-value="emit('update:debug-input-text', String($event ?? '{}'))"
              />
            </div>

            <Card v-if="workflowRunFormSchema.length">
              <CardHeader class="pb-3">
                <CardTitle class="text-sm">Run Test Form</CardTitle>
              </CardHeader>
              <CardContent>
                <FormGenerator
                  v-model="runFormModel"
                  :schema="workflowRunFormSchema"
                  :field-renderers="fieldRenderers"
                />
              </CardContent>
            </Card>

            <Card v-if="selectedNode && nodeDebugFormSchema.length">
              <CardHeader class="pb-3">
                <CardTitle class="text-sm">Node Debug Form</CardTitle>
              </CardHeader>
              <CardContent>
                <FormGenerator
                  v-model="debugFormModel"
                  :schema="nodeDebugFormSchema"
                  :field-renderers="fieldRenderers"
                />
              </CardContent>
            </Card>

            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-medium">Validation</p>
                <Badge
                  v-if="validationResult"
                  :variant="validationResult.is_valid ? 'secondary' : 'destructive'"
                >
                  {{ validationResult.is_valid ? '通过' : '失败' }}
                </Badge>
              </div>
              <div
                v-if="validationResult"
                class="rounded-lg border bg-muted/20 p-3 text-xs"
              >
                <p v-if="validationResult.is_valid" class="text-emerald-600">当前工作流图通过校验。</p>
                <ul v-else class="space-y-1 text-destructive">
                  <li v-for="errorItem in validationResult.errors" :key="errorItem">- {{ errorItem }}</li>
                </ul>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium">Latest Execution</p>
              <pre class="max-h-64 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">{{ latestExecutionText || '暂无执行结果。' }}</pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="space-y-2">
              <button
                v-for="run in runs"
                :key="run.run_id"
                type="button"
                class="flex w-full items-start justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/30"
                :class="selectedRunId === run.run_id ? 'border-primary bg-primary/5' : 'border-border/80'"
                @click="emit('select-run', run.run_id)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ run.run_id }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{{ run.status }} · {{ run.started_at || 'unknown time' }}</p>
                </div>
                <Badge variant="outline">{{ run.status }}</Badge>
              </button>
              <p v-if="!runs.length" class="text-sm text-muted-foreground">暂无运行记录。</p>
            </div>

            <div v-if="selectedRun" class="space-y-3 rounded-xl border p-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-medium">Selected Run</p>
                <Button
                  v-if="selectedRun.status === 'RUNNING'"
                  size="sm"
                  variant="destructive"
                  @click="emit('cancel-run', selectedRun.run_id)"
                >
                  取消
                </Button>
              </div>
              <pre class="max-h-48 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">{{ selectedRunText }}</pre>

              <div v-if="selectedRun.node_executions?.length" class="space-y-2">
                <p class="text-sm font-medium">Node Executions</p>
                <div class="space-y-2">
                  <div
                    v-for="nodeExecution in selectedRun.node_executions"
                    :key="`${nodeExecution.node_id}-${nodeExecution.attempt}`"
                    class="rounded-lg border bg-muted/20 p-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <p class="text-sm font-medium">{{ nodeExecution.node_name }}</p>
                        <p class="text-[11px] text-muted-foreground">{{ nodeExecution.node_type }} · attempt {{ nodeExecution.attempt }}</p>
                      </div>
                      <Badge variant="outline">{{ nodeExecution.status }}</Badge>
                    </div>
                    <p v-if="nodeExecution.error_message" class="mt-2 text-xs text-destructive">{{ nodeExecution.error_message }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium">Events</p>
                <div v-if="loadingRunEvents" class="text-sm text-muted-foreground">正在加载运行事件...</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="eventItem in selectedRunEvents"
                    :key="`${eventItem.sequence_no}-${eventItem.event_type}`"
                    class="rounded-lg border bg-muted/20 p-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs font-medium">{{ eventItem.event_type }}</p>
                      <span class="text-[11px] text-muted-foreground">#{{ eventItem.sequence_no }}</span>
                    </div>
                    <pre class="mt-2 overflow-auto text-[11px]">{{ formatJson(eventItem.payload) }}</pre>
                  </div>
                  <p v-if="!selectedRunEvents?.length" class="text-sm text-muted-foreground">暂无事件。</p>
                </div>
              </div>
            </div>
            <div v-else-if="loadingRunDetail" class="text-sm text-muted-foreground">正在加载运行详情...</div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>

    <TabsContent value="raw" class="mt-0 min-h-0 flex-1 overflow-auto">
      <div class="space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Selected Node JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <pre class="max-h-[72vh] overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">{{ formatJson(selectedNode) || '暂无选中节点。' }}</pre>
          </CardContent>
        </Card>

        <WorkflowVariableExplorer :entries="variableEntries" />
      </div>
    </TabsContent>
  </Tabs>
</template>
