<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Alert, AlertDescription } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'
import { Input } from '@repo/ui-shadcn/components/ui/input'
import { Label } from '@repo/ui-shadcn/components/ui/label'
import { useAuthFormRules } from '@app/composables/useAuthFormRules'
import { useSubmitGuard } from '@app/composables/useSubmitGuard'
import { usePlatformStore } from '@app/stores/platform'

const route = useRoute()
const router = useRouter()
const store = usePlatformStore()
const { t } = useI18n()
const { submitting, runWithGuard } = useSubmitGuard()

const account = ref('')
const password = ref('')
const message = ref('')

const { validateAccount, validatePassword } = useAuthFormRules()

const submit = (): void => {
  void runWithGuard(async () => {
    message.value = ''
    const accountValidation = validateAccount(account.value)
    if (!accountValidation.valid) {
      message.value = accountValidation.message
      return
    }

    const passwordValidation = validatePassword(password.value)
    if (!passwordValidation.valid) {
      message.value = passwordValidation.message
      return
    }

    try {
      await store.signInWithPassword(account.value, password.value)
      const rawRedirect = route.query.redirect
      const redirect = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect
      await router.push(redirect || '/')
    } catch {
      message.value = t('auth.signIn.failed')
    }
  })
}
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle>{{ t('auth.signIn.title') }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="account">{{ t('auth.signIn.accountLabel') }}</Label>
        <Input id="account" v-model="account" :placeholder="t('auth.signIn.accountPlaceholder')" />
      </div>
      <div class="space-y-2">
        <Label for="password">{{ t('auth.signIn.passwordLabel') }}</Label>
        <Input id="password" v-model="password" type="password" :placeholder="t('auth.signIn.passwordPlaceholder')" />
      </div>
      <Alert v-if="message">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>
      <div class="text-sm text-muted-foreground">
        {{ t('auth.signIn.forgotPrefix') }}
        <RouterLink class="text-primary underline" to="/auth/forgot-password">
          {{ t('auth.signIn.forgotAction') }}
        </RouterLink>
      </div>
    </CardContent>
    <CardFooter class="flex-col gap-3">
      <Button class="w-full" :disabled="submitting" @click="submit">
        {{ submitting ? t('auth.signIn.submitting') : t('auth.signIn.submit') }}
      </Button>
      <RouterLink class="text-sm text-muted-foreground underline" to="/auth/sign-up">
        {{ t('auth.signIn.toSignUp') }}
      </RouterLink>
    </CardFooter>
  </Card>
</template>
