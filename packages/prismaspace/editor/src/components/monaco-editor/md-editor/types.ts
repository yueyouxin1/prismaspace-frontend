import type { Component } from 'vue'
import type * as monaco from 'monaco-editor'
import type { MonacoEditorProps } from '../types'
import type { VariableTreeInsertValueResolver, VariableTreeNode } from '../../variable-tree'
import type { ExpressionSyntax, ExpressionSyntaxDescriptor } from '../../expression-popup-utils'

export type { ExpressionSyntax, ExpressionSyntaxDescriptor } from '../../expression-popup-utils'

export type ExpressionPopupSelectPayload = {
  insertText: string
  replaceRange?: monaco.IRange
}

export type ExpressionPopupContext = {
  position: monaco.IPosition
  triggerText: string
  queryText: string
  defaultReplaceRange: monaco.IRange
  syntax?: ExpressionSyntaxDescriptor
}

export type MdExpressionRuleMode = 'highlight' | 'none'

export type MdExpressionRule = {
  key: string
  match: RegExp
  mode: MdExpressionRuleMode
  highlightStyle?: {
    backgroundColor: string
    borderRadius?: string
  }
}

export interface MdEditorProps
  extends Omit<
    MonacoEditorProps,
    'language' | 'path' | 'modelValue' | 'update:modelValue' | 'readonly' | 'autofocus'
  > {
  modelValue: string
  path?: string
  readonly?: boolean
  autofocus?: boolean
  /**
   * Structured expression syntax definitions used for popup trigger, query parsing, and replacement range resolution.
   */
  expressionSyntaxes?: ExpressionSyntax[]
  /**
   * @deprecated Use `expressionSyntaxes` for fully supported custom expression syntaxes.
   */
  triggerPatterns?: RegExp[]
  popupComponent?: Component
  popupProps?: Record<string, unknown>
  expressionRules?: MdExpressionRule[]
}

export interface MdEditorExpose {
  focus: () => void
  blur: () => void
  formatDocument: () => Promise<void>
  getEditor: () => monaco.editor.IStandaloneCodeEditor | undefined
  getModel: () => monaco.editor.ITextModel | undefined
  insertText: (text: string, range?: monaco.IRange) => void
  hidePopup: () => void
}

export interface MdEditorVariablePanelProps {
  context?: ExpressionPopupContext
  tree?: VariableTreeNode[]
  title?: string
  emptyText?: string
  resolveInsertValue?: VariableTreeInsertValueResolver
}
