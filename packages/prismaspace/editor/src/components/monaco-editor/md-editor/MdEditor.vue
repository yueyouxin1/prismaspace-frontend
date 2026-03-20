<script setup lang="ts">
import { createApp, h, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Component } from 'vue'
import type * as monaco from 'monaco-editor'
import MonacoEditor from '../MonacoEditor.vue'
import type { MonacoEditorExpose } from '../types'
import {
  DEFAULT_EXPRESSION_SYNTAXES,
  findInlineExpressionMatch,
  findLegacyInlineExpressionMatch,
} from '../../expression-popup-utils'
import type {
  ExpressionSyntaxDescriptor,
  ExpressionPopupContext,
  ExpressionPopupSelectPayload,
  MdEditorExpose,
  MdEditorProps,
} from './types'

type TriggerMatch = {
  syntax: ExpressionSyntaxDescriptor
  triggerText: string
  queryText: string
  defaultReplaceRange: monaco.IRange
  position: monaco.IPosition
}

type PopupHost = {
  setVisible: (visible: boolean) => void
  getVisible: () => boolean
  getDomNodeRef: () => HTMLElement
  destroy: () => void
}

const props = withDefaults(defineProps<MdEditorProps>(), {
  theme: 'vs-dark',
  width: '100%',
  height: '320px',
  placeholder: '',
  wordWrap: 'on',
  fontSize: 13,
  minimap: false,
  lineNumbers: 'on',
  readonly: false,
  autofocus: false,
  options: undefined,
  popupComponent: undefined,
  popupProps: undefined,
  expressionRules: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'ready', payload: { editor: monaco.editor.IStandaloneCodeEditor; monaco: typeof monaco }): void
  (e: 'change', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
  (e: 'validate', markers: monaco.editor.IMarker[]): void
  (e: 'error', error: unknown): void
  (e: 'popup-show', payload: ExpressionPopupContext): void
  (e: 'popup-hide'): void
  (e: 'popup-select', payload: ExpressionPopupSelectPayload): void
}>()

const monacoEditorRef = ref<MonacoEditorExpose>()
const editorReady = ref(false)

let editor: monaco.editor.IStandaloneCodeEditor | undefined
let popupHost: PopupHost | undefined
let popupApp: ReturnType<typeof createApp> | undefined
let popupVisible = false
let suppressNextTrigger = false
let currentContext: ExpressionPopupContext | undefined
let keydownListener: monaco.IDisposable | undefined
let blurListener: monaco.IDisposable | undefined
let cursorListener: monaco.IDisposable | undefined
let contentListener: monaco.IDisposable | undefined
let scrollListener: monaco.IDisposable | undefined
let layoutListener: monaco.IDisposable | undefined
let outsideClickListener: ((event: PointerEvent) => void) | undefined
let pointerDownInsidePopup = false
let highlightDecorationIds: string[] = []
let styleElement: HTMLStyleElement | undefined

const stopMouseEvent = (event: Event): void => {
  event.stopPropagation()
}

const markPopupInteraction = (): void => {
  pointerDownInsidePopup = true
  window.setTimeout(() => {
    pointerDownInsidePopup = false
  }, 0)
}

const shouldKeepPopupOnBlur = (): boolean => {
  if (pointerDownInsidePopup || !popupHost) {
    return pointerDownInsidePopup
  }

  const activeElement = document.activeElement
  if (!activeElement) {
    return false
  }

  return popupHost.getDomNodeRef().contains(activeElement)
}

const toSafeClassToken = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, '-')

const ensureGlobalRegex = (pattern: RegExp): RegExp => {
  if (pattern.flags.includes('g')) {
    return new RegExp(pattern.source, pattern.flags)
  }
  return new RegExp(pattern.source, `${pattern.flags}g`)
}

const createHighlightDecoration = (
  range: monaco.IRange,
  className: string,
): monaco.editor.IModelDeltaDecoration => ({
  range,
  options: {
    inlineClassName: className,
  },
})

