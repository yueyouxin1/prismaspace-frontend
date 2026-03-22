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

const buildWorkflowNodePanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'subworkflow-config',
    items: [
      {
        id: 'subworkflow-resource',
        title: '子工作流',
        description: '选择子工作流后，会自动同步子流程输入输出契约。',
        defaultOpen: true,
        children: [
          {
            id: 'subworkflow-resource-instance',
            type: 'form',
            control: 'resource_selector',
            label: '工作流实例',
            modelPath: 'nodeData.config.resource_instance_uuid',
            props: {
              resource_type: 'workflow',
            },
          },
        ],
      },
      {
        id: 'subworkflow-inputs',
        title: '输入绑定',
        description: '为子工作流输入参数绑定上游变量。',
        defaultOpen: true,
        children: [
          {
            id: 'subworkflow-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'refine',
              headerTitle: 'SUBFLOW INPUTS',
              valueRefTree
            },
          },
        ],
      },
      {
        id: 'subworkflow-outputs',
        title: '输出契约',
        description: '输出变量来自子工作流实例，并会附带 lineage 元信息。',
        defaultOpen: true,
        children: [
          {
            id: 'subworkflow-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'SUBFLOW OUTPUTS',
              canEdit: false
            },
          },
        ],
      },
      {
        id: 'subworkflow-fault-tolerance',
        title: '异常处理',
        description: '为子工作流节点配置超时、重试和异常分支。',
        defaultOpen: false,
        children: createExecutionPolicyChildren('subworkflow'),
      },
    ],
  }),
])

export const workflowNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'WorkflowNode',
  panel: {
    buildSchema: (context) => buildWorkflowNodePanelSchema(context.valueRefTree),
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
        label: '子工作流',
        value: String(context.node.data.config?.resource_instance_uuid || '未配置'),
      },
      {
        label: '输入',
        value: context.node.data.inputs?.length ? `${context.node.data.inputs.length} 项` : '未同步',
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
