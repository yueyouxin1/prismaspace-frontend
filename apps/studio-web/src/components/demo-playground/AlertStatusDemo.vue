<script setup lang="ts">
import { Alert, AlertDescription, AlertTitle } from "@prismaspace/ui-shadcn/components/ui/alert"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
</script>

<template>
  <div class="relative h-full w-full overflow-auto bg-background">
    <DemoPlaygroundPanel
      title="Alert"
      description="展示默认与 destructive 两种告警样式。"
    />

    <div class="flex min-h-full items-center justify-center p-6 md:p-10">
      <div class="grid w-full max-w-5xl gap-4 lg:grid-cols-2">
        <Alert class="min-h-40">
          <AlertTitle>系统状态正常</AlertTitle>
          <AlertDescription>
            最近 15 分钟请求成功率 99.9%，所有核心服务均在线。
          </AlertDescription>
        </Alert>

        <Alert variant="destructive" class="min-h-40">
          <AlertTitle>需要处理的告警</AlertTitle>
          <AlertDescription>
            支付网关延迟升高，建议先切换到降级策略后再排查链路。
          </AlertDescription>
        </Alert>
      </div>
    </div>
  </div>
</template>