const updateRuleStyles = (): void => {
  const css: string[] = []

  for (const rule of props.expressionRules) {
    if (rule.mode !== 'highlight' || !rule.highlightStyle) {
      continue
    }

    const className = `md-editor-highlight-${toSafeClassToken(rule.key)}`
    const borderRadius = rule.highlightStyle.borderRadius ?? '4px'
    css.push(`.${className}{background:${rule.highlightStyle.backgroundColor};border-radius:${borderRadius};}`)
  }

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.setAttribute('data-md-editor-expression-styles', 'true')
    document.head.appendChild(styleElement)
  }
  styleElement.textContent = css.join('\n')
}

const removeStyleElement = (): void => {
  styleElement?.remove()
  styleElement = undefined
}

const clearHighlightDecorations = (): void => {
  if (!editor || !highlightDecorationIds.length) {
    return
  }
  highlightDecorationIds = editor.deltaDecorations(highlightDecorationIds, [])
}

const scanHighlightDecorations = (): monaco.editor.IModelDeltaDecoration[] => {
  const model = editor?.getModel()
  if (!model) {
    return []
  }

  const text = model.getValue()
  const decorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const rule of props.expressionRules) {
    if (rule.mode !== 'highlight') {
      continue
    }

    const matcher = ensureGlobalRegex(rule.match)
    let match: RegExpExecArray | null
    while ((match = matcher.exec(text)) !== null) {
      const raw = match[0]
      if (!raw) {
        matcher.lastIndex += 1
        continue
      }

      const startOffset = match.index
      const endOffset = startOffset + raw.length
      const start = model.getPositionAt(startOffset)
      const end = model.getPositionAt(endOffset)
      const className = `md-editor-highlight-${toSafeClassToken(rule.key)}`

      decorations.push(
        createHighlightDecoration(
          {
            startLineNumber: start.lineNumber,
            startColumn: start.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          className,
        ),
      )
    }
  }

  return decorations
}

const renderExpressionRules = (): void => {
  if (!editor) {
    return
  }

  updateRuleStyles()
  const highlightDecorations = scanHighlightDecorations()
  highlightDecorationIds = editor.deltaDecorations(highlightDecorationIds, highlightDecorations)
}

const createPopupHost = (): PopupHost => {
  const domNode = document.createElement('div')
  domNode.className = 'md-editor-expression-popup'
  domNode.style.display = 'none'
  domNode.style.left = '-9999px'
  domNode.style.top = '-9999px'
  domNode.addEventListener('mousedown', stopMouseEvent)
  domNode.addEventListener('click', stopMouseEvent)
  domNode.addEventListener('pointerdown', markPopupInteraction, true)
  document.body.appendChild(domNode)
  let visible = false

  return {
    setVisible: (nextVisible: boolean) => {
      visible = nextVisible
      domNode.style.display = nextVisible ? 'block' : 'none'
      if (!nextVisible) {
        domNode.style.left = '-9999px'
        domNode.style.top = '-9999px'
      }
    },
    getVisible: () => visible,
    getDomNodeRef: () => domNode,
    destroy: () => {
      domNode.remove()
    },
  }
}

const attachPopupApp = (): void => {
  if (!popupHost || !props.popupComponent) {
    return
  }

  popupApp?.unmount()
  popupApp = createApp({
    setup: () => () =>
      h(props.popupComponent as Component, {
        ...(props.popupProps ?? {}),
        context: currentContext,
        onSelect: (payload: ExpressionPopupSelectPayload) => {
          handlePopupSelect(payload)
        },
        onClose: () => {
          hidePopup()
        },
      }),
  })
  popupApp.mount(popupHost.getDomNodeRef())
}

const destroyPopupApp = (): void => {
  popupApp?.unmount()
  popupApp = undefined
}

