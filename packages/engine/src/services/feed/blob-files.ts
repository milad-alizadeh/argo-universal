import { randomUUID } from 'node:crypto';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    (): boolean => true,
    (error: NodeJS.ErrnoException): boolean => {
      if (error.code === 'ENOENT') return false;
      throw error;
    },
  );

// Writes a content-addressed Blob file once; a partial file never takes its name.
export async function writeBlobFile(
  blobsFolder: string,
  blobId: string,
  bytes: Uint8Array,
): Promise<void> {
  const path = join(blobsFolder, blobId);
  if (await exists(path)) return;
  await mkdir(blobsFolder, { recursive: true });
  const partial = `${path}.${randomUUID()}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, path);
}
