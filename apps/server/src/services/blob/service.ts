import type { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';
import type { z } from 'zod';

export interface BlobService {
  upload(input: z.output<typeof BlobUploadInput>): Promise<BlobUploadOutput>;
}
