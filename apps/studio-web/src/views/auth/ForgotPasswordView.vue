<script setup lang="ts">
import { ref } from 'vue'
import { Alert, AlertDescription } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { validateEmail } from '@app/composables/useAuthFormRules'
import { useSubmitGuard } from '@app/composables/useSubmitGuard'

const { submitting, runWithGuard } = useSubmitGuard()

const email = ref('')
const message = ref('')

const submit = (): void => {
  void runWithGuard(async () => {
    const validation = validateEmail(email.value)
    if (!validation.valid) {
      message.value = validation.message
      return
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500)
    })
    message.value = '重置链接已发送，请在 10 分钟内完成操作。'
  })
}
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>找回密码</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="email">注册邮箱</Label>
        <Input id="email" v-model="email" placeholder="name@company.com" />
      </div>
      <Alert v-if="message">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>
      <p class="text-xs text-muted-foreground">
        如链接失效或验证码过期，请重新提交请求。
      </p>
    </CardContent>
    <CardFooter class="flex-col gap-3">
      <Button class="w-full" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '发送重置邮件' }}
      </Button>
      <a class="text-sm text-muted-foreground underline" href="/auth/sign-in">返回登录</a>
    </CardFooter>
  </Card>
</template>
