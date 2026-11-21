import type {
  projectOperations,
  projectScheduleOperations,
} from '@repo/contracts/operations';
import { createRejectionCounter } from '@repo/machine-log';
import {
  addProject,
  cloneProject,
  createProject,
  listProjectBranches,
  readProjects,
  updateProject,
} from '../projects';
import type { OperationImplementations, OperationsDeps } from './operations';

type ProjectImplementations = Pick<
  OperationImplementations,
  keyof typeof projectOperations | keyof typeof projectScheduleOperations
>;

export function createProjectOperations(
  deps: Pick<OperationsDeps, 'database' | 'sessions'>,
): ProjectImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    'project.scheduleCreate': (input) =>
      deps.sessions.projectSchedules.create(input),
    'project.schedulePreview': async ({ projectId, cadence }) =>
      deps.sessions.projectSchedules.preview(projectId, cadence),
    'project.scheduleList': async ({ projectId }) =>
      deps.sessions.projectSchedules.list(projectId),
    'project.scheduleRunNow': (input) =>
      deps.sessions.projectSchedules.runNow(input),
    'project.list': () => readProjects(deps.database, rejections),
    'project.clone': ({ url }) => cloneProject(deps.database, url),
    'project.create': ({ name }) => createProject(deps.database, name),
    'project.add': ({ path }) => addProject(deps.database, path),
    'project.update': (input) =>
      updateProject(deps.database, rejections, input),
    'project.listBranches': (input) =>
      listProjectBranches(deps.database, input),
  };
}
