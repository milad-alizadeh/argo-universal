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
import type { ActorRefFrom } from 'xstate';
import type { z } from 'zod';
import {
  writeBlobFile,
  writeDatabaseJobAndWaitForCommit,
  type writerMachine,
} from '../feed';

const unusedBlobAge = 86_400_000;

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

const mimeOf = (bytes: Buffer, declared: string): string =>
  imageSignatures.find(([, matches]): boolean => matches(bytes))?.[0] ??
  (declared || 'application/octet-stream');

export async function uploadBlob(
  resources: {
    databaseWriter: ActorRefFrom<typeof writerMachine>;
    blobsFolder: string;
  },
  file: z.output<typeof BlobUploadInput>,
): Promise<BlobUploadOutput> {
  if (file.size > maxBlobUploadBytes)
    throw new TRPCError({
      code: 'PAYLOAD_TOO_LARGE',
      message: `An upload is at most ${maxBlobUploadBytes} bytes`,
    });
  const bytes = Buffer.from(await file.arrayBuffer());
  const blobId = createHash('sha256').update(bytes).digest('hex');
  await writeBlobFile(resources.blobsFolder, blobId, bytes);
  const mime = mimeOf(bytes, file.type);
  await writeDatabaseJobAndWaitForCommit(
    resources.databaseWriter,
    {
      type: 'blobMetadataUpsert',
      blob: { id: blobId, mime, bytes: bytes.length },
    },
    true,
  );
  return { blobId, mime, bytes: bytes.length };
}

export async function removeUnusedBlobs(options: {
  database: Database;
  blobsFolder: string;
  now?: number;
}): Promise<void> {
  const cutoff = (options.now ?? Date.now()) - unusedBlobAge;
  const { database } = options;
  const removed = database
    .delete(blob)
    .where(
      and(
        lt(blob.createdAt, cutoff),
        notExists(
          database
            .select({ blobId: blobRef.blobId })
            .from(blobRef)
            .where(eq(blobRef.blobId, blob.id)),
        ),
      ),
    )
    .returning({ id: blob.id })
    .all();
  for (const { id } of removed)
    await rm(join(options.blobsFolder, id), { force: true });
  const stored = new Set(
    database
      .select({ id: blob.id })
      .from(blob)
      .all()
      .map(({ id }): string => id),
  );
  const names = await readdir(options.blobsFolder).catch(
    unlessMissing<string[]>([]),
  );
  for (const name of names) {
    if (stored.has(name)) continue;
    const path = join(options.blobsFolder, name);
    if ((await stat(path)).mtimeMs < cutoff) await rm(path, { force: true });
  }
}
