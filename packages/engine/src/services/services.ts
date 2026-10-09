import type { AgentsService } from './agents';
import type { FeedService } from './feed';
import type { ProjectsService } from './projects';
import type { SystemService } from './system';

export interface Services {
  agents: AgentsService;
  projects: ProjectsService;
  system: SystemService;
  feed: FeedService;
}
