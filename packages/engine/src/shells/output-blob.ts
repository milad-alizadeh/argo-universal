import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { copyFile, link, mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { blob } from '@repo/db/schema';
import { z } from 'zod';

type ShellBlob = Pick<typeof blob.$inferInsert, 'id' | 'mime' | 'bytes'>;

export type ShellOutputBlob = { path: string; metadata: ShellBlob };

const hashChunkBytes = 1_048_576;

const CrossDevice = z.object({ code: z.literal('EXDEV') });

const retainFile = async (source: string, target: string): Promise<void> => {
  try {
    await link(source, target);
  } catch (error) {
    if (!CrossDevice.safeParse(error).success) throw error;
    await copyFile(source, target, constants.COPYFILE_FICLONE);
  }
};

const metadataFor = (id: string, bytes: number): ShellBlob => ({
  id,
  mime: 'text/plain; charset=utf-8',
  bytes,
});

export const shellOutputBlob = async (
  path: string,
): Promise<ShellOutputBlob> => {
  const hash = createHash('sha256');
  let bytes = 0;

  for await (const chunk of createReadStream(path, {
    highWaterMark: hashChunkBytes,
  })) {
    hash.update(chunk);
    bytes += chunk.length;
  }

  return { path, metadata: metadataFor(hash.digest('hex'), bytes) };
};

export const writeShellBlob = async (
  folder: string,
  output: ShellOutputBlob,
): Promise<void> => {
  await mkdir(folder, { recursive: true });
  const path = join(folder, output.metadata.id);
  const partial = `${path}.${randomUUID()}.partial`;

  try {
    await retainFile(output.path, partial);
    await rename(partial, path);
  } finally {
    await rm(partial, { force: true });
  }
};
