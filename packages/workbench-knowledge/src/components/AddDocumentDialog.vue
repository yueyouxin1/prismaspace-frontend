<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
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

const sourceType = ref<KnowledgeSourceType>('local')
const sourceUri = ref('')
const fileName = ref('')
const skeletonHint = ref('')

const sourceOptions: Array<{ type: KnowledgeSourceType; title: string; description: string; available: boolean }> = [
  { type: 'local', title: '本地上传', description: '通过资产库选择本地文件并入库。', available: true },
  { type: 'uri', title: 'URI 资源', description: '输入可访问链接后纳入解析流程。', available: true },
  { type: 'web', title: '网页抓取', description: '基于 URL 的网页内容接入。', available: true },
  { type: 'text', title: '纯文本', description: '直接粘贴文本内容。', available: false },
  { type: 'qa', title: 'QA 对', description: '结构化问答对录入。', available: false },
  { type: 'feishu', title: '飞书', description: '飞书文档与知识库同步。', available: false },
  { type: 'notion', title: 'Notion', description: 'Notion 页面同步。', available: false },
]

const selectedOption = computed(() => sourceOptions.find(item => item.type === sourceType.value) || sourceOptions[0])

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }
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
}

const handleAddLocal = (): void => {
  emit('add-local')
  emit('update:open', false)
}

const handleAddUrl = (): void => {
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
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>添加文档</DialogTitle>
        <DialogDescription>选择数据源类型并完成基础配置。未开放类型保留骨架入口。</DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 md:grid-cols-3">
        <button
          v-for="item in sourceOptions"
          :key="item.type"
          type="button"
          class="rounded-lg border p-3 text-left transition hover:border-foreground/40"
          :class="{
            'border-foreground/40 bg-accent/50': sourceType === item.type,
            'opacity-70': !item.available,
          }"
          @click="handleSelectSource(item.type)"
        >
          <p class="text-sm font-semibold">{{ item.title }}</p>
          <p class="mt-1 text-xs text-muted-foreground">{{ item.description }}</p>
          <Badge v-if="!item.available" variant="outline" class="mt-2">暂未开放</Badge>
        </button>
      </div>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm">{{ selectedOption?.title }}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <template v-if="sourceType === 'local'">
            <p class="text-sm text-muted-foreground">本地文件通过资产库选择器接入，上传后自动进入解析流程。</p>
            <Button :disabled="loading" @click="handleAddLocal">
              {{ loading ? '处理中...' : '选择本地文件' }}
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
            <Button :disabled="loading" @click="handleAddUrl">
              {{ loading ? '提交中...' : '提交资源' }}
            </Button>
          </template>

          <template v-else>
            <p class="text-sm text-muted-foreground">该类型已完成入口与占位流程，后续将逐步开放可用能力。</p>
            <Button variant="outline" disabled>暂未开放</Button>
          </template>

          <p v-if="skeletonHint" class="text-xs text-muted-foreground">{{ skeletonHint }}</p>
        </CardContent>
      </Card>
    </DialogContent>
  </Dialog>
</template>
