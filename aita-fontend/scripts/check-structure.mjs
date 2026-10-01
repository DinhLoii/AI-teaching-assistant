import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');
const problems = [];
const graph = new Map();
const relative = file => path.relative(sourceRoot, file).replaceAll('\\', '/');

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

function resolveImport(from, specifier) {
  const base = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.') ? path.resolve(path.dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  problems.push(`${relative(from)}: unresolved local import ${specifier}`);
  return null;
}

function checkDependency(from, target) {
  const source = relative(from), destination = relative(target);
  if (!target.startsWith(sourceRoot + path.sep)) {
    problems.push(`${source}: application imports outside src (${destination})`);
    return;
  }
  if (!source.startsWith('app/') && destination.startsWith('app/')) {
    problems.push(`${source}: imports a route (${destination})`);
  }
  if (/^(lib|types|config|constants)\//.test(source) && /^(app|features|components|providers|store|pages|layouts)\//.test(destination)) {
    problems.push(`${source}: infrastructure depends on UI (${destination})`);
  }
  if (/^(providers|store)\//.test(source) && /^(app|pages)\//.test(destination)) {
    problems.push(`${source}: state store depends on a page/screen (${destination})`);
  }
  if (source.startsWith('components/ui/') && /^(features|providers|store|pages|lib\/api)\//.test(destination)) {
    problems.push(`${source}: UI primitive depends on business code (${destination})`);
  }
  if (/^(features|components|providers|pages)\//.test(source) && destination === 'lib/api/index.ts') {
    problems.push(`${source}: use a domain API module instead of the compatibility facade`);
  }
}

for (const dir of ['app', 'components', 'lib', 'hooks', 'constants', 'types']) {
  if (fs.existsSync(path.join(root, dir))) problems.push(`Legacy root directory remains: ${dir}`);
}

const files = filesIn(sourceRoot).filter(file => /\.tsx?$/.test(file));
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies = [];
  function visit(node) {
    let specifier, typeOnly = false;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
      typeOnly = !!node.isTypeOnly || !!node.importClause?.isTypeOnly;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && !node.importClause.name && bindings.elements.length && bindings.elements.every(e => e.isTypeOnly)) typeOnly = true;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
      specifier = node.arguments[0].text;
    }
    if (specifier) {
      const target = resolveImport(file, specifier);
      if (target) {
        checkDependency(file, target);
        if (!typeOnly && /\.tsx?$/.test(target)) dependencies.push(target);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, dependencies);
}

const visiting = new Set(), visited = new Set();
function checkCycles(file, trail = []) {
  if (visiting.has(file)) {
    problems.push(`Runtime import cycle: ${[...trail, file].map(relative).join(' -> ')}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const dependency of graph.get(file) || []) checkCycles(dependency, [...trail, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) checkCycles(file);

// Keep a reviewable route -> screen inventory in sync as features are added.
const routeMap = JSON.parse(fs.readFileSync(path.join(root, 'docs/route-map.json'), 'utf8'));
const pages = files.filter(file => relative(file).startsWith('app/') && path.basename(file) === 'page.tsx');
const mappedEntries = new Set();
for (const item of routeMap) {
  const entry = path.resolve(root, item.entry), screen = path.resolve(root, item.screen);
  if (mappedEntries.has(entry)) problems.push(`Duplicate route entry: ${item.entry}`);
  mappedEntries.add(entry);
  if (!pages.includes(entry) || !files.includes(screen)) problems.push(`Missing route or screen: ${item.route}`);
  else if (!(graph.get(entry) || []).includes(screen)) problems.push(`Route does not import its declared screen: ${item.route}`);
  const actualRoute = '/' + relative(entry).replace(/^app\//, '').replace(/(^|\/)page\.tsx$/, '').replace(/\[([^\]]+)\]/g, ':$1');
  if (actualRoute !== item.route) problems.push(`Incorrect route map URL: ${item.route} (expected ${actualRoute})`);
}
for (const page of pages) if (!mappedEntries.has(page)) problems.push(`Add route to docs/route-map.json: ${relative(page)}`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Structure OK: ${files.length} source files, ${pages.length} routes; local imports, layer boundaries and runtime cycles checked.`);
}
