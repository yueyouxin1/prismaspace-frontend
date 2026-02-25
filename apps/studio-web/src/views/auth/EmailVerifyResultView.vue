<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'

const route = useRoute()
const status = computed(() => {
  const raw = route.query.status
  return Array.isArray(raw) ? raw[0] : raw ?? 'sent'
})
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>邮箱验证结果</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <Alert v-if="status === 'success'">
        <AlertTitle>验证成功</AlertTitle>
        <AlertDescription>邮箱已验证，你现在可以登录并进入控制台。</AlertDescription>
      </Alert>
      <Alert v-else-if="status === 'expired'" variant="destructive">
        <AlertTitle>链接已失效</AlertTitle>
        <AlertDescription>验证链接已过期，请返回注册页重新发送验证邮件。</AlertDescription>
      </Alert>
      <Alert v-else>
        <AlertTitle>邮件已发送</AlertTitle>
        <AlertDescription>请前往邮箱完成验证，若 5 分钟未收到可重新发送。</AlertDescription>
      </Alert>
      <div class="flex gap-2">
        <Button as="a" href="/auth/sign-in">
          去登录
        </Button>
        <Button variant="outline" as="a" href="/auth/sign-up">
          重新注册
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
