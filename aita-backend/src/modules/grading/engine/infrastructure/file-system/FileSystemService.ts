// @ts-nocheck
import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';

/**
 * Abstraction over raw file-system operations.
 *
 * Keeping FS access behind a service boundary means:
 * - Unit tests can stub this instead of touching the real disk.
 * - Swapping to cloud storage later (S3, Azure Blob) only changes this class.
 */
export class FileSystemService {
  /**
   * Ensure a directory exists, creating it recursively if needed.
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Extract a .zip archive into the target directory.
   */
  async extractZip(zipPath: string, targetDir: string): Promise<void> {
    await this.ensureDirectory(targetDir);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetDir, true);
  }

  /**
   * Remove a file or directory tree. Silently succeeds if the path doesn't exist.
   */
  async cleanup(targetPath: string): Promise<void> {
    await fs.remove(targetPath);
  }

  /**
   * Check whether a path exists on disk.
   */
  async exists(targetPath: string): Promise<boolean> {
    return fs.pathExists(targetPath);
  }

  /**
   * Resolve an absolute path from segments.
   */
  resolve(...segments: string[]): string {
    return path.resolve(...segments);
  }
}

