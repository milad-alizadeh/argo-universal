import type { FeedService } from './feed/service';
import type { SessionService } from './sessions/service';
import type { SystemService } from './system/service';

export interface Services {
  system: SystemService;
  feed: FeedService;
  session: SessionService;
}
