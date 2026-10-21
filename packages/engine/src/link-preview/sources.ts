import type { BlobRef } from '@repo/contracts';
import type { GitData } from './github';
import type { PreviewResponse } from './read-url';

export type PreviewSources = {
  read: (url: string) => Promise<PreviewResponse>;
  github: (path: string) => Promise<GitData>;
  storeImage: (image: Blob) => Promise<BlobRef>;
};
