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
  .refine((form): boolean => {
    let entries = 0;
    for (const _ of form) entries += 1;
    return entries === 1 && form.get('file') instanceof Blob;
  }, 'Expected FormData with one file in the file field');
export type BlobUploadInput = z.infer<typeof BlobUploadInput>;

export const BlobUploadOutput = BlobRef;
export type BlobUploadOutput = z.infer<typeof BlobUploadOutput>;
