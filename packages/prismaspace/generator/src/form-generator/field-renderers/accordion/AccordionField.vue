<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, provide, ref } from "vue";
import { cn } from "@prismaspace/ui-shadcn/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@prismaspace/ui-shadcn/components/ui/accordion";
import { formGeneratorHeaderActionsPortalKey } from "../../injection-keys";

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    title?: string;
    description?: string;
    itemValue?: string;
    defaultOpen?: boolean;
    disabled?: boolean;
    class?: HTMLAttributes["class"];
    triggerClass?: HTMLAttributes["class"];
    contentClass?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: undefined,
    title: "高级配置",
    description: "",
    itemValue: "accordion-item",
    defaultOpen: false,
    disabled: false,
    class: "",
    triggerClass: "",
    contentClass: "",
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
}>();

const headerActionsTarget = ref<HTMLElement | null>(null);
const internalOpen = ref(Boolean(props.defaultOpen));

provide(formGeneratorHeaderActionsPortalKey, {
  target: headerActionsTarget,
});

const isControlled = computed(() => typeof props.modelValue === "boolean");
const accordionValue = computed(() => {
  const isOpen = isControlled.value ? Boolean(props.modelValue) : internalOpen.value;
  return isOpen ? props.itemValue : undefined;
});

function onAccordionValueChange(value: string | string[] | undefined) {
  const nextValue = Array.isArray(value) ? value.includes(props.itemValue) : value === props.itemValue;
  if (!isControlled.value) {
    internalOpen.value = nextValue;
  }
  emit("update:modelValue", nextValue);
}
</script>

<template>
  <Accordion type="single" collapsible :class="cn(props.class)" :model-value="accordionValue"
    @update:model-value="onAccordionValueChange">
    <AccordionItem :value="itemValue" :disabled="disabled">
      <AccordionTrigger :class="cn('items-center py-2 hover:no-underline', props.triggerClass)">
        <div class="min-w-0 flex-1 text-left">
          <div class="truncate text-sm font-semibold text-foreground">
            {{ title }}
          </div>
          <p v-if="description" class="mt-1 text-xs font-normal text-muted-foreground">
            {{ description }}
          </p>
        </div>
        <div ref="headerActionsTarget" class="flex shrink-0 items-center gap-2" @click.stop />
      </AccordionTrigger>

      <AccordionContent :class="props.contentClass">
        <div class="space-y-4">
          <slot />
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
