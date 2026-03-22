<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { nanoid } from 'nanoid'
import type { WorkflowParameterSchema, WorkflowValueRefContent } from '@prismaspace/contracts'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@prismaspace/ui-shadcn/components/ui/select'
import type { WorkflowVariableEntry } from '../../types/workflow-ide'

type BranchConditionValueMode = 'literal' | 'ref'
type BranchLogic = '&' | '|'

type BranchConditionForm = {
  id: string
  operator: number
  leftRefKey: string
  leftType: WorkflowParameterSchema['type']
  rightMode: BranchConditionValueMode
  rightRefKey: string
  rightLiteral: string
  rightType: WorkflowParameterSchema['type']
}

type BranchForm = {
  id: string
  logic: BranchLogic
  conditions: BranchConditionForm[]
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

const operatorOptions = [
  { value: '1', label: '等于' },
  { value: '2', label: '不等于' },
  { value: '3', label: '长度大于' },
  { value: '4', label: '长度大于等于' },
  { value: '5', label: '长度小于' },
  { value: '6', label: '长度小于等于' },
  { value: '7', label: '包含' },
  { value: '8', label: '不包含' },
  { value: '9', label: '为空' },
  { value: '10', label: '不为空' },
]

const scalarTypeOptions = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'integer', label: '整数' },
  { value: 'boolean', label: '布尔' },
]

const variableOptions = computed(() =>
  props.variableEntries.map(entry => ({
    key: `${entry.nodeId}::${entry.path}`,
    label: `${entry.nodeName} · ${entry.path}`,
    schemaType: entry.schema.type,
    ref: entry.refValue.content,
  })),
)

const variableOptionMap = computed(() => new Map(
  variableOptions.value.map(option => [option.key, option] as const),
))

const localBranches = ref<BranchForm[]>([])
const appliedSnapshot = ref('')
const emittedSnapshot = ref('')

const createEmptyCondition = (): BranchConditionForm => ({
  id: nanoid(8),
  operator: 1,
  leftRefKey: variableOptions.value[0]?.key ?? '',
  leftType: (variableOptions.value[0]?.schemaType as WorkflowParameterSchema['type']) ?? 'string',
  rightMode: 'literal',
  rightRefKey: variableOptions.value[0]?.key ?? '',
  rightLiteral: '',
  rightType: 'string',
})

const createEmptyBranch = (): BranchForm => ({
  id: nanoid(8),
  logic: '&',
  conditions: [createEmptyCondition()],
})

const operatorsWithoutRightValue = (operator: number): boolean => operator === 9 || operator === 10

const parseLiteral = (value: string, type: WorkflowParameterSchema['type']): unknown => {
  if (type === 'boolean') {
    return value === 'true'
  }
  if (type === 'number' || type === 'integer') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return value
}

