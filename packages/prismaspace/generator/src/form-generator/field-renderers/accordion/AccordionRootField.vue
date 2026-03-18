<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, ref } from "vue";
import { Accordion } from "@prismaspace/ui-shadcn/components/ui/accordion";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";

type AccordionModelValue = string | string[] | undefined;

const props = withDefaults(
  defineProps<{
    modelValue?: AccordionModelValue;
    defaultValue?: AccordionModelValue;
    type?: "single" | "multiple";
    collapsible?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    type: "multiple",
    collapsible: true,
    class: "",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: AccordionModelValue): void;
}>();

const internalValue = ref<AccordionModelValue>(props.defaultValue);
const isControlled = computed(() => props.modelValue !== undefined);

function normalizeValue(value: AccordionModelValue, type: "single" | "multiple"): AccordionModelValue {
  if (type === "multiple") {
    return Array.isArray(value) ? value : [];
  }
  return typeof value === "string" ? value : undefined;
}

const normalizedValue = computed<AccordionModelValue>(() => {
  const sourceValue = isControlled.value ? props.modelValue : internalValue.value;
  return normalizeValue(sourceValue, props.type);
});

function onUpdateModelValue(value: AccordionModelValue) {
  if (!isControlled.value) {
    internalValue.value = normalizeValue(value, props.type);
  }
  emit("update:modelValue", value);
}
</script>

<template>
  <Accordion :type="type" :collapsible="collapsible" :class="cn(props.class)" :model-value="normalizedValue"
    @update:model-value="onUpdateModelValue">
    <slot />
  </Accordion>
</template>
