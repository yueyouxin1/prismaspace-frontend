<script setup lang="ts">
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import { Input } from "@prismaspace/ui-shadcn/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@prismaspace/ui-shadcn/components/ui/card"
import DemoPlaygroundPanel from "@app/components/demo-playground/DemoPlaygroundPanel.vue"
</script>

<template>
  <div class="relative h-full w-full overflow-auto bg-background">
    <DemoPlaygroundPanel
      title="Form Card"
      description="展示 Card、Input、Button 的表单组合示例。"
    />

    <div class="flex min-h-full items-center justify-center p-6 md:p-10">
      <Card class="w-full max-w-lg shadow-sm">
        <CardHeader>
          <CardTitle>订阅更新</CardTitle>
          <CardDescription>用于测试 Input + Card + Button 组合样式。</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Input placeholder="请输入邮箱地址" type="email" />
          <Input placeholder="请输入姓名" />
        </CardContent>
        <CardFooter class="justify-end">
          <Button>提交</Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
