import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type BlobUploadOutput, maxBlobUploadBytes } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { startRouterTestHost } from '#mocks/router';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const pngMime = 'image/png';
const textMime = 'text/plain';
const pngId =
  '6b7fa434f92a8b80aab02d9bf1a12e49ffcae424e4013a1c4f68b67e3d2bbcd0';

let blobsFolder: string;
let uploadFile: ReturnType<
  typeof startRouterTestHost
>['caller']['blob']['upload'];

const formWith = (file: Blob): FormData => {
  const form = new FormData();
  form.set('file', file, 'image.png');
  return form;
};
const upload = (file: Blob): Promise<BlobUploadOutput> =>
  uploadFile(formWith(file));
beforeEach((): void => {
  const { context, caller } = startRouterTestHost();
  blobsFolder = context.blobsFolder;
  uploadFile = caller.blob.upload;
});

describe('blob upload', (): void => {
  it('stores a file under the sha256 of its content and returns its BlobRef', async (): Promise<void> => {
    const ref = await upload(new Blob([png], { type: pngMime }));

    expect(ref).toEqual({ blobId: pngId, mime: pngMime, bytes: 70 });
    expect(readFileSync(join(blobsFolder, pngId))).toEqual(png);
  });

  it('names an image by its content when the App declares another type', async (): Promise<void> => {
    const ref = await upload(new Blob([png], { type: textMime }));

    expect(ref.mime).toBe(pngMime);
  });

  it.each(['serial', 'concurrent'])(
    'stores the same content once for %s uploads',
    async (ordering): Promise<void> => {
      const firstUpload = upload(new Blob([png], { type: pngMime }));
      if (ordering === 'serial') await firstUpload;
      const [first, second] = await Promise.all([
        firstUpload,
        upload(new Blob([png], { type: pngMime })),
      ]);
      expect(second).toEqual(first);
      expect(readdirSync(blobsFolder)).toEqual([pngId]);
    },
  );

  it('refuses a file over 20 MB and stores nothing', async (): Promise<void> => {
    await expect(
      upload(new Blob([new Uint8Array(maxBlobUploadBytes + 1)])),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });

    expect(existsSync(blobsFolder) ? readdirSync(blobsFolder) : []).toEqual([]);
  });

  it('returns a storage error without replacing a conflicting file', async (): Promise<void> => {
    writeFileSync(blobsFolder, 'occupied');

    await expect(upload(new Blob([png]))).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });

    expect(readFileSync(blobsFolder, 'utf8')).toBe('occupied');
  });

  it.each([
    { declared: textMime, expected: textMime },
    { declared: '', expected: 'application/octet-stream' },
  ])(
    'keeps the MIME fallback $expected for non-image bytes',
    async ({ declared, expected }): Promise<void> => {
      expect(
        await upload(new Blob(['notes'], { type: declared })),
      ).toMatchObject({
        mime: expected,
        bytes: 5,
      });
    },
  );

  it('accepts a file of exactly 20 MB', async (): Promise<void> => {
    const ref = await upload(new Blob([new Uint8Array(maxBlobUploadBytes)]));

    expect(ref.bytes).toBe(maxBlobUploadBytes);
  });
});
