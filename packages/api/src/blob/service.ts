import type { BlobUploadInput, BlobUploadOutput } from '@repo/contracts';

export interface BlobService {
  upload(input: BlobUploadInput): Promise<BlobUploadOutput>;
}
