import type { projectOperations } from '@repo/contracts/operations';
import { createRejectionCounter } from '@repo/machine-log';
import { listProjectBranches, readProjects } from '../projects';
import type { OperationImplementations, OperationsDeps } from './operations';

type ProjectImplementations = Pick<
  OperationImplementations,
  keyof typeof projectOperations
>;

export function createProjectOperations(
  deps: Pick<OperationsDeps, 'database'>,
): ProjectImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    'project.list': () => readProjects(deps.database, rejections),
    'project.listBranches': (input) =>
      listProjectBranches(deps.database, input),
  };
}
