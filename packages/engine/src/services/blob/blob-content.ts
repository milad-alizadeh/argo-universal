import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BlobRef, maxBlobUploadBytes } from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export type BlobStorage = { database: Database; blobsFolder: string };
const readStoredBlob = (database: Database, reference: BlobRef): BlobRef => {
  const stored = database
    .select({ blobId: blob.id, mime: blob.mime, bytes: blob.bytes })
    .from(blob)
    .where(eq(blob.id, reference.blobId))
    .get();
  if (!stored) throw new Error('The attached Blob is unavailable');
  const accepted = BlobRef.parse(stored);
  if (accepted.mime !== reference.mime || accepted.bytes !== reference.bytes)
    throw new Error('The attached Blob metadata does not match storage');
  return accepted;
};
const requireBlobBounds = (reference: BlobRef): void => {
  if (!/^[a-f0-9]{64}$/.test(reference.blobId))
    throw new Error('The attached Blob identity is invalid');
  if (reference.bytes > maxBlobUploadBytes)
    throw new Error('The attached Blob exceeds the upload limit');
};
export const readBlobBytes = async (
  storage: BlobStorage,
  reference: BlobRef,
): Promise<Buffer> => {
  const stored = readStoredBlob(storage.database, reference);
  requireBlobBounds(stored);
  const bytes = await readFile(join(storage.blobsFolder, stored.blobId));
  if (
    bytes.length !== stored.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== stored.blobId
  )
    throw new Error('The attached Blob contents do not match storage');
  return bytes;
};
