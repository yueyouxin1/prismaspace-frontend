<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  SchemaValueRefTree,
  getValueRefPickerItemIssue,
  type ValueRefPickerItem,
  type ValueRefPickerViewModel,
} from "@prismaspace/editor";
import { Button } from "@prismaspace/ui-shadcn/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@prismaspace/ui-shadcn/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@prismaspace/ui-shadcn/components/ui/popover";
import { ScrollArea } from "@prismaspace/ui-shadcn/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@prismaspace/ui-shadcn/components/ui/tooltip";
import { AlertCircle, ChevronRight, CornerDownRight } from "lucide-vue-next";

defineOptions({ name: "ParamSchemaCascadeValueRefPickerDemo" });

interface CascadeEntry {
  key: string;
  item: ValueRefPickerItem;
  children: ValueRefPickerItem[];
  searchableText: string;
  issue: string | null;
}

interface CascadeGroup {
  key: string;
  label: string;
  entries: CascadeEntry[];
}

const props = defineProps<{
  picker: ValueRefPickerViewModel;
  close: () => void;
}>();

const openEntryKey = ref("");

const cascadeGroups = computed<CascadeGroup[]>(() =>
  props.picker.items
    .map((category) => ({
      key: category.key,
      label: category.label,
      entries: buildEntries(category),
    }))
    .filter((group) => group.entries.length),
);

const currentEntry = computed(() =>
  cascadeGroups.value
    .flatMap((group) => group.entries)
    .find((entry) => entry.key === openEntryKey.value)
  ?? null,
);

const currentTreeSelection = computed(() => {
  if (!currentEntry.value || !props.picker.selectedKey) return null;
  return findPickerItemByKey(currentEntry.value.children, props.picker.selectedKey);
});

const currentSelectionLabel = computed(() => props.picker.selectedItem?.label ?? props.picker.selectedSummary ?? "未选择变量");
const currentSelectionType = computed(() => props.picker.selectedItem?.schemaType ?? null);
const currentSelectionIssue = computed(() => {
  if (props.picker.selectedValidation.status === "empty" || props.picker.selectedValidation.status === "ok") {
    return null;
  }
  return props.picker.selectedValidation.message;
});

watch(
  cascadeGroups,
  (nextGroups) => {
    const availableKeys = new Set(nextGroups.flatMap((group) => group.entries.map((entry) => entry.key)));
    if (openEntryKey.value && !availableKeys.has(openEntryKey.value)) {
      openEntryKey.value = "";
    }
  },
  { immediate: true, deep: true },
);

function selectItem(item: ValueRefPickerItem) {
  if (props.picker.selectItem(item)) {
    openEntryKey.value = "";
    props.close();
  }
}

function buildEntries(category: ValueRefPickerItem): CascadeEntry[] {
  if (!category.children.length) {
    return [createEntry(category)];
  }

  const entries = category.children.map((child) => createEntry(child));
  if (category.ref && category.selectable) {
    return [createEntry(category), ...entries];
  }
  return entries;
}

function createEntry(item: ValueRefPickerItem): CascadeEntry {
  return {
    key: item.key,
    item,
    children: item.children,
    searchableText: collectSearchableText(item),
    issue: getValueRefPickerItemIssue(item),
  };
}

function collectSearchableText(item: ValueRefPickerItem): string {
  return [
    item.searchableText,
    ...item.children.map((child) => collectSearchableText(child)),
  ].join(" ");
}

function findPickerItemByKey(items: ValueRefPickerItem[], key: string): ValueRefPickerItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    const child = findPickerItemByKey(item.children, key);
    if (child) return child;
  }
  return null;
}

function entryContainsSelection(entry: CascadeEntry): boolean {
  if (!props.picker.selectedKey) return false;
  if (entry.item.key === props.picker.selectedKey) return true;
  return findPickerItemByKey(entry.children, props.picker.selectedKey) !== null;
}

