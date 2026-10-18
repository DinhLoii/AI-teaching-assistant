import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

/** Legacy @ts-nocheck modules still emit extensionless imports; Node ESM requires explicit files. */
export async function fixEsmImports(directory) {
  let changed = 0
  async function exists(file) {
    try { return (await fs.stat(file)).isFile() } catch { return false }
  }
  async function visit(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name)
      if (entry.isDirectory()) { await visit(file); continue }
      if (!entry.isFile() || !file.endsWith('.js')) continue
      const text = await fs.readFile(file, 'utf8')
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
      const specifiers = []
      function collect(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) specifiers.push(node.moduleSpecifier)
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) specifiers.push(node.arguments[0])
        ts.forEachChild(node, collect)
      }
      collect(source)
      const edits = []
      for (const node of specifiers) {
        if (!ts.isStringLiteral(node) || !node.text.startsWith('.')) continue
        if (/\.(?:[cm]?js|json|node)$/.test(node.text)) continue
        const target = path.resolve(path.dirname(file), node.text)
        const suffix = await exists(`${target}.js`) ? '.js' : await exists(path.join(target, 'index.js')) ? '/index.js' : null
        if (!suffix) throw Error(`Không tìm thấy module được biên dịch: ${path.relative(directory, file)} → ${node.text}`)
        edits.push({ start: node.getStart(source), end: node.end, text: JSON.stringify(node.text + suffix) })
      }
      let output = text
      for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
      if (edits.length) { await fs.writeFile(file, output); changed += edits.length }
    }
  }
  await visit(directory)
  return changed
}
