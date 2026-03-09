<script setup lang="ts">
import { computed, ref } from 'vue'
import { AgentChat } from '@prismaspace/agent'
import { prismaspaceClient } from '@app/core/client/prismaspace-client'
import { usePlatformStore } from '@app/stores/platform'
import { Alert, AlertDescription, AlertTitle } from '@prismaspace/ui-shadcn/components/ui/alert'
import { Badge } from '@prismaspace/ui-shadcn/components/ui/badge'
import { Button } from '@prismaspace/ui-shadcn/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@prismaspace/ui-shadcn/components/ui/card'
import { Input } from '@prismaspace/ui-shadcn/components/ui/input'
import { Label } from '@prismaspace/ui-shadcn/components/ui/label'
import { Switch } from '@prismaspace/ui-shadcn/components/ui/switch'

const platform = usePlatformStore()

const instanceUuid = ref('')
const pinnedThread = ref(false)
const draftThreadId = ref('')
const liveThreadId = ref<string | null>(null)

const normalizedInstanceUuid = computed(() => instanceUuid.value.trim())
const normalizedDraftThreadId = computed(() => draftThreadId.value.trim())

const agentChatProps = computed(() => {
  const props: Record<string, unknown> = {
    client: prismaspaceClient,
    instanceUuid: normalizedInstanceUuid.value || undefined,
    title: 'Agent Chat Demo',
  }

  if (pinnedThread.value && normalizedDraftThreadId.value) {
    props.threadId = normalizedDraftThreadId.value
  }

  return props
})

const authSummary = computed(() => ({
  authenticated: Boolean(platform.accessToken),
  workspaceName: platform.currentWorkspace?.name || null,
  workspaceUuid: platform.currentWorkspaceId || null,
}))

const canMountChat = computed(() => normalizedInstanceUuid.value.length > 0)

function useSelectedThreadAsPinned(): void {
  if (!liveThreadId.value) {
    return
  }
  draftThreadId.value = liveThreadId.value
  pinnedThread.value = true
}

function clearPinnedThread(): void {
  draftThreadId.value = ''
  pinnedThread.value = false
}

function handleThreadChange(value: string | null): void {
  liveThreadId.value = value
}
</script>

<template>
  <div class="space-y-4">
    <Card>
      <CardHeader class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <CardTitle>AgentChat Demo</CardTitle>
          <Badge variant="outline">Shared Client</Badge>
          <Badge variant="secondary">AG-UI</Badge>
        </div>
        <CardDescription>
          Demo 直接复用 studio-web 的统一 `prismaspaceClient`。填写 `instanceUuid` 后即可验证两种模式：
          不传 `threadId` 为会话工作站模式，传入 `threadId` 为固定线程模式。
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div class="space-y-2">
            <Label for="agent-instance-uuid">Agent Instance UUID</Label>
            <Input
              id="agent-instance-uuid"
              v-model="instanceUuid"
              placeholder="请输入后端 Agent 实例 UUID"
            />
          </div>

          <div class="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <p class="font-medium">宿主上下文</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
              <Badge :variant="authSummary.authenticated ? 'default' : 'destructive'">
                {{ authSummary.authenticated ? 'Authenticated' : 'Unauthenticated' }}
              </Badge>
              <span v-if="authSummary.workspaceName">{{ authSummary.workspaceName }}</span>
              <span v-if="authSummary.workspaceUuid" class="font-mono text-xs">{{ authSummary.workspaceUuid }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl border bg-background px-4 py-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-1">
              <p class="text-sm font-medium">固定线程模式</p>
              <p class="text-sm text-muted-foreground">
                开启后直接把 `threadId` 传给 `AgentChat`，组件不会展示会话列表。
              </p>
            </div>
            <Switch :model-value="pinnedThread" @update:model-value="pinnedThread = !!$event" />
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <Input
              v-model="draftThreadId"
              :disabled="!pinnedThread"
              placeholder="可选：输入已存在的 threadId"
            />
            <Button variant="outline" :disabled="!liveThreadId" @click="useSelectedThreadAsPinned">
              使用当前线程
            </Button>
            <Button variant="ghost" :disabled="!draftThreadId" @click="clearPinnedThread">
              清空
            </Button>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>当前线程：</span>
            <Badge variant="outline">{{ liveThreadId || '未建立' }}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <Alert v-if="!authSummary.authenticated" variant="destructive">
      <AlertTitle>需要登录</AlertTitle>
      <AlertDescription>
        这个 Demo 走统一 `prismaspaceClient`，请先登录并进入一个工作区，否则无法访问 Agent 接口。
      </AlertDescription>
    </Alert>

    <Alert v-else-if="!canMountChat">
      <AlertTitle>等待实例 UUID</AlertTitle>
      <AlertDescription>
        填入一个有效的 Agent `instanceUuid` 后，下面的 AgentChat 会直接挂载真实后端接口。
      </AlertDescription>
    </Alert>

    <div v-if="canMountChat" class="h-[calc(100vh-14rem)] min-h-[760px] overflow-hidden rounded-xl border bg-background">
      <AgentChat
        v-bind="agentChatProps"
        @thread-change="handleThreadChange"
      />
    </div>
  </div>
</template>
