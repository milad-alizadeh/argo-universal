import type { AgentsService } from './agents';
import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { ProjectsService } from './projects';

export interface Services {
  blob: BlobService;
  agents: AgentsService;
  projects: ProjectsService;
  feed: FeedService;
}
