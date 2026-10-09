import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { expect, it } from 'vitest';

it('accepts a file FormData mock and a BlobRef response', (): void => {
  const uploadForm = new FormData();
  uploadForm.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');
  expect(BlobUploadInput.parse(uploadForm).size).toBe(3);
  const response = { blobId: 'image-1', mime: 'image/png', bytes: 3 };
  expect(BlobUploadOutput.parse(response)).toEqual(response);
});
it.each(['missing', 'text', 'extra'])(
  'rejects the %s file mock',
  (invalidFileShape): void => {
    const uploadForm = new FormData();
    if (invalidFileShape === 'text') uploadForm.set('file', 'plain text');
    if (invalidFileShape === 'extra') {
      uploadForm.set('file', new Blob(['png']));
      uploadForm.append('extra', new Blob(['second']));
    }
    expect(BlobUploadInput.safeParse(uploadForm).success).toBe(false);
  },
);
it('rejects JSON in place of FormData', (): void => {
  expect(BlobUploadInput.safeParse({ file: 'image' }).success).toBe(false);
});
