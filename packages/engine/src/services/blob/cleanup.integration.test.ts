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
import { removeUnusedBlobs } from './blob';

const newUnusedBlobId = 'new-unused';
const day = 24 * 60 * 60 * 1000;
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

describe('removeUnusedBlobs', (): void => {
  const now = Date.UTC(2026, 9, 5);
  const storeBlob = (id: string, createdAt: number): void => {
    mkdirSync(blobsFolder, { recursive: true });
    writeFileSync(join(blobsFolder, id), id);
    database
      .insert(blob)
      .values({ id, mime: 'image/png', bytes: 2, createdAt })
      .run();
  };

  it('deletes a blob no prompt refers to once it is over a day old', async (): Promise<void> => {
    storeBlob('old-unused', now - day - 1);
    storeBlob('old-used', now - 2 * day);
    storeBlob(newUnusedBlobId, now - day + 1);
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
        [`old.${extension}`, day + 1],
        [`new.${extension}`, day - 1000],
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
    storeBlob(blobId, uploadedAt - day - 1);
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
