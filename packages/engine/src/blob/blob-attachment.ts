import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { BlobRef } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readBlobBytes, type BlobStorage } from './blob-content';
import { storedBlobIds } from './blob-storage';

export const attachmentsFolderIn = (home: string): string =>
  join(home, 'attachments');

export type AttachmentStorage = BlobStorage & { attachmentsFolder: string };

// An uploaded file as the Agent reads it: a copy under its own name, beside its stored bytes.
export type AttachedFile = { path: string; bytes: Buffer };

const fallbackFileName = 'file';

const invalidFileNames = new Set(['', '.', '..']);

// Only the last path segment survives, so a sent name cannot leave its folder.
const safeFileName = (name: string): string => {
  const printable = name.split('').filter((character) => character >= ' ');
  const kept = basename(printable.join('').replaceAll('\\', '/'));

  return invalidFileNames.has(kept) ? fallbackFileName : kept;
};

export const attachFile = async (
  storage: AttachmentStorage,
  reference: BlobRef,
  name: string,
): Promise<AttachedFile> => {
  const bytes = await readBlobBytes(storage, reference);
  const folder = join(storage.attachmentsFolder, reference.blobId);
  const path = join(folder, safeFileName(name));
  await mkdir(folder, { recursive: true });
  await writeFile(path, bytes);

  return { path, bytes };
};

// A copy is kept only while its Blob is.
export async function removeOrphanAttachments(options: {
  database: Database;
  attachmentsFolder: string;
}): Promise<void> {
  const stored = storedBlobIds(options.database);

  const folders = await attachmentFolders(options.attachmentsFolder);

  for (const folder of folders.filter((name) => !stored.has(name)))
    await rm(join(options.attachmentsFolder, folder), {
      recursive: true,
      force: true,
    });
}

const attachmentFolders = async (folder: string): Promise<string[]> =>
  readdir(folder).catch((error: NodeJS.ErrnoException): string[] => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
