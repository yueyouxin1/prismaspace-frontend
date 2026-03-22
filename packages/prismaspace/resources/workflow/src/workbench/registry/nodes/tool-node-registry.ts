import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  appendErrorPortIfNeeded,
  buildResourceHydrationPatch,
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
  createExecutionPolicyChildren,
  getResourceInstanceUuid,
} from '../helpers'

const buildToolPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'tool-config',
    items: [
      {
        id: 'tool-resource',
        title: '工具资源',
        description: '选择工具实例后，会自动同步输入输出契约。',
        defaultOpen: true,
        children: [
          {
            id: 'tool-resource-instance',
            type: 'form',
            control: 'resource_selector',
            label: '工具实例',
            modelPath: 'nodeData.config.resource_instance_uuid',
            props: {
              resource_type: 'tool',
            },
          },
        ],
      },
      {
        id: 'tool-inputs',
        title: '输入绑定',
        description: '为工具输入参数绑定上游变量或字面量。',
        defaultOpen: true,
        children: [
          {
            id: 'tool-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'refine',
              headerTitle: 'TOOL INPUTS',
              valueRefTree
            },
          },
        ],
      },
      {
        id: 'tool-outputs',
        title: '输出契约',
        description: '工具输出由实例契约决定，默认只读预览。',
        defaultOpen: true,
        children: [
          {
            id: 'tool-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'TOOL OUTPUTS',
              canEdit: false
            },
          },
        ],
      },
      {
        id: 'tool-fault-tolerance',
        title: '异常处理',
        description: '配置超时、重试、降级值和异常分支。',
        defaultOpen: false,
        children: createExecutionPolicyChildren('tool'),
      },
    ],
  }),
])

export const toolNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'ToolNode',
  panel: {
    buildSchema: (context) => buildToolPanelSchema(context.valueRefTree),
  },
  canvas: {
    width: 360,
    getInputPorts: (context) => createDefaultSingleInputPort('输入', context.node.data.inputs?.[0] ?? null),
    getOutputPorts: (context) => appendErrorPortIfNeeded(
      context.node.data,
      createDefaultSingleOutputPort(
        context.node.data.outputs?.[0]?.label || context.node.data.outputs?.[0]?.name || '输出',
        context.node.data.outputs?.[0] ?? null,
      ),
    ),
    getSummaryLines: (context) => [
      {
        label: '工具',
        value: String(context.node.data.config?.resource_instance_uuid || '未配置'),
      },
      {
        label: '输入',
        value: context.node.data.inputs?.length ? `${context.node.data.inputs.length} 项` : '未配置',
      },
      {
        label: '输出',
        value: context.node.data.outputs?.length ? `${context.node.data.outputs.length} 项` : '未同步',
      },
    ],
    getResultPreview: (context) => {
      const runState = context.runState
      if (!runState?.outputPreview && !runState?.errorMessage) {
        return null
      }
      return {
        label: '结果',
        content: runState.errorMessage || runState.outputPreview || '',
        tone: runState.errorMessage ? 'danger' : 'success',
      }
    },
  },
  hydrate: {
    resolveInstanceUuid: getResourceInstanceUuid,
    applyInstance: ({ instance, node }) => buildResourceHydrationPatch(instance, node.data),
  },
  faultTolerance: {
    visible: true,
  },
}
