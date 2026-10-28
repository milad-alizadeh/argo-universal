import type { readerOperations } from '@repo/contracts/operations';
import { listProjectBranches } from '../projects';
import {
  createSessionAgentReader,
  listSessionShells,
  listSessionBranches,
  type SessionRouterDeps,
} from '../sessions';
import type { OperationImplementations } from './operations';

export function createReadOperations(
  deps: SessionRouterDeps,
): Pick<OperationImplementations, keyof typeof readerOperations> {
  const listAgents = createSessionAgentReader(deps);

  return {
    'session.listAgents': async (input) => listAgents(input),
    'session.listShells': async (input) =>
      listSessionShells(deps, input.sessionId),
    'session.listBranches': (input) => listSessionBranches(deps, input),
    'project.listBranches': (input) =>
      listProjectBranches(deps.database, input),
  };
}
