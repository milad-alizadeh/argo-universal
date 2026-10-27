import { open } from 'node:fs/promises';
import { join } from 'node:path';
import type { ShellOutputInput, ShellRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { shellOutputPath } from './files';
import { readShellRecord } from './reader';

export type OutputStorage = { database: Database; blobsFolder: string };

const outputPath = (storage: OutputStorage, record: ShellRecord): string =>
  record.outputBlobId
    ? join(storage.blobsFolder, record.outputBlobId)
    : shellOutputPath(
        join(storage.blobsFolder, '..'),
        record.sessionId,
        record.id,
      );

type OutputChunk = { bytes: Buffer; total: number };

const outputChunkBytes = 65_536;

const readChunkBytes = async (
  path: string,
  after: number,
): Promise<OutputChunk> => {
  const file = await open(path, 'r');

  try {
    const total = (await file.stat()).size;
    validateOffset(after, total);
    const buffer = Buffer.alloc(Math.min(outputChunkBytes, total - after));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, after);

    return { bytes: buffer.subarray(0, bytesRead), total };
  } finally {
    await file.close();
  }
};

export const requireShell = (
  database: Database,
  input: ShellOutputInput,
): ShellRecord => {
  const record = readShellRecord(database, input);

  if (!record)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No Shell in this Session',
    });

  return record;
};

export const readOutput = async (
  storage: OutputStorage,
  input: ShellOutputInput,
  after: number,
): Promise<OutputChunk & { record: ShellRecord }> => {
  const record = requireShell(storage.database, input);

  try {
    return await readRecordOutput(storage, record, after);
  } catch (error) {
    const latest = requireShell(storage.database, input);

    if (latest.outputBlobId === record.outputBlobId) throw error;

    return readRecordOutput(storage, latest, after);
  }
};

const validateOffset = (after: number, total: number): void => {
  if (after < 0 || after > total)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid Shell output offset',
    });
};

const readRecordOutput = async (
  storage: OutputStorage,
  record: ShellRecord,
  after: number,
): Promise<OutputChunk & { record: ShellRecord }> => ({
  record,
  ...(await readChunkBytes(outputPath(storage, record), after)),
});
