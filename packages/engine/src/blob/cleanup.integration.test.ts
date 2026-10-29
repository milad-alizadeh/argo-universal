import {
  mkdirSync,
  readdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Database } from '@repo/db';
import { blob, blobRef } from '@repo/db/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { removeUnusedBlobs, unusedBlobAge } from './blob';
import { removeOrphanAttachments } from './blob-attachment';

const newUnusedBlobId = 'new-unused';

let database: Database;

let blobsFolder: string;

let uploadFile: Awaited<
  ReturnType<typeof startEngineTestHost>
>['caller']['blob']['upload'];

beforeEach(async (): Promise<void> => {
  const {
    database: storedDatabase,
    blobsFolder: storedBlobsFolder,
    caller,
  } = await startEngineTestHost();

  database = storedDatabase;
  blobsFolder = storedBlobsFolder;
  uploadFile = caller.blob.upload;
});

const storeBlob = (id: string, createdAt: number): void => {
  mkdirSync(blobsFolder, { recursive: true });
  writeFileSync(join(blobsFolder, id), id);
  database
    .insert(blob)
    .values({ id, mime: 'image/png', bytes: 2, createdAt })
    .run();
};

describe('removeUnusedBlobs', (): void => {
  const now = Date.UTC(2026, 9, 5);

  it('deletes a blob no prompt refers to once it is over a day old', async (): Promise<void> => {
    storeBlob('old-unused', now - unusedBlobAge - 1);
    storeBlob('old-used', now - 2 * unusedBlobAge);
    storeBlob(newUnusedBlobId, now - unusedBlobAge + 1);
    database
      .insert(blobRef)
      .values({ blobId: 'old-used', sessionId: 'session-1' })
      .run();

    await removeUnusedBlobs({ database, blobsFolder, now });

    expect(readdirSync(blobsFolder).sort()).toEqual([
      newUnusedBlobId,
      'old-used',
    ]);
  });

  it.each(['stray', 'partial'])(
    'recovers an old %s file while retaining an upload still in flight',
    async (extension): Promise<void> => {
      mkdirSync(blobsFolder, { recursive: true });

      for (const [name, age] of [
        [`old.${extension}`, unusedBlobAge + 1],
        [`new.${extension}`, unusedBlobAge - 1000],
      ] as const) {
        writeFileSync(join(blobsFolder, name), name);
        const modified = new Date(now - age);
        utimesSync(join(blobsFolder, name), modified, modified);
      }

      await removeUnusedBlobs({ database, blobsFolder, now });

      expect(readdirSync(blobsFolder)).toEqual([`new.${extension}`]);
    },
  );

  it('retains uploaded content when deduplication refreshes its cleanup age', async (): Promise<void> => {
    const uploadedAt = Date.now();
    const content = 'deduplicated';

    const blobId =
      'bb60c16478a264b151c0e6c514b2c242d89ff3f5a92b6ebc8154c479dc43d9d3';

    storeBlob(blobId, uploadedAt - unusedBlobAge - 1);
    writeFileSync(join(blobsFolder, blobId), content);
    const form = new FormData();
    form.set('file', new Blob([content]));
    await uploadFile(form);

    await removeUnusedBlobs({ database, blobsFolder, now: uploadedAt });

    expect(readFileSync(join(blobsFolder, blobId), 'utf8')).toBe(content);
  });

  it('does nothing before the first upload makes the folder', async (): Promise<void> => {
    await expect(
      removeUnusedBlobs({ database, blobsFolder, now }),
    ).resolves.toBeUndefined();
  });
});

describe('removeOrphanAttachments', (): void => {
  it('keeps the named copy of a stored Blob and removes the copy of a deleted one', async (): Promise<void> => {
    const attachmentsFolder = join(blobsFolder, '..', 'attachments');
    database
      .insert(blob)
      .values({ id: 'kept', mime: 'text/plain', bytes: 1, createdAt: 0 })
      .run();

    for (const id of ['kept', 'deleted']) {
      mkdirSync(join(attachmentsFolder, id), { recursive: true });
      writeFileSync(join(attachmentsFolder, id, 'notes.md'), id);
    }

    await removeOrphanAttachments({ database, attachmentsFolder });

    expect(readdirSync(attachmentsFolder)).toEqual(['kept']);
  });
});
