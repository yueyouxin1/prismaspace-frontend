<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, CheckCircle2, FileText, Play, Sparkles, X, XCircle } from 'lucide-vue-next'
import type {
  WorkflowEventRead,
  WorkflowParameterSchema,
  WorkflowRunRead,
  WorkflowRunSummaryRead,
} from '@prismaspace/contracts'
import { FormGenerator, type FieldRendererDefinition } from '@prismaspace/generator/form-generator'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { ScrollArea } from '@prismaspace/ui-shadcn/components/ui/scroll-area'
import { Switch } from '@prismaspace/ui-shadcn/components/ui/switch'
import { buildFormItemsFromParameterSchemas, formatJson, parseJsonObject } from '../utils/workflow-helpers'
import WorkflowJsonValueField from './fields/WorkflowJsonValueField.vue'

const props = withDefaults(defineProps<{
  open: boolean
  running?: boolean
  debugging?: boolean
  canDebug?: boolean
  selectedNodeName?: string | null
  inputText: string
  workflowInputSchemas: WorkflowParameterSchema[]
  runs?: WorkflowRunSummaryRead[]
  selectedRunId?: string | null
  selectedRun?: WorkflowRunRead | null
  selectedRunEvents?: WorkflowEventRead[]
  loadingRunDetail?: boolean
  loadingRunEvents?: boolean
}>(), {
  open: false,
  running: false,
  debugging: false,
  canDebug: false,
  selectedNodeName: null,
  runs: () => [],
  selectedRunId: null,
  selectedRun: null,
  selectedRunEvents: () => [],
  loadingRunDetail: false,
  loadingRunEvents: false,
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:input-text', value: string): void
  (event: 'run'): void
  (event: 'run-async'): void
  (event: 'debug-node'): void
  (event: 'select-run', runId: string): void
  (event: 'cancel-run', runId: string): void
}>()

const formModel = ref<Record<string, unknown>>({})
const jsonMode = ref(false)
const keepAsTestset = ref(false)

const schema = computed(() => buildFormItemsFromParameterSchemas(props.workflowInputSchemas, 'workflow-test-run'))

const jsonFieldRenderer: FieldRendererDefinition = {
  component: WorkflowJsonValueField,
  getProps: (ctx) => ({
    fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
  }),
}

watch(
  () => props.inputText,
  (value) => {
    try {
      formModel.value = parseJsonObject(value)
    } catch {
      formModel.value = {}
    }
  },
  { immediate: true },
)

watch(
  formModel,
  (value) => {
    if (jsonMode.value) {
      return
    }
    emit('update:input-text', formatJson(value))
  },
  { deep: true },
)

const latestResultText = computed(() => {
  const nodeExecutions = props.selectedRun?.node_executions ?? []
  const latestNodeExecution = nodeExecutions.length ? nodeExecutions[nodeExecutions.length - 1] : null
  return formatJson(latestNodeExecution?.result ?? props.selectedRun)
})

const debugButtonLabel = computed(() => {
  if (props.debugging) {
    return '调试中'
  }
  if (!props.canDebug) {
    return '请选择节点后调试'
  }
  return props.selectedNodeName ? `调试节点 · ${props.selectedNodeName}` : '调试节点'
})

const statusClass = (status?: string | null): string => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-[#edf9f1] text-[#12a150]'
    case 'FAILED':
      return 'bg-[#fff2f0] text-[#d0534d]'
    case 'RUNNING':
      return 'bg-[#eef2ff] text-[#5b63ff]'
    case 'CANCELLED':
      return 'bg-[#f5f6fb] text-[#697085]'
    default:
      return 'bg-[#f5f6fb] text-[#697085]'
  }
}

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '未知时间'
  }
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}
</script>

