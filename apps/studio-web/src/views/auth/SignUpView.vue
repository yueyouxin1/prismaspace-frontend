<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, AlertDescription } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Checkbox } from '@repo/ui-shadcn/components/ui/checkbox'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { useAuthFormRules } from '@app/composables/useAuthFormRules'
import { useSubmitGuard } from '@app/composables/useSubmitGuard'
import { trackEvent } from '@app/services/analytics/events'

const router = useRouter()
const { submitting, runWithGuard } = useSubmitGuard()
const { validateEmail, validatePassword } = useAuthFormRules()

const email = ref('')
const password = ref('')
const agreePolicy = ref(false)
const message = ref('')

const submit = (): void => {
  void runWithGuard(async () => {
    const emailValidation = validateEmail(email.value)
    if (!emailValidation.valid) {
      message.value = emailValidation.message
      return
    }

    const passwordValidation = validatePassword(password.value)
    if (!passwordValidation.valid) {
      message.value = passwordValidation.message
      return
    }

    if (!agreePolicy.value) {
      message.value = '请先勾选用户协议和隐私协议。'
      return
    }

    trackEvent('sign_up_submitted', {
      channel: 'email',
      agreedPolicy: true,
    })

    await router.push('/auth/email-verify-result?status=sent')
  })
}
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>创建账号</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="email">邮箱</Label>
        <Input id="email" v-model="email" placeholder="name@company.com" />
      </div>
      <div class="space-y-2">
        <Label for="password">密码</Label>
        <Input id="password" v-model="password" type="password" />
      </div>
      <div class="flex items-start gap-2 text-sm text-muted-foreground">
        <Checkbox :model-value="agreePolicy" @update:model-value="agreePolicy = Boolean($event)" />
        <span>我已阅读并同意《用户协议》与《隐私协议》。</span>
      </div>
      <Alert v-if="message">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>
    </CardContent>
    <CardFooter class="flex-col gap-3">
      <Button class="w-full" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '注册并发送验证邮件' }}
      </Button>
      <a class="text-sm text-muted-foreground underline" href="/auth/sign-in">已有账号？去登录</a>
    </CardFooter>
  </Card>
</template>
