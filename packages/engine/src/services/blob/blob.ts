import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  type BlobUploadInput,
  type BlobUploadOutput,
  maxBlobUploadBytes,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, lt, notExists, sql } from 'drizzle-orm';
import type { z } from 'zod';

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

const exists = (path: string): Promise<boolean> =>
  stat(path).then((): boolean => true, unlessMissing(false));

export async function uploadBlob(
  resources: { database: Database; blobsFolder: string },
  file: z.output<typeof BlobUploadInput>,
): Promise<BlobUploadOutput> {
  if (file.size > maxBlobUploadBytes)
    throw new TRPCError({
      code: 'PAYLOAD_TOO_LARGE',
      message: `An upload is at most ${maxBlobUploadBytes} bytes`,
    });
  const bytes = Buffer.from(await file.arrayBuffer());
  const blobId = createHash('sha256').update(bytes).digest('hex');
  const path = join(resources.blobsFolder, blobId);
  if (!(await exists(path))) {
    await mkdir(resources.blobsFolder, { recursive: true });
    const partial = `${path}.${randomUUID()}.partial`;
    await writeFile(partial, bytes);
    await rename(partial, path);
  }
  const mime = mimeOf(bytes, file.type);
  resources.database
    .insert(blob)
    .values({ id: blobId, mime, bytes: bytes.length })
    .onConflictDoUpdate({
      target: blob.id,
      set: { createdAt: sql`excluded.created_at` },
    })
    .run();
  return { blobId, mime, bytes: bytes.length };
}

export async function removeUnusedBlobs(
  options: Parameters<typeof uploadBlob>[0] & { now?: number },
): Promise<void> {
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
