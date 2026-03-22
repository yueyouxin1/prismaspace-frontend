<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { WorkflowParameterSchema, WorkflowValueRefContent } from '@prismaspace/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import type { WorkflowVariableEntry } from '../../types/workflow-ide'

type ValueMode = 'ref' | 'literal'

type AssignmentForm = {
  id: string
  leftRefKey: string
  rightMode: ValueMode
  rightRefKey: string
  rightLiteral: string
  rightType: WorkflowParameterSchema['type']
}

const props = withDefaults(defineProps<{
  modelValue?: unknown
  variableEntries?: WorkflowVariableEntry[]
}>(), {
  modelValue: undefined,
  variableEntries: () => [],
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: unknown): void
}>()

const loopVariableOptions = computed(() =>
  props.variableEntries
    .filter(entry => entry.category === 'loop-variable' && entry.schema.meta?.loopMutable === true)
    .map(entry => ({
      key: `${entry.nodeId}::${entry.path}`,
      label: `${entry.nodeName} · ${entry.path}`,
      schemaType: entry.schema.type,
      ref: entry.refValue.content,
    })),
)

const allValueOptions = computed(() =>
  props.variableEntries.map(entry => ({
    key: `${entry.nodeId}::${entry.path}`,
    label: `${entry.nodeName} · ${entry.path}`,
    schemaType: entry.schema.type,
    ref: entry.refValue.content,
  })),
)

const valueOptionMap = computed(() => new Map(
  allValueOptions.value.map(option => [option.key, option] as const),
))

const scalarTypeOptions = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'integer', label: '整数' },
  { value: 'boolean', label: '布尔' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
]

const localAssignments = ref<AssignmentForm[]>([])
const appliedSnapshot = ref('')
const emittedSnapshot = ref('')

const createEmptyAssignment = (): AssignmentForm => ({
  id: nanoid(8),
  leftRefKey: loopVariableOptions.value[0]?.key ?? '',
  rightMode: 'ref',
  rightRefKey: allValueOptions.value[0]?.key ?? '',
  rightLiteral: '',
  rightType: 'string',
})

