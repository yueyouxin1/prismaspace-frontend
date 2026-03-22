import type { FormItem } from '@prismaspace/generator/form-generator'
import type { WorkflowNodeRegistry } from '../types'
import {
  appendErrorPortIfNeeded,
  createAccordionSection,
  createDefaultSingleInputPort,
  createDefaultSingleOutputPort,
  createExecutionPolicyChildren,
} from '../helpers'

const llmResponseFormatOptions = [
  { label: '文本', value: 'text' },
  { label: 'JSON 对象', value: 'json_object' },
]

const buildLlmPanelSchema = (valueRefTree: unknown): FormItem[] => ([
  createAccordionSection({
    id: 'llm-config',
    items: [
      {
        id: 'llm-model',
        title: '模型',
        description: '选择实际调用的模型版本，并控制输出格式。',
        defaultOpen: true,
        children: [
          {
            id: 'llm-model-version',
            type: 'form',
            control: 'model_selector',
            label: '模型版本',
            modelPath: 'nodeData.config.llm_module_version_uuid',
          },
          {
            id: 'llm-response-format',
            type: 'form',
            control: 'select',
            label: '输出格式',
            modelPath: 'nodeData.config.agent_config.io_config.response_format.type',
            props: {
              defaultValue: 'text',
              options: llmResponseFormatOptions,
            },
          },
          {
            id: 'llm-enable-thinking',
            type: 'form',
            control: 'switch',
            label: '深度思考',
            modelPath: 'nodeData.config.agent_config.io_config.enable_deep_thinking',
          },
          {
            id: 'llm-max-thinking',
            type: 'form',
            control: 'number',
            label: '最大思考 Tokens',
            modelPath: 'nodeData.config.agent_config.io_config.max_thinking_tokens',
            state: {
              visible: '{{ model.nodeData.config.agent_config.io_config.enable_deep_thinking === true }}',
            },
            props: {
              min: 1,
              step: 128,
            },
          },
          {
            id: 'llm-max-response',
            type: 'form',
            control: 'number',
            label: '最大回复 Tokens',
            modelPath: 'nodeData.config.agent_config.io_config.max_response_tokens',
            props: {
              min: 1,
              step: 128,
            },
          },
        ],
      },
      {
        id: 'llm-prompts',
        title: '提示词与输入',
        description: '通过上游变量绑定输入，并配置系统提示词。',
        defaultOpen: true,
        children: [
          {
            id: 'llm-system-prompt',
            type: 'form',
            control: 'textarea',
            label: '系统提示词',
            modelPath: 'nodeData.config.system_prompt',
            props: {
              rows: 6,
              placeholder: '你是一个严谨的 AI 助手。',
            },
          },
          {
            id: 'llm-inputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            label: '输入绑定',
            modelPath: 'nodeData.inputs',
            props: {
              runtimeMode: 'refine',
              headerTitle: 'LLM INPUTS',
              valueRefTree
            },
          },
          {
            id: 'llm-history',
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
        id: 'llm-outputs',
        title: '输出',
        description: '定义 LLM 节点对外暴露的变量结构。',
        defaultOpen: true,
        children: [
          {
            id: 'llm-outputs-editor',
            type: 'form',
            control: 'param-schema-editor',
            modelPath: 'nodeData.outputs',
            props: {
              runtimeMode: 'define',
              headerTitle: 'LLM OUTPUTS'
            },
          },
        ],
      },
      {
        id: 'llm-fault-tolerance',
        title: '异常处理',
        description: '为 LLM 节点配置超时、重试与异常分支。',
        defaultOpen: false,
        children: createExecutionPolicyChildren('llm'),
      },
    ],
  }),
])

export const llmNodeRegistry: WorkflowNodeRegistry = {
  registryId: 'LLMNode',
  panel: {
    buildSchema: (context) => buildLlmPanelSchema(context.valueRefTree),
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
      const agentConfig = (config.agent_config ?? {}) as Record<string, any>
      const ioConfig = (agentConfig.io_config ?? {}) as Record<string, any>
      const responseFormat = (ioConfig.response_format ?? {}) as Record<string, any>
      return [
        {
          label: '模型',
          value: String(config.llm_module_version_uuid || '未配置'),
        },
        {
          label: '输出格式',
          value: String(responseFormat.type || 'text'),
        },
        {
          label: '深度思考',
          value: ioConfig.enable_deep_thinking ? '开启' : '关闭',
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
  faultTolerance: {
    visible: true,
  },
}
