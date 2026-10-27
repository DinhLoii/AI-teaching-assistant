/** Repair formatting only: fences, comments, literal controls and trailing commas.
 * Missing keys/values and truncated responses still fail validation. */
export function parseAiJson(input: string): unknown {
  const text = input.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let cleaned = '', quoted = false, escaped = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (!escaped && char === '"') quoted = false
      if (!escaped && char.charCodeAt(0) < 32) cleaned += JSON.stringify(char).slice(1, -1)
      else cleaned += char
      escaped = char === '\\' && !escaped
      continue
    }
    if (char === '"') { quoted = true; cleaned += char; continue }
    if (char === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; cleaned += '\n'; continue }
    if (char === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); if (end < 0) throw new SyntaxError('AI_JSON_INVALID: unterminated comment'); i = end + 1; continue }
    cleaned += char
  }
  // Remove trailing commas outside strings, including a comma before a comment.
  let result = ''; quoted = false; escaped = false
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]
    if (!quoted && char === ',' && /^[\s]*[}\]]/.test(cleaned.slice(i + 1))) continue
    result += char
    if (!escaped && char === '"') quoted = !quoted
    escaped = quoted && char === '\\' && !escaped
  }
  return JSON.parse(result)
}
