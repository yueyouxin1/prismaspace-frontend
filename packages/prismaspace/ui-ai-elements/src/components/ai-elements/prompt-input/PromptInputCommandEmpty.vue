<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CommandEmpty } from '@prismaspace/ui-shadcn/components/ui/command'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

type PromptInputCommandEmptyProps = InstanceType<typeof CommandEmpty>['$props']

interface Props extends /* @vue-ignore */ PromptInputCommandEmptyProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <CommandEmpty :class="cn(props.class)" v-bind="props">
    <slot />
  </CommandEmpty>
</template>
