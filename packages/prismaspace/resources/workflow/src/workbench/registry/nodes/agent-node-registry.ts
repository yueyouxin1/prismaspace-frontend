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

const buildAgentPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'agent-config',
    items: [
      {
        id: 'agent-resource',
        title: 'Agent 资源',
        description: '选择要调用的 Agent 实例。',
        defaultOpen: true,
        children: [
          {
            id: 'agent-resource-instance',
            type: 'form',
            control: 'resource_selector',
            label: 'Agent 实例',
            modelPath: 'nodeData.config.resource_instance_uuid',
            props: {
              resource_type: 'agent',
            },
          },
          {
            id: 'agent-enable-session',
            type: 'form',
            control: 'switch',
            label: '启用持久会话',
            modelPath: 'nodeData.config.enable_session',
          },
          {
            id: 'agent-session-uuid',
            type: 'form',
            control: 'input',
            label: '会话 UUID',
            modelPath: 'nodeData.config.session_uuid',
            state: {
              visible: '{{ model.nodeData.config.enable_session === true }}',
            },
            props: {
              placeholder: '可选，指定固定会话',
            },
          },
        ],
      },
      {
        id: 'agent-inputs',
        title: '输入',
        description: '配置 query、多模态 content parts 和历史上下文。',
        defaultOpen: true,
        children: [
          {
            id: 'agent-input-bindings',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'refine',
              headerTitle: 'AGENT INPUTS',
              valueRefTree
            },
          },
          {
            id: 'agent-query',
            type: 'form',
            control: 'textarea',
            label: '用户输入模板',
            modelPath: 'nodeData.config.input_query',
            props: {
              rows: 4,
              placeholder: '{{question}}',
            },
          },
          {
            id: 'agent-content-parts',
            type: 'form',
            control: 'workflow_json',
            label: '多模态输入',
            modelPath: 'nodeData.config.input_content_parts',
            props: {
              placeholder: '[\n  {\n    "type": "text",\n    "text": "{{question}}"\n  }\n]',
            },
          },
          {
            id: 'agent-history',
            type: 'form',
            control: 'workflow_json',
            label: '历史上下文',
            modelPath: 'nodeData.config.history',
            props: {
              placeholder: '[\n  {\n    "role": "user",\n    "content": "..." \n  }\n]',
            },
          },
        ],
      },
      {
        id: 'agent-outputs',
        title: '输出',
        description: '定义 Agent 对外暴露的结果变量。',
        defaultOpen: true,
        children: [
          {
            id: 'agent-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'AGENT OUTPUTS'
            },
          },
        ],
      },
      {
        id: 'agent-fault-tolerance',
        title: '异常处理',
        description: '为 Agent 节点配置重试与异常分支。',
        defaultOpen: false,
        children: createExecutionPolicyChildren('agent'),
      },
    ],
  }),
])

export const agentNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'AgentNode',
  panel: {
    buildSchema: (context) => buildAgentPanelSchema(context.valueRefTree),
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
    getSummaryLines: (context) => {
      const config = (context.node.data.config ?? {}) as Record<string, any>
      return [
        {
          label: 'Agent',
          value: String(config.resource_instance_uuid || '未配置'),
        },
        {
          label: '会话',
          value: config.enable_session ? '持久' : '无状态',
        },
        {
          label: '输出',
          value: context.node.data.outputs?.length ? `${context.node.data.outputs.length} 项` : '默认',
        },
      ]
    },
    getResultPreview: (context) => {
      const runState = context.runState
      if (!runState?.streamPreview && !runState?.outputPreview && !runState?.errorMessage) {
        return null
      }
      if (runState.errorMessage) {
        return {
          label: '输出',
          content: runState.errorMessage,
          tone: 'danger',
        }
      }
      return {
        label: runState.streamPreview ? '流式输出' : '输出',
        content: runState.streamPreview || runState.outputPreview || '',
        tone: runState.status === 'running' ? 'default' : 'success',
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
