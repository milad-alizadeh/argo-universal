import type { projectOperations } from '@repo/contracts/operations';
import { createRejectionCounter } from '@repo/machine-log';
import {
  addProject,
  cloneProject,
  createProject,
  listProjectBranches,
  readProjects,
} from '../projects';
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
    'project.clone': ({ url }) => cloneProject(deps.database, url),
    'project.create': ({ name }) => createProject(deps.database, name),
    'project.add': ({ path }) => addProject(deps.database, path),
    'project.listBranches': (input) =>
      listProjectBranches(deps.database, input),
  };
}
