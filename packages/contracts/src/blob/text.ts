import { z } from 'zod';

// A Blob id is the sha256 of its content, so it cannot name a path outside the Blobs folder.
export const BlobTextInput = z.strictObject({
  blobId: z.string().regex(/^[0-9a-f]{64}$/),
});

export type BlobTextInput = z.infer<typeof BlobTextInput>;

// The Blob's bytes as UTF-8 text: a tool call's whole output, read when its row is opened.
export const BlobTextOutput = z.string();

export type BlobTextOutput = z.infer<typeof BlobTextOutput>;
