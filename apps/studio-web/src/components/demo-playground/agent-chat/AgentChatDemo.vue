<script setup lang="ts">
import { computed, ref } from "vue"
import { AgentChat } from "@prismaspace/agent"
import { prismaspaceClient } from "@app/core/client/prismaspace-client"
import { usePlatformStore } from "@app/stores/platform"
import { Alert, AlertDescription, AlertTitle } from "@prismaspace/ui-shadcn/components/ui/alert"
import { Badge } from "@prismaspace/ui-shadcn/components/ui/badge"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import { Input } from "@prismaspace/ui-shadcn/components/ui/input"
import { Label } from "@prismaspace/ui-shadcn/components/ui/label"
import { Switch } from "@prismaspace/ui-shadcn/components/ui/switch"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"

const platform = usePlatformStore()

const instanceUuid = ref("")
const pinnedThread = ref(false)
const draftThreadId = ref("")
const liveThreadId = ref<string | null>(null)

const normalizedInstanceUuid = computed(() => instanceUuid.value.trim())
const normalizedDraftThreadId = computed(() => draftThreadId.value.trim())

const agentChatProps = computed(() => {
  const props: Record<string, unknown> = {
    client: prismaspaceClient,
    instanceUuid: normalizedInstanceUuid.value || undefined,
    title: "Agent Chat Demo",
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
  draftThreadId.value = ""
  pinnedThread.value = false
}

function handleThreadChange(value: string | null): void {
  liveThreadId.value = value
}
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-background">
    <DemoPlaygroundPanel
      title="Agent Chat"
      description="基于统一 PrismaspaceClient 的 AG-UI AgentChat Demo，支持会话工作站与固定线程两种模式。"
    >
      <div class="space-y-4">
        <section class="space-y-2">
          <Label for="agent-instance-uuid">Agent Instance UUID</Label>
          <Input
            id="agent-instance-uuid"
            v-model="instanceUuid"
            placeholder="请输入后端 Agent 实例 UUID"
          />
        </section>

        <section class="rounded-xl border bg-muted/20 px-3 py-3 text-xs">
          <p class="font-medium">宿主上下文</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
            <Badge :variant="authSummary.authenticated ? 'default' : 'destructive'">
              {{ authSummary.authenticated ? "Authenticated" : "Unauthenticated" }}
            </Badge>
            <span v-if="authSummary.workspaceName">{{ authSummary.workspaceName }}</span>
            <span v-if="authSummary.workspaceUuid" class="font-mono">
              {{ authSummary.workspaceUuid }}
            </span>
          </div>
        </section>

        <section class="space-y-3 rounded-xl border bg-muted/20 p-3">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="text-sm font-medium">固定线程模式</p>
              <p class="text-xs text-muted-foreground">
                开启后直接把 <code>threadId</code> 传给 <code>AgentChat</code>，组件不会展示会话列表。
              </p>
            </div>
            <Switch :model-value="pinnedThread" @update:model-value="pinnedThread = !!$event" />
          </div>

          <Input
            v-model="draftThreadId"
            :disabled="!pinnedThread"
            placeholder="可选：输入已存在的 threadId"
          />

          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" :disabled="!liveThreadId" @click="useSelectedThreadAsPinned">
              使用当前线程
            </Button>
            <Button variant="ghost" size="sm" :disabled="!draftThreadId" @click="clearPinnedThread">
              清空
            </Button>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>当前线程：</span>
            <Badge variant="outline">{{ liveThreadId || "未建立" }}</Badge>
          </div>
        </section>
      </div>
    </DemoPlaygroundPanel>

    <div class="h-full w-full">
      <div v-if="!authSummary.authenticated" class="flex h-full items-center justify-center p-6">
        <Alert variant="destructive" class="max-w-lg">
          <AlertTitle>需要登录</AlertTitle>
          <AlertDescription>
            这个 Demo 走统一 <code>prismaspaceClient</code>，请先登录并进入一个工作区，否则无法访问 Agent 接口。
          </AlertDescription>
        </Alert>
      </div>

      <div v-else-if="!canMountChat" class="flex h-full items-center justify-center p-6">
        <Alert class="max-w-lg">
          <AlertTitle>等待实例 UUID</AlertTitle>
          <AlertDescription>
            填入一个有效的 Agent <code>instanceUuid</code> 后，下面的 AgentChat 会直接挂载真实后端接口。
          </AlertDescription>
        </Alert>
      </div>

      <div v-else class="h-full w-full overflow-hidden">
        <AgentChat
          v-bind="agentChatProps"
          class="h-full w-full"
          @thread-change="handleThreadChange"
        />
      </div>
    </div>
  </div>
</template>
