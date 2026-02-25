<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'

const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>{{ t('platform.forbidden.title') }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <p class="text-muted-foreground text-sm">
          {{ t('platform.forbidden.description') }}
        </p>
        <Button as-child class="w-full">
          <RouterLink to="/">
            {{ t('platform.forbidden.backHome') }}
          </RouterLink>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>

