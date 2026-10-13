import { blob, blobRef } from '@repo/db/schema';
import { inArray, sql, type SQL } from 'drizzle-orm';
import type { TypedQueryBuilder } from 'drizzle-orm/query-builders/query-builder';
import type { StorageTransaction } from '../storage';
import type { OutputBlob } from './acp/tool-output';
import { writeBlobFile } from './blob-files';

type BlobReferences = {
  sessionId: string;
  blobIds?: string[];
  blobs?: OutputBlob[];
};

export async function writeOutputBlobFiles(
  folder: string | undefined,
  blobs: OutputBlob[],
): Promise<void> {
  for (const stored of blobs) await writeOutputBlob(folder, stored);
}

async function writeOutputBlob(
  folder: string | undefined,
  stored: OutputBlob,
): Promise<void> {
  if (!folder) throw new Error('Writer has no Blob folder');
  await writeBlobFile(folder, stored.blob.blobId, stored.data);
}

export function insertOutputBlobs(
  transaction: StorageTransaction,
  blobs: OutputBlob[],
): void {
  for (const { blob: stored } of blobs)
    transaction
      .insert(blob)
      .values({ id: stored.blobId, mime: stored.mime, bytes: stored.bytes })
      .onConflictDoNothing()
      .run();
}

const referencedBlobIds = (input: BlobReferences): string[] => [
  ...(input.blobIds ?? []),
  ...(input.blobs ?? []).map((stored): string => stored.blob.blobId),
];

const selectBlobReferences = (
  transaction: StorageTransaction,
  input: BlobReferences,
): TypedQueryBuilder<{
  blobId: typeof blob.id;
  sessionId: SQL.Aliased<string>;
}> =>
  transaction
    .select({
      blobId: blob.id,
      sessionId: sql<string>`${input.sessionId}`.as('session_id'),
    })
    .from(blob)
    .where(inArray(blob.id, referencedBlobIds(input)));

export function insertOutputBlobRefs(
  transaction: StorageTransaction,
  input: BlobReferences,
): void {
  if (referencedBlobIds(input).length === 0) return;
  transaction
    .insert(blobRef)
    .select(selectBlobReferences(transaction, input))
    .onConflictDoNothing()
    .run();
}
