export interface InlineExpressionMatch {
  triggerText: string
  queryText: string
  startIndex: number
  endIndex: number
}

function resolveExpressionCloseToken(triggerText: string): string {
  if (triggerText === '{{') {
    return '}}'
  }
  if (triggerText === '${') {
    return '}'
  }
  return ''
}

function resolveExpressionReplaceEnd(lineText: string, cursorIndex: number, triggerText: string): number {
  const closeToken = resolveExpressionCloseToken(triggerText)
  if (!closeToken) {
    return cursorIndex
  }

  const closeTokenIndex = lineText.indexOf(closeToken, cursorIndex)
  if (closeTokenIndex >= 0) {
    return closeTokenIndex + closeToken.length
  }

  const fallbackClosingBraceIndex = lineText.indexOf('}', cursorIndex)
  if (fallbackClosingBraceIndex >= 0) {
    return fallbackClosingBraceIndex + 1
  }

  return lineText.length
}

export function findInlineExpressionMatch(
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
    const startIndex = result.index
    const endIndex = resolveExpressionReplaceEnd(lineText, cursorIndex, triggerText)

    return {
      triggerText,
      queryText: prefix.slice(startIndex + triggerText.length),
      startIndex,
      endIndex,
    }
  }

  return null
}
