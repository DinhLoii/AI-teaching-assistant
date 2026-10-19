import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { StdInOutProbeEngine } from '../src/modules/grading/engine/application/evaluator/StdInOutProbeEngine.js'

process.env.STDIO_SANDBOX_ENABLED = 'true'
test('real Docker runner separates stdout/stderr, rejects nonzero exits and records compiler failure without inventing executed tests', async () => {
  const root = path.resolve('temp', `console-fixture-${Date.now()}`)
  await fs.mkdir(root, { recursive: true })
  try {
    const engine = new StdInOutProbeEngine()
    const spec = { description: 'fixture', requiredLanguage: 'C++', testCases: [{ id: 'fixture', input: '', expectedOutput: '4', comparisonMode: 'exact' as const }] }
    const events: any[] = []
    await fs.writeFile(path.join(root, 'main.cpp'), '#include <iostream>\nint main(){std::cout<<"4\\n";std::cerr<<"diagnostic\\n";return 0;}')
    const good = await engine.evaluateAsync(root, spec, undefined, event => events.push(event))
    assert.equal(good.passedCases, 1)
    assert.equal(good.compilationPassed, true)
    assert.equal(good.caseResults[0].actual, '4')
    assert.match(good.caseResults[0].stderr || '', /diagnostic/)
    assert.ok(events.some(event => event.stage === 1 && /ID: sha256:/.test(event.message)))
    assert.ok(events.some(event => event.stage === 1 && /Đã tạo [a-f0-9]{12,}/.test(event.message)))
    assert.ok(events.some(event => event.stage === 2 && /build: g\+\+/.test(event.message)))
    assert.ok(events.some(event => event.stage === 2 && /PASS; biên dịch: thành công/.test(event.message)))
    assert.ok(events.some(event => /Đã xóa container/.test(event.message)))
    assert.ok(events.every(event => !event.message.includes('diagnostic') && !event.message.includes('sha256:d89a1c')))
    await fs.writeFile(path.join(root, 'main.cpp'), '#include <iostream>\nint main(){std::cout<<"4 \\n";return 0;}')
    const spacing = await engine.evaluateAsync(root, spec)
    assert.equal(spacing.passedCases, 0)
    await fs.writeFile(path.join(root, 'main.cpp'), '#include <iostream>\nint main(){std::cout<<"4\\n";return 1;}')
    const crash = await engine.evaluateAsync(root, spec)
    assert.equal(crash.passedCases, 0)
    assert.equal(crash.caseResults[0].passed, false)
    await fs.writeFile(path.join(root, 'main.cpp'), 'int main(){ invalid syntax }')
    const bad = await engine.evaluateAsync(root, spec)
    assert.equal(bad.compilationPassed, false)
    assert.equal(bad.caseResults[0].passed, null)
    assert.ok(bad.caseResults[0].stderr?.length)
  } finally {
    assert.ok(root.startsWith(path.resolve('temp') + path.sep))
    await fs.rm(root, { recursive: true, force: true })
  }
})
