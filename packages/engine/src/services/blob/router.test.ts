import { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import { expect, it } from 'vitest';

it('accepts a file FormData mock and a BlobRef response', (): void => {
  const form = new FormData();
  form.set('file', new Blob(['png'], { type: 'image/png' }), 'image.png');
  expect(BlobUploadInput.parse(form).size).toBe(3);
  const response = { blobId: 'image-1', mime: 'image/png', bytes: 3 };
  expect(BlobUploadOutput.parse(response)).toEqual(response);
});
it.each(['missing', 'text', 'extra'])(
  'rejects the %s file mock',
  (shape): void => {
    const form = new FormData();
    if (shape === 'text') form.set('file', 'plain text');
    if (shape === 'extra') {
      form.set('file', new Blob(['png']));
      form.append('extra', new Blob(['second']));
    }
    expect(BlobUploadInput.safeParse(form).success).toBe(false);
  },
);
it('rejects JSON in place of FormData', (): void => {
  expect(BlobUploadInput.safeParse({ file: 'image' }).success).toBe(false);
});
