import type { BlobService } from './blob';
import type { FeedService } from './feed';
import type { ProjectsService } from './projects';
import type { SystemService } from './system';

export interface Services {
  blob: BlobService;
  projects: ProjectsService;
  system: SystemService;
  feed: FeedService;
}
