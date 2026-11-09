import { ValidationError } from '../../../shared/application/app.error.js'

export function validateSubmissionLinks(github?: string, vercel?: string) {
  try {
    const repo = new URL(github?.trim() || '')
    const deploy = new URL(vercel?.trim() || '')
    if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || repo.port || repo.username || repo.password || repo.search || repo.hash || !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repo.pathname)) throw new Error()
    if (deploy.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(deploy.hostname) || deploy.port || deploy.username || deploy.password) throw new Error()
    return { githubUrl: `https://github.com${repo.pathname.replace(/\/$/, '').replace(/\.git$/, '')}`, vercelUrl: deploy.href }
  } catch { throw new ValidationError('Nhập link repo GitHub công khai và link deploy HTTPS dạng ten-du-an.vercel.app hợp lệ.') }
}

export async function downloadGithubSubmission(githubUrl: string): Promise<{ file: Express.Multer.File; commit: string }> {
  const repoPath = new URL(validateSubmissionLinks(githubUrl, 'https://example.vercel.app').githubUrl).pathname
  try {
    const signal = AbortSignal.timeout(45000)
    const commitResponse = await fetch(`https://api.github.com/repos${repoPath}/commits/HEAD`, { redirect: 'error', signal, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AITA-submissions' } })
    if (!commitResponse.ok) throw new Error()
    const metadata = await commitResponse.json() as { sha?: string }
    const commit = metadata.sha || ''
    if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error()
    const response = await fetch(`https://codeload.github.com${repoPath}/zip/${commit}`, { redirect: 'error', signal })
    if (!response.ok || !response.body) throw new Error()
    const limit = 100 * 1024 * 1024
    const reader = response.body.getReader()
    const chunks: Buffer[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > limit) throw new Error()
        chunks.push(Buffer.from(value))
      }
    } finally { await reader.cancel() }
    return { commit, file: { originalname: `${repoPath.split('/').pop()}.zip`, buffer: Buffer.concat(chunks), size, mimetype: 'application/zip' } as Express.Multer.File }
  } catch { throw new ValidationError('Không tải được repo GitHub. Repo phải công khai, có mã nguồn và ZIP không vượt 100MB. Vui lòng thử lại hoặc nộp ZIP.') }
}
