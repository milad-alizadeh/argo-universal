import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobUploadInput } from '@repo/contracts';
import { type BlobUploadOutput, maxBlobUploadBytes } from '@repo/contracts';
import type { Database } from '@repo/db';
import { blob, blobRef } from '@repo/db/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { createBlobService, removeUnusedBlobs } from './blob-service';

const newUnusedBlobId = 'new-unused';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const pngId = createHash('sha256').update(png).digest('hex');
const day = 24 * 60 * 60 * 1000;

let database: Database;
let removeDatabase: () => void;
let blobsFolder: string;

const formWith = (file: Blob): FormData => {
  const form = new FormData();
  form.set('file', file, 'image.png');
  return form;
};
const upload = (file: Blob): Promise<BlobUploadOutput> =>
  createBlobService({ database, blobsFolder }).upload(
    BlobUploadInput.parse(formWith(file)),
  );
const storedIds = (): string[] =>
  database
    .select({ id: blob.id })
    .from(blob)
    .all()
    .map(({ id }): string => id)
    .sort();

beforeEach((): void => {
  ({ database, remove: removeDatabase } = openTestDatabase());
  blobsFolder = join(mkdtempSync(join(tmpdir(), 'argo-blobs-')), 'blobs');
});

afterEach((): void => {
  removeDatabase();
  rmSync(join(blobsFolder, '..'), { recursive: true, force: true });
});

describe('blob upload', (): void => {
  it('stores a file under the sha256 of its content and returns its BlobRef', async (): Promise<void> => {
    const ref = await upload(new Blob([png], { type: 'image/png' }));

    expect(ref).toEqual({ blobId: pngId, mime: 'image/png', bytes: 70 });
    expect(readFileSync(join(blobsFolder, pngId))).toEqual(png);
    expect(storedIds()).toEqual([pngId]);
  });

  it('names an image by its content when the App declares another type', async (): Promise<void> => {
    const ref = await upload(new Blob([png], { type: 'text/plain' }));

    expect(ref.mime).toBe('image/png');
  });

  it('stores the same content once', async (): Promise<void> => {
    const first = await upload(new Blob([png], { type: 'image/png' }));
    const second = await upload(new Blob([png], { type: 'image/png' }));

    expect(second).toEqual(first);
    expect(readdirSync(blobsFolder)).toEqual([pngId]);
    expect(storedIds()).toEqual([pngId]);
  });

  it('refuses a file over 20 MB and stores nothing', async (): Promise<void> => {
    await expect(
      upload(new Blob([new Uint8Array(maxBlobUploadBytes + 1)])),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });

    expect(existsSync(blobsFolder) ? readdirSync(blobsFolder) : []).toEqual([]);
    expect(storedIds()).toEqual([]);
  });

  it('accepts a file of exactly 20 MB', async (): Promise<void> => {
    const ref = await upload(new Blob([new Uint8Array(maxBlobUploadBytes)]));

    expect(ref.bytes).toBe(maxBlobUploadBytes);
  });
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

    expect(storedIds()).toEqual([newUnusedBlobId, 'old-used']);
    expect(readdirSync(blobsFolder).sort()).toEqual([
      newUnusedBlobId,
      'old-used',
    ]);
  });

  it('deletes a file left without a row once it is over a day old', async (): Promise<void> => {
    mkdirSync(blobsFolder, { recursive: true });
    for (const [name, age] of [
      ['old-stray', day + 1],
      ['new-stray', day - 1000],
    ] as const) {
      writeFileSync(join(blobsFolder, name), name);
      const modified = new Date(now - age);
      utimesSync(join(blobsFolder, name), modified, modified);
    }

    await removeUnusedBlobs({ database, blobsFolder, now });

    expect(readdirSync(blobsFolder)).toEqual(['new-stray']);
  });

  it('does nothing before the first upload makes the folder', async (): Promise<void> => {
    await expect(
      removeUnusedBlobs({ database, blobsFolder, now }),
    ).resolves.toBeUndefined();
  });
});
