<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, MoreHorizontal } from 'lucide-vue-next'
import { Badge } from '@repo/ui-shadcn/components/ui/badge'
import { Button } from '@repo/ui-shadcn/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui-shadcn/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui-shadcn/components/ui/tooltip'
import type {
  WorkbenchExtraAction,
  WorkbenchHeaderActionConfig,
} from '../types'

type HeaderActionKey = 'run' | 'save' | 'publish'

interface HeaderActionItem {
  key: HeaderActionKey | string
  label: string
  disabled: boolean
  loading: boolean
  icon?: Component
  source: 'base' | 'extra'
}

const props = withDefaults(defineProps<{
  title: string
  description: string
  resourceName: string
  updatedAt?: string | null
  saveStatusText?: string
  saveStatusVariant?: 'outline' | 'secondary' | 'destructive' | 'default'
  runAction?: WorkbenchHeaderActionConfig
  saveAction?: WorkbenchHeaderActionConfig
  publishAction?: WorkbenchHeaderActionConfig
  extraActions?: WorkbenchExtraAction[]
}>(), {
  updatedAt: null,
  saveStatusText: '',
  saveStatusVariant: 'outline',
  runAction: () => ({}),
  saveAction: () => ({}),
  publishAction: () => ({}),
  extraActions: () => [],
})
const { t } = useI18n()

const updatedAtText = computed(() => {
  if (!props.updatedAt) {
    return t('platform.workbench.header.updatedAtEmpty')
  }
  const time = new Date(props.updatedAt)
  if (Number.isNaN(time.getTime())) {
    return t('platform.workbench.header.updatedAtRaw', { value: props.updatedAt })
  }
  return t('platform.workbench.header.updatedAtValue', { value: new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(time) })
})

const descriptionText = computed(() => {
  const text = props.description.trim()
  return text || t('platform.workbench.header.emptyDescription')
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'run'): void
  (event: 'save'): void
  (event: 'publish'): void
  (event: 'action', key: string): void
}>()

const buildBaseAction = (
  key: HeaderActionKey,
  config: WorkbenchHeaderActionConfig | undefined,
  defaultLabel: string,
  defaultLoadingLabel: string,
): HeaderActionItem | null => {
  if (config?.visible === false) {
    return null
  }
  return {
    key,
    label: config?.loading ? (config.loadingLabel || defaultLoadingLabel) : (config?.label || defaultLabel),
    disabled: Boolean(config?.disabled || config?.loading),
    loading: Boolean(config?.loading),
    source: 'base',
  }
}

const baseActionItems = computed<HeaderActionItem[]>(() => {
  const result: HeaderActionItem[] = []
  const runAction = buildBaseAction('run', props.runAction, t('platform.workbench.header.actions.run'), t('platform.workbench.header.actions.running'))
  const saveAction = buildBaseAction('save', props.saveAction, t('platform.workbench.header.actions.save'), t('platform.workbench.header.actions.saving'))
  const publishAction = buildBaseAction('publish', props.publishAction, t('platform.workbench.header.actions.publish'), t('platform.workbench.header.actions.publishing'))
  if (runAction) {
    result.push(runAction)
  }
  if (saveAction) {
    result.push(saveAction)
  }
  if (publishAction) {
    result.push(publishAction)
  }
  return result
})

const onelineExtraActionItems = computed<HeaderActionItem[]>(() => {
  return props.extraActions
    .filter(action => action.placement === 'oneline')
    .map(action => ({
      key: action.key,
      label: action.loading ? (action.loadingLabel || action.label) : action.label,
      disabled: Boolean(action.disabled || action.loading),
      loading: Boolean(action.loading),
      icon: action.icon as Component | undefined,
      source: 'extra' as const,
    }))
})

