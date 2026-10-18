import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { pathToFileURL } from 'node:url'
import { fixEsmImports } from './fix-esm-imports.mjs'

test('compiled modules run in plain Node with file, directory, export and dynamic imports', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-esm-test-'))
  try {
    await fs.mkdir(path.join(directory, 'folder'))
    await fs.writeFile(path.join(directory, 'package.json'), '{"type":"module"}')
    await fs.writeFile(path.join(directory, 'dependency.js'), 'export const value = 2')
    await fs.writeFile(path.join(directory, 'folder', 'index.js'), 'export const name = "folder"')
    await fs.writeFile(path.join(directory, 'main.js'), `
      import { value } from './dependency';
      export { name } from './folder';
      const dynamic = await import('./dependency');
      export const total = value + dynamic.value;
      export const literal = "import('./must-stay-a-string')";
      // import './must-stay-a-comment'
    `)
    assert.equal(await fixEsmImports(directory), 3)
    const module = await import(pathToFileURL(path.join(directory, 'main.js')).href)
    assert.equal(module.total, 4)
    assert.equal(module.name, 'folder')
    assert.equal(module.literal, "import('./must-stay-a-string')")
    assert.equal(await fixEsmImports(directory), 0)
    await fs.writeFile(path.join(directory, 'broken.js'), "import './missing'")
    await assert.rejects(fixEsmImports(directory), /missing/)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(directory).startsWith('aita-esm-test-'))
    await fs.rm(directory, { recursive: true, force: true })
  }
})