function openEntry(entry: CascadeEntry, nextOpen = true) {
  openEntryKey.value = nextOpen ? entry.key : openEntryKey.value === entry.key ? "" : openEntryKey.value;
}

function onEntrySelect(entry: CascadeEntry) {
  if (!entry.children.length) {
    selectItem(entry.item);
    return;
  }
  openEntry(entry);
}
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
      <Command class="rounded-none border-0 bg-transparent">
        <CommandInput placeholder="搜索变量或引用路径" />

        <CommandList class="max-h-[320px]">
          <CommandEmpty class="py-10 text-sm text-muted-foreground">
            没有匹配的变量入口。
          </CommandEmpty>
          <CommandGroup v-for="group in cascadeGroups" :key="group.key" :heading="group.label">
            <template v-for="entry in group.entries" :key="entry.key">

              <CommandItem :value="entry.searchableText">
                <Popover v-if="entry.children.length" :open="openEntryKey === entry.key"
                  @update:open="openEntry(entry, $event)">
                  <PopoverTrigger as-child>
                    <div class="min-w-0 flex flex-1 items-center gap-1.5">
                      <span class="truncate">{{ entry.item.label }}</span>
                      <Tooltip v-if="entry.issue">
                        <TooltipTrigger as-child>
                          <span class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                            <AlertCircle class="size-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" class="max-w-[240px]">
                          {{ entry.issue }}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <span v-if="entry.item.schemaType" class="shrink-0 text-[11px] font-medium text-muted-foreground">
                      {{ entry.item.schemaType }}
                    </span>
                    <ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
                    <span class="sr-only">{{ entry.searchableText }}</span>
                  </PopoverTrigger>

                  <PopoverContent side="left" align="start" :side-offset="8"
                    class="flex flex-col max-h-[260px] w-full rounded-lg border-[#e9e7f1] p-0 overflow-auto">
                    <div class="flex items-center gap-2 border-b px-3 py-2">
                      <CornerDownRight class="size-4 shrink-0 text-muted-foreground" />
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 text-sm font-medium">
                          <span class="truncate">{{ entry.item.label }}</span>
                          <Tooltip v-if="entry.issue">
                            <TooltipTrigger as-child>
                              <span
                                class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                                <AlertCircle class="size-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" class="max-w-[240px]">
                              {{ entry.issue }}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p class="truncate text-xs text-muted-foreground">{{ entry.item.caption }}</p>
                      </div>
                    </div>

                    <ScrollArea class="min-h-0 flex-1">
                      <SchemaValueRefTree :picker="picker" :items="entry.children" :selected-item="currentTreeSelection"
                        empty-text="当前节点下没有可引用的子项。" class="min-h-full" @request-close="props.close()" />
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                <div v-else>
                  <div class="min-w-0 flex flex-1 items-center gap-1.5">
                    <span class="truncate">{{ entry.item.label }}</span>

                    <Tooltip v-if="entry.issue">
                      <TooltipTrigger as-child>
                        <span class="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                          <AlertCircle class="size-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" class="max-w-[240px]">
                        {{ entry.issue }}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <span v-if="entry.item.schemaType" class="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {{ entry.item.schemaType }}
                  </span>
                  <span class="sr-only">{{ entry.searchableText }}</span>
                </div>
              </CommandItem>
            </template>
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </Command>

      <div v-if="picker.selected" class="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
        <span class="truncate">{{ currentSelectionLabel }}</span>

        <Tooltip v-if="currentSelectionIssue || getValueRefPickerItemIssue(picker.selectedItem)">
          <TooltipTrigger as-child>
            <span class="inline-flex size-4 shrink-0 items-center justify-center">
              <AlertCircle class="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {{ currentSelectionIssue || getValueRefPickerItemIssue(picker.selectedItem) }}
          </TooltipContent>
        </Tooltip>

        <span v-if="currentSelectionType" class="ml-auto shrink-0 font-medium">
          {{ currentSelectionType }}
        </span>
      </div>
    </div>
  </TooltipProvider>
</template>
