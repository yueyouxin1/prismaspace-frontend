<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check, FolderOpen } from 'lucide-vue-next'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@prismaspace/ui-shadcn/components/ui/dialog'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { Label } from '@prismaspace/ui-shadcn/components/ui/label'
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@prismaspace/ui-shadcn/components/ui/stepper'
import type { KnowledgeSourceType } from '../types/knowledge-ide'

const props = withDefaults(defineProps<{
  open: boolean
  loading?: boolean
}>(), {
  loading: false,
})

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'add-local'): void
  (event: 'add-url', payload: { sourceUri: string; fileName?: string }): void
}>()

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const currentStep = ref(1)
const sourceType = ref<KnowledgeSourceType>('local')
const sourceUri = ref('')
const fileName = ref('')
const skeletonHint = ref('')

const sourceOptions: Array<{ type: KnowledgeSourceType; title: string; description: string; available: boolean }> = [
  { type: 'local', title: '本地上传', description: '选择后将直接进入素材库视图。', available: true },
  { type: 'uri', title: 'URI 资源', description: '输入可访问链接后纳入解析流程。', available: true },
  { type: 'web', title: '网页抓取', description: '基于 URL 的网页内容接入。', available: true },
  { type: 'text', title: '纯文本', description: '直接粘贴文本内容。', available: false },
  { type: 'qa', title: 'QA 对', description: '结构化问答对录入。', available: false },
  { type: 'feishu', title: '飞书', description: '飞书文档与知识库同步。', available: false },
  { type: 'notion', title: 'Notion', description: 'Notion 页面同步。', available: false },
]

const selectedOption = computed(() => sourceOptions.find(item => item.type === sourceType.value) || sourceOptions[0])
const selectedAvailable = computed(() => Boolean(selectedOption.value?.available))

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }
    currentStep.value = 1
    sourceType.value = 'local'
    sourceUri.value = ''
    fileName.value = ''
    skeletonHint.value = ''
  },
)

const handleSelectSource = (nextType: KnowledgeSourceType): void => {
  sourceType.value = nextType
  const option = sourceOptions.find(item => item.type === nextType)
  if (!option?.available) {
    skeletonHint.value = `${option?.title || '该类型'}暂未开放，请先使用本地上传或 URI 资源。`
    return
  }
  skeletonHint.value = ''
  if (nextType === 'local') {
    emit('add-local')
    emit('update:open', false)
  }
}

const goNext = (): void => {
  if (currentStep.value !== 1) {
    return
  }
  if (!selectedAvailable.value) {
    skeletonHint.value = `${selectedOption.value?.title || '该类型'}暂未开放，请先使用可用来源。`
    return
  }
  currentStep.value = 2
}

const goBack = (): void => {
  if (currentStep.value <= 1) {
    return
  }
  currentStep.value = currentStep.value - 1
}

const handleSubmit = (): void => {
  if (sourceType.value === 'local') {
    emit('add-local')
    emit('update:open', false)
    return
  }

  const normalized = sourceUri.value.trim()
  if (!normalized) {
    skeletonHint.value = '请输入可访问的 URI / URL。'
    return
  }
  if (!/^https?:\/\//i.test(normalized)) {
    skeletonHint.value = 'URI / URL 需要以 http:// 或 https:// 开头。'
    return
  }
  emit('add-url', {
    sourceUri: normalized,
    fileName: fileName.value.trim() || undefined,
  })
  emit('update:open', false)
}

const handleStepChange = (value: unknown): void => {
  const nextStep = Number(value || 1)
  if (Number.isNaN(nextStep)) {
    return
  }
  currentStep.value = Math.max(1, Math.min(2, nextStep))
}
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>添加文档</DialogTitle>
        <DialogDescription>分步骤完成来源选择与接入配置。</DialogDescription>
      </DialogHeader>

      <Stepper
        class="w-full items-start justify-between gap-3"
        :model-value="currentStep"
        @update:model-value="handleStepChange"
      >
        <StepperItem :step="1" class="flex-1">
          <StepperTrigger class="w-full items-start text-left">
            <StepperIndicator>1</StepperIndicator>
            <div class="space-y-0.5">
              <StepperTitle class="text-sm">选择来源</StepperTitle>
              <StepperDescription>选择文档导入方式</StepperDescription>
            </div>
          </StepperTrigger>
          <StepperSeparator class="mt-4 h-px w-full" />
        </StepperItem>
        <StepperItem :step="2" class="flex-1">
          <StepperTrigger class="w-full items-start text-left">
            <StepperIndicator>2</StepperIndicator>
            <div class="space-y-0.5">
              <StepperTitle class="text-sm">填写配置</StepperTitle>
              <StepperDescription>确认参数并提交</StepperDescription>
            </div>
          </StepperTrigger>
        </StepperItem>
      </Stepper>

      <div v-if="currentStep === 1" class="grid gap-3 md:grid-cols-3">
        <Button
          v-for="item in sourceOptions"
          :key="item.type"
          type="button"
          variant="outline"
          class="h-auto min-h-24 items-start justify-start p-3 text-left"
          :class="{
            'border-foreground/40 bg-accent/40': sourceType === item.type,
            'opacity-70': !item.available,
          }"
          @click="handleSelectSource(item.type)"
        >
          <div class="w-full space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-semibold">{{ item.title }}</span>
              <Check v-if="sourceType === item.type" class="size-4" />
            </div>
            <p class="text-xs text-muted-foreground">{{ item.description }}</p>
            <Badge v-if="!item.available" variant="outline">暂未开放</Badge>
          </div>
        </Button>
      </div>

      <Card v-else>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm">{{ selectedOption?.title }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <template v-if="sourceType === 'local'">
            <p class="text-sm text-muted-foreground">本地文件通过素材库接入，选择后自动进入解析流程。</p>
            <Button :disabled="props.loading" @click="handleSubmit">
              <FolderOpen class="mr-1.5 size-4" />
              {{ props.loading ? '打开中...' : '打开素材库' }}
            </Button>
          </template>

          <template v-else-if="sourceType === 'uri' || sourceType === 'web'">
            <div class="space-y-2">
              <Label for="knowledge-source-uri">URI / URL</Label>
              <Input
                id="knowledge-source-uri"
                v-model="sourceUri"
                placeholder="https://example.com/docs/file.pdf"
              />
            </div>
            <div class="space-y-2">
              <Label for="knowledge-source-name">文档名称（可选）</Label>
              <Input
                id="knowledge-source-name"
                v-model="fileName"
                placeholder="例如：产品手册.pdf"
              />
            </div>
          </template>
        </CardContent>
      </Card>

      <p v-if="skeletonHint" class="text-xs text-muted-foreground">{{ skeletonHint }}</p>

      <div class="flex items-center justify-between border-t pt-3">
        <Button
          variant="outline"
          :disabled="props.loading || currentStep === 1"
          @click="goBack"
        >
          <ArrowLeft class="mr-1 size-4" />
          上一步
        </Button>

        <div class="flex items-center gap-2">
          <Button variant="ghost" :disabled="props.loading" @click="emit('update:open', false)">
            取消
          </Button>
          <Button
            v-if="currentStep === 1"
            :disabled="props.loading || !selectedAvailable"
            @click="goNext"
          >
            下一步
            <ArrowRight class="ml-1 size-4" />
          </Button>
          <Button
            v-else
            :disabled="props.loading || !selectedAvailable"
            @click="handleSubmit"
          >
            {{ props.loading ? '提交中...' : '提交资源' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
