import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.js'
test('frontend monorepos fail before installing or starting a backend', async () => {
 const service = new ExecutionSandboxService() as any
 service.detectRuntimeStack = async () => 'nodejs'
 service.getFreePort = async () => 1234
 service.findFile = async () => '/fixture/backend/package.json'
 service.findAllFiles = async () => ['/fixture/backend/package.json','/fixture/frontend/package.json']
 service.injectDbOverrides = async () => []
 service.docker = { getImage(){throw Error('must not access Docker')}, createContainer(){throw Error('must not start backend')} }
 const result = await service.startAsync('/fixture','frontend')
 assert.equal(result.isReady,false)
 assert.equal(result.containerId,null)
 assert.match(result.crashLogs,/UI_PROJECT_ROOT_AMBIGUOUS/)
})
