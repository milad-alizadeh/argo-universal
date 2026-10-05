import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { BlobService } from '@repo/api';
import { maxBlobUploadBytes } from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, lt, notExists, sql } from 'drizzle-orm';

const unusedBlobAge = 24 * 60 * 60 * 1000;

// Where a Server home keeps its uploads (ADR-0005).
export const blobsFolderIn = (home: string) => join(home, 'blobs');

// A missing file or folder gives `fallback`; any other error still throws.
const unlessMissing =
  <T>(fallback: T) =>
  (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  };

// The image types an Agent reads, known by their first bytes; a fetched Blob on iOS arrives as text/plain.
const imageSignatures: [mime: string, matches: (bytes: Buffer) => boolean][] = [
  ['image/png', (bytes) => bytes.subarray(0, 4).toString('hex') === '89504e47'],
  ['image/jpeg', (bytes) => bytes.subarray(0, 3).toString('hex') === 'ffd8ff'],
  ['image/gif', (bytes) => bytes.subarray(0, 4).toString('latin1') === 'GIF8'],
  [
    'image/webp',
    (bytes) =>
      bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
      bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  ],
];

const mimeOf = (bytes: Buffer, declared: string) =>
  imageSignatures.find(([, matches]) => matches(bytes))?.[0] ??
  (declared || 'application/octet-stream');

const exists = (path: string) =>
  stat(path).then(() => true, unlessMissing(false));

// Stores each upload once at `blobs/<sha256>` with a `blob` row (ADR-0005).
export function createBlobService(options: {
  database: Database;
  blobsFolder: string;
}): BlobService {
  return {
    upload: async (form) => {
      // The contract has checked that `file` holds a Blob.
      const file = form.get('file') as Blob;
      if (file.size > maxBlobUploadBytes)
        throw new TRPCError({
          code: 'PAYLOAD_TOO_LARGE',
          message: `An upload is at most ${maxBlobUploadBytes} bytes`,
        });
      const bytes = Buffer.from(await file.arrayBuffer());
      const blobId = createHash('sha256').update(bytes).digest('hex');
      const path = join(options.blobsFolder, blobId);
      if (!(await exists(path))) {
        await mkdir(options.blobsFolder, { recursive: true });
        // A rename is atomic, so a reader never sees half a blob; a crash leaves only a stray file.
        const partial = `${path}.${randomUUID()}.partial`;
        await writeFile(partial, bytes);
        await rename(partial, path);
      }
      const mime = mimeOf(bytes, file.type);
      // A new upload of stored content restarts its day before cleanup.
      options.database
        .insert(blob)
        .values({ id: blobId, mime, bytes: bytes.length })
        .onConflictDoUpdate({
          target: blob.id,
          set: { createdAt: sql`excluded.created_at` },
        })
        .run();
      return { blobId, mime, bytes: bytes.length };
    },
  };
}

// Deletes each blob that no prompt refers to and that is over a day old, and stray files of that age.
export async function removeUnusedBlobs(options: {
  database: Database;
  blobsFolder: string;
  now?: number;
}) {
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
      .map(({ id }) => id),
  );
  const names = await readdir(options.blobsFolder).catch(
    unlessMissing<string[]>([]),
  );
  for (const name of names) {
    if (stored.has(name)) continue;
    const path = join(options.blobsFolder, name);
    // A file without a row is a deleted blob or an upload cut short; a younger one may be an upload in flight.
    if ((await stat(path)).mtimeMs < cutoff) await rm(path, { force: true });
  }
}
