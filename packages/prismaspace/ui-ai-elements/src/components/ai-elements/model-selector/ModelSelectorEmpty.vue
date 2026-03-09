<script setup lang="ts">
import { CommandEmpty } from '@prismaspace/ui-shadcn/components/ui/command'
</script>

<template>
  <CommandEmpty v-bind="$attrs">
    <slot />
  </CommandEmpty>
</template>
