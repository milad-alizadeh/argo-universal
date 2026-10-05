import type {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
  ProjectsListOutput,
} from '@repo/contracts';

export interface ProjectsService {
  branches(input: ProjectsBranchesInput): Promise<ProjectsBranchesOutput>;
  list(): Promise<ProjectsListOutput>;
}
