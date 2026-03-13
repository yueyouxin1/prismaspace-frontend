<script setup lang="ts">
import type { ValueRefContent } from "../core";
import type { VariableTreeNode } from "./tree-types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@prismaspace/ui-shadcn/components/ui/dialog";
import SchemaValueRefTreePanel from "./SchemaValueRefTreePanel.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    tree?: VariableTreeNode[];
    modelValue?: ValueRefContent | null;
    title?: string;
    description?: string;
  }>(),
  {
    tree: () => [],
    modelValue: null,
    title: "选择变量引用",
    description: "从变量树中选择 blockID / path / source。",
  },
);

const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
  (event: "select", value: ValueRefContent): void;
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[78vh] max-h-[78vh] flex-col overflow-hidden sm:max-w-[640px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <SchemaValueRefTreePanel
        :tree="tree"
        :model-value="modelValue"
        class="min-h-0 flex-1"
        @select="emit('select', $event)"
        @request-close="emit('update:open', false)"
      >
        <template v-if="$slots['tree-panel']" #tree-panel="slotProps">
          <slot name="tree-panel" v-bind="slotProps" />
        </template>
      </SchemaValueRefTreePanel>
    </DialogContent>
  </Dialog>
</template>
