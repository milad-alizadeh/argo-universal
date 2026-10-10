import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// The name a content-addressed file takes: the SHA-256 of its bytes.
export const contentAddress = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

// Turns a missing file into `fallback`; any other file error still throws.
export const unlessMissing =
  <T>(fallback: T): ((error: NodeJS.ErrnoException) => T) =>
  (error: NodeJS.ErrnoException): T => {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  };

// Writes a content-addressed file once; a partial file never takes its name.
export async function writeContentFile(
  folder: string,
  name: string,
  bytes: Uint8Array,
): Promise<void> {
  const path = join(folder, name);
  if (await stat(path).then(() => true, unlessMissing(false))) return;
  await mkdir(folder, { recursive: true });
  const partial = `${path}.${randomUUID()}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, path);
}
