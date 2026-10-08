import type { AgentsService } from './agents';
import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { ProjectsService } from './projects';
import type { SessionService } from './sessions';
import type { SystemService } from './system';

export interface Services {
  blob: BlobService;
  agents: AgentsService;
  projects: ProjectsService;
  system: SystemService;
  feed: FeedService;
  session: SessionService;
}
