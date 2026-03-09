<script setup lang="ts">
import { CommandGroup } from '@prismaspace/ui-shadcn/components/ui/command'
</script>

<template>
  <CommandGroup v-bind="$attrs">
    <slot />
  </CommandGroup>
</template>
