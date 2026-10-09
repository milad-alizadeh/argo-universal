import type { BlobService } from './blob';
import type { ProjectsService } from './projects';

export interface Services {
  blob: BlobService;
  projects: ProjectsService;
}
