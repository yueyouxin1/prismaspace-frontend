<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Search } from 'lucide-vue-next'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import type { WorkflowVariableEntry } from '../types/workflow-ide'
import { formatJson } from '../utils/workflow-helpers'

const props = defineProps<{
  entries: WorkflowVariableEntry[]
}>()

const keyword = ref('')
const copiedKey = ref('')

const filteredEntries = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) {
    return props.entries
  }
  return props.entries.filter(entry =>
    [entry.nodeName, entry.path, entry.category, entry.schema.label, entry.schema.name]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(search)),
  )
})

const copyText = async (key: string, text: string): Promise<void> => {
  await navigator.clipboard.writeText(text)
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = ''
    }
  }, 1200)
}
</script>

<template>
  <Card>
    <CardHeader class="space-y-2">
      <CardTitle class="text-base">Variables</CardTitle>
      <div class="relative">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="keyword" class="pl-8" placeholder="搜索可用变量或路径" />
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <div
        v-for="entry in filteredEntries"
        :key="entry.key"
        class="rounded-xl border bg-muted/20 p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium">{{ entry.path }}</p>
              <Badge variant="outline">{{ entry.category === 'workflow-input' ? 'Input' : 'Output' }}</Badge>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{{ entry.nodeName }} · {{ entry.schema.type }}</p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              class="gap-1.5"
              @click="copyText(`${entry.key}-path`, entry.path)"
            >
              <Copy class="size-3.5" />
              {{ copiedKey === `${entry.key}-path` ? '已复制路径' : '复制路径' }}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              class="gap-1.5"
              @click="copyText(`${entry.key}-ref`, formatJson(entry.refValue))"
            >
              <Copy class="size-3.5" />
              {{ copiedKey === `${entry.key}-ref` ? '已复制 Ref' : '复制 Ref' }}
            </Button>
          </div>
        </div>
      </div>
      <p v-if="!filteredEntries.length" class="text-sm text-muted-foreground">当前没有匹配的可用变量。</p>
    </CardContent>
  </Card>
</template>
