<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Command } from '@prismaspace/ui-shadcn/components/ui/command'
import { cn } from '@prismaspace/ui-shadcn/lib/utils'

type PromptInputCommandProps = InstanceType<typeof Command>['$props']

interface Props extends /* @vue-ignore */ PromptInputCommandProps {
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <Command :class="cn(props.class)" v-bind="props">
    <slot />
  </Command>
</template>
