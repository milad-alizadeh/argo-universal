import { z } from 'zod';
import { BlobRef } from '../feed/content-block';

const bytesPerMebibyte = 1_048_576;

export const maxBlobUploadMebibytes = 20;
export const maxBlobUploadBytes = maxBlobUploadMebibytes * bytesPerMebibyte;

// One file in the `file` field; tRPC parses multipart input over HTTP.
export const BlobUploadInput = z
  .custom<FormData>(
    (value): boolean =>
      typeof FormData !== 'undefined' && value instanceof FormData,
  )
  .transform((form, context): Blob => {
    const file = form.get('file');
    if ([...form].length === 1 && file instanceof Blob) return file;
    context.addIssue({
      code: 'custom',
      message: 'Expected FormData with one file in the file field',
    });
    return z.NEVER;
  });
export type BlobUploadInput = z.input<typeof BlobUploadInput>;

export const BlobUploadOutput = BlobRef;
export type BlobUploadOutput = z.infer<typeof BlobUploadOutput>;
