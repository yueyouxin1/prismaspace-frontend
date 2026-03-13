<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ParamSchemaRegularEditor,
  exportParameterSchema,
  importParameterSchema,
  useParamSchemaEditor,
} from '@prismaspace/editor'
import type { WorkflowParameterSchema } from '@prismaspace/contracts'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Maximize2 } from 'lucide-vue-next'
import type { WorkflowVariableEntry } from '../../types/workflow-ide'
import { buildWorkflowVariableTree, cloneJson } from '../../utils/workflow-helpers'

const props = withDefaults(defineProps<{
  modelValue?: unknown
  fieldProps?: {
    placeholder?: string
    default_schema?: unknown
    disabled?: boolean
  }
  variableEntries?: WorkflowVariableEntry[]
}>(), {
  modelValue: undefined,
  fieldProps: () => ({}),
  variableEntries: () => [],
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void
}>()

const isSchemaCollection = computed(() => {
  return Array.isArray(props.modelValue ?? props.fieldProps?.default_schema)
})

const initialSchemaList = computed<WorkflowParameterSchema[]>(() => {
  const fallback = props.modelValue ?? props.fieldProps?.default_schema
  if (Array.isArray(fallback)) {
    return cloneJson(fallback)
  }
  if (fallback && typeof fallback === 'object') {
    const cloned = cloneJson(fallback as WorkflowParameterSchema)
    return [{
      ...cloned,
      required: cloned.required ?? false,
      open: cloned.open ?? true,
    }]
  }
  return [{
    name: 'param',
    type: 'string',
    required: false,
    open: true,
  } satisfies WorkflowParameterSchema]
})

const { state, dispatch } = useParamSchemaEditor({
  initialState: {
    tree: importParameterSchema(initialSchemaList.value),
  },
})

const variableTree = computed(() => buildWorkflowVariableTree(props.variableEntries))
const currentSourceSnapshot = computed(() => JSON.stringify(
  isSchemaCollection.value ? initialSchemaList.value : initialSchemaList.value[0] ?? null,
))
const appliedSnapshot = ref(currentSourceSnapshot.value)
const emittedSnapshot = ref(appliedSnapshot.value)
const fullscreenOpen = ref(false)

watch(
  initialSchemaList,
  (schemaList) => {
    const nextSnapshot = JSON.stringify(isSchemaCollection.value ? schemaList : schemaList[0] ?? null)
    if (nextSnapshot === emittedSnapshot.value || nextSnapshot === appliedSnapshot.value) {
      return
    }
    appliedSnapshot.value = nextSnapshot
    dispatch({
      type: 'reset',
      tree: importParameterSchema(schemaList),
    })
  },
  { deep: true },
)

watch(
  () => state.value.tree,
  (tree) => {
    const exported = exportParameterSchema(tree)
    if (!exported.length) {
      return
    }
    const nextValue = isSchemaCollection.value ? exported : exported[0]
    const snapshot = JSON.stringify(nextValue)
    emittedSnapshot.value = snapshot
    appliedSnapshot.value = snapshot
    emit('update:modelValue', nextValue)
  },
  { deep: true },
)
</script>

<template>
  <div class="space-y-2 rounded-xl border border-[#ececf4] bg-white p-2">
    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-[#1f2335]">ParameterSchema Editor</p>
        <p class="text-[11px] text-[#8b91a4]">已按侧栏窄布局优化，可展开进入大画布编辑。</p>
      </div>
      <Button size="icon-sm" variant="ghost" class="rounded-[8px]" @click="fullscreenOpen = true">
        <Maximize2 class="size-4" />
      </Button>
    </div>

    <ParamSchemaRegularEditor
      :state="state"
      :dispatch="dispatch"
      runtime-mode="define"
      :value-ref-tree="variableTree"
      class="h-[440px] min-h-[360px]"
    />
  </div>

  <Dialog v-model:open="fullscreenOpen">
    <DialogContent class="h-[88vh] max-h-[88vh] overflow-hidden sm:max-w-[1100px]">
      <DialogHeader>
        <DialogTitle>ParameterSchema Editor</DialogTitle>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-hidden rounded-[8px] border border-[#ececf4]">
        <ParamSchemaRegularEditor
          :state="state"
          :dispatch="dispatch"
          runtime-mode="define"
          :value-ref-tree="variableTree"
          class="h-full min-h-0"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
