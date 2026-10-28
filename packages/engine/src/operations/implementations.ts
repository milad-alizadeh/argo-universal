import {
  operations,
  type OperationId,
  type OperationExecution,
} from '@repo/contracts/operations';
import type { z } from 'zod';
import type { SessionList } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import type { OperationsDeps } from './operations';
import { createPluginOperations } from './plugins';
import { createProjectOperations } from './projects';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { sessionImplementations } from './sessions';

export type OperationResult<Id extends OperationId = OperationId> = z.output<
  (typeof operations)[Id]['result']
>;

export type OperationRunResult = OperationResult | OperationExecution;

export type OperationImplementations = {
  [Id in OperationId]: (
    params: z.output<(typeof operations)[Id]['params']>,
  ) => Promise<z.output<(typeof operations)[Id]['result']>>;
};

export function createImplementations(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationImplementations {
  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps, sessionList),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    ...createProjectOperations(deps),
  };
}
