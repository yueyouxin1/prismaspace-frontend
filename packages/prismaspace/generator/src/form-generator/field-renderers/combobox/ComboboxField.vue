<script setup lang="ts">
import { computed, ref } from "vue"
import { Check, ChevronsUpDown } from "lucide-vue-next"
import { Button } from "@prismaspace/ui-shadcn/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@prismaspace/ui-shadcn/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover"
import { cn } from "@prismaspace/ui-shadcn/lib/utils"
import type { FieldOption } from "../../types"

const props = defineProps<{
  modelValue?: unknown
  disabled?: boolean
  fieldProps?: Record<string, unknown>
  options?: FieldOption[]
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: unknown): void
}>()

const open = ref(false)
const resolvedOptions = computed(() => props.options ?? [])

const selectedOption = computed(() => (
  resolvedOptions.value.find((option) => Object.is(option.value, props.modelValue))
))

const placeholder = computed(() => String(props.fieldProps?.placeholder ?? "请选择"))
const searchPlaceholder = computed(() => String(props.fieldProps?.searchPlaceholder ?? "搜索选项"))
const emptyText = computed(() => String(props.fieldProps?.emptyText ?? "没有匹配项"))

function selectOption(option: FieldOption) {
  emit("update:modelValue", option.value)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :id="fieldProps?.id as string | undefined"
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :aria-invalid="fieldProps?.['aria-invalid'] as string | undefined"
        :aria-describedby="fieldProps?.['aria-describedby'] as string | undefined"
        :disabled="disabled || Boolean(fieldProps?.disabled)"
        :class="cn('w-full justify-between', fieldProps?.triggerClass as string)"
      >
        <span class="truncate">
          {{ selectedOption?.label ?? selectedOption?.value ?? placeholder }}
        </span>
        <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent :class="cn('w-(--reka-popover-trigger-width) p-0', fieldProps?.contentClass as string)">
      <Command>
        <CommandInput :placeholder="searchPlaceholder" />
        <CommandList>
          <CommandEmpty>{{ emptyText }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="(option, index) in resolvedOptions"
              :key="`${option.value}-${index}`"
              :value="`${option.label ?? option.value}`"
              :disabled="Boolean(option.disabled)"
              @select.prevent="selectOption(option)"
            >
              <Check
                :class="cn(
                  'mr-2 size-4',
                  Object.is(option.value, modelValue) ? 'opacity-100' : 'opacity-0',
                )"
              />
              {{ option.label ?? option.value }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