const normalizeType = (value: unknown): WorkflowParameterSchema['type'] => {
  const type = String(value ?? 'string')
  if (['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(type)) {
    return type as WorkflowParameterSchema['type']
  }
  return 'string'
}

const resolveRefKey = (content: WorkflowValueRefContent | undefined): string => {
  if (!content?.blockID || !content.path) {
    return ''
  }
  return `${content.blockID}::${content.path}`
}

const stringifyLiteral = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const parseLiteral = (value: string, type: WorkflowParameterSchema['type']): unknown => {
  if (type === 'boolean') return value === 'true'
  if (type === 'number' || type === 'integer') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (type === 'object' || type === 'array') {
    try {
      return JSON.parse(value)
    } catch {
      return type === 'array' ? [] : {}
    }
  }
  return value
}

const normalizeAssignments = (value: unknown): AssignmentForm[] => {
  if (!Array.isArray(value) || !value.length) {
    return [createEmptyAssignment()]
  }
  const assignments = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((assignment) => {
      const left = (assignment.left ?? {}) as Record<string, unknown>
      const right = (assignment.right ?? {}) as Record<string, unknown>
      const rightValue = right.value as Record<string, unknown> | undefined
      const rightMode: ValueMode = rightValue?.type === 'ref' ? 'ref' : 'literal'
      return {
        id: String(assignment.id ?? nanoid(8)),
        leftRefKey: resolveRefKey((left.value as Record<string, unknown> | undefined)?.content as WorkflowValueRefContent | undefined),
        rightMode,
        rightRefKey: resolveRefKey((rightValue?.content as WorkflowValueRefContent | undefined)),
        rightLiteral: stringifyLiteral(rightValue?.content),
        rightType: normalizeType(right.type),
      } satisfies AssignmentForm
    })
  return assignments.length ? assignments : [createEmptyAssignment()]
}

const buildRefSchema = (name: string, refKey: string, fallbackType: WorkflowParameterSchema['type']): WorkflowParameterSchema => {
  const option = valueOptionMap.value.get(refKey)
  return {
    name,
    type: option?.schemaType ?? fallbackType,
    required: false,
    open: true,
    value: {
      type: 'ref',
      content: option?.ref ?? { blockID: '', path: '' },
    },
  }
}

const exportAssignments = (assignments: AssignmentForm[]): unknown => assignments.map((assignment, index) => ({
  id: assignment.id || `assignment_${index + 1}`,
  left: buildRefSchema(`left_${index + 1}`, assignment.leftRefKey, 'string'),
  right: assignment.rightMode === 'ref'
    ? buildRefSchema(`right_${index + 1}`, assignment.rightRefKey, assignment.rightType)
    : {
        name: `right_${index + 1}`,
        type: assignment.rightType,
        required: false,
        open: true,
        value: {
          type: 'literal',
          content: parseLiteral(assignment.rightLiteral, assignment.rightType),
        },
      },
}))

watch(
  () => props.modelValue,
  (value) => {
    const nextAssignments = normalizeAssignments(value)
    const snapshot = JSON.stringify(nextAssignments)
    if (snapshot === emittedSnapshot.value || snapshot === appliedSnapshot.value) {
      return
    }
    appliedSnapshot.value = snapshot
    localAssignments.value = nextAssignments
  },
  { immediate: true, deep: true },
)

watch(
  localAssignments,
  (value) => {
    const payload = exportAssignments(value)
    const snapshot = JSON.stringify(payload)
    emittedSnapshot.value = snapshot
    appliedSnapshot.value = snapshot
    emit('update:modelValue', payload)
  },
  { deep: true },
)

const addAssignment = (): void => {
  localAssignments.value = [...localAssignments.value, createEmptyAssignment()]
}

const removeAssignment = (assignmentId: string): void => {
  if (localAssignments.value.length <= 1) {
    return
  }
  localAssignments.value = localAssignments.value.filter(item => item.id !== assignmentId)
}

const updateAssignment = (
  assignmentId: string,
  patch: Partial<AssignmentForm>,
): void => {
  localAssignments.value = localAssignments.value.map((assignment) => {
    if (assignment.id !== assignmentId) {
      return assignment
    }
    const next = { ...assignment, ...patch }
    if (patch.rightRefKey) {
      const option = valueOptionMap.value.get(patch.rightRefKey)
      next.rightType = (option?.schemaType as WorkflowParameterSchema['type']) ?? next.rightType
    }
    return next
  })
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="assignment in localAssignments"
      :key="assignment.id"
      class="rounded-[10px] border border-[#ececf4] bg-white p-3"
    >
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px]">
        <div class="space-y-2">
          <p class="text-xs text-[#8d93a6]">中间变量</p>
          <Select
            :model-value="assignment.leftRefKey"
            @update:model-value="updateAssignment(assignment.id, { leftRefKey: String($event ?? '') })"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择循环变量" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in loopVariableOptions"
                :key="option.key"
                :value="option.key"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <p class="text-xs text-[#8d93a6]">设置值</p>
            <Select
              :model-value="assignment.rightMode"
              @update:model-value="updateAssignment(assignment.id, { rightMode: String($event ?? 'ref') as ValueMode })"
            >
              <SelectTrigger class="ml-auto h-7 w-[92px]">
                <SelectValue placeholder="模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ref">变量</SelectItem>
                <SelectItem value="literal">常量</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            v-if="assignment.rightMode === 'ref'"
            :model-value="assignment.rightRefKey"
            @update:model-value="updateAssignment(assignment.id, { rightRefKey: String($event ?? '') })"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="选择变量" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in allValueOptions"
                :key="option.key"
                :value="option.key"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <div v-else class="flex items-center gap-2">
            <Select
              :model-value="assignment.rightType"
              @update:model-value="updateAssignment(assignment.id, { rightType: String($event ?? 'string') as WorkflowParameterSchema['type'] })"
            >
              <SelectTrigger class="w-[110px]">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in scalarTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              :model-value="assignment.rightLiteral"
              class="flex-1"
              placeholder="输入常量值"
              @update:model-value="updateAssignment(assignment.id, { rightLiteral: String($event ?? '') })"
            />
          </div>
        </div>

        <div class="flex items-end justify-end">
          <Button
            size="sm"
            variant="ghost"
            class="h-8 px-2 text-[#7f8599]"
            @click="removeAssignment(assignment.id)"
          >
            删除
          </Button>
        </div>
      </div>
    </div>

    <Button
      size="sm"
      variant="outline"
      class="h-8 rounded-[8px] border-[#dfe3ff] bg-[#f8f7ff] text-[#5f66ff] hover:bg-[#efedff]"
      @click="addAssignment"
    >
      添加设置项
    </Button>
  </div>
</template>
