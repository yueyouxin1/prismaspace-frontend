export interface ExpressionReplaceRange {
  startIndex: number
  endIndex: number
}

export interface ExpressionSyntax {
  key: string
  open: string
  close?: string
  queryOffset?: number
  triggerPattern?: RegExp
  findReplaceRange?: (context: ExpressionSyntaxMatchContext) => ExpressionReplaceRange | null
}

export interface ExpressionSyntaxDescriptor {
  key: string
  open: string
  close: string
  queryOffset: number
}

export interface ExpressionSyntaxMatchContext {
  lineText: string
  cursorIndex: number
  matchedText: string
  matchIndex: number
  syntax: ExpressionSyntaxDescriptor
}

interface ResolvedExpressionSyntax extends ExpressionSyntaxDescriptor {
  triggerPattern: RegExp
  findReplaceRange?: (context: ExpressionSyntaxMatchContext) => ExpressionReplaceRange | null
}

export interface InlineExpressionMatch {
  syntax: ExpressionSyntaxDescriptor
  triggerText: string
  queryText: string
  startIndex: number
  endIndex: number
}

export const DEFAULT_EXPRESSION_SYNTAXES: ExpressionSyntax[] = [
  {
    key: 'mustache',
    open: '{{',
    close: '}}',
  },
  {
    key: 'template-string',
    open: '${',
    close: '}',
  },
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildDefaultExpressionTriggerPattern(syntax: ExpressionSyntax): RegExp {
  const escapedOpen = escapeRegExp(syntax.open)
  if (syntax.close) {
    return new RegExp(`${escapedOpen}[^\\n]*$`)
  }
  return new RegExp(`${escapedOpen}[^\\s\\n]*$`)
}

function resolveExpressionSyntax(syntax: ExpressionSyntax): ResolvedExpressionSyntax {
  return {
    key: syntax.key,
    open: syntax.open,
    close: syntax.close ?? '',
    queryOffset: syntax.queryOffset ?? syntax.open.length,
    triggerPattern: syntax.triggerPattern ?? buildDefaultExpressionTriggerPattern(syntax),
    findReplaceRange: syntax.findReplaceRange,
  }
}

function normalizeExpressionReplaceRange(
  range: ExpressionReplaceRange,
  lineText: string,
  cursorIndex: number,
): ExpressionReplaceRange {
  const startIndex = Math.max(0, Math.min(range.startIndex, lineText.length))
  const minEndIndex = Math.max(startIndex, cursorIndex)
  const endIndex = Math.max(minEndIndex, Math.min(range.endIndex, lineText.length))
  return {
    startIndex,
    endIndex,
  }
}

function defaultExpressionReplaceRange(context: ExpressionSyntaxMatchContext): ExpressionReplaceRange {
  if (!context.syntax.close) {
    return {
      startIndex: context.matchIndex,
      endIndex: context.cursorIndex,
    }
  }

  const closeTokenIndex = context.lineText.indexOf(context.syntax.close, context.cursorIndex)
  if (closeTokenIndex >= 0) {
    return {
      startIndex: context.matchIndex,
      endIndex: closeTokenIndex + context.syntax.close.length,
    }
  }

  return {
    startIndex: context.matchIndex,
    endIndex: context.lineText.length,
  }
}

function createInlineExpressionMatch(
  lineText: string,
  cursorIndex: number,
  syntax: ResolvedExpressionSyntax,
  matchedText: string,
  matchIndex: number,
): InlineExpressionMatch {
  const matchContext: ExpressionSyntaxMatchContext = {
    lineText,
    cursorIndex,
    matchedText,
    matchIndex,
    syntax,
  }
  const replaceRange = normalizeExpressionReplaceRange(
    syntax.findReplaceRange?.(matchContext) ?? defaultExpressionReplaceRange(matchContext),
    lineText,
    cursorIndex,
  )
  const queryStartIndex = Math.max(
    replaceRange.startIndex,
    Math.min(replaceRange.startIndex + syntax.queryOffset, cursorIndex),
  )

  return {
    syntax,
    triggerText: syntax.open,
    queryText: lineText.slice(queryStartIndex, cursorIndex),
    startIndex: replaceRange.startIndex,
    endIndex: replaceRange.endIndex,
  }
}

export function cloneExpressionSyntaxes(syntaxes: ExpressionSyntax[]): ExpressionSyntax[] {
  return syntaxes.map(syntax => ({ ...syntax }))
}

export function buildExpressionInsertText(
  syntax: Pick<ExpressionSyntaxDescriptor, 'open' | 'close'>,
  insertValue: string,
): string {
  return `${syntax.open}${insertValue}${syntax.close}`
}

export function findInlineExpressionMatch(
  lineText: string,
  cursorIndex: number,
  syntaxes: ExpressionSyntax[],
): InlineExpressionMatch | null {
  const prefix = lineText.slice(0, cursorIndex)
  const matches: Array<InlineExpressionMatch & { order: number }> = []

  syntaxes.forEach((syntax, order) => {
    if (!syntax.open) {
      return
    }

    const resolvedSyntax = resolveExpressionSyntax(syntax)
    const normalizedFlags = resolvedSyntax.triggerPattern.flags.replace(/g/g, '')
    const matcher = new RegExp(resolvedSyntax.triggerPattern.source, normalizedFlags)
    const result = matcher.exec(prefix)
    if (!result || typeof result.index !== 'number') {
      return
    }

    const matchedText = result[0]
    if (!matchedText) {
      return
    }

    matches.push({
      ...createInlineExpressionMatch(lineText, cursorIndex, resolvedSyntax, matchedText, result.index),
      order,
    })
  })

  matches.sort((left, right) => {
    if (left.startIndex !== right.startIndex) {
      return right.startIndex - left.startIndex
    }
    if (left.triggerText.length !== right.triggerText.length) {
      return right.triggerText.length - left.triggerText.length
    }
    return left.order - right.order
  })

  if (!matches.length) {
    return null
  }

  const firstMatch = matches[0]
  if (!firstMatch) {
    return null
  }

  const { order: _order, ...match } = firstMatch
  return match
}

export function findLegacyInlineExpressionMatch(
  lineText: string,
  cursorIndex: number,
  triggerPatterns: RegExp[],
): InlineExpressionMatch | null {
  const prefix = lineText.slice(0, cursorIndex)

  for (const pattern of triggerPatterns) {
    const normalizedFlags = pattern.flags.replace(/g/g, '')
    const matcher = new RegExp(pattern.source, normalizedFlags)
    const result = matcher.exec(prefix)
    if (!result || typeof result.index !== 'number') {
      continue
    }

    const matchedText = result[0]
    if (!matchedText) {
      continue
    }

    const triggerText = matchedText.slice(0, 2)
    const syntax = resolveExpressionSyntax({
      key: `legacy-${triggerText || result.index}`,
      open: triggerText,
      close: triggerText === '{{' ? '}}' : triggerText === '${' ? '}' : '',
      queryOffset: 2,
      triggerPattern: pattern,
    })

    return createInlineExpressionMatch(lineText, cursorIndex, syntax, matchedText, result.index)
  }

  return null
}
