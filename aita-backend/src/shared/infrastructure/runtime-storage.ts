import path from 'node:path'

/** One persistent mount can hold all durable runtime files on Render. */
export const runtimeDataRoot = () => path.resolve(process.env.RUNTIME_DATA_DIR || process.cwd())
export const publicUploadsRoot = () => path.join(runtimeDataRoot(), 'uploads')
export const artifactFilesRoot = () => path.join(runtimeDataRoot(), 'artifacts', 'files')
