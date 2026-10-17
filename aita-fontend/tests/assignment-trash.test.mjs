import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createLoader } from './helpers/load-typescript.mjs'

const source = fs.readFileSync('../aita-backend/src/modules/grading/engine/assignment/assignment-trash.ts', 'utf8')
const module = { exports: {} }
vm.runInNewContext(`(function(exports){${ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}})`, {})(module.exports)
const { changeAssignmentTrashState } = module.exports
const permanentExports = {}
const permanentSource = fs.readFileSync('../aita-backend/src/modules/grading/engine/assignment/assignment-permanent-delete.ts', 'utf8')
vm.runInNewContext(`(function(exports){${ts.transpileModule(permanentSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}})`, {})(permanentExports)
const { permanentlyDeleteAssignments } = permanentExports

function permanentFixture(failAt, active = false) {
  let state = { exam: { IsDeleted: !active }, publishedAssignment: { IsDeleted: !active } }
  const calls = [], invalidated = []
  const db = { $transaction: async callback => {
    const draft = structuredClone(state)
    const tx = new Proxy({}, { get: (_, model) => ({
      findUnique: async () => draft[model],
      deleteMany: async () => {
        calls.push(model)
        if (model === failAt) throw new Error('FK deletion failed')
        if (model === 'publishedAssignment') draft[model] = null
      },
      updateMany: async () => calls.push(model + ':detach'),
      delete: async () => { calls.push(model); draft[model] = null },
    }) })
    await callback(tx)
    state = draft
  } }
  return { db, cache: { invalidatePrefix: key => invalidated.push(key) }, state: () => state, calls, invalidated }
}

test('permanent deletion removes dependent grading data before parents, then invalidates counters', async () => {
  const fixture = permanentFixture()
  await permanentlyDeleteAssignments(fixture.db, fixture.cache, ['a'])
  assert.equal(fixture.state().exam, null)
  assert.equal(fixture.state().publishedAssignment, null)
  for (const model of ['sandboxExecution', 'gradingJob', 'appeal', 'submissionArtifact', 'criterionScore', 'evidence']) assert.ok(fixture.calls.includes(model))
  assert.ok(fixture.calls.indexOf('sandboxExecution') < fixture.calls.indexOf('gradingSession'))
  assert.ok(fixture.calls.indexOf('submissionArtifact') < fixture.calls.indexOf('submission'))
  assert.ok(fixture.calls.includes('rubric:detach'))
  assert.ok(fixture.invalidated.includes('exams_list_'))
})

test('permanent deletion failure retains both records and never degrades into a reported-success soft delete', async () => {
  const fixture = permanentFixture('sandboxExecution')
  await assert.rejects(permanentlyDeleteAssignments(fixture.db, fixture.cache, ['a']), /FK deletion failed/)
  assert.ok(fixture.state().exam)
  assert.ok(fixture.state().publishedAssignment)
  assert.equal(fixture.invalidated.length, 0)
})

test('permanent deletion refuses active assignments and supports an idempotent retry', async () => {
  const active = permanentFixture(null, true)
  await assert.rejects(permanentlyDeleteAssignments(active.db, active.cache, ['a']), error => error.statusCode === 409)
  const fixture = permanentFixture()
  await permanentlyDeleteAssignments(fixture.db, fixture.cache, ['a'])
  await permanentlyDeleteAssignments(fixture.db, fixture.cache, ['a'])
  assert.equal(fixture.state().exam, null)
})

test('trash query selects only fields in the generated Prisma schema', () => {
  const source = fs.readFileSync('../aita-backend/src/modules/grading/engine/assignment/assignment-trash-query.ts', 'utf8')
  const exports = {}
  vm.runInNewContext(`(function(exports){${ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}})`, {})(exports)
  const { Prisma } = createRequire(path.resolve('../aita-backend/package.json'))('@prisma/client')
  const models = Prisma.dmmf.datamodel.models
  function validate(modelName, query) {
    const model = models.find(model => model.name === modelName)
    for (const [name, selection] of Object.entries(query.select || query.include || {})) {
      const field = model.fields.find(field => field.name === name)
      assert.ok(field, `${modelName}.${name} does not exist`)
      if (typeof selection === 'object') validate(field.type, selection)
    }
  }
  validate('Exam', exports.assignmentTrashQuery)
  assert.throws(() => validate('Class', { select: { Name: true } }), /Class.Name/)
})

function setup(exam, published, fail = false) {
  let state = { exam, published }
  const invalidated = []
  const db = { $transaction: async callback => {
    const draft = structuredClone(state)
    const tx = Object.fromEntries(['exam', 'published'].map(key => [key === 'published' ? 'publishedAssignment' : key, {
      findUnique: async () => draft[key],
      update: async ({ data }) => {
        if (fail && key === 'published') throw new Error('database unavailable')
        Object.assign(draft[key], data)
      }
    }]))
    await callback(tx)
    state = draft
  } }
  return { db, cache: { invalidatePrefix: prefix => invalidated.push(prefix) }, invalidated, state: () => state }
}

test('trash and restore commit both representations and invalidate cached lists afterwards', async () => {
  const fixture = setup({ Id: 'a', Status: 'Draft', IsDeleted: false }, { Id: 'a', Data: '{"metadata":{"title":"Original"}}', IsDeleted: false })
  await changeAssignmentTrashState(fixture.db, fixture.cache, ['a'], true)
  assert.equal(fixture.state().exam.IsDeleted, true)
  assert.equal(fixture.state().published.IsDeleted, true)
  assert.ok(fixture.invalidated.includes('exams_list_'))
  await changeAssignmentTrashState(fixture.db, fixture.cache, ['a'], false)
  assert.equal(fixture.state().exam.Status, 'Draft')
  assert.equal(fixture.state().published.IsDeleted, false)
  assert.equal(JSON.parse(fixture.state().published.Data).metadata.title, 'Original')
})

test('failure rolls back both representations and does not invalidate as if committed', async () => {
  const fixture = setup({ Id: 'a', Status: 'Published', IsDeleted: false }, { Id: 'a', Data: '{}', IsDeleted: false }, true)
  await assert.rejects(changeAssignmentTrashState(fixture.db, fixture.cache, ['a'], true), /database unavailable/)
  assert.equal(fixture.state().exam.IsDeleted, false)
  assert.equal(fixture.state().published.IsDeleted, false)
  assert.equal(fixture.invalidated.length, 0)
})

test('legacy assignments with only one representation work; missing assignments return failure', async () => {
  for (const fixture of [setup({ Id: 'a' }, null), setup(null, { Id: 'a', Data: '{}' })]) {
    await changeAssignmentTrashState(fixture.db, fixture.cache, ['a'], true)
    assert.equal((fixture.state().exam || fixture.state().published).IsDeleted, true)
  }
  const missing = setup(null, null)
  await assert.rejects(changeAssignmentTrashState(missing.db, missing.cache, ['a'], true), error => error.statusCode === 404)
})

test('a failed trash request never falls back to a different delete API', async () => {
  const calls = []
  const load = createLoader({ fetch: async (url, options) => {
    calls.push({ url, method: options.method })
    return { ok: false, status: 500, json: async () => ({ success: false, message: 'Write failed' }) }
  }, localStorage: { getItem: () => 'test' }, sessionStorage: { getItem: () => null }, window: {} })
  await assert.rejects(load('lib/api/modules/assignments.ts').assignmentsApi.deleteAssignment('a'), /Write failed/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/api/grading/assignments/a')
})
