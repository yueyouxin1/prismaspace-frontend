<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Alert, AlertDescription } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { useSubmitGuard } from '@app/composables/useSubmitGuard'
import { validatePassword } from '@app/composables/useAuthFormRules'

const router = useRouter()
const { submitting, runWithGuard } = useSubmitGuard()

const password = ref('')
const confirmPassword = ref('')
const message = ref('')

const submit = (): void => {
  void runWithGuard(async () => {
    const validation = validatePassword(password.value)
    if (!validation.valid) {
      message.value = validation.message
      return
    }

    if (password.value !== confirmPassword.value) {
      message.value = '两次输入的密码不一致。'
      return
    }

    message.value = '密码重置成功，正在跳转登录页。'
    await new Promise((resolve) => setTimeout(resolve, 500))
    await router.push('/auth/sign-in')
  })
}
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>重置密码</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="password">新密码</Label>
        <Input id="password" v-model="password" type="password" />
      </div>
      <div class="space-y-2">
        <Label for="confirm-password">确认新密码</Label>
        <Input id="confirm-password" v-model="confirmPassword" type="password" />
      </div>
      <Alert v-if="message">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>
    </CardContent>
    <CardFooter>
      <Button class="w-full" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中...' : '确认重置' }}
      </Button>
    </CardFooter>
  </Card>
</template>
