import type { FeedService } from './feed';
import type { ProjectsService } from './projects';
import type { SystemService } from './system';

export interface Services {
  projects: ProjectsService;
  system: SystemService;
  feed: FeedService;
}
