import { createHash } from 'node:crypto';
import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type BlobUploadInput,
  type BlobUploadOutput,
  maxBlobUploadBytes,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, lt, notExists } from 'drizzle-orm';
import type { z } from 'zod';
import { writeBlobFile } from '../feed';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../storage';
import { BlobMetadataUpsertJob, storedBlobIds } from './blob-storage';

export const unusedBlobAge = 86_400_000;

export const blobsFolderIn = (home: string): string => join(home, 'blobs');

const unlessMissing =
  <T>(fallback: T): ((error: NodeJS.ErrnoException) => T) =>
  (error: NodeJS.ErrnoException): T => {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  };

const hasBytesAt = (bytes: Buffer, offset: number, expected: Buffer): boolean =>
  bytes.subarray(offset, offset + expected.length).equals(expected);

const webpFormatOffset = 8;

const imageSignatures: [mime: string, matches: (bytes: Buffer) => boolean][] = [
  [
    'image/png',
    (bytes): boolean => hasBytesAt(bytes, 0, Buffer.from('89504e47', 'hex')),
  ],
  [
    'image/jpeg',
    (bytes): boolean => hasBytesAt(bytes, 0, Buffer.from('ffd8ff', 'hex')),
  ],
  [
    'image/gif',
    (bytes): boolean => hasBytesAt(bytes, 0, Buffer.from('GIF8', 'latin1')),
  ],
  [
    'image/webp',
    (bytes): boolean =>
      hasBytesAt(bytes, 0, Buffer.from('RIFF', 'latin1')) &&
      hasBytesAt(bytes, webpFormatOffset, Buffer.from('WEBP', 'latin1')),
  ],
];

const mimeOf = (bytes: Buffer, declared: string): string => {
  const detected = imageSignatures.find(([, matches]): boolean =>
    matches(bytes),
  );

  return detected ? detected[0] : declaredMime(declared);
};

const declaredMime = (declared: string): string =>
  declared || 'application/octet-stream';

export interface BlobUploadDeps {
  databaseWriter: WriterActorRef;
  blobsFolder: string;
}

export async function uploadBlob(
  resources: BlobUploadDeps,
  file: z.output<typeof BlobUploadInput>,
): Promise<BlobUploadOutput> {
  checkUploadSize(file.size);
  const bytes = Buffer.from(await file.arrayBuffer());
  const blobId = blobIdentity(bytes);
  await writeBlobFile(resources.blobsFolder, blobId, bytes);
  const mime = mimeOf(bytes, file.type);
  const metadata = { id: blobId, mime, bytes: bytes.length };
  await saveMetadata(resources.databaseWriter, metadata);

  return { blobId, mime, bytes: bytes.length };
}

const blobIdentity = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

const checkUploadSize = (size: number): void => {
  if (size > maxBlobUploadBytes)
    throw new TRPCError({
      code: 'PAYLOAD_TOO_LARGE',
      message: `An upload is at most ${maxBlobUploadBytes} bytes`,
    });
};

const saveMetadata = async (
  writer: WriterActorRef,
  blobMetadata: { id: string; mime: string; bytes: number },
): Promise<void> => {
  await writeDatabaseJobAndWaitForCommit(
    writer,
    new BlobMetadataUpsertJob({ blob: blobMetadata }),
    true,
  );
};

export async function removeUnusedBlobs(options: {
  database: Database;
  blobsFolder: string;
  now?: number;
}): Promise<void> {
  const cutoff = (options.now ?? Date.now()) - unusedBlobAge;
  const { database } = options;

  const removed = deleteUnusedBlobRows(database, cutoff);

  for (const { id } of removed)
    await rm(join(options.blobsFolder, id), { force: true });

  await removeUnstoredFiles(database, options.blobsFolder, cutoff);
}

const deleteUnusedBlobRows = (
  database: Database,
  cutoff: number,
): { id: string }[] =>
  database
    .delete(blob)
    .where(and(lt(blob.createdAt, cutoff), noReference(database)))
    .returning({ id: blob.id })
    .all();

const noReference = (database: Database): ReturnType<typeof notExists> =>
  notExists(
    database
      .select({ blobId: blobRef.blobId })
      .from(blobRef)
      .where(eq(blobRef.blobId, blob.id)),
  );

const removeUnstoredFiles = async (
  database: Database,
  blobsFolder: string,
  cutoff: number,
): Promise<void> => {
  const stored = storedBlobIds(database);

  const names = await readdir(blobsFolder).catch(unlessMissing<string[]>([]));

  for (const name of names) {
    if (stored.has(name)) continue;
    await removeOldFile(join(blobsFolder, name), cutoff);
  }
};

const removeOldFile = async (path: string, cutoff: number): Promise<void> => {
  if ((await stat(path)).mtimeMs < cutoff) await rm(path, { force: true });
};