<template>
  <div
    v-if="open"
    class="absolute top-4 right-4 bottom-4 z-40 flex w-[372px] flex-col overflow-hidden rounded-[8px] border border-[#e4e7ef] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)]"
  >
    <div class="flex h-12 items-center justify-between border-b border-[#ececf4] px-3">
      <div class="flex items-center gap-2">
        <Bot class="size-5 text-[#12b347]" />
        <div>
          <p class="text-[14px] font-semibold text-[#1f2335]">试运行</p>
          <p class="text-xs text-[#8b91a4]">输入测试集并查看运行结果</p>
        </div>
      </div>
      <Button size="icon-sm" variant="ghost" class="rounded-[8px] text-[#767c8f]" @click="emit('update:open', false)">
        <X class="size-4" />
      </Button>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-5 px-5 py-5">
        <div class="rounded-2xl border border-black/6 bg-[#fafafc] p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-[#1f2335]">试运行输入</p>
            <div class="flex items-center gap-2 text-xs text-[#7f8498]">
              <span>JSON 模式</span>
              <Switch :model-value="jsonMode" @update:model-value="jsonMode = Boolean($event)" />
            </div>
          </div>

          <div class="mt-4">
            <textarea
              v-if="jsonMode"
              :value="inputText"
              class="min-h-36 w-full rounded-2xl border border-[#e9eaf1] bg-white px-4 py-3 font-mono text-xs outline-none"
              @input="emit('update:input-text', String(($event.target as HTMLTextAreaElement).value))"
            />
            <FormGenerator
              v-else
              v-model="formModel"
              :schema="schema"
              :field-renderers="{ workflow_json: jsonFieldRenderer }"
            />
          </div>

          <div class="mt-4 flex items-center gap-3 text-xs text-[#8b91a4]">
            <input id="workflow-keep-testset" v-model="keepAsTestset" type="checkbox" class="size-4 rounded border-[#d7d9e5]" />
            <label for="workflow-keep-testset">将本次运行输入保存为测试集或手动创建</label>
          </div>
        </div>

        <div class="rounded-2xl border border-black/6 bg-[#fafafc] p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-semibold text-[#1f2335]">运行结果</p>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
              :class="statusClass(selectedRun?.status)"
            >
              <CheckCircle2 class="size-3.5" />
              {{ selectedRun?.status || '待运行' }}
            </span>
          </div>

          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-sm font-medium text-[#1f2335]">
                <FileText class="size-4 text-[#7f8498]" />
                输出变量
              </div>
              <pre class="min-h-24 overflow-auto rounded-2xl border border-[#e9eaf1] bg-white px-4 py-3 text-xs text-[#4a5063]">{{ latestResultText || '暂无运行结果' }}</pre>
            </div>

            <div v-if="selectedRunEvents?.length" class="space-y-2">
              <div class="flex items-center gap-2 text-sm font-medium text-[#1f2335]">
                <Sparkles class="size-4 text-[#7f8498]" />
                运行日志
              </div>
              <div class="space-y-2">
                <div
                  v-for="eventItem in selectedRunEvents.slice(-8)"
                  :key="`${eventItem.sequence_no}-${eventItem.event_type}`"
                  class="rounded-2xl border border-[#ececf4] bg-white px-4 py-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-semibold text-[#1f2335]">{{ eventItem.event_type }}</p>
                    <span class="text-[11px] text-[#8b91a4]">#{{ eventItem.sequence_no }}</span>
                  </div>
                  <pre class="mt-2 overflow-auto text-[11px] text-[#555b6d]">{{ formatJson(eventItem.payload) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/6 bg-[#fafafc] p-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-[#1f2335]">运行记录</p>
              <p class="mt-1 text-xs text-[#8b91a4]">切换查看最近运行与节点调试结果</p>
            </div>
            <Badge variant="outline" class="rounded-full border-[#ececf4] bg-white">
              {{ runs.length }} 条
            </Badge>
          </div>

          <div class="mt-4 space-y-2">
            <button
              v-for="run in runs"
              :key="run.run_id"
              type="button"
              class="flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-white"
              :class="selectedRunId === run.run_id ? 'border-[#dcdffe] bg-white shadow-[0_8px_24px_rgba(91,99,255,0.08)]' : 'border-[#ececf4]'"
              @click="emit('select-run', run.run_id)"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-[#1f2335]">{{ run.run_id }}</p>
                <p class="mt-1 text-[11px] text-[#8b91a4]">{{ formatDateTime(run.started_at) }}</p>
                <p v-if="run.error_message" class="mt-1 line-clamp-2 text-[11px] text-[#d0534d]">{{ run.error_message }}</p>
              </div>
              <span class="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium" :class="statusClass(run.status)">
                {{ run.status }}
              </span>
            </button>

            <p v-if="!runs.length" class="rounded-2xl border border-dashed border-[#e2e4ef] px-4 py-5 text-center text-sm text-[#8b91a4]">
              暂无运行记录。
            </p>
          </div>

          <div v-if="selectedRun" class="mt-4 rounded-2xl border border-[#ececf4] bg-white p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-[#1f2335]">当前查看</p>
                <p class="mt-1 text-xs text-[#8b91a4]">{{ formatDateTime(selectedRun.started_at) }}</p>
              </div>
              <Button
                v-if="selectedRun.status === 'RUNNING'"
                size="sm"
                variant="destructive"
                class="rounded-xl"
                @click="emit('cancel-run', selectedRun.run_id)"
              >
                <XCircle class="mr-1.5 size-4" />
                取消
              </Button>
            </div>

            <div v-if="loadingRunDetail" class="mt-3 text-sm text-[#8b91a4]">正在加载运行详情...</div>
            <div v-else class="mt-3 space-y-3">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="rounded-2xl border border-[#ececf4] bg-[#fafafc] px-3 py-3">
                  <p class="text-[#8b91a4]">开始时间</p>
                  <p class="mt-1 font-medium text-[#1f2335]">{{ formatDateTime(selectedRun.started_at) }}</p>
                </div>
                <div class="rounded-2xl border border-[#ececf4] bg-[#fafafc] px-3 py-3">
                  <p class="text-[#8b91a4]">结束时间</p>
                  <p class="mt-1 font-medium text-[#1f2335]">{{ formatDateTime(selectedRun.finished_at) }}</p>
                </div>
              </div>

              <div v-if="selectedRun.node_executions?.length" class="space-y-2">
                <p class="text-sm font-medium text-[#1f2335]">节点执行</p>
                <div class="space-y-2">
                  <div
                    v-for="nodeExecution in selectedRun.node_executions.slice(0, 4)"
                    :key="`${nodeExecution.node_id}-${nodeExecution.attempt}`"
                    class="rounded-2xl border border-[#ececf4] bg-[#fafafc] px-3 py-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-[#1f2335]">{{ nodeExecution.node_name }}</p>
                        <p class="mt-1 text-[11px] text-[#8b91a4]">{{ nodeExecution.node_type }} · attempt {{ nodeExecution.attempt }}</p>
                      </div>
                      <Badge variant="outline" class="rounded-full border-[#ececf4] bg-white">{{ nodeExecution.status }}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium text-[#1f2335]">事件流</p>
                <div v-if="loadingRunEvents" class="text-sm text-[#8b91a4]">正在加载运行事件...</div>
                <div v-else class="space-y-2">
                  <div
                    v-for="eventItem in selectedRunEvents.slice(-6)"
                    :key="`${eventItem.sequence_no}-${eventItem.event_type}`"
                    class="rounded-2xl border border-[#ececf4] bg-[#fafafc] px-3 py-3"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-xs font-semibold text-[#1f2335]">{{ eventItem.event_type }}</p>
                      <span class="text-[11px] text-[#8b91a4]">#{{ eventItem.sequence_no }}</span>
                    </div>
                    <pre class="mt-2 overflow-auto text-[11px] text-[#555b6d]">{{ formatJson(eventItem.payload) }}</pre>
                  </div>
                  <p v-if="!selectedRunEvents.length" class="text-sm text-[#8b91a4]">当前运行暂无事件记录。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <div class="border-t border-[#ececf4] px-4 py-3">
      <div class="grid grid-cols-1 gap-2">
        <Button variant="outline" class="h-11 rounded-2xl" :disabled="running" @click="emit('run-async')">
          <Bot class="mr-1.5 size-4" />
          {{ running ? '后台运行中' : '后台运行' }}
        </Button>
        <Button variant="secondary" class="h-11 rounded-2xl" :disabled="!canDebug || debugging" @click="emit('debug-node')">
          <Sparkles class="mr-1.5 size-4" />
          {{ debugButtonLabel }}
        </Button>
        <Button class="h-11 rounded-2xl bg-[#12b347] text-base text-white hover:bg-[#0fa040]" :disabled="running" @click="emit('run')">
          <Play class="mr-1.5 size-4" />
          {{ running ? '试运行中' : '试运行' }}
        </Button>
      </div>
    </div>
  </div>
</template>