const stringifyLiteral = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value == null) {
    return ''
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const resolveRefKey = (content: WorkflowValueRefContent | undefined): string => {
  if (!content?.blockID || !content.path) {
    return ''
  }
  return `${content.blockID}::${content.path}`
}

const normalizeSchemaType = (value: unknown): WorkflowParameterSchema['type'] => {
  const next = String(value ?? 'string')
  if (['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(next)) {
    return next as WorkflowParameterSchema['type']
  }
  return 'string'
}

const normalizeBranches = (value: unknown): BranchForm[] => {
  if (!Array.isArray(value) || !value.length) {
    return [createEmptyBranch()]
  }

  const branches = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((branch) => {
      const rawConditions = Array.isArray(branch.conditions) ? branch.conditions : []
      const conditions = rawConditions
        .filter((condition): condition is Record<string, unknown> => Boolean(condition) && typeof condition === 'object')
        .map((condition) => {
          const left = (condition.left ?? {}) as Record<string, unknown>
          const right = (condition.right ?? {}) as Record<string, unknown>
          const leftRefKey = resolveRefKey((left.value as Record<string, unknown> | undefined)?.content as WorkflowValueRefContent | undefined)
          const rightValue = right.value as Record<string, unknown> | undefined
          const rightMode: BranchConditionValueMode = rightValue?.type === 'ref' ? 'ref' : 'literal'
          return {
            id: String(condition.id ?? nanoid(8)),
            operator: Number(condition.operator ?? 1),
            leftRefKey,
            leftType: normalizeSchemaType(left.type),
            rightMode,
            rightRefKey: resolveRefKey((rightValue?.content as WorkflowValueRefContent | undefined)),
            rightLiteral: stringifyLiteral(rightValue?.content),
            rightType: normalizeSchemaType(right.type),
          } satisfies BranchConditionForm
        })

      return {
        id: String(branch.id ?? nanoid(8)),
        logic: branch.logic === '|' ? '|' : '&',
        conditions: conditions.length ? conditions : [createEmptyCondition()],
      } satisfies BranchForm
    })

  return branches.length ? branches : [createEmptyBranch()]
}

const toSchemaRef = (
  optionKey: string,
  fallbackType: WorkflowParameterSchema['type'],
  name: string,
): WorkflowParameterSchema => {
  const option = variableOptionMap.value.get(optionKey)
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

const toSchemaLiteral = (
  condition: BranchConditionForm,
  name: string,
): WorkflowParameterSchema => ({
  name,
  type: condition.rightType,
  required: false,
  open: true,
  value: {
    type: 'literal',
    content: parseLiteral(condition.rightLiteral, condition.rightType),
  },
})

const exportBranches = (branches: BranchForm[]): unknown => branches.map((branch, branchIndex) => ({
  id: branch.id || `branch_${branchIndex + 1}`,
  logic: branch.logic,
  conditions: branch.conditions.map((condition, conditionIndex) => ({
    id: condition.id || `condition_${conditionIndex + 1}`,
    operator: condition.operator,
    left: toSchemaRef(condition.leftRefKey, condition.leftType, `left_${conditionIndex + 1}`),
    right: operatorsWithoutRightValue(condition.operator)
      ? toSchemaLiteral({ ...condition, rightLiteral: '' }, `right_${conditionIndex + 1}`)
      : condition.rightMode === 'ref'
        ? toSchemaRef(condition.rightRefKey, condition.rightType, `right_${conditionIndex + 1}`)
        : toSchemaLiteral(condition, `right_${conditionIndex + 1}`),
  })),
}))

watch(
  () => props.modelValue,
  (value) => {
    const nextBranches = normalizeBranches(value)
    const snapshot = JSON.stringify(nextBranches)
    if (snapshot === emittedSnapshot.value || snapshot === appliedSnapshot.value) {
      return
    }
    appliedSnapshot.value = snapshot
    localBranches.value = nextBranches
  },
  { immediate: true, deep: true },
)

watch(
  localBranches,
  (value) => {
    const payload = exportBranches(value)
    const snapshot = JSON.stringify(payload)
    emittedSnapshot.value = snapshot
    appliedSnapshot.value = snapshot
    emit('update:modelValue', payload)
  },
  { deep: true },
)

const addBranch = (): void => {
  localBranches.value = [...localBranches.value, createEmptyBranch()]
}

const removeBranch = (branchId: string): void => {
  if (localBranches.value.length <= 1) {
    return
  }
  localBranches.value = localBranches.value.filter(branch => branch.id !== branchId)
}

const addCondition = (branchId: string): void => {
  localBranches.value = localBranches.value.map(branch =>
    branch.id === branchId
      ? { ...branch, conditions: [...branch.conditions, createEmptyCondition()] }
      : branch,
  )
}

const removeCondition = (branchId: string, conditionId: string): void => {
  localBranches.value = localBranches.value.map((branch) => {
    if (branch.id !== branchId) {
      return branch
    }
    const nextConditions = branch.conditions.filter(condition => condition.id !== conditionId)
    return {
      ...branch,
      conditions: nextConditions.length ? nextConditions : [createEmptyCondition()],
    }
  })
}

const updateBranch = (branchId: string, patch: Partial<BranchForm>): void => {
  localBranches.value = localBranches.value.map(branch =>
    branch.id === branchId ? { ...branch, ...patch } : branch,
  )
}

const updateCondition = (
  branchId: string,
  conditionId: string,
  patch: Partial<BranchConditionForm>,
): void => {
  localBranches.value = localBranches.value.map((branch) => {
    if (branch.id !== branchId) {
      return branch
    }
    return {
      ...branch,
      conditions: branch.conditions.map((condition) => {
        if (condition.id !== conditionId) {
          return condition
        }
        const next = { ...condition, ...patch }
        if (patch.leftRefKey) {
          const option = variableOptionMap.value.get(patch.leftRefKey)
          next.leftType = (option?.schemaType as WorkflowParameterSchema['type']) ?? next.leftType
        }
        if (patch.rightRefKey) {
          const option = variableOptionMap.value.get(patch.rightRefKey)
          next.rightType = (option?.schemaType as WorkflowParameterSchema['type']) ?? next.rightType
        }
        return next
      }),
    }
  })
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(branch, branchIndex) in localBranches"
      :key="branch.id"
      class="rounded-[12px] border border-[#e4e7ef] bg-white p-3"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <p class="text-sm font-semibold text-[#1f2335]">
            {{ branchIndex === 0 ? '如果' : '否则如果' }}
          </p>
          <Badge variant="outline" class="rounded-full border-[#ececf4] bg-[#fafafc] px-2 text-[10px] text-[#7d8296]">
            优先级 {{ branchIndex + 1 }}
          </Badge>
        </div>
        <div class="flex items-center gap-2">
          <Select
            :model-value="branch.logic"
            @update:model-value="updateBranch(branch.id, { logic: String($event ?? '&') === '|' ? '|' : '&' })"
          >
            <SelectTrigger class="h-8 w-[112px]">
              <SelectValue placeholder="逻辑关系" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="&">全部满足</SelectItem>
              <SelectItem value="|">任一满足</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            class="h-8 px-2 text-[#7f8599]"
            :disabled="localBranches.length <= 1"
            @click="removeBranch(branch.id)"
          >
            删除
          </Button>
        </div>
      </div>

      <div class="mt-3 space-y-3">
        <div
          v-for="condition in branch.conditions"
          :key="condition.id"
          class="rounded-[10px] border border-[#f0f1f5] bg-[#fbfbfe] p-3"
        >
          <div class="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_120px_minmax(0,1.2fr)_80px]">
            <Select
              :model-value="condition.leftRefKey"
              @update:model-value="updateCondition(branch.id, condition.id, { leftRefKey: String($event ?? '') })"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="选择左值变量" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in variableOptions"
                  :key="option.key"
                  :value="option.key"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="String(condition.operator)"
              @update:model-value="updateCondition(branch.id, condition.id, { operator: Number($event ?? 1) })"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="运算符" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in operatorOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <template v-if="!operatorsWithoutRightValue(condition.operator)">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Select
                    :model-value="condition.rightMode"
                    @update:model-value="updateCondition(branch.id, condition.id, { rightMode: String($event ?? 'literal') as BranchConditionValueMode })"
                  >
                    <SelectTrigger class="h-8 w-[96px]">
                      <SelectValue placeholder="右值模式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="literal">常量</SelectItem>
                      <SelectItem value="ref">变量</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    v-if="condition.rightMode === 'literal'"
                    :model-value="condition.rightType"
                    @update:model-value="updateCondition(branch.id, condition.id, { rightType: String($event ?? 'string') as WorkflowParameterSchema['type'] })"
                  >
                    <SelectTrigger class="h-8 flex-1">
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
                </div>

                <Select
                  v-if="condition.rightMode === 'ref'"
                  :model-value="condition.rightRefKey"
                  @update:model-value="updateCondition(branch.id, condition.id, { rightRefKey: String($event ?? '') })"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="选择右值变量" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in variableOptions"
                      :key="option.key"
                      :value="option.key"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  v-else-if="condition.rightType === 'boolean'"
                  :model-value="condition.rightLiteral"
                  @update:model-value="updateCondition(branch.id, condition.id, { rightLiteral: String($event ?? 'false') })"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="布尔值" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  v-else
                  :model-value="condition.rightLiteral"
                  placeholder="输入常量值"
                  @update:model-value="updateCondition(branch.id, condition.id, { rightLiteral: String($event ?? '') })"
                />
              </div>
            </template>

            <div v-else class="flex items-center text-xs text-[#8b91a4]">
              当前运算符无需右值
            </div>

            <div class="flex items-start justify-end">
              <Button
                size="sm"
                variant="ghost"
                class="h-8 px-2 text-[#7f8599]"
                @click="removeCondition(branch.id, condition.id)"
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
          @click="addCondition(branch.id)"
        >
          新增条件
        </Button>
      </div>
    </div>

    <div class="rounded-[12px] border border-dashed border-[#e4e7ef] bg-[#fafafc] p-3 text-sm text-[#70778c]">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="font-medium text-[#1f2335]">否则</p>
          <p class="mt-1 text-xs text-[#8b91a4]">当前所有条件都不命中时，流程会走默认 `-1` 端口。</p>
        </div>
        <Button
          size="sm"
          class="h-8 rounded-[8px] bg-[#f4f1ff] px-3 text-xs text-[#6e57ff] shadow-none hover:bg-[#ece7ff]"
          @click="addBranch"
        >
          添加分支
        </Button>
      </div>
    </div>
  </div>
</template>
