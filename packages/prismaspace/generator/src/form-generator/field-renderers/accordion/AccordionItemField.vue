<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { provide, ref } from "vue";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@prismaspace/ui-shadcn/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@prismaspace/ui-shadcn/components/ui/tooltip';
import { cn } from "@prismaspace/ui-shadcn/lib/utils";
import { formGeneratorHeaderActionsPortalKey } from "../../injection-keys";

const props = withDefaults(
  defineProps<{
    modelValue?: unknown;
    title?: string;
    description?: string;
    value?: string;
    disabled?: boolean;
    class?: HTMLAttributes["class"];
    triggerClass?: HTMLAttributes["class"];
    contentClass?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: undefined,
    title: "折叠项",
    description: "",
    value: "accordion-item",
    disabled: false,
    class: "",
    triggerClass: "",
    contentClass: "",
  },
);

const headerActionsTarget = ref<HTMLElement | null>(null);

provide(formGeneratorHeaderActionsPortalKey, {
  target: headerActionsTarget,
});
</script>

<template>
  <AccordionItem :value="value" :disabled="disabled" :class="cn(props.class)">
    <AccordionTrigger :class="cn('items-center py-2 hover:no-underline', props.triggerClass)">
      <div class="min-w-0 flex-1 text-left">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="truncate text-sm font-semibold text-foreground">
                {{ title }}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p v-if="description">
                {{ description }}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div ref="headerActionsTarget" class="flex shrink-0 items-center gap-2" @click.stop />
    </AccordionTrigger>

    <AccordionContent :class="props.contentClass">
      <div class="space-y-4">
        <slot />
      </div>
    </AccordionContent>
  </AccordionItem>
</template>
