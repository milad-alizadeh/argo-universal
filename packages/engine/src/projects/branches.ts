import type {
  ProjectsBranchesInput,
  ProjectsBranchesOutput,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { readProjectPath } from './project';

export function listProjectBranches(
  database: Database,
  { projectId }: ProjectsBranchesInput,
): Promise<ProjectsBranchesOutput> {
  return listBranches(readProjectPath(database, projectId));
}