const closePopupByEscape = (event: monaco.IKeyboardEvent): void => {
  if (!popupVisible) {
    return
  }

  if (event.code !== 'Escape') {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  hidePopup()
}

const hidePopup = (): void => {
  if (!popupHost || !popupVisible) {
    return
  }

  popupVisible = false
  currentContext = undefined
  popupHost.setVisible(false)
  emit('popup-hide')
}

const isMouseOutsidePopupAndEditor = (event: PointerEvent): boolean => {
  const target = event.target as Node | null
  if (!target || !editor || !popupHost) {
    return false
  }

  const popupNode = popupHost.getDomNodeRef()
  const editorNode = editor.getDomNode()
  if (!editorNode) {
    return false
  }

  return !popupNode.contains(target) && !editorNode.contains(target)
}

const updatePopupPosition = (): void => {
  if (!popupVisible || !popupHost || !editor || !currentContext) {
    return
  }

  const popupNode = popupHost.getDomNodeRef()
  const editorNode = editor.getDomNode()
  const anchor = editor.getScrolledVisiblePosition(currentContext.position)
  if (!editorNode || !anchor) {
    return
  }

  const editorRect = editorNode.getBoundingClientRect()
  const popupWidth = popupNode.offsetWidth || 220
  const popupHeight = popupNode.offsetHeight || 0
  const viewportPadding = 8
  const offset = 6
  const preferredTop = editorRect.top + anchor.top + anchor.height + offset
  const fallbackTop = editorRect.top + anchor.top - popupHeight - offset

  let top = preferredTop
  if (popupHeight && preferredTop + popupHeight > window.innerHeight - viewportPadding && fallbackTop >= viewportPadding) {
    top = fallbackTop
  } else if (popupHeight) {
    top = Math.min(preferredTop, Math.max(window.innerHeight - popupHeight - viewportPadding, viewportPadding))
  }

  const maxLeft = Math.max(window.innerWidth - popupWidth - viewportPadding, viewportPadding)
  const left = Math.min(
    Math.max(editorRect.left + anchor.left, viewportPadding),
    maxLeft,
  )

  popupNode.style.left = `${Math.round(left)}px`
  popupNode.style.top = `${Math.round(Math.max(top, viewportPadding))}px`
}

const handlePopupViewportChange = (): void => {
  if (!popupVisible) {
    return
  }
  updatePopupPosition()
}

const resolveTriggerMatch = (lineText: string, cursorIndex: number): TriggerMatch | null => {
  const match = props.expressionSyntaxes !== undefined
    ? (props.expressionSyntaxes.length
        ? findInlineExpressionMatch(lineText, cursorIndex, props.expressionSyntaxes)
        : null)
    : props.triggerPatterns !== undefined
      ? (props.triggerPatterns.length
          ? findLegacyInlineExpressionMatch(lineText, cursorIndex, props.triggerPatterns)
          : null)
      : findInlineExpressionMatch(lineText, cursorIndex, DEFAULT_EXPRESSION_SYNTAXES)

  if (!match || !editor) {
    return null
  }

  const position = editor.getPosition()
  if (!position) {
    return null
  }

  return {
    syntax: match.syntax,
    triggerText: match.triggerText,
    queryText: match.queryText,
    defaultReplaceRange: {
      startLineNumber: position.lineNumber,
      startColumn: match.startIndex + 1,
      endLineNumber: position.lineNumber,
      endColumn: match.endIndex + 1,
    },
    position,
  }
}

const findTriggerMatch = (): TriggerMatch | null => {
  const model = editor?.getModel()
  const position = editor?.getPosition()
  if (!model || !position) {
    return null
  }

  const lineText = model.getLineContent(position.lineNumber)
  return resolveTriggerMatch(lineText, position.column - 1)
}

const maybeShowPopup = (): void => {
  if (!editor || !popupHost || props.readonly || !props.popupComponent) {
    hidePopup()
    return
  }

  if (suppressNextTrigger) {
    suppressNextTrigger = false
    hidePopup()
    return
  }

  const match = findTriggerMatch()
  if (!match) {
    hidePopup()
    return
  }

  currentContext = {
    syntax: match.syntax,
    position: match.position,
    triggerText: match.triggerText,
    queryText: match.queryText,
    defaultReplaceRange: match.defaultReplaceRange,
  }

  attachPopupApp()

  popupVisible = true
  popupHost.setVisible(true)
  updatePopupPosition()
  nextTick(() => {
    updatePopupPosition()
  })
  emit('popup-show', currentContext)
}

const applyEdit = (payload: ExpressionPopupSelectPayload): void => {
  const targetEditor = editor
  const model = targetEditor?.getModel()
  if (!targetEditor || !model) {
    return
  }

  const fallbackPosition = targetEditor.getPosition()
  if (!fallbackPosition) {
    return
  }

  const range = payload.replaceRange ?? currentContext?.defaultReplaceRange ?? {
    startLineNumber: fallbackPosition.lineNumber,
    startColumn: fallbackPosition.column,
    endLineNumber: fallbackPosition.lineNumber,
    endColumn: fallbackPosition.column,
  }

  const closeToken = payload.insertText.startsWith('{{')
    ? '}}'
    : payload.insertText.startsWith('${')
      ? '}'
      : ''

  let normalizedRange: monaco.IRange = { ...range }
  const rangeText = model.getValueInRange(normalizedRange)
  if (closeToken && !rangeText.endsWith(closeToken)) {
    const lookahead = model.getValueInRange({
      startLineNumber: normalizedRange.endLineNumber,
      startColumn: normalizedRange.endColumn,
      endLineNumber: normalizedRange.endLineNumber,
      endColumn: normalizedRange.endColumn + closeToken.length,
    })

    let overlap = 0
    for (let i = closeToken.length; i > 0; i -= 1) {
      if (lookahead.startsWith(closeToken.slice(0, i))) {
        overlap = i
        break
      }
    }

    if (overlap > 0) {
      normalizedRange = {
        ...normalizedRange,
        endColumn: normalizedRange.endColumn + overlap,
      }
    }
  }

  suppressNextTrigger = true
  targetEditor.executeEdits('md-editor-expression-popup', [
    {
      range: normalizedRange,
      text: payload.insertText,
      forceMoveMarkers: true,
    },
  ])
  targetEditor.focus()
}

const handlePopupSelect = (payload: ExpressionPopupSelectPayload): void => {
  emit('popup-select', payload)
  applyEdit(payload)
  hidePopup()
}

const bindPopupLifecycle = (): void => {
  if (!editor || popupHost) {
    return
  }

  popupHost = createPopupHost()

  keydownListener = editor.onKeyDown(closePopupByEscape)
  blurListener = editor.onDidBlurEditorText(() => {
    window.setTimeout(() => {
      if (shouldKeepPopupOnBlur()) {
        return
      }
      hidePopup()
    }, 0)
  })
  cursorListener = editor.onDidChangeCursorPosition(() => {
    maybeShowPopup()
  })
  contentListener = editor.onDidChangeModelContent(() => {
    renderExpressionRules()
    maybeShowPopup()
  })
  scrollListener = editor.onDidScrollChange(() => {
    handlePopupViewportChange()
  })
  layoutListener = editor.onDidLayoutChange(() => {
    handlePopupViewportChange()
  })

  outsideClickListener = (event: PointerEvent) => {
    if (!popupVisible) {
      return
    }
    if (isMouseOutsidePopupAndEditor(event)) {
      hidePopup()
    }
  }
  window.addEventListener('pointerdown', outsideClickListener, true)
  window.addEventListener('scroll', handlePopupViewportChange, true)
  window.addEventListener('resize', handlePopupViewportChange)
}

const cleanupPopupLifecycle = (): void => {
  keydownListener?.dispose()
  blurListener?.dispose()
  cursorListener?.dispose()
  contentListener?.dispose()
  scrollListener?.dispose()
  layoutListener?.dispose()
  keydownListener = undefined
  blurListener = undefined
  cursorListener = undefined
  contentListener = undefined
  scrollListener = undefined
  layoutListener = undefined

  if (outsideClickListener) {
    window.removeEventListener('pointerdown', outsideClickListener, true)
    outsideClickListener = undefined
  }
  window.removeEventListener('scroll', handlePopupViewportChange, true)
  window.removeEventListener('resize', handlePopupViewportChange)

  destroyPopupApp()
  popupHost?.getDomNodeRef().removeEventListener('mousedown', stopMouseEvent)
  popupHost?.getDomNodeRef().removeEventListener('click', stopMouseEvent)
  popupHost?.getDomNodeRef().removeEventListener('pointerdown', markPopupInteraction, true)
  popupHost?.destroy()
  popupHost = undefined
  popupVisible = false
  currentContext = undefined
}

const cleanupExpressionRenderer = (): void => {
  clearHighlightDecorations()
  removeStyleElement()
}

const onEditorReady = (payload: {
  editor: monaco.editor.IStandaloneCodeEditor
  monaco: typeof monaco
}): void => {
  editor = payload.editor
  editorReady.value = true
  bindPopupLifecycle()
  renderExpressionRules()
  emit('ready', payload)
}

watch(
  () => props.popupComponent,
  () => {
    if (!editorReady.value) {
      return
    }

    if (!props.popupComponent) {
      hidePopup()
      destroyPopupApp()
      return
    }

    if (popupVisible) {
      attachPopupApp()
      nextTick(() => {
        updatePopupPosition()
      })
    }
  },
)

watch(
  () => props.popupProps,
  () => {
    if (popupVisible) {
      attachPopupApp()
      nextTick(() => {
        updatePopupPosition()
      })
    }
  },
  { deep: true },
)

watch(
  () => props.expressionSyntaxes,
  () => {
    maybeShowPopup()
  },
  { deep: true },
)

watch(
  () => props.triggerPatterns,
  () => {
    maybeShowPopup()
  },
  { deep: true },
)

watch(
  () => props.expressionRules,
  () => {
    renderExpressionRules()
  },
  { deep: true },
)

watch(
  () => props.readonly,
  (readonly) => {
    if (readonly) {
      hidePopup()
    }
  },
)

onBeforeUnmount(() => {
  cleanupPopupLifecycle()
  cleanupExpressionRenderer()
})

defineExpose<MdEditorExpose>({
  focus: () => monacoEditorRef.value?.focus(),
  blur: () => monacoEditorRef.value?.blur(),
  formatDocument: async () => {
    await monacoEditorRef.value?.formatDocument()
  },
  getEditor: () => monacoEditorRef.value?.getEditor(),
  getModel: () => monacoEditorRef.value?.getModel(),
  insertText: (text, range) => {
    handlePopupSelect({ insertText: text, replaceRange: range })
  },
  hidePopup,
})
</script>

<template>
  <MonacoEditor
    ref="monacoEditorRef"
    :model-value="modelValue"
    language="markdown"
    :path="path"
    :theme="theme"
    :width="width"
    :height="height"
    :placeholder="placeholder"
    :word-wrap="wordWrap"
    :font-size="fontSize"
    :minimap="minimap"
    :line-numbers="lineNumbers"
    :options="options"
    :readonly="readonly"
    :autofocus="autofocus"
    @update:model-value="emit('update:modelValue', $event)"
    @ready="onEditorReady"
    @change="emit('change', $event)"
    @focus="emit('focus')"
    @blur="emit('blur')"
    @validate="emit('validate', $event)"
    @error="emit('error', $event)"
  />
</template>

<style scoped>
:global(.md-editor-expression-popup) {
  position: fixed;
  z-index: 200;
  min-width: 220px;
  pointer-events: auto;
}
</style>
