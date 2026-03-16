<script setup lang="ts">
import { computed } from "vue";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle } from "lucide-vue-next";

type SchemaValueLockPlaceholderVariant = "embedded" | "field";

const props = withDefaults(
  defineProps<{
    message: string;
    variant?: SchemaValueLockPlaceholderVariant;
  }>(),
  {
    variant: "embedded",
  },
);

const wrapperClass = computed(() =>
  props.variant === "embedded"
    ? "flex min-h-7 min-w-0 flex-1 items-center gap-1.5 bg-muted/40 px-2 text-[12px] text-muted-foreground"
    : "flex min-h-8 items-center gap-1.5 rounded-[10px] border border-[#dddce6] bg-muted/40 px-3 text-[12px] text-muted-foreground",
);
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <Tooltip>
      <TooltipTrigger as-child>
        <div :class="wrapperClass">
          <span class="truncate">{{ message }}</span>
          <AlertCircle class="size-3.5 shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" class="max-w-[260px]">
        {{ message }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
