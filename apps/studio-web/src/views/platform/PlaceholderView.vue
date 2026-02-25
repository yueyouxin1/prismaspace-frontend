<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlatformShell from '@app/components/platform/PlatformShell.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui-shadcn/components/ui/card'

const props = defineProps<{
  titleKey: string
  subtitleKey: string
  descriptionKey: string
}>()

const { t } = useI18n()
</script>

<template>
  <PlatformShell :title="t(props.titleKey)" :subtitle="t(props.subtitleKey)">
    <div class="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t(props.titleKey) }}</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-muted-foreground text-sm">
            {{ t(props.descriptionKey) }}
          </p>
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
</template>

