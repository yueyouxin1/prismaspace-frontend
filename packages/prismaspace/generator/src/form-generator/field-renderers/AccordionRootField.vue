<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { Accordion } from "@prismaspace/ui-shadcn/components/ui/accordion";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";

type AccordionModelValue = string | string[] | undefined;

const props = withDefaults(
  defineProps<{
    modelValue?: AccordionModelValue;
    type?: "single" | "multiple";
    collapsible?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: undefined,
    type: "multiple",
    collapsible: true,
    class: "",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: AccordionModelValue): void;
}>();

const normalizedValue = computed<AccordionModelValue>(() => {
  if (props.type === "multiple") {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return typeof props.modelValue === "string" ? props.modelValue : undefined;
});

function onUpdateModelValue(value: AccordionModelValue) {
  emit("update:modelValue", value);
}
</script>

<template>
  <Accordion :type="type" :collapsible="collapsible" :class="cn(props.class)" :model-value="normalizedValue"
    @update:model-value="onUpdateModelValue">
    <slot />
  </Accordion>
</template>
