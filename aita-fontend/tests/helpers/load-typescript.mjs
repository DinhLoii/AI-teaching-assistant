import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Isolated browser globals and module cache per test; API tests never call the network.
export function createLoader(globals = {}) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
  const cache = new Map();
  const context = vm.createContext({ console, URLSearchParams, FormData, setTimeout, clearTimeout, ...globals });
  function load(file) {
    const resolved = path.resolve(root, file);
    if (!resolved.startsWith(root + path.sep)) throw new Error('Test module outside src');
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const moduleRecord = { exports: {} };
    cache.set(resolved, moduleRecord);
    const output = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
      fileName: resolved,
    }).outputText;
    const requireExternal = createRequire(resolved);
    const localRequire = specifier => {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return requireExternal(specifier);
      const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(resolved), specifier);
      const target = [`${base}.ts`, path.join(base, 'index.ts')].find(f => fs.existsSync(f));
      if (!target) throw new Error(`Unresolved module ${specifier}`);
      return load(path.relative(root, target));
    };
    vm.runInContext(`(function(require, module, exports) {\n${output}\n})`, context, { filename: resolved })(localRequire, moduleRecord, moduleRecord.exports);
    return moduleRecord.exports;
  }
  return load;
}

