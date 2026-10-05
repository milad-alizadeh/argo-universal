import type { AgentsService } from './agents/service';
import type { BlobService } from './blob/service';
import type { FeedService } from './feed/service';
import type { ProjectsService } from './projects/service';
import type { SessionService } from './sessions/service';
import type { SystemService } from './system/service';

export interface Services {
  blob: BlobService;
  agents: AgentsService;
  projects: ProjectsService;
  system: SystemService;
  feed: FeedService;
  session: SessionService;
}
