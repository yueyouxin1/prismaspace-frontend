<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { SelectContent } from '@prismaspace/ui-shadcn/components/ui/select'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

type SelectContentProps = InstanceType<typeof SelectContent>['$props']

interface Props extends /* @vue-ignore */ SelectContentProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <SelectContent :class="cn(props.class)" v-bind="props">
    <slot />
  </SelectContent>
</template>
