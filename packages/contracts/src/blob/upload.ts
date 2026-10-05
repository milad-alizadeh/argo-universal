import { z } from 'zod';
import { BlobRef } from '../feed/content-block';

// One file in the `file` field; tRPC parses multipart input over HTTP.
export const BlobUploadInput = z
  .custom<FormData>(
    (value) => typeof FormData !== 'undefined' && value instanceof FormData,
  )
  .refine((form) => {
    let entries = 0;
    form.forEach(() => {
      entries += 1;
    });
    return entries === 1 && form.get('file') instanceof Blob;
  }, 'Expected FormData with one file in the file field');
export type BlobUploadInput = z.infer<typeof BlobUploadInput>;

export const BlobUploadOutput = BlobRef;
export type BlobUploadOutput = z.infer<typeof BlobUploadOutput>;
