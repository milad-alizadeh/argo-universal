import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { ProjectsService } from './projects';

export interface Services {
  blob: BlobService;
  projects: ProjectsService;
  feed: FeedService;
}
