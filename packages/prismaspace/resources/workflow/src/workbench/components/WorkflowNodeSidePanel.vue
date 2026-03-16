<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, CircleHelp, X } from 'lucide-vue-next'
import type {
  WorkflowGraphRead,
  WorkflowNodeDataRead,
  WorkflowNodeDefRead,
  WorkflowNodeRead,
} from '@prismaspace/contracts'
import {
  FormGenerator,
  type FieldRendererDefinition,
  type FieldOption,
  type FormItem,
} from '@prismaspace/generator/form-generator'
import { paramSchemaEditorFieldRenderer } from '@prismaspace/generator/form-generator/advanced-components'
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
  buildWorkflowVariableTree,
  cloneJson,
  prefixFormItemsModelPath,
} from '../utils/workflow-helpers'
import { resolveWorkflowIcon } from '../utils/workflow-icons'

type WorkflowNodeSidePanelModel = {
  nodeData: WorkflowNodeDataRead
  ui: {
    sections: string[]
  }
}

const END_PARAM_FIELD_VISIBILITY = {
  refine: {
    regularInline: {
      type: true,
      required: true,
      valueField: 'value',
      actions: true,
    },
  },
} as const

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

const panelModel = ref<WorkflowNodeSidePanelModel | null>(null)
const syncingFromProps = ref(false)

const isStartNode = computed(() => props.selectedNode.data.registryId === 'Start')
const isEndNode = computed(() => props.selectedNode.data.registryId === 'End')
const isLlmNode = computed(() => props.selectedNode.data.registryId === 'LLMNode')
const Icon = computed(() => resolveWorkflowIcon(props.selectedNodeDefinition?.icon || props.selectedNode.data.registryId))
const variableEntries = computed(() => buildWorkflowVariableEntries(props.graph, props.selectedNode.id))
const valueRefTree = computed(() => buildWorkflowVariableTree(variableEntries.value))

const createPanelModel = (nodeData: WorkflowNodeDataRead): WorkflowNodeSidePanelModel => ({
  nodeData: cloneJson(nodeData),
  ui: {
    sections: nodeData.registryId === 'Start'
      ? ['start-inputs']
      : nodeData.registryId === 'End'
        ? ['end-result-mode', 'end-result-object']
        : [],
  },
})

watch(
  () => props.selectedNode,
  (node) => {
    syncingFromProps.value = true
    panelModel.value = createPanelModel(node.data)
    queueMicrotask(() => {
      syncingFromProps.value = false
    })
  },
  { immediate: true, deep: true },
)

watch(
  panelModel,
  (value) => {
    if (!value || syncingFromProps.value) {
      return
    }
    emit('update-node-data', cloneJson(value.nodeData))
  },
  { deep: true },
)

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
  'param-schema-editor': paramSchemaEditorFieldRenderer,
  workflow_json: jsonFieldRenderer,
}))

const defaultGeneratorSchema = computed<FormItem[]>(() => {
  return prefixFormItemsModelPath(
    buildGeneratorSchema(props.selectedNodeDefinition?.forms ?? []),
    'nodeData',
  )
})

const startNodeFormSchema = computed<FormItem[]>(() => ([{
  id: 'start-config-root',
  type: 'form',
  control: 'accordion-root',
  modelPath: 'ui.sections',
  props: {
    type: 'multiple',
    collapsible: true,
    class: 'space-y-3',
  },
  children: [
    {
      id: 'start-inputs-group',
      type: 'form',
      control: 'accordion-item',
      modelPath: 'ui.sections',
      props: {
        value: 'start-inputs',
        title: '输入',
        description: '',
        class: 'rounded-[12px] border border-[#ececf4] bg-[#fafafd]',
        triggerClass: 'px-3 py-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline',
        contentClass: 'px-3 pb-4',
      },
      children: [
        {
          id: 'start-inputs-editor',
          type: 'form',
          control: 'param-schema-editor',
          modelPath: 'nodeData.outputs',
          props: {
            runtimeMode: 'define',
            headerTitle: 'DEFINE',
            class: 'h-[520px] min-h-0 rounded-[10px] border border-[#ececf4] bg-white',
          },
        },
      ],
    },
  ],
}]))

