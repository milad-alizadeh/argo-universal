import type { ProjectsListOutput } from '@repo/contracts';

export interface ProjectsService {
  list(): Promise<ProjectsListOutput>;
}
