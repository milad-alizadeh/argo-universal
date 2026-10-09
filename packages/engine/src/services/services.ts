import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { SystemService } from './system';

export interface Services {
  blob: BlobService;
  system: SystemService;
  feed: FeedService;
}