const endNodeFormSchema = computed<FormItem[]>(() => ([{
  id: 'end-config-root',
  type: 'form',
  control: 'accordion-root',
  modelPath: 'ui.sections',
  props: {
    type: 'multiple',
    collapsible: true,
    class: 'space-y-3',
  },
  children: [
    {
      id: 'end-result-mode-group',
      type: 'form',
      control: 'accordion-item',
      modelPath: 'ui.sections',
      props: {
        value: 'end-result-mode',
        title: '输出方式',
        description: '',
        class: 'rounded-[12px] border border-[#ececf4] bg-[#fafafd]',
        triggerClass: 'px-3 py-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline',
        contentClass: 'px-3 pb-4',
      },
      children: [
        {
          id: 'end-return-type',
          type: 'form',
          control: 'radiogroup',
          label: '输出方式',
          modelPath: 'nodeData.config.returnType',
          required: true,
          props: {
            options: [
              { label: '结构化对象', value: 'Object' },
              { label: '返回文本', value: 'Text' },
            ],
          },
        },
        {
          id: 'end-stream-switch',
          type: 'form',
          control: 'switch',
          label: '流式输出',
          modelPath: 'nodeData.config.stream',
          state: {
            visible: "{{ model.nodeData.config.returnType === 'Text' }}",
          },
          props: {
            label: '启用流式输出',
          },
        },
      ],
    },
    {
      id: 'end-result-object-group',
      type: 'form',
      control: 'accordion-item',
      modelPath: 'ui.sections',
      state: {
        visible: "{{ model.nodeData.config.returnType !== 'Text' }}",
      },
      props: {
        value: 'end-result-object',
        title: '输出变量',
        description: '',
        class: 'rounded-[12px] border border-[#ececf4] bg-[#fafafd]',
        triggerClass: 'px-3 py-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline',
        contentClass: 'px-3 pb-4',
      },
      children: [
        {
          id: 'end-inputs-editor',
          type: 'form',
          control: 'param-schema-editor',
          modelPath: 'nodeData.inputs',
          props: {
            runtimeMode: 'refine',
            headerTitle: 'RETURN VARIABLES',
            valueRefTree: valueRefTree.value,
            fieldVisibility: END_PARAM_FIELD_VISIBILITY,
            class: 'h-[520px] min-h-0 rounded-[10px] border border-[#ececf4] bg-white',
          },
        },
      ],
    },
    {
      id: 'end-result-text-group',
      type: 'form',
      control: 'accordion-item',
      modelPath: 'ui.sections',
      state: {
        visible: "{{ model.nodeData.config.returnType === 'Text' }}",
      },
      props: {
        value: 'end-result-text',
        title: '回答内容',
        description: '',
        class: 'rounded-[12px] border border-[#ececf4] bg-[#fafafd]',
        triggerClass: 'px-3 py-3 text-[14px] font-semibold text-[#1f2335] hover:no-underline',
        contentClass: 'px-3 pb-4',
      },
      children: [
        {
          id: 'end-content-template',
          type: 'form',
          control: 'textarea',
          label: '返回文本',
          modelPath: 'nodeData.config.content',
          props: {
            placeholder: '例如：工作流结果：\n{{result}}',
            class: 'min-h-[180px]',
          },
        },
      ],
    },
  ],
}]))

const panelSchema = computed<FormItem[]>(() => {
  if (isStartNode.value) {
    return startNodeFormSchema.value
  }
  if (isEndNode.value) {
    return endNodeFormSchema.value
  }
  return defaultGeneratorSchema.value
})
</script>

<template>
  <aside class="absolute top-4 right-4 bottom-4 z-40 flex w-[392px] flex-col overflow-hidden rounded-[12px] border border-[#e4e7ef] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]">
    <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#ececf4] bg-white px-3 py-3">
      <div class="flex min-w-0 items-start gap-3">
        <div class="mt-0.5 flex size-8 items-center justify-center rounded-[8px] bg-[#f5f6ff] text-[#4e40e5]">
          <component :is="Icon" class="size-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-[14px] font-semibold text-[#1f2335]">{{ panelModel?.nodeData.name }}</h2>
            <Badge variant="outline" class="rounded-full border-[#ececf4] bg-[#fafafc] px-2 text-[10px] text-[#7d8296]">
              {{ panelModel?.nodeData.registryId }}
            </Badge>
          </div>
          <p class="mt-1 text-[12px] leading-5 text-[#757c91]">
            {{ panelModel?.nodeData.description || '配置节点执行逻辑与变量输入输出。' }}
          </p>
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
              <div v-if="panelModel && panelSchema.length" class="space-y-4">
                <FormGenerator
                  v-model="panelModel"
                  :schema="panelSchema"
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
