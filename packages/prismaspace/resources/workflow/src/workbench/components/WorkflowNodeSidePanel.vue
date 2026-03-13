<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, CircleHelp, X } from 'lucide-vue-next'
import type {
  WorkflowGraphRead,
  WorkflowNodeDataRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
} from '@prismaspace/contracts'
import { FormGenerator, type FieldRendererDefinition, type FieldOption } from '@prismaspace/generator/form-generator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@prismaspace/ui-shadcn/components/ui/accordion'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import WorkflowVariableExplorer from './WorkflowVariableExplorer.vue'
import WorkflowParameterSchemaEditorField from './fields/WorkflowParameterSchemaEditorField.vue'
import WorkflowOptionSelectField from './fields/WorkflowOptionSelectField.vue'
import WorkflowJsonValueField from './fields/WorkflowJsonValueField.vue'
import type { WorkflowFormRuntimeContext } from '../types/workflow-ide'
import {
  buildGeneratorSchema,
  buildWorkflowVariableEntries,
  cloneJson,
} from '../utils/workflow-helpers'
import { resolveWorkflowIcon } from '../utils/workflow-icons'

const props = defineProps<{
  selectedNode: WorkflowNodeRead
  selectedNodeDefinition?: WorkflowNodeDefRead | null
  graph: WorkflowGraphRead
  formContext: WorkflowFormRuntimeContext
}>()

const emit = defineEmits<{
  (event: 'update-node-data', value: WorkflowNodeDataRead): void
  (event: 'close'): void
}>()

const draftNodeData = ref<WorkflowNodeDataRead>(cloneJson(props.selectedNode.data))
const syncingFromProps = ref(false)

watch(
  () => props.selectedNode,
  (node) => {
    syncingFromProps.value = true
    draftNodeData.value = cloneJson(node.data)
    queueMicrotask(() => {
      syncingFromProps.value = false
    })
  },
  { immediate: true, deep: true },
)

watch(
  draftNodeData,
  (value) => {
    if (syncingFromProps.value) {
      return
    }
    emit('update-node-data', cloneJson(value))
  },
  { deep: true },
)

const Icon = computed(() => resolveWorkflowIcon(props.selectedNodeDefinition?.icon || props.selectedNode.data.registryId))
const generatorSchema = computed(() => buildGeneratorSchema(props.selectedNodeDefinition?.forms ?? []))
const variableEntries = computed(() => buildWorkflowVariableEntries(props.graph, props.selectedNode.id))

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

const isLlmNode = computed(() => props.selectedNode.data.registryId === 'LLMNode')
</script>

<template>
  <aside class="absolute top-4 right-4 bottom-4 z-40 flex w-[360px] flex-col overflow-hidden rounded-[12px] border border-[#e4e7ef] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
    <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ececf4] bg-white px-3 py-3">
      <div class="flex min-w-0 items-start gap-3">
        <div class="mt-0.5 flex size-8 items-center justify-center rounded-[8px] bg-[#f5f6ff] text-[#4e40e5]">
          <component :is="Icon" class="size-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-[14px] font-semibold text-[#1f2335]">{{ draftNodeData.name }}</h2>
            <Badge variant="outline" class="rounded-full border-[#ececf4] bg-[#fafafc] px-2 text-[10px] text-[#7d8296]">
              {{ draftNodeData.registryId }}
            </Badge>
          </div>
          <p class="mt-1 text-[12px] leading-5 text-[#757c91]">{{ draftNodeData.description || '配置节点执行逻辑与变量输入输出。' }}</p>
        </div>
      </div>
      <Button size="icon-sm" variant="ghost" class="rounded-[8px] text-[#767c8f]" @click="emit('close')">
        <X class="size-4" />
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <div class="h-full overflow-y-auto">
        <Accordion type="multiple" :default-value="['config', 'variables']" class="w-full">
          <AccordionItem value="config" class="border-b border-[#ececf4] bg-white px-0">
            <AccordionTrigger class="px-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline">
              <div class="flex items-center gap-2">
                <Bot v-if="isLlmNode" class="size-4 text-[#1f2335]" />
                <CircleHelp v-else class="size-4 text-[#1f2335]" />
                节点配置
              </div>
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4">
              <div v-if="generatorSchema.length" class="space-y-4">
                <FormGenerator
                  v-model="draftNodeData"
                  :schema="generatorSchema"
                  :field-renderers="fieldRenderers"
                />
              </div>
              <div v-else class="rounded-[8px] bg-[#f7f8fb] px-3 py-4 text-sm text-[#8c92a6]">
                当前节点没有额外表单配置。
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="variables" class="bg-white px-0">
            <AccordionTrigger class="px-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline">
              可用变量
            </AccordionTrigger>
            <AccordionContent class="px-3 pb-4">
              <WorkflowVariableExplorer :entries="variableEntries" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  </aside>
</template>
