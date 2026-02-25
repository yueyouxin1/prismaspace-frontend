<script setup lang="ts">
import { computed } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui-shadcn/components/ui/alert'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui-shadcn/components/ui/dialog'
import { usePlatformStore } from '@app/stores/platform'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const store = usePlatformStore()
const router = useRouter()
const { t } = useI18n()

const error = computed(() => store.latestError)
const showDialog = computed(() => {
  if (!error.value) {
    return false
  }

  return [401, 402, 403].includes(error.value.status)
})
const showThrottleAlert = computed(() => error.value?.status === 429)
const showServerAlert = computed(() => {
  if (!error.value) {
    return false
  }

  return error.value.status >= 500
})

const closeModal = (): void => {
  store.clearError()
}

const retryRequest = (): void => {
  void router.go(0)
}

const handleAction = async (): Promise<void> => {
  if (!error.value) {
    return
  }

  if (error.value.status === 401) {
    await router.push('/auth/sign-in')
    closeModal()
    return
  }

  if (error.value.status === 402) {
    await router.push('/pricing')
    closeModal()
    return
  }

  if (error.value.status === 403) {
    await router.push('/forbidden')
    closeModal()
  }
}
</script>

<template>
  <div class="pointer-events-none fixed right-4 bottom-4 z-50 w-full max-w-md space-y-3">
    <Alert v-if="showThrottleAlert" class="pointer-events-auto border-amber-500/40 bg-amber-50">
      <AlertTitle>{{ t('errors.throttle.title') }}</AlertTitle>
      <AlertDescription>
        {{ error?.message }}
      </AlertDescription>
      <Button class="mt-3" size="sm" variant="outline" @click="store.clearError()">
        {{ t('common.acknowledge') }}
      </Button>
    </Alert>

    <Alert v-if="showServerAlert" class="pointer-events-auto border-red-500/30 bg-red-50">
      <AlertTitle>{{ t('errors.server.title') }}</AlertTitle>
      <AlertDescription>
        {{ error?.message }}
      </AlertDescription>
      <Button class="mt-3" size="sm" variant="outline" @click="retryRequest">
        {{ t('common.retry') }}
      </Button>
    </Alert>
  </div>

  <Dialog :open="showDialog" @update:open="closeModal">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {{
            error?.status === 401
              ? t('errors.authExpired.title')
              : error?.status === 402
                ? t('errors.quotaBlocked.title')
                : t('errors.forbidden.title')
          }}
        </DialogTitle>
        <DialogDescription>
          {{ error?.message }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="closeModal">
          {{ t('common.cancel') }}
        </Button>
        <Button @click="handleAction">
          {{ error?.actionText || t('common.continue') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
