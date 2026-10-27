import Docker from 'dockerode'
import { execFileSync } from 'node:child_process'

export function dockerSocketOptions(endpoint: string): { socketPath: string } | undefined {
  if (endpoint.startsWith('npipe:')) return { socketPath: endpoint.replace(/^npipe:\/+/, '//') }
  if (endpoint.startsWith('unix://')) return { socketPath: endpoint.slice(7) }
}

/** Dockerode's Windows default differs from Docker Desktop's active Linux pipe. */
export function createDockerClient(): Docker {
  if (process.env.DOCKER_HOST) return new Docker()
  try {
    const context = process.env.DOCKER_CONTEXT
    const args = ['context', 'inspect', ...(context ? [context] : []), '--format', '{{json .Endpoints.docker.Host}}']
    const endpoint = JSON.parse(execFileSync('docker', args, { encoding: 'utf8', timeout: 5000, windowsHide: true }).trim())
    const options = dockerSocketOptions(endpoint)
    if (options) return new Docker(options)
  } catch { /* Report actual connection failures at runtime; never print credentials. */ }
  return new Docker()
}
