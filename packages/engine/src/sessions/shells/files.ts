import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { blob } from '@repo/db/schema';

export const shellOutputPath = (
  home: string,
  sessionId: string,
  shellId: string,
): string =>
  join(
    home,
    'shells',
    createHash('sha256')
      .update(JSON.stringify([sessionId, shellId]))
      .digest('hex'),
  );

export const createShellOutput = async (path: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
};

export const appendShellOutput = (path: string, text: string): Promise<void> =>
  appendFile(path, text);

export const removeShellOutput = (path: string): Promise<void> =>
  rm(path, { force: true });

export const readShellOutput = (path: string): Promise<Buffer> =>
  readFile(path);

type ShellBlob = Pick<typeof blob.$inferInsert, 'id' | 'mime' | 'bytes'>;

export const shellOutputBlob = (bytes: Buffer): ShellBlob => ({
  id: createHash('sha256').update(bytes).digest('hex'),
  mime: 'text/plain; charset=utf-8',
  bytes: bytes.length,
});

export const readRecoveredOutput = async (path: string): Promise<Buffer> => {
  try {
    return await readShellOutput(path);
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    return recoveredOutputFailure(error);
  }
};

const recoveredOutputFailure = (error: NodeJS.ErrnoException): Buffer => {
  if (isMissingFile(error)) return Buffer.alloc(0);
  throw error;
};

const isMissingFile = (error: NodeJS.ErrnoException): boolean => {
  return 'code' in error && error.code === 'ENOENT';
};

export const clearShellOutputs = async (home: string): Promise<void> => {
  const folder = join(home, 'shells');
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
};
