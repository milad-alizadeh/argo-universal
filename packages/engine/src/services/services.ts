import type { AgentsService } from './agents';
import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { SystemService } from './system';

export interface Services {
  blob: BlobService;
  agents: AgentsService;
  system: SystemService;
  feed: FeedService;
}
