import type { FeedService } from './feed/service';
import type { SystemService } from './system/service';

export interface Services {
  system: SystemService;
  feed: FeedService;
  // milestone 1 adds: projects, sessions, checkouts
}