const overflowExtraActionItems = computed<HeaderActionItem[]>(() => {
  return props.extraActions
    .filter(action => action.placement !== 'oneline')
    .map(action => ({
      key: action.key,
      label: action.loading ? (action.loadingLabel || action.label) : action.label,
      disabled: Boolean(action.disabled || action.loading),
      loading: Boolean(action.loading),
      icon: action.icon as Component | undefined,
      source: 'extra' as const,
    }))
})

const desktopInlineActionItems = computed<HeaderActionItem[]>(() => {
  return [...baseActionItems.value, ...onelineExtraActionItems.value]
})

const desktopMoreActionItems = computed<HeaderActionItem[]>(() => {
  return overflowExtraActionItems.value
})

const mobileMoreActionItems = computed<HeaderActionItem[]>(() => {
  return [...desktopInlineActionItems.value, ...desktopMoreActionItems.value]
})

const hasDesktopMore = computed(() => desktopMoreActionItems.value.length > 0)
const hasMobileMore = computed(() => mobileMoreActionItems.value.length > 0)

const emitAction = (key: string): void => {
  if (key === 'run') {
    emit('run')
    return
  }
  if (key === 'save') {
    emit('save')
    return
  }
  if (key === 'publish') {
    emit('publish')
    return
  }
  emit('action', key)
}
</script>

<template>
  <TooltipProvider>
    <header class="w-full border-b bg-background px-3 py-2 md:px-4">
      <div class="flex w-full flex-wrap items-center gap-3">
        <div class="order-1 min-w-0 flex-1 basis-[260px]">
          <slot name="left">
            <div class="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="icon-sm" :aria-label="t('platform.workbench.header.back')" @click="emit('back')">
                <ArrowLeft class="size-4" />
              </Button>
              <div class="min-w-0 space-y-0.5">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <p class="max-w-full truncate text-sm font-semibold md:text-base">{{ resourceName || title }}</p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{{ resourceName || title }}</TooltipContent>
                </Tooltip>
                <div class="max-w-full flex items-center gap-2 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <p class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{ descriptionText }}</p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{{ descriptionText }}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Badge variant="outline" class="shrink-0">{{ updatedAtText }}</Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{{ updatedAtText }}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </slot>
        </div>

        <div class="order-2 ml-auto flex min-w-0 shrink-0 items-center gap-2">
          <slot name="right">
            <div class="hidden items-center justify-end gap-2 sm:flex">
              <Badge v-if="saveStatusText" :variant="saveStatusVariant">
                {{ saveStatusText }}
              </Badge>
              <template v-for="action in desktopInlineActionItems" :key="action.key">
                <Button :variant="action.key === 'run' ? 'outline' : 'default'" :disabled="action.disabled"
                  @click="emitAction(action.key)">
                  <component :is="action.icon" v-if="action.icon" class="mr-1.5 size-4" />
                  {{ action.label }}
                </Button>
              </template>

              <DropdownMenu v-if="hasDesktopMore">
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="outline" :aria-label="t('platform.workbench.header.more')">
                    <MoreHorizontal class="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-44">
                  <DropdownMenuItem v-for="action in desktopMoreActionItems" :key="`desktop-more-${action.key}`"
                    :disabled="action.disabled" @select.prevent="emitAction(action.key)">
                    <component :is="action.icon" v-if="action.icon" class="mr-1.5 size-4" />
                    {{ action.label }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div class="sm:hidden">
              <DropdownMenu v-if="hasMobileMore">
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="outline" :aria-label="t('platform.workbench.header.more')">
                    <MoreHorizontal class="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-44">
                  <DropdownMenuItem v-for="action in mobileMoreActionItems" :key="`mobile-more-${action.key}`"
                    :disabled="action.disabled" @select.prevent="emitAction(action.key)">
                    <component :is="action.icon" v-if="action.icon" class="mr-1.5 size-4" />
                    {{ action.label }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </slot>
        </div>

        <div v-if="$slots.center" class="order-3 w-full min-w-0 md:order-2 md:flex-1">
          <slot name="center" />
        </div>
      </div>
    </header>
  </TooltipProvider>
</template>
