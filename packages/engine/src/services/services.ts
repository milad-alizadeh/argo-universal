import type { BlobService } from './blob';
import type { FeedService } from './feed';

export interface Services {
  blob: BlobService;
  feed: FeedService;
}
