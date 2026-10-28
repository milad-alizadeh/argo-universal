import type { ProjectsListOutput } from '@repo/contracts';
import { operations, type OperationId } from '@repo/contracts/operations';
import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';
import { readProjects } from '../projects';
import type { SessionList } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import type { OperationsDeps } from './operations';
import { createPluginOperations } from './plugins';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { sessionImplementations } from './sessions';

export type OperationResult<Id extends OperationId = OperationId> = z.output<
  (typeof operations)[Id]['result']
>;

export type OperationImplementations = {
  [Id in OperationId]: (
    params: z.output<(typeof operations)[Id]['params']>,
  ) => Promise<z.output<(typeof operations)[Id]['result']>>;
};

export function createImplementations(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps, sessionList),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    'project.list': (): Promise<ProjectsListOutput> =>
      readProjects(deps.database, rejections),
  };
}
