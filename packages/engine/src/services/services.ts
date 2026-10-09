import type { FeedService } from './feed';
import type { ProjectsService } from './projects';

export interface Services {
  projects: ProjectsService;
  feed: FeedService;
}
