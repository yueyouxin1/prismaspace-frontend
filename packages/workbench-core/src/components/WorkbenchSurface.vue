<script setup lang="ts">
import type { WorkbenchScaffoldProps } from '@repo/workbench-core/types'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui-shadcn/components/ui/card'

defineProps<WorkbenchScaffoldProps>()
</script>

<template>
  <div class="h-full w-full space-y-4">
    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{{ title }}</CardTitle>
            <CardDescription class="mt-1">
              {{ description }}
            </CardDescription>
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">{{ resourceType }}</Badge>
            <Badge variant="outline">{{ resourceName }}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="grid gap-3 text-xs md:grid-cols-2">
          <div class="rounded-md border bg-muted/30 p-3">
            <p class="text-muted-foreground">Workspace Instance</p>
            <p class="mt-1 break-all font-mono">{{ workspaceInstanceUuid || '-' }}</p>
          </div>
          <div class="rounded-md border bg-muted/30 p-3">
            <p class="text-muted-foreground">Latest Published</p>
            <p class="mt-1 break-all font-mono">{{ latestPublishedInstanceUuid || '-' }}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    <slot />
  </div>
</template>
