// @ts-nocheck
import fs from 'fs-extra';
import path from 'path';

/**
 * Recursively search for a file matching the given predicate.
 * Returns the first match or null.
 */
export async function findFileRecursive(
  dir: string,
  predicate: (filename: string) => boolean,
): Promise<string | null> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const result = await findFileRecursive(fullPath, predicate);
      if (result) return result;
    } else if (predicate(entry.name)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Recursively check whether a folder with the given name exists
 * anywhere in the directory tree (case-insensitive).
 */
export async function folderExistsRecursive(
  dir: string,
  folderName: string,
): Promise<boolean> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    if (entry.name.toLowerCase() === folderName.toLowerCase()) {
      return true;
    }

    const found = await folderExistsRecursive(path.join(dir, entry.name), folderName);
    if (found) return true;
  }

  return false;
}

